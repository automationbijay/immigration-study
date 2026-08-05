# LlamaCloud Key Rotation + CSV Ingestion Audit

**Date:** 2026-08-05
**Scope:** Validate/rotate the LlamaCloud API key, check for LlamaExtract docs in installed skills, and
audit whether CSV data can be parsed directly into this project's table format.

---

## 1. TL;DR

- New key `llx-A4YvN6Os…KI` is **valid** — confirmed via a live auth check and a full upload → parse →
  markdown round trip against `two-column-resume-template-blue.pdf`. It is now set everywhere the old
  key was.
- The **old key was still live** on LlamaCloud's side (not revoked) even though code comments and
  [CV_UPLOAD_FIX_PLAN.md](CV_UPLOAD_FIX_PLAN.md) had already called it compromised. Revoke it from the
  LlamaCloud dashboard — rotating call sites doesn't deactivate the old credential.
- The old key was **hardcoded in two git-tracked files** (`test_llama.py`, `test_llamaparse_rest.py`),
  committed in `814fa37`. Fixed both to read from `LLAMA_CLOUD_API_KEY` env instead — putting the new
  key in the same spot would have repeated the exact leak.
- No **LlamaExtract** skill or docs exist anywhere in this repo. The only LlamaIndex-related skill is
  `liteparse` (local, model-free `lit` CLI) — a different product from LlamaCloud's hosted
  parse/extract API this project actually uses.
- **Direct CSV → table parsing already exists** as a working pattern (`script/upload_anzsco_to_supabase.py`),
  but it's a one-off ETL script, not a reusable path. CVs uploaded as `.csv` today get force-fed through
  the PDF/OCR-oriented LlamaParse pipeline, which is the wrong tool for already-tabular text. See §4.

---

## 2. LlamaCloud key: validation and rotation

### What was checked

| # | Check | Result |
|---|---|---|
| 1 | New key auth check (`GET /api/v1/files`) | ✅ 200, `[]` |
| 2 | New key full round trip (upload → poll → fetch markdown) | ✅ SUCCESS, markdown fetched |
| 3 | Garbage key sanity check (same endpoint) | ✅ 401 — confirms the check is meaningful |
| 4 | Old key auth check, for comparison | ⚠️ **still 200** — not revoked |
| 5 | Production Supabase secret `LLAMA_CLOUD_API_KEY` | ✅ updated (`supabase secrets set`, project `mvycqvmojoqtfyvjsigv`) |
| 6 | Local `.env` / `supabase/.env` | ✅ updated |

### One real bug found along the way (unrelated to the key)

The first end-to-end attempt failed with `MISSING_VERSION_FOR_TIER` — LlamaCloud's REST API now
requires a `version` field whenever `tier` is set. `test_llamaparse_rest.py` was only sending `tier`.
Production's `parse-cv` edge function already sends both (`tier: "fast"`, `version: "latest"`), so this
did not affect production — only the local test script, which is now fixed the same way.

### Where the key is used / stored

| Location | Status |
|---|---|
| `.env` (repo root) | updated, gitignored — never committed |
| `supabase/.env` | updated, gitignored — never committed |
| Supabase secret (project `mvycqvmojoqtfyvjsigv`) | updated — this is what `parse-cv` actually reads in production via `Deno.env.get("LLAMA_CLOUD_API_KEY")` |
| `test_llama.py`, `test_llamaparse_rest.py` | **fixed** — now read `LLAMA_CLOUD_API_KEY` from env via `dotenv`, no literal key in the file |

### Still outstanding (not done here — needs your call)

- **Revoke the old key** (`llx-WrFAt…`) from the LlamaCloud dashboard. It authenticates successfully
  right now; rotating every call site doesn't invalidate it, only LlamaCloud can.
