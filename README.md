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
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_SENTRY_DSN=<optional>
VITE_CONTACT_EMAIL=<optional, shown on the Contact page>
```

### 2. Database and Edge Functions

```bash
npx supabase db push              # apply new migrations
npx supabase functions deploy     # deploy Edge Functions
```

Edge Function secrets: `LLAMA_CLOUD_API_KEY`, `LLAMA_CLOUD_PROJECT_ID`,
`N8N_SHARED_SECRET` (the name is historical; it signs `extract-cv` → `apply-cv-profile`).

Recent migrations to apply:

| Migration | What it does |
|---|---|
| `20261122000000_sync_points_from_profile.sql` | Education, work experience and English tests now update the Australian points automatically. New users start unanswered instead of with 0s. Existing education and experience entries are backfilled. |
| `20261122010000_create_feedback_submissions.sql` | Table for the "Report a mistake" / "Collaborate with us" forms. It's insert-only for visitors; you review submissions in the dashboard. |

### 3. Tests

```bash
cd web-app
npm test             # Playwright e2e (database calls are mocked)
npm run test:db      # live round-trip with a throwaway account (see web-app/README.md)
```

### 4. Reviewing feedback

Open Supabase → Table editor → `feedback_submissions`. New entries have
`status = 'new'`; set it to `in_progress`, `resolved` or `spam` as you work
through them.

## Data pipeline

### Environment

Create a root `.env` with the database connection string:

```ini
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
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
