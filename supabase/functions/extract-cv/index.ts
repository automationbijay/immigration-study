import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// Structured extraction, direct from the PDF, via LlamaCloud's LlamaExtract —
// no markdown middle-step, no external LLM-guessing workflow. Dispatched by
// its own DB trigger (extract_cv_webhook_trigger), independent of parse-cv's
// trigger — the two run as separate function invocations, not chained, so
// LlamaParse's and LlamaExtract's polling loops never compound into one
// request's timeout budget.
const LLAMA_CLOUD_API_KEY = Deno.env.get("LLAMA_CLOUD_API_KEY")
const LLAMA_CLOUD_PROJECT_ID = Deno.env.get("LLAMA_CLOUD_PROJECT_ID")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
// Shared secret apply-cv-profile already checks (X-Webhook-Secret). Kept
// under its original name even though the caller is no longer n8n, so
// apply-cv-profile's auth code needs zero changes.
const N8N_SHARED_SECRET = Deno.env.get("N8N_SHARED_SECRET")

const LLAMA_BASE_URL = "https://api.cloud.llamaindex.ai"
const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 45 // ~90s — comfortably above the 21-49s observed for a one-page resume on the "agentic" tier

// Every field is nullable and the "not stated" instruction is repeated per
// field: schema-validated in test_llamaextract_rest.py against real output —
// without this, LlamaExtract fills absent fields with "" / 0 / a plausible
// default (e.g. marital_status: "Single") instead of omitting them, which
// would slip past apply-cv-profile's `candidate === null` check and write
// garbage into real columns.
const NOT_STATED =
  "Return null (not an empty string, not 0, not a guessed default) for any field that is not explicitly and unambiguously stated in the CV text. Never fill in what would merely be a common or default value."

function nullable(schema: Record<string, unknown>, description?: string) {
  return {
    ...schema,
    type: [schema.type, "null"],
    ...(description ? { description } : {}),
  }
}

const CV_DATA_SCHEMA = {
  type: "object",
  properties: {
    personal: {
      type: "object",
      description: "Identity and contact details exactly as printed on the CV.",
      properties: {
        full_name: nullable({ type: "string" }, "The candidate's full name as printed on the CV."),
        email: nullable({ type: "string" }, "Contact email address, if listed."),
        phone: nullable({ type: "string" }, "Contact phone number, including country code if shown."),
        date_of_birth: nullable(
          { type: "string" },
          `Date of birth as YYYY-MM-DD, ONLY if explicitly printed on the CV. CVs rarely state this — never infer it from age, graduation year, or photo. ${NOT_STATED}`,
        ),
        country_of_residence: nullable({ type: "string" }, "Country the candidate currently lives in, if stated."),
        marital_status: nullable(
          { type: "string", enum: ["Single", "Married", "De Facto", "Divorced", "Widowed"] },
          `Only if explicitly stated on the CV — most CVs do not include this. ${NOT_STATED}`,
        ),
      },
    },
    highest_qualification: {
      type: "object",
      description: "The single highest COMPLETED educational qualification. Ignore study that is in progress or unfinished.",
      properties: {
        level: nullable(
          { type: "string", enum: ["none", "diploma_or_trade", "bachelor", "masters", "doctorate"] },
          "Highest level of education completed. Use 'diploma_or_trade' for vocational/trade certificates and diplomas below bachelor level.",
        ),
        field_of_study: nullable({ type: "string" }),
        institution: nullable({ type: "string" }),
        country: nullable({ type: "string" }, "Country where the institution is located."),
        completed_year: nullable({ type: "integer" }, `4-digit year the qualification was awarded or completed. ${NOT_STATED}`),
      },
    },
    experience: {
      type: "object",
      properties: {
        overseas_years: nullable(
          { type: "number" },
          `Total years of professional work experience OUTSIDE Australia, summed across all roles, as a number of years not months. Sum from the roles' date ranges; count overlapping roles once; treat 'Present'/'Current' as today's date; round down to whole years. Exclude internships, unpaid work, and full-time study. ${NOT_STATED}`,
        ),
        australian_years: nullable(
          { type: "number" },
          `Same calculation as overseas_years, but only for roles explicitly located in Australia, as a number of years not months. ${NOT_STATED}`,
        ),
        most_recent_job_title: nullable({ type: "string" }),
      },
    },
    english_test: {
      type: "object",
      description:
        "Scores from ONE English proficiency test only (IELTS, PTE, TOEFL, Cambridge, or OET), only if printed on the CV. Never compute, average, or estimate a score — report only what is explicitly written.",
      properties: {
        test_type: nullable({ type: "string", enum: ["IELTS", "PTE", "TOEFL", "Cambridge", "OET"] }, NOT_STATED),
        listening: nullable({ type: "number" }, NOT_STATED),
        reading: nullable({ type: "number" }, NOT_STATED),
        writing: nullable({ type: "number" }, NOT_STATED),
        speaking: nullable({ type: "number" }, NOT_STATED),
        overall: nullable({ type: "number" }, `The overall/composite band score. ${NOT_STATED}`),
        test_date: nullable({ type: "string" }, "Date the test was taken, as YYYY-MM-DD, or YYYY alone if only the year is shown."),
      },
    },
    australian_factors: {
      type: "object",
      description:
        "Booleans based only on explicit evidence in the CV text. Leave false if not mentioned — absence of a mention is not proof it didn't happen, and this data is only ever used to turn things ON, never off.",
      properties: {
        studied_in_australia: { type: "boolean", description: "True only if a listed qualification was completed at an institution physically in Australia." },
        studied_in_regional_australia: {
          type: "boolean",
          description:
            "True only if that Australian institution's campus is explicitly in a designated regional area (i.e. not one of the major metro areas: Sydney, Melbourne, Brisbane, Perth, Adelaide, Gold Coast).",
        },
        completed_professional_year: {
          type: "boolean",
          description: "True only if the CV explicitly mentions completing a 12-month Professional Year internship program in Australia after graduating from an Australian institution.",
        },
        completed_ccl: {
          type: "boolean",
          description: "True only if the CV explicitly mentions passing the official NAATI Credentialled Community Language (CCL) interpreting/translating exam.",
        },
      },
    },
    occupation: {
      type: "object",
      properties: {
        occupation_code: nullable(
          { type: "string" },
          `ANZSCO occupation code, ONLY if you can confidently match the candidate's primary/most recent occupation to a specific code from the description of their role. ${NOT_STATED}`,
        ),
        job_name: nullable({ type: "string" }),
        category: nullable({ type: "string" }),
      },
    },
    assumptions: {
      type: "array",
      items: { type: "string" },
      description:
        "Free-text notes on anything inferred rather than read verbatim (e.g. 'summed 3 overlapping contract roles as 2 years of overseas experience'). Leave empty if nothing was inferred.",
    },
  },
}

