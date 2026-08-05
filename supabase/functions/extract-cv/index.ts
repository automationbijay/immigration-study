// Turns a parsed CV's markdown into structured profile fields.
//
// parse-cv gets us text (LlamaParse does layout/OCR, not extraction). This
// function is the step that reads that text and produces the fields the points
// calculator actually needs, then fills the EMPTY parts of the user's profile.
//
// It never overwrites a value the user entered themselves: a CV is evidence,
// not authority, and silently replacing a hand-entered date of birth would
// change someone's points score without them knowing. Everything extracted is
// stored on cv_metadata.extracted_profile so the UI can show its work.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Anthropic from "npm:@anthropic-ai/sdk";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

/** `anyOf` is the structured-outputs-supported way to express a nullable field. */
const nullable = (schema: Record<string, unknown>) => ({
  anyOf: [schema, { type: "null" }],
});

const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const CV_SCHEMA = obj({
  personal: obj({
    full_name: nullable({ type: "string" }),
    email: nullable({ type: "string" }),
    phone: nullable({ type: "string" }),
    date_of_birth: nullable({ type: "string", format: "date" }),
    country_of_residence: nullable({ type: "string" }),
    marital_status: nullable({
      type: "string",
      enum: ["Single", "Married", "De Facto", "Divorced", "Widowed"],
    }),
  }),

  highest_qualification: obj({
    level: nullable({
      type: "string",
      enum: ["none", "diploma_or_trade", "bachelor", "masters", "doctorate"],
    }),
    field_of_study: nullable({ type: "string" }),
    institution: nullable({ type: "string" }),
    country: nullable({ type: "string" }),
    completed_year: nullable({ type: "integer" }),
  }),

  experience: obj({
    // Whole years of skilled work, counted from the dates on the CV. Roles that
    // overlap in time are counted once.
    overseas_years: nullable({ type: "number" }),
    australian_years: nullable({ type: "number" }),
    most_recent_job_title: nullable({ type: "string" }),
  }),

  english_test: obj({
    test_type: nullable({
      type: "string",
      enum: ["IELTS", "PTE", "TOEFL", "Cambridge", "OET"],
    }),
    listening: nullable({ type: "number" }),
    reading: nullable({ type: "number" }),
    writing: nullable({ type: "number" }),
    speaking: nullable({ type: "number" }),
    overall: nullable({ type: "number" }),
    test_date: nullable({ type: "string", format: "date" }),
  }),

  australian_factors: obj({
    studied_in_australia: { type: "boolean" },
    studied_in_regional_australia: { type: "boolean" },
    completed_professional_year: { type: "boolean" },
  }),

  // Anything inferred rather than stated, so the UI can flag it for review.
  assumptions: { type: "array", items: { type: "string" } },
});

const SYSTEM_PROMPT = `You extract structured facts from a CV for an Australian skilled-migration points calculator.

Extract only what the document supports. Use null for anything absent — never guess a date of birth, a test score, or a country. A wrong value here changes someone's visa eligibility, so an omission is much better than an invention.

For experience years: add up skilled professional roles from their date ranges, counting overlapping roles once and treating "Present" as today. Classify a role as Australian only when the location says so. Round down to whole years. Exclude internships and unrelated casual work.

For qualification level, take the highest completed one only.

List anything you inferred rather than read directly in "assumptions" — for example working a date range out of partial dates, or judging a role to be skilled.`;

/** Highest-qualification level -> points on the Australian points test. */
const EDUCATION_POINTS: Record<string, number> = {
  none: 0,
  diploma_or_trade: 10,
  bachelor: 15,
  masters: 15,
  doctorate: 20,
};

/**
 * English points from the four band scores. Every band must clear the
 * threshold, so the weakest band decides the outcome.
 */
function englishPoints(test: Record<string, number | null>): number | null {
  const bands = [test.listening, test.reading, test.writing, test.speaking];
  if (bands.some((b) => typeof b !== "number")) return null;

  const lowest = Math.min(...(bands as number[]));
  const type = test.test_type as unknown as string;

  if (type === "PTE") {
    if (lowest >= 79) return 20; // Superior
    if (lowest >= 65) return 10; // Proficient
    return 0; // Competent or below
  }
  // IELTS and equivalents.
  if (lowest >= 8) return 20;
  if (lowest >= 7) return 10;
  return 0;
}

const TEST_TABLES: Record<string, string> = {
  IELTS: "test_ielts",
  PTE: "test_pte",
  TOEFL: "test_toefl",
  Cambridge: "test_cambridge",
  OET: "test_oet",
};

/** True when the stored value is absent or still at its default. */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "" || value === 0;
}

/** Copies `candidate` onto `target[key]` only where the user has nothing. */
function fillIfEmpty(
  target: Record<string, unknown>,
  existing: Record<string, unknown> | null,
  key: string,
  candidate: unknown,
  filled: string[],
) {
  if (candidate === null || candidate === undefined) return;
  if (existing && !isEmpty(existing[key])) return;
  target[key] = candidate;
  filled.push(key);
}

