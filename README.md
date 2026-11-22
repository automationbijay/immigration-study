# Skilled Migration Assistant

Upload your CV and let AI do the paperwork. AI reads the resume, fills in the
user's profile and asks only about what's missing, then the app estimates
skilled migration points for **Australia** (points test for subclass 189, 190
and 491) and **Canada** (Federal Skilled Worker 67-point grid, with a link to the
official CRS calculator).

General information only, not migration advice. See the in-app Disclaimer.

## Project overview

1. **Web app** (`/web-app`): a mobile-first React app with an editorial look (cream paper, navy ink, ochre accents).
   - **Public pages**: homepage, Discover, Australian visas, calculators, occupation and university lookups, About, FAQ, Contact, Privacy, Terms and Disclaimer.
   - **Signed-in pages**: dashboard, profile builder and CV import. Saved estimates appear on the dashboard.
   - **Feedback**: "Report a mistake" and "Collaborate with us" forms on the homepage and Contact page.
2. **Backend** (`/supabase`): Supabase Postgres with Row Level Security, Auth, Storage and Edge Functions. Database triggers keep the points in step with the profile (see [docs/SUPABASE_SCHEMA.md](docs/SUPABASE_SCHEMA.md)).
3. **CV pipeline**: upload → LlamaCloud LlamaExtract → `apply-cv-profile` → profile tables → points. See [docs/cv-pipeline-n8n.md](docs/cv-pipeline-n8n.md).
4. **Data pipeline** (`/script`): Python and Node scripts that scrape ANZSCO occupation lists and global university data and seed them into Supabase.

## Tech stack

- **Frontend**: React 19, Vite, React Router, SWR, Lucide icons, vanilla CSS. Fonts are Newsreader (display), Inter Tight (body) and JetBrains Mono (labels). It's a PWA.
- **Backend**: Supabase (PostgreSQL, Auth with email and Google, Storage, Edge Functions, RLS).
- **AI document processing**: LlamaIndex LlamaCloud (LlamaParse, LlamaExtract).
- **Testing**: Playwright end-to-end tests, plus a live database round-trip script.
- **Monitoring**: Sentry (errors and sampled session replay).
- **Hosting**: Vercel.

## Directory structure

- `/web-app`: the React app. See [web-app/README.md](web-app/README.md) for its layout and scripts.
- `/supabase/migrations`: SQL schema, RLS policies, triggers and seed data.
- `/supabase/functions`: Deno Edge Functions (`upload-cv`, `parse-cv`, `extract-cv`, `apply-cv-profile`, `delete-user-data`, `calculate-english-points`).
- `/docs`: living docs (schema, CV pipeline, Australian visa notes, occupation lists) and raw datasets.
- `/docs/reports`: point-in-time audits and plans (not living documentation).
- `/script`: scraping, seeding and test scripts. `/script/fixtures` holds sample files such as a test CV.

## Getting started

### 1. Web app

```bash
cd web-app
npm install
npm run dev          # http://localhost:5173
```

Create `web-app/.env.local`:

```ini
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # safe in the browser; RLS protects data
VITE_SENTRY_DSN=<optional>
VITE_CONTACT_EMAIL=<optional, shown on the Contact page>
```

### 2. Database and Edge Functions

The Supabase CLI authenticates with `SUPABASE_ACCESS_TOKEN` (a personal
access token) kept in the git-ignored root `.env`:

```bash
export SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env | cut -d= -f2-)
supabase functions deploy <name> --project-ref mvycqvmojoqtfyvjsigv --use-api
# apply-cv-profile, extract-cv, parse-cv, upload-cv and calculate-english-points
# run with verify_jwt = false (see supabase/config.toml); keep it that way.
```

Edge Function secrets: `LLAMA_CLOUD_API_KEY`, `LLAMA_CLOUD_PROJECT_ID`,
`N8N_SHARED_SECRET` (the name is historical; it signs `extract-cv` → `apply-cv-profile`).
Supabase injects the project keys itself; the CV functions use the new secret
key from `SUPABASE_SECRET_KEYS` (legacy `SUPABASE_SERVICE_ROLE_KEY` only as a fallback).

**API keys.** The project uses the new key system: a **publishable** key
(`sb_publishable_…`) in the browser and a **secret** key (`sb_secret_…`) only on
servers and in local scripts (`SUPABASE_KEY` in the root `.env`). Never put the
secret key in the web app or commit it.

Recent migrations (all applied to the live project on 22 November 2026):

| Migration | What it does |
|---|---|
| `20261122000000_sync_points_from_profile.sql` | Education, work experience and English tests now update the Australian points automatically. New users start unanswered instead of with 0s. Existing education and experience entries are backfilled. |
| `20261122010000_create_feedback_submissions.sql` | Table for the "Report a mistake" / "Collaborate with us" forms. It's insert-only for visitors; you review submissions in the dashboard. |
| `20261122020000_fix_clear_user_data.sql` | "Delete All My Data" also removes saved Canada estimates and the chosen occupation, and detaches the user's feedback. |

> **Migration history caveat.** Most older migrations were applied by hand, so
> the live `supabase_migrations.schema_migrations` table only records the
> entries listed above plus `20260926115000` and `20260926150100`. **Do not run
> `supabase db push --include-all`**: it would re-run every old migration,
> including data moves and the universities seed. Apply a new migration with
> `psql "$DATABASE_URL" -1 -v ON_ERROR_STOP=1 -f <file>` and then record it with
> `supabase migration repair --db-url "$DATABASE_URL" --status applied <version>`.

### Deploying the web app (Vercel)

Pushing to `master` deploys production automatically. To deploy from a local
checkout instead (project `immigration-study`, root directory `web-app`):

```bash
npx vercel link --project immigration-study   # once; creates .vercel/ (git-ignored)
npx vercel deploy --prod
```

`.vercelignore` keeps `.env*`, `supabase/`, `script/` and `docs/` out of the
upload. Build-time variables come from Vercel's environment settings:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SENTRY_DSN`, and
optionally `VITE_CONTACT_EMAIL`.

### 3. Tests

```bash
cd web-app
npm test             # Playwright e2e (database calls are mocked)
npm run test:db      # live round-trip with a throwaway account (see web-app/README.md)
npm run test:cv      # live CV upload → AI extraction → profile → points, then cleanup
```

### 4. Reviewing feedback

Open Supabase → Table editor → `feedback_submissions`. New entries have
`status = 'new'`; set it to `in_progress`, `resolved` or `spam` as you work
through them.

## Data pipeline

### Environment

Create a root `.env` (git-ignored) with the database connection string and the
CLI token:

```ini
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=sb_secret_...        # secret key, for scripts in /script only
SUPABASE_ACCESS_TOKEN=sbp_...
```

### Scraping occupation lists

Playwright extracts the MLTSSL, ROL and STSOL tables from ANZSCO Search:

```bash
python script/scrape_mltssl.py
python script/scrape_rol.py
python script/scrape_stsol.py
python script/scrape_all.py      # or all three at once
```

### Seeding

```bash
python script/seed_mltssl.py
python script/seed_rol.py
python script/seed_stsol.py
node script/seed_universities.js  # Hipolabs → docs/universities.json → universities table
```

The ANZSCO seed scripts drop and recreate their tables with an `anzsco_code`
index. The universities script needs `npm install pg` in the root folder.
