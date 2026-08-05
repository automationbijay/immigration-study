// Write-back endpoint for the n8n CV workflow.
//
// Flow: upload-cv -> cv_metadata insert -> parse-cv (LlamaCloud -> markdown)
//       -> n8n webhook (extraction) -> THIS FUNCTION (mapping + write)
//
// Why n8n posts here instead of writing to the tables directly:
//
//   1. Units. `overseasExp` and `ausExp` store YEARS. Several parts of the app
//      score them into points, and a workflow that writes points into those
//      columns silently inflates or deflates every visa match. This endpoint
//      takes `overseas_years` / `australian_years` so the unit is unambiguous
//      and the conversion lives in one place.
//   2. Scoring rules. Education level and English band thresholds map to points
//      by rules that change with policy. Keeping them here means one edit, not
//      an n8n node rebuild.
//   3. Safety. A CV is evidence, not authority. This only fills fields the user
//      has left empty — it never overwrites something they typed, because doing
//      so would change their points score without them noticing.

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
