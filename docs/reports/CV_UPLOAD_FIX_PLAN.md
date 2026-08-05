# CV Upload Failure — Diagnosis & Fix Plan

**Date:** 2026-08-05
**Symptom:** "Error uploading CV. Please try again." + `FunctionsHttpError: Edge Function returned a non-2xx status code`
**Project:** `mvycqvmojoqtfyvjsigv` (linked)

---

## 0. STATUS — fixed and deployed to production

**Code changes (lint clean, `vite build` passes):**

- ✅ Phase 0.1 — [CvUploadModal.jsx](../../web-app/src/components/CvUploadModal.jsx) reads the real error
  off `error.context` and shows it
- ✅ Phase 1A — [20260805234500_make_cv_webhook_nonfatal.sql](../../supabase/migrations/20260805234500_make_cv_webhook_nonfatal.sql)
  wraps the `net.http_post` dispatch in an exception handler
- ✅ Phase 1B — 401 renders as "your session has expired", not "please try again"
- ✅ Phase 3.1 / 3.2 / 3.3 — [upload-cv](../../supabase/functions/upload-cv/index.ts) reordered so the old
  CV is deleted only after the new one is stored *and* recorded; orphaned file cleaned up on insert
  failure; error `code` returned alongside the message

**Deployed to `mvycqvmojoqtfyvjsigv` and verified:**

| Action | Verification |
|---|---|
| `supabase db push --linked` | `migration list` → `20260805230000` and `20260805234500` both `remote` ✅ |
| extraction columns live | `?select=extraction_status` → HTTP 200 (was `42703`) ✅ |
| `functions deploy upload-cv` | downloaded deployed source → byte-identical to repo ✅ |
| `functions deploy parse-cv` | downloaded deployed source → byte-identical to repo ✅ |
| leaked `llx-` key | 0 occurrences in deployed `parse-cv` ✅ |
| `upload-cv` still boots | anon POST → clean 401, not 503 `BOOT_ERROR` ✅ |

**Still open (needs input only you have):**

- `apply-cv-profile` is **not deployed** — it returns 500 by design without `N8N_SHARED_SECRET`, and
  the n8n workflow it serves does not exist yet. Deploy it together with §5 Phase 2.2/2.3.
- Delete `supabase/.temp/check-buckets.ts` (plaintext Supabase secret key) and rotate that key.

Resolved separately: the old LlamaCloud key has been rotated — see `LLAMACLOUD_CSV_AUDIT.md`.

**Note on residual risk:** the reproduction that would have distinguished H1 from H2 (§4) could not be
run, so it remains unconfirmed which one was firing. Both are now fixed, and Phase 0.1 means any
remaining cause names itself in the UI on the next failed attempt.

---

## 1. TL;DR

