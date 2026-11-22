# CV pipeline

How an uploaded CV becomes profile data and, from there, a points estimate.

> The filename is historical. The pipeline no longer uses n8n: `extract-cv`
> calls LlamaCloud's LlamaExtract directly and hands the result to
> `apply-cv-profile`.

```
web-app (CvUploadModal)
   │  supabase.functions.invoke('upload-cv')
   ▼
upload-cv (edge fn)
   │  stores the PDF in the private cv-uploads bucket (replaces any older CV)
   │  inserts a cv_metadata row
   ▼
DB triggers on cv_metadata (AFTER INSERT)
   ├─▶ parse-cv   (edge fn) LlamaParse → markdown, kept for audit/re-runs
   └─▶ extract-cv (edge fn) LlamaExtract → structured JSON (schema below)
                     │  extraction_status: processing → extracted | failed
                     ▼
               apply-cv-profile (edge fn, X-Webhook-Secret)
                     │  fills EMPTY fields only, never overwrites the user
                     ├─▶ profile_basic       (name, email, phone, country, location, dob, marital status)
                     ├─▶ profile_education   (only if the user has none yet)
                     ├─▶ profile_experience  (only if the user has none yet and the CV gives
                     │                        company, role, country and start date)
                     └─▶ cv_llamaparsed      (full audit copy of every candidate value)
                     │  extraction_status: applied
                     ▼
DB triggers (migration 20261122000000_sync_points_from_profile)
   profile_education  → point_australia.education       (points)
   profile_experience → point_australia."overseasExp"   (years in the last 10)
                        point_australia."ausExp"
   test_*             → point_australia.english         (points)
```

After the import the app asks only for what is still missing. The dashboard's
"Continue your profile" prompt and checklist point the user to each gap
(date of birth, occupation, English test, and so on).

## Secrets

```bash
supabase secrets set LLAMA_CLOUD_API_KEY=<key>
supabase secrets set LLAMA_CLOUD_PROJECT_ID=<project id>
supabase secrets set N8N_SHARED_SECRET=<random string>   # name is historical
```

`N8N_SHARED_SECRET` authenticates `extract-cv` → `apply-cv-profile`
(`X-Webhook-Secret` header). Without it `apply-cv-profile` refuses every
request. It writes profile data, so it cannot be open to the internet.

## Extraction schema (`extract-cv` → `apply-cv-profile`)

`POST /functions/v1/apply-cv-profile` with `X-Webhook-Secret`:

```json
{
  "cv_id": "uuid",
  "profile": {
    "personal": {
      "full_name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+61 400 000 000",
      "date_of_birth": "1994-03-12",
      "country_of_residence": "India",
      "marital_status": "Single",
      "location": "Pune"
    },
    "education": {
      "level": "bachelor",
      "field_of_study": "Computer Science",
      "institution": "…",
      "university_name": "…",
      "country": "India",
      "start_date": "2012-07-01",
      "end_date": "2016-05-31"
    },
    "experience": {
      "company_name": "Acme",
      "role": "Software Engineer",
      "country": "India",
      "start_date": "2018-01-01",
      "end_date": null
    },
    "assumptions": ["Start date month inferred from 'early 2018'"]
  }
}
```

Every field is nullable. LlamaExtract is instructed to return `null` rather than
guess. A wrong date of birth changes the points total, while a `null` only
costs the user one question.

| Field | Accepted values | Stored as |
|---|---|---|
| `personal.marital_status` | `Single`, `Married`, `De Facto`, `Divorced`, `Widowed` | same |
| `education.level` | `none`, `diploma_or_trade`, `bachelor`, `masters`, `doctorate` | `High School`, `Diploma`, `Bachelor`, `Masters`, `Doctorate` (the Profile form's values) |

Anything outside these is ignored rather than written.

Response:

```json
{ "success": true, "filled": ["name", "education"], "skipped": ["email", "experience (incomplete in CV)"] }
```

`skipped` lists fields the user had already filled in, plus sections the CV
couldn't complete.

## Rules worth knowing

- **Fills empty fields only.** A CV is evidence, not authority. Nothing the user
  typed is overwritten. The raw extraction is kept in
  `cv_metadata.extracted_profile` and `cv_llamaparsed` regardless.
- **Points are derived in the database, not here.** `apply-cv-profile` writes
  facts (levels, dates, countries); the triggers turn them into points and
  years. A caller can never write points into a years column.
- **Experience counts distinct days in the last 10 years**, split by whether the
  job's country is Australia, so overlapping jobs are not double-counted.
  Qualifications with a future end date score 0 until completed.
- **The points test only counts work in the nominated occupation at 20+ hours
  a week.** The app can't verify that, so imported years are an upper bound
  the user should review.

## Retrying one CV

Re-run extraction for a stored CV by invoking `extract-cv` with its
`cv_metadata` record, or post a corrected payload straight to
`apply-cv-profile`:

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/apply-cv-profile" \
  -H "X-Webhook-Secret: $N8N_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"cv_id":"<uuid>","profile":{...}}'
```
