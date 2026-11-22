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
//   2. Scoring rules. Points are derived in the database (triggers on
//      profile_education, profile_experience and test_*; see migration
//      20261122000000_sync_points_from_profile), so callers only send facts.
//   3. Safety. A CV is evidence, not authority. This only fills fields the user
//      has left empty — it never overwrites something they typed, because doing
//      so would change their points score without them noticing.
//
// Writes profile_basic / profile_education / profile_experience (empty-fields-only;
// database triggers derive point_australia from the latter two), plus
// an unconditional cv_llamaparsed audit row recording every candidate value
// this extraction found — including ones skipped above because the user
// already had data there.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
// Admin key: the new secret API key (injected as SUPABASE_SECRET_KEYS, JSON
// {"default": "sb_secret_..."}), falling back to the legacy service_role JWT
// only while legacy keys are still enabled on the project.
function adminKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    if (typeof keys.default === "string" && keys.default) return keys.default;
  } catch {
    // fall through to the legacy key
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}
const SUPABASE_SERVICE_ROLE_KEY = adminKey();
const N8N_SHARED_SECRET = Deno.env.get("N8N_SHARED_SECRET");

// profile_education.level uses the Profile form's vocabulary, so an imported
// level shows up selected in the form instead of as a blank dropdown. The
// database trigger turns these into point_australia.education.
const PROFILE_EDUCATION_LEVEL: Record<string, string> = {
  none: "High School",
  diploma_or_trade: "Diploma",
  bachelor: "Bachelor",
  masters: "Masters",
  doctorate: "Doctorate",
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
    fillIfEmpty(basicUpdates, basicRow, "location", p.location, filled, skipped);
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

    // ---- profile_education ----------------------------------------------------------
    const q = profile.education ?? {};
    const { data: existingEducation } = await supabase
      .from("profile_education")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (!existingEducation || existingEducation.length === 0) {
      const eduCandidate: Record<string, unknown> = {};
      if (q.level && q.level in PROFILE_EDUCATION_LEVEL) eduCandidate.level = PROFILE_EDUCATION_LEVEL[q.level];
      if (q.field_of_study) eduCandidate.field_of_study = q.field_of_study;
      if (q.institution) eduCandidate.institution = q.institution;
      if (q.country) eduCandidate.country = q.country;
      if (q.start_date) eduCandidate.start_date = q.start_date;
      if (q.end_date) eduCandidate.end_date = q.end_date;
      if (q.university_name) eduCandidate.university_name = q.university_name;

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

    // ---- profile_experience ----------------------------------------------------------
    const x = profile.experience ?? {};
    const { data: existingExperience } = await supabase
      .from("profile_experience")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (!existingExperience || existingExperience.length === 0) {
      const expCandidate: Record<string, unknown> = {};
      if (x.company_name) expCandidate.company_name = x.company_name;
      if (x.role) expCandidate.role = x.role;
      if (x.country) expCandidate.country = x.country;
      if (x.start_date) expCandidate.start_date = x.start_date;
      if (x.end_date) expCandidate.end_date = x.end_date;

      // company_name, role, country and start_date are NOT NULL. Inserting a
      // partial row used to fail silently; leave it for the user to add instead.
      const complete = ["company_name", "role", "country", "start_date"].every((k) => expCandidate[k]);
      if (!complete) {
        if (Object.keys(expCandidate).length > 0) skipped.push("experience (incomplete in CV)");
      } else {
        const { error } = await supabase.from("profile_experience").insert({
          user_id: userId,
          created_at: new Date().toISOString(),
          ...expCandidate,
        });
        if (error) console.error("experience insert failed:", error);
        else filled.push("experience");
      }
    } else {
      skipped.push("experience");
    }

    // ---- cv_llamaparsed (full audit record) -------------------------------------------
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
        profile_basic_location: p.location ?? null,

        profile_education_level: q.level ?? null,
        profile_education_field_of_study: q.field_of_study ?? null,
        profile_education_institution: q.institution ?? null,
        profile_education_country: q.country ?? null,
        profile_education_start_date: q.start_date ?? null,
        profile_education_end_date: q.end_date ?? null,
        profile_education_university_name: q.university_name ?? null,

        profile_experience_company_name: x.company_name ?? null,
        profile_experience_role: x.role ?? null,
        profile_experience_country: x.country ?? null,
        profile_experience_start_date: x.start_date ?? null,
        profile_experience_end_date: x.end_date ?? null,
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
    return Response.json({ error: String((error as Error)?.message ?? error) }, { status: 500 });
  }
});