serve(async (req) => {
  try {
    if (!LLAMA_CLOUD_API_KEY || !LLAMA_CLOUD_PROJECT_ID) {
      console.error("LLAMA_CLOUD_API_KEY / LLAMA_CLOUD_PROJECT_ID is not configured")
      return new Response("LlamaCloud is not configured", { status: 500 })
    }

    const payload = await req.json()
    const { record, type } = payload

    if (type !== 'INSERT' || !record) {
      return new Response("Not an INSERT event", { status: 200 })
    }

    const cvId = record.id
    let cvUrl = record.file_url

    if (!cvUrl) {
      console.log("No file URL found in record")
      return new Response("No file URL", { status: 400 })
    }

    const supabaseAdmin = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_ROLE_KEY || "")

    // Same signed-URL resolution as parse-cv (duplicated deliberately — each
    // edge function in this repo is self-contained, no shared lib).
    if (cvUrl.includes('/storage/v1/object/')) {
      const urlParts = cvUrl.split('/cv-uploads/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0]
        const { data } = await supabaseAdmin.storage.from('cv-uploads').createSignedUrl(decodeURIComponent(filePath), 3600)
        if (data?.signedUrl) cvUrl = data.signedUrl
      }
    } else if (!cvUrl.startsWith('http')) {
      const { data } = await supabaseAdmin.storage.from('cv-uploads').createSignedUrl(cvUrl, 3600)
      if (data?.signedUrl) cvUrl = data.signedUrl
    }

    const fileRes = await fetch(cvUrl)
    if (!fileRes.ok) {
      console.error("Failed to fetch file from storage", fileRes.statusText)
      return new Response("Failed to fetch file", { status: 500 })
    }
    const fileBlob = await fileRes.blob()

    // 1. Upload to LlamaCloud's file store for extraction.
    const uploadForm = new FormData()
    uploadForm.append("file", fileBlob, record.file_name || "cv.pdf")
    uploadForm.append("purpose", "extract")

    const fileRes2 = await fetch(`${LLAMA_BASE_URL}/api/v1/beta/files`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${LLAMA_CLOUD_API_KEY}` },
      body: uploadForm,
    })
    if (!fileRes2.ok) {
      const err = await fileRes2.text()
      console.error("Failed to upload to LlamaCloud:", err)
      await supabaseAdmin.from("cv_metadata")
        .update({ extraction_status: "failed", extraction_error: "LlamaCloud file upload failed" })
        .eq("id", cvId)
      return new Response("Failed to upload to LlamaCloud", { status: 500 })
    }
    const { id: fileId } = await fileRes2.json()

    // 2. Create the extraction job.
    const jobRes = await fetch(`${LLAMA_BASE_URL}/api/v2/extract?project_id=${LLAMA_CLOUD_PROJECT_ID}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LLAMA_CLOUD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_input: fileId,
        configuration: {
          tier: "agentic",
          extraction_target: "per_doc",
          data_schema: CV_DATA_SCHEMA,
          cite_sources: false,
          confidence_scores: false,
        },
      }),
    })
    if (!jobRes.ok) {
      const err = await jobRes.text()
      console.error("Failed to create extraction job:", err)
      await supabaseAdmin.from("cv_metadata")
        .update({ extraction_status: "failed", extraction_error: "LlamaExtract job creation failed" })
        .eq("id", cvId)
      return new Response("Failed to create extraction job", { status: 500 })
    }
    const { id: jobId } = await jobRes.json()
    console.log("LlamaExtract job ID:", jobId)

    // Record the job before polling, so a mid-poll crash still leaves
    // something to resume from instead of nothing.
    await supabaseAdmin.from("cv_metadata")
      .update({ extracted_profile: { file_id: fileId, job_id: jobId }, extraction_status: "processing" })
      .eq("id", cvId)

    // 3. Poll for completion.
    let extractResult: Record<string, unknown> | null = null
    let terminal = false
    let attempts = 0

    while (!terminal && attempts < MAX_POLL_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      attempts++
      const pollRes = await fetch(`${LLAMA_BASE_URL}/api/v2/extract/${jobId}?project_id=${LLAMA_CLOUD_PROJECT_ID}`, {
        headers: { "Authorization": `Bearer ${LLAMA_CLOUD_API_KEY}` },
      })
      const pollData = await pollRes.json()
      console.log(`LlamaExtract job status: ${pollData.status}`)

      if (pollData.status === "COMPLETED") {
        extractResult = pollData.extract_result
        terminal = true
      } else if (pollData.status === "FAILED" || pollData.status === "ERROR") {
        await supabaseAdmin.from("cv_metadata")
          .update({ extraction_status: "failed", extraction_error: `LlamaExtract job ${pollData.status}` })
          .eq("id", cvId)
        return new Response("Extraction failed", { status: 200 })
      }
    }

    if (!terminal) {
      // Still running when our budget ran out. job_id is already saved
      // above, so this can be resumed by polling again — no need to re-pay
      // for a new extraction.
      console.warn(`LlamaExtract job ${jobId} still running after ${MAX_POLL_ATTEMPTS} polls`)
      return new Response(JSON.stringify({ success: true, jobId, stillRunning: true }), { status: 202 })
    }

    // 4. Save the structured result.
    await supabaseAdmin.from("cv_metadata")
      .update({ extracted_profile: { file_id: fileId, job_id: jobId, extract_result: extractResult } })
      .eq("id", cvId)

    // 5. Hand off to apply-cv-profile directly — no n8n. Same in-process
    // invocation pattern this repo already used once before (the original
    // extract-cv, removed in 47fa801, called this way too).
    const { error: applyError } = await supabaseAdmin.functions.invoke("apply-cv-profile", {
      body: { cv_id: cvId, profile: extractResult },
      headers: { "X-Webhook-Secret": N8N_SHARED_SECRET ?? "" },
    })

    if (applyError) {
      console.error("apply-cv-profile invocation failed:", applyError)
      await supabaseAdmin.from("cv_metadata")
        .update({ extraction_status: "failed", extraction_error: String(applyError.message ?? applyError) })
        .eq("id", cvId)
    }
    // On success, apply-cv-profile itself sets extraction_status to
    // 'extracted' then 'applied' — nothing left to do here.

    return new Response(JSON.stringify({ success: true, jobId }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Error processing extract-cv webhook:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
})