serve(async (req) => {
  try {
    if (!ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const payload = await req.json();
    // Accepts either a direct { cv_id } call or a database webhook envelope.
    const cvId = payload.cv_id ?? payload.record?.id;
    if (!cvId) {
      return Response.json({ error: "cv_id is required" }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

    const { data: cv, error: cvError } = await supabase
      .from("cv_metadata")
      .select("id, user_id, parsed_data, is_parsed")
      .eq("id", cvId)
      .single();

    if (cvError || !cv) {
      return Response.json({ error: "CV not found" }, { status: 404 });
    }

    const markdown = cv.parsed_data?.markdown_full;
    if (!cv.is_parsed || !markdown) {
      return Response.json({ error: "CV text is not ready yet" }, { status: 409 });
    }

    // ---- Extract -----------------------------------------------------------
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    let extracted;
    try {
      const message = await anthropic.messages.create({
        model: "claude-opus-5",
        max_tokens: 16000,
        // Reading dates off a CV and reconciling overlapping roles is genuine
        // reasoning; medium keeps it accurate without the xhigh token cost.
        output_config: {
          effort: "medium",
          format: { type: "json_schema", schema: CV_SCHEMA },
        },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: markdown }],
      });

      if (message.stop_reason === "refusal") {
        throw new Error("Extraction was declined by safety classifiers");
      }

      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content returned");
      }
      extracted = JSON.parse(textBlock.text);
    } catch (err) {
      console.error("Extraction failed:", err);
      await supabase
        .from("cv_metadata")
        .update({
          extraction_status: "failed",
          extraction_error: String(err?.message ?? err),
        })
        .eq("id", cvId);
      return Response.json({ error: "Extraction failed" }, { status: 500 });
    }

    await supabase
      .from("cv_metadata")
      .update({
        extracted_profile: extracted,
        extraction_status: "extracted",
        extraction_error: null,
        extracted_at: new Date().toISOString(),
      })
      .eq("id", cvId);

    // ---- Apply to empty profile fields only --------------------------------
    const userId = cv.user_id;
    const filled: string[] = [];

    const { data: basicRow } = await supabase
      .from("profile_basic")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const basicUpdates: Record<string, unknown> = { id: userId, updated_at: new Date() };
    const p = extracted.personal ?? {};
    fillIfEmpty(basicUpdates, basicRow, "name", p.full_name, filled);
    fillIfEmpty(basicUpdates, basicRow, "email", p.email, filled);
    fillIfEmpty(basicUpdates, basicRow, "phone_no", p.phone, filled);
    fillIfEmpty(basicUpdates, basicRow, "dob", p.date_of_birth, filled);
    fillIfEmpty(basicUpdates, basicRow, "country", p.country_of_residence, filled);
    fillIfEmpty(basicUpdates, basicRow, "marital_status", p.marital_status, filled);

    if (Object.keys(basicUpdates).length > 2) {
      await supabase.from("profile_basic").upsert(basicUpdates);
    }

    const { data: pointsRow } = await supabase
      .from("point_australia")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const pointUpdates: Record<string, unknown> = { id: userId, updated_at: new Date() };
    const q = extracted.highest_qualification ?? {};
    const x = extracted.experience ?? {};
    const af = extracted.australian_factors ?? {};

    if (q.level) {
      fillIfEmpty(pointUpdates, pointsRow, "education", EDUCATION_POINTS[q.level], filled);
    }
    // Years, not points — Profile and the calculator both read these as years.
    if (typeof x.overseas_years === "number") {
      fillIfEmpty(pointUpdates, pointsRow, "overseasExp", Math.floor(x.overseas_years), filled);
    }
    if (typeof x.australian_years === "number") {
      fillIfEmpty(pointUpdates, pointsRow, "ausExp", Math.floor(x.australian_years), filled);
    }

    const english = englishPoints(extracted.english_test ?? {});
    if (english !== null) {
      fillIfEmpty(pointUpdates, pointsRow, "english", english, filled);
    }

    // Boolean flags: only ever turn one on, never off.
    for (const [key, value] of [
      ["ausStudy", af.studied_in_australia],
      ["regionalStudy", af.studied_in_regional_australia],
      ["professionalYear", af.completed_professional_year],
    ] as const) {
      if (value === true && !pointsRow?.[key]) {
        pointUpdates[key] = true;
        filled.push(key);
      }
    }

    if (Object.keys(pointUpdates).length > 2) {
      await supabase.from("point_australia").upsert(pointUpdates);
    }

    // ---- English test scores ----------------------------------------------
    const test = extracted.english_test ?? {};
    const testTable = test.test_type ? TEST_TABLES[test.test_type] : null;
    if (testTable && typeof test.overall === "number") {
      const { data: existingTests } = await supabase
        .from(testTable)
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      // Only add a test row when the user has none — never edit a score they entered.
      if (!existingTests || existingTests.length === 0) {
        await supabase.from(testTable).insert({
          user_id: userId,
          listening: test.listening,
          reading: test.reading,
          writing: test.writing,
          speaking: test.speaking,
          overall: test.overall,
          test_date: test.test_date,
          updated_at: new Date(),
        });
        filled.push(`${test.test_type} scores`);
      }
    }

    await supabase
      .from("cv_metadata")
      .update({ extraction_status: "applied" })
      .eq("id", cvId);

    return Response.json({
      success: true,
      filled,
      assumptions: extracted.assumptions ?? [],
      extracted,
    });
  } catch (error) {
    console.error("extract-cv error:", error);
    return Response.json({ error: String(error?.message ?? error) }, { status: 500 });
  }
});
