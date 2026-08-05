// Write-back endpoint for CV extraction. Called directly by extract-cv
// (LlamaExtract structured extraction — no n8n in the loop) with the same
// {cv_id, profile} contract an n8n workflow could also use if one existed.
//
// Flow: upload-cv -> cv_metadata insert -> extract-cv (LlamaCloud LlamaExtract,
//       direct from the PDF) -> THIS FUNCTION (mapping + write)
//
// Why the caller posts here instead of writing to the tables directly:
//
//   1. Units. `overseasExp` and `ausExp` store YEARS. Several parts of the app
//      score them into points, and a workflow that writes points into those
//      columns silently inflates or deflates every visa match. This endpoint
//      takes `overseas_years` / `australian_years` so the unit is unambiguous
//      and the conversion lives in one place.
//   2. Scoring rules. Education level and English band thresholds map to points
//      by rules that change with policy. Keeping them here means one edit, not
//      a rebuild in every caller.
//   3. Safety. A CV is evidence, not authority. This only fills fields the user
//      has left empty — it never overwrites something they typed, because doing
//      so would change their points score without them noticing.
//
// Writes profile_basic / point_australia / education (empty-fields-only), plus
// an unconditional cv_llamaparsed audit row recording every candidate value
// this extraction found — including ones skipped above because the user
// already had data there.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const N8N_SHARED_SECRET = Deno.env.get("N8N_SHARED_SECRET");

/** Highest completed qualification -> points on the Australian points test. */
const EDUCATION_POINTS: Record<string, number> = {
  none: 0,
  diploma_or_trade: 10,
  bachelor: 15,
  masters: 15,
  doctorate: 20,
};

const TEST_TABLES: Record<string, string> = {
  IELTS: "test_ielts",
  PTE: "test_pte",
  TOEFL: "test_toefl",
  Cambridge: "test_cambridge",
  OET: "test_oet",
};

const MARITAL_STATUSES = ["Single", "Married", "De Facto", "Divorced", "Widowed"];

/**
 * English points from the four band scores. Every band must clear the
 * threshold, so the weakest band decides the result. Returns null when the
 * bands are incomplete — a partial test tells us nothing.
 */
function englishPoints(test: Record<string, unknown>): number | null {
  const bands = [test.listening, test.reading, test.writing, test.speaking];
  if (bands.some((b) => typeof b !== "number")) return null;

  const lowest = Math.min(...(bands as number[]));

  if (test.test_type === "PTE") {
    if (lowest >= 79) return 20; // Superior
    if (lowest >= 65) return 10; // Proficient
    return 0; // Competent
  }
  // IELTS and equivalents.
  if (lowest >= 8) return 20;
  if (lowest >= 7) return 10;
  return 0;
}

/** True when the stored value is absent or still at its column default. */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "" || value === 0;
}