- Per [CV_UPLOAD_FIX_PLAN.md §6](CV_UPLOAD_FIX_PLAN.md#6-security-items-found-on-the-way-independent-of-this-bug),
  deployed `parse-cv` was 2 revisions stale (`v6`) and missing the n8n dispatch step entirely. Setting
  the secret does **not** fix that — it needs `supabase functions deploy parse-cv` from the current repo
  code. I did not redeploy the function itself; only the secret it reads was rotated.
- The leaked key stays in git history (`814fa37`) even after this fix. History rewriting (`git filter-repo`
  / BFG) is the only way to remove it — flagging so you can decide if that's worth doing, since it
  rewrites shared history and needs coordination with anyone else with a clone.

---

## 3. LlamaExtract in skills

Searched `.agents/skills/**` and the whole repo for `LlamaExtract` (and variants). **No matches.**

What *is* installed is `.agents/skills/liteparse/SKILL.md` — LlamaIndex's local, model-free `lit` CLI for
pulling text/tables out of PDFs/DOCX/images on-disk. It's useful, but it's a different product from:

- **LlamaParse** (cloud) — what `parse-cv` already calls, turns a document into markdown.
- **LlamaExtract** (cloud) — schema-driven structured extraction directly from a document, i.e. skips
  the "n8n reads markdown and guesses fields" step this project currently does by hand in
  `docs/cv-pipeline-n8n.md`.

If you want schema-driven extraction (a fixed JSON schema matching the `apply-cv-profile` payload shape
in [docs/cv-pipeline-n8n.md](../cv-pipeline-n8n.md)) instead of markdown + n8n guesswork, that's a
LlamaExtract integration, not something any installed skill currently covers. Worth a separate
conversation if you want to explore replacing the n8n extraction step with it — no code changes made
here.

---

## 4. Can CSV text go directly into "our required table format"?

Short answer: **yes for reference-data CSVs, no shortcut yet for CV/profile CSVs.** Two different
paths in this codebase answer this differently:

### 4a. Reference-data CSVs (occupations) — already solved, and it's the right pattern

`script/upload_anzsco_to_supabase.py` and `script/upsert_skilled_occupations.py` both do exactly this:

```
pandas.read_csv(csv) → map columns to table schema → upsert via Supabase (REST or client)
```

No LLM involved, because a CSV is already tabular — parsing it with LlamaParse/LlamaExtract would be
strictly worse (slower, costs a parse credit, and adds OCR-shaped failure modes to text that's already
structured). This is the correct template to copy for any *new* reference-data CSV → table job: swap the
column map and target table name.

### 4b. CV/profile CSVs — no shortcut exists; the current pipeline actively mishandles them

The CV upload path has **no file-type restriction** (`upload-cv/index.ts` accepts any extension;
`CV_UPLOAD_FIX_PLAN.md` §5 Phase 3.4 already flagged this — the `cvs` bucket has stray `.png`, `.avif`,
and `.csv` objects in it from real uploads). If a user uploads a `.csv` today, `parse-cv` sends the raw
bytes to LlamaParse as if it were a PDF. That's the wrong tool for text that's already structured, and
LlamaParse's own docs treat CSV as an edge case at best.

The target schema is well-defined, though — `apply-cv-profile/index.ts` and
[docs/cv-pipeline-n8n.md](../cv-pipeline-n8n.md) fully specify it: `profile_basic` (name, email, phone,
dob, country, marital_status) and `point_australia` (education, overseasExp/ausExp **in years, not
points**, english score, boolean factors), fill-empty-only, never overwrite. So "parse CSV directly to
our required table format" is answerable, it just isn't built:

**If you want this**, the shape would be: detect `.csv` in `upload-cv` (or a new endpoint), parse it
client-side/server-side with a real CSV parser (e.g. `papaparse` — not currently a dependency anywhere
in `web-app`) against an explicit column-name map, and POST the result straight to `apply-cv-profile`
with the same JSON shape n8n already produces — skipping LlamaParse and n8n entirely for this input
type. That reuses all the existing safety rules (fill-empty-only, years-not-points, enum validation)
for free, since they live in `apply-cv-profile`, not in the extraction step. I have not built this — say
the word if you want it, since it touches the upload endpoint and possibly the upload modal's accepted
file types.

---

## 5. Summary of changes made this session

- [`.env`](/.env), [`supabase/.env`](../../supabase/.env): `LLAMA_CLOUD_API_KEY` → new key
- Supabase secret `LLAMA_CLOUD_API_KEY` (project `mvycqvmojoqtfyvjsigv`): rotated
- [`test_llama.py`](../../script/test_llama.py), [`test_llamaparse_rest.py`](../../script/test_llamaparse_rest.py): stopped
  hardcoding the key; now load `LLAMA_CLOUD_API_KEY` from env; also fixed the missing `version` field
  bug in the latter
- No table/schema/pipeline code changed — §4b is a proposal, not an implementation

## 6. Suggested next steps, in order

1. Revoke the old LlamaCloud key from the dashboard (only remaining place it's still live).
2. Decide whether to redeploy `parse-cv` from current repo code — the secret rotation alone doesn't fix
   the stale-deploy issue from `CV_UPLOAD_FIX_PLAN.md`.
3. Decide if CSV-to-profile (§4b) or LlamaExtract-based schema extraction (§3) is worth building — both
   are scoped above but unbuilt.
