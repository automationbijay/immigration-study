import os
import time
import json
from pathlib import Path
import requests
from dotenv import load_dotenv

load_dotenv()

FIXTURE_PDF = Path(__file__).parent / "fixtures" / "two-column-resume-template-blue.pdf"

API_KEY = os.environ.get("LLAMA_CLOUD_API_KEY")
if not API_KEY:
    raise SystemExit("LLAMA_CLOUD_API_KEY environment variable is required.")

PROJECT_ID = os.environ.get("LLAMA_CLOUD_PROJECT_ID")
if not PROJECT_ID:
    raise SystemExit("LLAMA_CLOUD_PROJECT_ID environment variable is required.")

BASE_URL = "https://api.cloud.llamaindex.ai"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

NOT_STATED = "Return null (not an empty string, not 0, not a guessed default) for any field that is not explicitly and unambiguously stated in the CV text. Never fill in what would merely be a common or default value."

def nullable(schema, description=None):
    out = {**schema, "type": [schema["type"], "null"]}
    if description:
        out["description"] = description
    return out

# Keep in sync with supabase/functions/extract-cv/index.ts
CV_DATA_SCHEMA = {
    "type": "object",
    "properties": {
        "personal": {
            "type": "object",
            "description": "Identity and contact details exactly as printed on the CV.",
            "properties": {
                "full_name": nullable({"type": "string"}, "The candidate's full name as printed on the CV."),
                "email": nullable({"type": "string"}, "Contact email address, if listed."),
                "phone": nullable({"type": "string"}, "Contact phone number, including country code if shown."),
                "date_of_birth": nullable(
                    {"type": "string"},
                    f"Date of birth as YYYY-MM-DD, ONLY if explicitly printed on the CV. CVs rarely state this - never infer it from age, graduation year, or photo. {NOT_STATED}",
                ),
                "country_of_residence": nullable({"type": "string"}, "Country the candidate currently lives in, if stated."),
                "marital_status": nullable(
                    {"type": "string", "enum": ["Single", "Married", "De Facto", "Divorced", "Widowed"]},
                    f"Only if explicitly stated on the CV - most CVs do not include this. {NOT_STATED}",
                ),
            },
        },
        "highest_qualification": {
            "type": "object",
            "description": "The single highest COMPLETED educational qualification. Ignore study that is in progress or unfinished.",
            "properties": {
                "level": nullable(
                    {"type": "string", "enum": ["none", "diploma_or_trade", "bachelor", "masters", "doctorate"]},
                    "Highest level of education completed. Use 'diploma_or_trade' for vocational/trade certificates and diplomas below bachelor level.",
                ),
                "field_of_study": nullable({"type": "string"}),
                "institution": nullable({"type": "string"}),
                "country": nullable({"type": "string"}, "Country where the institution is located."),
                "completed_year": nullable({"type": "integer"}, f"4-digit year the qualification was awarded or completed. {NOT_STATED}"),
            },
        },
        "experience": {
            "type": "object",
            "properties": {
                "overseas_years": nullable(
                    {"type": "number"},
                    f"Total years of professional work experience OUTSIDE Australia, summed across all roles, as a number of years not months. Sum from the roles' date ranges; count overlapping roles once; treat 'Present'/'Current' as today's date; round down to whole years. Exclude internships, unpaid work, and full-time study. {NOT_STATED}",
                ),
                "australian_years": nullable(
                    {"type": "number"},
                    f"Same calculation as overseas_years, but only for roles explicitly located in Australia, as a number of years not months. {NOT_STATED}",
                ),
                "most_recent_job_title": nullable({"type": "string"}),
            },
        },
        # english_test and australian_factors were removed deliberately - they
        # exist ONLY to feed the Australia points calculation, and that data is
        # too consequential to let an LLM guess from CV text. Users enter it
        # manually through the app's own forms instead.
        "occupation": {
            "type": "object",
            "properties": {
                "occupation_code": nullable({"type": "string"}, f"ANZSCO occupation code, ONLY if you can confidently match the candidate's primary/most recent occupation to a specific code from the description of their role. {NOT_STATED}"),
                "job_name": nullable({"type": "string"}),
                "category": nullable({"type": "string"}),
            },
        },
        "assumptions": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Free-text notes on anything inferred rather than read verbatim (e.g. 'summed 3 overlapping contract roles as 2 years of overseas experience'). Leave empty if nothing was inferred.",
        },
    },
}


def main():
    print("1. Uploading file...")
    with open(FIXTURE_PDF, "rb") as f:
        upload_res = requests.post(
            f"{BASE_URL}/api/v1/beta/files",
            headers=HEADERS,
            files={"file": f},
            data={"purpose": "extract"},
        )
    print(upload_res.status_code, upload_res.text[:500])
    upload_res.raise_for_status()
    file_id = upload_res.json()["id"]
    print(f"File ID: {file_id}")

    print("\n2. Creating extraction job...")
    job_res = requests.post(
        f"{BASE_URL}/api/v2/extract",
        params={"project_id": PROJECT_ID},
        headers={**HEADERS, "Content-Type": "application/json"},
        json={
            "file_input": file_id,
            "configuration": {
                "tier": "agentic",
                "extraction_target": "per_doc",
                "data_schema": CV_DATA_SCHEMA,
                "cite_sources": False,
                "confidence_scores": False,
            },
        },
    )
    print(job_res.status_code, job_res.text[:1000])
    job_res.raise_for_status()
    job_id = job_res.json()["id"]
    print(f"Job ID: {job_id}")

    print("\n3. Polling...")
    start = time.time()
    status = None
    result = None
    for _ in range(60):
        time.sleep(2)
        poll_res = requests.get(
            f"{BASE_URL}/api/v2/extract/{job_id}",
            params={"project_id": PROJECT_ID},
            headers=HEADERS,
        )
        data = poll_res.json()
        status = data.get("status")
        elapsed = time.time() - start
        print(f"  [{elapsed:5.1f}s] status={status}")
        if status == "COMPLETED":
            result = data.get("extract_result") or data.get("data") or data
            break
        if status in ("FAILED", "ERROR"):
            print("Full response:", json.dumps(data, indent=2))
            break

    if result:
        print(f"\n[OK] Completed in {time.time() - start:.1f}s")
        print(json.dumps(result, indent=2))
    else:
        print(f"\n[FAIL] status={status}")


if __name__ == "__main__":
    main()