/** Copies `candidate` onto `target[key]` only where the user has nothing there. */
function fillIfEmpty(
  target: Record<string, unknown>,
  existing: Record<string, unknown> | null,
  key: string,
  candidate: unknown,
  filled: string[],
  skipped: string[],
) {
  if (candidate === null || candidate === undefined) return;
  if (existing && !isEmpty(existing[key])) {
    skipped.push(key); // user already supplied this; leave it alone
    return;
  }
  target[key] = candidate;
  filled.push(key);
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    // This endpoint writes profile data, so it must not be open to the internet.
    if (!N8N_SHARED_SECRET) {
      console.error("N8N_SHARED_SECRET is not configured");
      return Response.json({ error: "Server is not configured" }, { status: 500 });
    }
    if (req.headers.get("X-Webhook-Secret") !== N8N_SHARED_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const cvId = body.cv_id;
    const profile = body.profile ?? {};

    if (!cvId) {
      return Response.json({ error: "cv_id is required" }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

    const { data: cv, error: cvError } = await supabase
      .from("cv_metadata")
      .select("id, user_id")
      .eq("id", cvId)
      .single();

    if (cvError || !cv) {
      return Response.json({ error: "CV not found" }, { status: 404 });
    }

    const userId = cv.user_id;
    const filled: string[] = [];
    const skipped: string[] = [];

    // Keep the raw extraction regardless of what gets applied, so the UI can
    // show its work and the user can accept the rest.
    await supabase
      .from("cv_metadata")
      .update({
        extracted_profile: profile,
        extraction_status: "extracted",
        extraction_error: null,
        extracted_at: new Date().toISOString(),
      })
      .eq("id", cvId);

    // ---- profile_basic -----------------------------------------------------
    const { data: basicRow } = await supabase
      .from("profile_basic")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const p = profile.personal ?? {};
    const basicUpdates: Record<string, unknown> = { id: userId, updated_at: new Date() };

    fillIfEmpty(basicUpdates, basicRow, "name", p.full_name, filled, skipped);
    fillIfEmpty(basicUpdates, basicRow, "email", p.email, filled, skipped);
    fillIfEmpty(basicUpdates, basicRow, "phone_no", p.phone, filled, skipped);
    fillIfEmpty(basicUpdates, basicRow, "country", p.country_of_residence, filled, skipped);
    if (p.date_of_birth && /^\d{4}-\d{2}-\d{2}$/.test(p.date_of_birth)) {
      fillIfEmpty(basicUpdates, basicRow, "dob", p.date_of_birth, filled, skipped);
    }
    if (MARITAL_STATUSES.includes(p.marital_status)) {
      fillIfEmpty(basicUpdates, basicRow, "marital_status", p.marital_status, filled, skipped);
    }

    if (Object.keys(basicUpdates).length > 2) {
      const { error } = await supabase.from("profile_basic").upsert(basicUpdates);
      if (error) console.error("profile_basic upsert failed:", error);
    }

    // ---- point_australia ---------------------------------------------------
    const { data: pointsRow } = await supabase
      .from("point_australia")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const q = profile.highest_qualification ?? {};
    const x = profile.experience ?? {};
    const af = profile.australian_factors ?? {};
    const pointUpdates: Record<string, unknown> = { id: userId, updated_at: new Date() };

    if (q.level && q.level in EDUCATION_POINTS) {
      fillIfEmpty(pointUpdates, pointsRow, "education", EDUCATION_POINTS[q.level], filled, skipped);
    }

    // YEARS, not points — see the note at the top of this file.
    if (isFiniteNumber(x.overseas_years)) {
      fillIfEmpty(
        pointUpdates, pointsRow, "overseasExp",
        Math.max(0, Math.floor(x.overseas_years)), filled, skipped,
      );
    }
    if (isFiniteNumber(x.australian_years)) {
      fillIfEmpty(
        pointUpdates, pointsRow, "ausExp",
        Math.max(0, Math.floor(x.australian_years)), filled, skipped,
      );
    }

    const test = profile.english_test ?? {};
    const english = englishPoints(test);
    if (english !== null) {
      fillIfEmpty(pointUpdates, pointsRow, "english", english, filled, skipped);
    }

    // Boolean flags are only ever turned on, never off.
    for (const [column, value] of [
      ["ausStudy", af.studied_in_australia],
      ["regionalStudy", af.studied_in_regional_australia],
      ["professionalYear", af.completed_professional_year],
      ["ccl", af.completed_ccl],
    ] as const) {
      if (value === true && !pointsRow?.[column]) {
        pointUpdates[column] = true;
        filled.push(column);
      }
    }

    // Occupation, if n8n resolved one against the anzsco tables.
    const occ = profile.occupation ?? null;
    if (occ?.occupation_code) {
      fillIfEmpty(pointUpdates, pointsRow, "experienceAnzsco", occ, filled, skipped);
    }

    if (Object.keys(pointUpdates).length > 2) {
      const { error } = await supabase.from("point_australia").upsert(pointUpdates);
      if (error) console.error("point_australia upsert failed:", error);
    }

    // ---- education ----------------------------------------------------------
    // This table now supports multiple rows per user (concurrent schema
    // change, see 20260806000001_update_education_table.sql — user_id +
    // generated id, no longer 1:1). CV extraction only inserts when the user
    // has NO education rows at all; if they've entered even one themselves,
    // that's their data to manage and this stays out of it entirely — same
    // "CV is evidence, not authority" rule as everywhere else in this file,
    // just applied at row-existence granularity instead of per-field.
    const { data: existingEducation } = await supabase
      .from("profile_education")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (!existingEducation || existingEducation.length === 0) {
      const eduCandidate: Record<string, unknown> = {};
      if (q.level && q.level in EDUCATION_POINTS) eduCandidate.level = q.level;
      if (q.field_of_study) eduCandidate.field_of_study = q.field_of_study;
      if (q.institution) eduCandidate.institution = q.institution;
      if (q.country) eduCandidate.country = q.country;
      if (isFiniteNumber(q.completed_year)) eduCandidate.completed_year = q.completed_year;

      if (Object.keys(eduCandidate).length > 0) {
        const { error } = await supabase.from("profile_education").insert({
          user_id: userId,
          updated_at: new Date(),
          ...eduCandidate,
        });
        if (error) console.error("education insert failed:", error);
        else filled.push("education");
      }
    } else {
      skipped.push("education");
    }

    // ---- English test scores ----------------------------------------------
    const testTable = typeof test.test_type === "string" ? TEST_TABLES[test.test_type] : null;
    if (testTable && isFiniteNumber(test.overall)) {
      const { data: existing } = await supabase
        .from(testTable)
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      // Only add a row when the user has no test of this type — never edit a
      // score they entered themselves.
      if (!existing || existing.length === 0) {
        const { error } = await supabase.from(testTable).insert({
          user_id: userId,
          listening: test.listening ?? null,
          reading: test.reading ?? null,
          writing: test.writing ?? null,
          speaking: test.speaking ?? null,
          overall: test.overall,
          test_date: test.test_date ?? null,
          updated_at: new Date(),
        });
        if (error) console.error(`${testTable} insert failed:`, error);
        else filled.push(`${test.test_type} scores`);
      } else {
        skipped.push(`${test.test_type} scores`);
      }
    }

    // ---- cv_llamaparsed (full audit record of everything this extraction found,
    // regardless of whether fillIfEmpty above actually applied each field —
    // this is a "what did we find" record, not just "what we applied") ------
    const eduPoints = q.level && q.level in EDUCATION_POINTS ? EDUCATION_POINTS[q.level] : null;
    const dobCandidate = typeof p.date_of_birth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date_of_birth)
      ? p.date_of_birth
      : null;
    const maritalCandidate = MARITAL_STATUSES.includes(p.marital_status) ? p.marital_status : null;

    const { error: llamaparsedError } = await supabase.from("cv_llamaparsed").upsert(
      {
        cv_id: cvId,
        user_id: userId,
        updated_at: new Date(),

        profile_basic_name: p.full_name ?? null,
        profile_basic_email: p.email ?? null,
        profile_basic_phone_no: p.phone ?? null,
        profile_basic_country: p.country_of_residence ?? null,
        profile_basic_dob: dobCandidate,
        profile_basic_marital_status: maritalCandidate,

        point_australia_education: eduPoints,
        point_australia_overseas_exp: isFiniteNumber(x.overseas_years) ? Math.max(0, Math.floor(x.overseas_years)) : null,
        point_australia_aus_exp: isFiniteNumber(x.australian_years) ? Math.max(0, Math.floor(x.australian_years)) : null,
        // english_test / australian_factors are no longer part of the
        // extraction schema (too consequential to let an LLM guess) — these
        // stay null unless some future caller of this endpoint sends them.
        point_australia_english: english,
        point_australia_aus_study: af.studied_in_australia ?? null,
        point_australia_regional_study: af.studied_in_regional_australia ?? null,
        point_australia_professional_year: af.completed_professional_year ?? null,
        point_australia_ccl: af.completed_ccl ?? null,
        point_australia_age: null,
        point_australia_specialist_edu: null,
        point_australia_partner_skills: null,
        point_australia_education_anzsco: null,
        point_australia_experience_anzsco: occ?.occupation_code ? occ : null,
        point_australia_spouse_details: null,
        point_australia_children_count: null,

        education_level: q.level ?? null,
        education_field_of_study: q.field_of_study ?? null,
        education_institution: q.institution ?? null,
        education_country: q.country ?? null,
        education_completed_year: isFiniteNumber(q.completed_year) ? q.completed_year : null,

        most_recent_job_title: x.most_recent_job_title ?? null,
        occupation_code: occ?.occupation_code ?? null,
        occupation_job_name: occ?.job_name ?? null,
        occupation_category: occ?.category ?? null,
        assumptions: profile.assumptions ?? [],
      },
      { onConflict: "cv_id" },
    );
    if (llamaparsedError) console.error("cv_llamaparsed upsert failed:", llamaparsedError);

    await supabase
      .from("cv_metadata")
      .update({ extraction_status: "applied" })
      .eq("id", cvId);

    return Response.json({
      success: true,
      filled,
      skipped, // fields the user had already filled in; left untouched
    });
  } catch (error) {
    console.error("apply-cv-profile error:", error);
    return Response.json({ error: String(error?.message ?? error) }, { status: 500 });
  }
});