`FunctionsHttpError` is not the bug — it is the *absence* of the bug report. It is what
`supabase-js` throws for **any** non-2xx response from an Edge Function. The `upload-cv` function
already returns a useful body (`{"error": "<real message>"}`), but
[CvUploadModal.jsx:32](../../web-app/src/components/CvUploadModal.jsx#L32) throws the error object away
without reading it, so both the toast and the console show a generic string.

**So the first fix is to make the error visible.** Everything else in this plan is either (a) a
confirmed broken thing found while investigating, or (b) hardening so this class of failure is
diagnosable in one glance next time.

The investigation ruled out most of the usual suspects — the upload path itself is healthy — and
narrowed the failure to two candidates (see §4).

---

## 2. What was checked, and what is actually true

Everything below was verified against the live project, not inferred.

| # | Check | Result | How verified |
|---|---|---|---|
| 1 | `upload-cv` deployed & ACTIVE | ✅ v8, ACTIVE | `supabase functions list` |
| 2 | Deployed `upload-cv` matches repo | ✅ byte-identical | `supabase functions download upload-cv` + `diff` |
| 3 | Function boots (no `BOOT_ERROR`) | ✅ returns a clean 401, not 503 | `curl -X POST .../upload-cv` with valid anon key |
| 4 | CORS / preflight | ✅ `OPTIONS` → 204, `Access-Control-Allow-Origin: *` | `curl -X OPTIONS` |
| 5 | `cv-uploads` bucket exists | ✅ exists, holds 3 PDFs | `supabase storage ls --experimental` |
| 6 | Storage RLS lets users write | ✅ 3 files present under 3 distinct user-id folders | same |
| 7 | `cv_metadata` reachable by API roles (GRANTs) | ✅ HTTP 200 | `GET /rest/v1/cv_metadata` with anon key |
| 8 | `cv_metadata` has rows | ✅ ~3 rows | `supabase inspect db table-stats --linked` |
| 9 | **Migration `20260805230000_add_cv_extraction.sql` applied** | ❌ **NOT applied** | `supabase migration list --linked` → `remote: ""` |
| 10 | **`cv_metadata.extraction_status` column exists** | ❌ **`42703 column does not exist`** | `GET /rest/v1/cv_metadata?select=extraction_status` |
| 11 | **`apply-cv-profile` deployed** | ❌ **not deployed at all** | `supabase functions list` |
| 12 | **Deployed `parse-cv` up to date** | ❌ **v6, two revisions stale** | `supabase functions download parse-cv` + `diff` |
| 13 | **Deployed `parse-cv` secrets** | ❌ **hardcoded `llx-…` LlamaCloud key is live in production** | same |

### Hypotheses that were tested and *disproven*
Recording these so nobody re-walks them:

- ~~Missing `GRANT` on `cv_metadata`~~ — the table is reachable (check 7). (This project *has*
  needed explicit grant migrations twice before, so it was a reasonable suspicion — but not this.)
- ~~Bucket-name mismatch (`cvs` vs `cv-uploads`)~~ — deployed code and bucket agree (checks 2, 5).
- ~~Import-map / `npm:@supabase/server` boot failure~~ — the function boots (check 3).
- ~~Missing CORS headers~~ — preflight passes (check 4). A CORS failure would surface as
  `FunctionsFetchError`, not `FunctionsHttpError`, which independently confirms this.
- ~~Storage policies dropped by migration `20260805210600`~~ — writes succeed (check 6).

---

## 3. The pipeline, and where each piece stands

```
CvUploadModal  ──invoke──▶  upload-cv (v8 ✅ in sync)
                                 │
                                 ├─ storage.upload → cv-uploads   ✅ working
                                 └─ INSERT cv_metadata            ✅ working (rows exist)
                                        │
                                        └─ AFTER INSERT TRIGGER  parse_cv_webhook_trigger
                                                │  net.http_post (pg_net) — ⚠️ runs INSIDE the insert txn
                                                ▼
                                           parse-cv (v6 ❌ STALE — no n8n dispatch, hardcoded key)
                                                │
                                                ▼
                                           n8n webhook  ──▶  apply-cv-profile (❌ NOT DEPLOYED)
                                                                    │
                                                                    ▼
                                                          writes extraction_status (❌ COLUMN MISSING)
```

Two independent problems are tangled together here:

- **Problem A — the upload 500/401 the user sees.** Narrowed to two candidates (§4).
- **Problem B — the extraction half of the pipeline is not deployed at all.** Confirmed, not a
  hypothesis: checks 9–13. Even if Problem A is fixed today, CV extraction still cannot work.

---

## 4. Root cause of Problem A — two live candidates

Step 0 of the plan pins this down in under a minute. Ranked by likelihood:

### H1 — The `AFTER INSERT` trigger aborts the insert (→ HTTP 500)

`trigger_parse_cv_webhook()` ([20260805212500](../../supabase/migrations/20260805212500_add_parse_cv_webhook.sql),
URL patched by [20260805214800](../../supabase/migrations/20260805214800_fix_webhook_url.sql)) calls
`net.http_post` **synchronously inside the INSERT transaction**. If `pg_net` raises for any reason,
the `INSERT` rolls back → `dbError` → `throw` → the catch block returns 500.

This is the one step in the write path that could not be verified from outside the database, and the
commit history (`814fa37 … and fix webhook trigger`) shows it has already been a source of trouble.

**Tell-tale signature:** an orphaned file in `cv-uploads` with no matching `cv_metadata` row — because
`upload-cv` uploads to storage *before* inserting, and deletes the previous CV *before* either.

### H2 — Stale/expired browser session rejected by `withSupabase({ auth: "user" })` (→ HTTP 401)

Probing the deployed function returns exactly `401 {"message":"Invalid credentials","code":"INVALID_CREDENTIALS"}`
for a non-user token. If the browser's access token is dead and the refresh failed, `functions.invoke`
sends a bad JWT and gets this same 401. Cheap to rule out: sign out, sign in, retry.

---

## 5. Fix plan

### Phase 0 — Make the failure legible *(do this first; it decides Phase 1)*

**0.1 — Read the error body in the client.** `FunctionsHttpError` carries the raw `Response` on
`error.context`; that is where `{"error": "..."}` lives.

In [CvUploadModal.jsx](../../web-app/src/components/CvUploadModal.jsx#L28-L42), replace `if (error) throw error;`:

```js
if (error) {
  // FunctionsHttpError keeps the raw Response on .context — the function's own
  // {"error": "..."} body is in there, and it is the only useful part.
  let detail = error.message;
  if (error.context instanceof Response) {
    const res = error.context.clone();
    try {
      detail = (await res.json())?.error ?? detail;
    } catch {
      detail = (await error.context.clone().text()) || detail;
    }
    detail = `${error.context.status}: ${detail}`;
  }
  throw new Error(detail);
}
```

and surface it: `setMessage(\`Error uploading CV — ${err.message}\`)`.

**0.2 — Read the server-side logs.** Reproduce the upload, then open
Dashboard → Edge Functions → `upload-cv` → Logs. The `console.error("Upload error details:", …)`
line at [upload-cv/index.ts:80](../../supabase/functions/upload-cv/index.ts#L80) prints the real cause.

**0.3 — Decide:**
- Status **500**, message mentions `net`/`http_post`/trigger → **H1** → do Phase 1A.
- Status **401** → **H2** → sign out / sign in; then do Phase 1B (make it a clear message, not a crash).
- Anything else → the log line now names it directly.

---

### Phase 1A — Fix H1: get the webhook out of the insert transaction

The trigger should never be able to fail a user-facing upload. Two options; **take option 1**.

**Option 1 (recommended) — make the trigger non-fatal.** New migration
`supabase/migrations/<ts>_make_cv_webhook_nonfatal.sql`:

```sql
CREATE OR REPLACE FUNCTION public.trigger_parse_cv_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url     := 'https://mvycqvmojoqtfyvjsigv.supabase.co/functions/v1/parse-cv',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object(
                   'type', TG_OP, 'table', TG_TABLE_NAME,
                   'schema', TG_TABLE_SCHEMA, 'record', row_to_json(NEW))
    );
  EXCEPTION WHEN OTHERS THEN
    -- Parsing is a nice-to-have. Losing it must never cost the user their upload.
    RAISE WARNING 'parse-cv dispatch failed for cv_metadata %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;
```

**Option 2 (alternative) — drop the DB trigger entirely** and have `upload-cv` call `parse-cv`
directly after a successful insert, in its own `try/catch`. Fewer moving parts, no `pg_net`
dependency, and the dispatch failure is then visible in the same function log. Worth considering
if `pg_net` keeps misbehaving.

Also confirm `pg_net` is actually healthy:

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_net';
SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5;  -- did any request go out?
```

---

### Phase 1B — Fix H2: handle a dead session honestly

In `upload-cv`, the 401 branch already exists and is correct. The gap is the client: a 401 should
tell the user to sign in again, not "please try again". With Phase 0.1 in place the status code is
available — branch on it:

```js
if (error.context?.status === 401) {
  setMessage('Your session expired. Please sign in again and retry.');
  return;
}
```

---

### Phase 2 — Ship the extraction half (Problem B — confirmed broken regardless of Phase 1)

Order matters: migration first, then the write-back endpoint, then the producer.

**2.1 — Apply the pending migration.**
```bash
supabase db push --linked
```
Verify: `curl ".../rest/v1/cv_metadata?select=id,extraction_status&limit=1"` must stop returning `42703`.

**2.2 — Deploy `apply-cv-profile`** (currently untracked *and* undeployed):
```bash
supabase functions deploy apply-cv-profile --project-ref mvycqvmojoqtfyvjsigv
```
It requires `N8N_SHARED_SECRET` — without it, it returns 500 by design.

**2.3 — Set the secrets** the new `parse-cv` needs:
```bash
supabase secrets set N8N_CV_WEBHOOK_URL=... N8N_SHARED_SECRET=... --project-ref mvycqvmojoqtfyvjsigv
```

**2.4 — Redeploy `parse-cv`** (v6 → current; this also removes the hardcoded key from production):
```bash
supabase functions deploy parse-cv --project-ref mvycqvmojoqtfyvjsigv
```

**2.5 — Commit the working tree.** `apply-cv-profile/` and `docs/cv-pipeline-n8n.md` are untracked;
`parse-cv/index.ts` and the extraction migration are modified. Deploying from an uncommitted tree is
how `parse-cv` drifted two versions behind in the first place.

---

### Phase 3 — Hardening (prevents the next silent failure)

**3.1 — Stop destroying the old CV before the new one is safe.**
[upload-cv/index.ts:24-40](../../supabase/functions/upload-cv/index.ts#L24-L40) deletes the existing row and
file *first*. Any later failure leaves the user with no CV at all. Reorder to: upload new → insert new
→ *then* delete old.

**3.2 — Clean up the orphan on insert failure.** If the `cv_metadata` insert fails, remove the file
just uploaded, otherwise `cv-uploads` accumulates unreferenced objects:
```js
if (dbError) {
  await ctx.supabase.storage.from(bucketName).remove([fileName]);
  throw dbError;
}
```

**3.3 — Return the error *code*, not just the message.** `Response.json({ error: error.message, code: error.code })`
makes the client branch on cause instead of string-matching.

**3.4 — Validate file type.** The `cvs` bucket contains `.png`, `.avif` and `.csv` uploads. Restrict to
PDF/DOC/DOCX client-side and set `allowed_mime_types` on the `cv-uploads` bucket.

**3.5 — Drop the dead `cvs` bucket** (7 stale objects incl. a `test-upload/` folder) and the leftover
`"Users can read their own CV"` policy from
[20260805122634](../../supabase/migrations/20260805122634_add_cv_storage.sql), which still points at `cvs`.
Take a backup of anything still referenced before deleting.

---

## 6. Security items found on the way (independent of this bug)

1. ~~**A hardcoded LlamaCloud key was live in deployed `parse-cv` v6.**~~ **Resolved.** Removing it
   from the repo did nothing while v6 was the deployed artifact; redeploying `parse-cv` (Phase 2.4)
   removed it from production, and the key itself has since been rotated — see
   `LLAMACLOUD_CSV_AUDIT.md`.
2. **A Supabase secret key sits in plaintext** in `supabase/.temp/check-buckets.ts` (labelled
   "using secret key to bypass RLS"). `.temp/` is gitignored so it is not in history, but the file
   should be deleted and the key rotated.
3. `supabase/.env` was only just added to `.gitignore` (uncommitted change) — confirm nothing
   sensitive from it is already in git history.

---

## 7. Verification checklist

- [ ] Failed upload now shows a specific message with an HTTP status, not "Please try again"
- [ ] `supabase migration list --linked` shows `20260805230000` with a non-empty `remote`
- [ ] `GET /rest/v1/cv_metadata?select=extraction_status` returns 200, not `42703`
- [ ] `supabase functions list` shows `upload-cv`, `parse-cv`, **and** `apply-cv-profile`
- [ ] Deployed `parse-cv` contains no `llx-` literal (`supabase functions download parse-cv` + grep)
- [ ] Upload a real PDF → HTTP 200, one new row in `cv_metadata`, one new file in `cv-uploads`
- [ ] `SELECT * FROM net._http_response ORDER BY created DESC LIMIT 1` shows the parse-cv dispatch
- [ ] `cv_metadata.is_parsed` flips to `true` and `parsed_data.markdown_full` is populated
- [ ] `extraction_status` walks `pending → processing → extracted → applied`
- [ ] Object count in `cv-uploads` equals row count in `cv_metadata` (no orphans)

---

## 8. Suggested order of work

1. **Phase 0** — 15 min. Surfaces the real error and decides 1A vs 1B.
2. **Phase 1A or 1B** — fixes the reported bug.
3. **Phase 2** — ~30 min. Makes CV extraction actually function; also removes the leaked key from prod.
4. **Phase 3 + §6** — cleanup and hardening, no user-visible urgency except the key rotation.
