# CV pipeline — LlamaCloud + n8n

How an uploaded CV becomes profile data.

```
web-app  ──upload──▶  upload-cv (edge fn)
                          │  writes file to cv-uploads bucket
                          │  inserts cv_metadata row
                          ▼
                     DB trigger  ──▶  parse-cv (edge fn)
                                          │  LlamaCloud → markdown
                                          │  saves parsed_data.markdown_full
                                          │  status = processing
                                          ▼
                                     n8n webhook  (extraction)
                                          │
                                          ▼
                                     apply-cv-profile (edge fn)
                                          │  maps + fills empty fields only
                                          ▼
                                profile_basic · point_australia · test_*
```

## Secrets to set

```bash
supabase secrets set LLAMA_CLOUD_API_KEY=<rotate this — the old one leaked>
supabase secrets set N8N_CV_WEBHOOK_URL=https://<your-n8n>/webhook/cv-parsed
supabase secrets set N8N_SHARED_SECRET=<random string>
```

`N8N_SHARED_SECRET` authenticates both directions: parse-cv sends it to n8n as
`X-Webhook-Secret`, and n8n must send the same header back to
`apply-cv-profile`. Without it that endpoint refuses every request — it writes
profile data, so it cannot be open to the internet.

## 1. What n8n receives

`POST` to `N8N_CV_WEBHOOK_URL`, header `X-Webhook-Secret`:

```json
{
  "cv_id": "uuid",
  "user_id": "uuid",
  "file_name": "resume.pdf",
  "markdown": "# Jane Doe\n\n## Experience\n..."
}
```

The markdown is LlamaCloud's parse of the document — layout and OCR resolved,
but no fields extracted. Extraction is n8n's job.

## 2. What n8n sends back

`POST https://<project>.supabase.co/functions/v1/apply-cv-profile`, header
`X-Webhook-Secret`:

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
      "marital_status": "Single"
    },
    "highest_qualification": {
      "level": "bachelor",
      "field_of_study": "Computer Science",
      "institution": "…",
      "country": "India",
      "completed_year": 2016
    },
    "experience": {
      "overseas_years": 6,
      "australian_years": 0,
      "most_recent_job_title": "Software Engineer"
    },
    "english_test": {
      "test_type": "IELTS",
      "listening": 8.5, "reading": 8.0, "writing": 7.0, "speaking": 7.5,
      "overall": 7.5,
      "test_date": "2025-11-02"
    },
    "australian_factors": {
      "studied_in_australia": false,
      "studied_in_regional_australia": false,
      "completed_professional_year": false,
      "completed_ccl": false
    },
    "occupation": {
      "occupation_code": "261313",
      "job_name": "Software Engineer",
      "category": "ICT"
    },
    "assumptions": ["Derived 6 years from role date ranges; 2019 gap excluded"]
  }
}
```

Every field is optional — send `null` or omit anything the CV doesn't support.

### Enums

| Field | Accepted values |
|---|---|
| `personal.marital_status` | `Single`, `Married`, `De Facto`, `Divorced`, `Widowed` |
| `highest_qualification.level` | `none`, `diploma_or_trade`, `bachelor`, `masters`, `doctorate` |
| `english_test.test_type` | `IELTS`, `PTE`, `TOEFL`, `Cambridge`, `OET` |

Anything outside these is ignored rather than written.

### Response

```json
{ "success": true, "filled": ["name", "dob", "overseasExp"], "skipped": ["email"] }
```

`skipped` lists fields the user had already filled in, which were left alone.

## Two rules the workflow must respect

**Send years, not points.** `experience.overseas_years` and
`australian_years` are counts of years. The `overseasExp` / `ausExp` columns
also store years, and the app scores them into points at read time. A workflow
that writes points into those columns inflates every visa match — this was a
real bug (a "5 years" entry became "10 years" after a points value was written
back). Posting to `apply-cv-profile` avoids it entirely: the endpoint owns the
conversion, so n8n never touches the columns directly.

**Prefer omission over a guess.** A wrong date of birth or test score changes
someone's points total and therefore which visas they're shown. `null` costs the
user one form field; a wrong value costs them a wrong eligibility answer. Put
anything inferred rather than read into `assumptions` so the UI can flag it.

## Why n8n posts to an endpoint instead of writing tables directly

n8n *can* write to Supabase directly, but then it also owns the education→points
table, the English band thresholds, the years/points distinction, and the
never-overwrite rule. Those are scoring rules that change with policy — keeping
them in `apply-cv-profile` means one edit here rather than a node rebuild there,
and the same safety applies no matter what calls it.

## Behaviour worth knowing

- **Fills empty fields only.** A CV is evidence, not authority — nothing the
  user typed is overwritten. Everything extracted is stored in
  `cv_metadata.extracted_profile` regardless, so a review screen can offer the
  rest.
- **Boolean flags only ever turn on**, never off. An absent mention of regional
  study isn't proof it didn't happen.
- **Test scores are inserted only when the user has no test of that type.**
- **Failures are recoverable.** The markdown is saved before dispatch, so n8n
  can be re-triggered against the stored text without re-parsing the PDF.

## Retrying one CV

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/apply-cv-profile" \
  -H "X-Webhook-Secret: $N8N_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"cv_id":"<uuid>","profile":{...}}'
```

To re-run extraction from stored text, read
`cv_metadata.parsed_data.markdown_full` for that row and post it to the n8n
webhook yourself.
