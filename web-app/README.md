# Skilled Migration Assistant — web app

React + Vite single-page app. See the [root README](../README.md) for the full
project overview.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run lint       # oxlint
npm test           # Playwright end-to-end tests (database calls are mocked)
npm run test:db    # live database round-trip, see below
npm run test:cv    # live CV pipeline check (upload → AI → profile → points)
```

## Environment (`.env.local`, git-ignored)

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable key (`sb_publishable_…`). The legacy `VITE_SUPABASE_ANON_KEY` is still read as a fallback. |
| `VITE_SENTRY_DSN` | no | Error monitoring |
| `VITE_CONTACT_EMAIL` | no | Shown on the Contact page; the contact form works without it |

## Layout

```
src/
  App.jsx                 routes, SiteNav, SiteFooter, bottom nav (signed-in phones only)
  index.css               design tokens (cream/navy/ochre, Newsreader + Inter Tight) and components
  pages/
    Landing.jsx (+ landing.css)   public landing page: hero, how it works and tools
    Home.jsx                      signed-in dashboard
    Profile.jsx                   profile sections (basic, language, education, experience, family, CV)
    Calculator.jsx, CanadaFSWCalculator.jsx, CanadaCRSCalculator.jsx
    Discover.jsx, VisasHub.jsx, FormsHub.jsx, ToolsHub.jsx, AnzscoTool.jsx, UniversityTool.jsx
    info/                         About, FAQ, Contact (feedback and collaboration), Privacy, Terms, Disclaimer
  components/
    FeedbackForm.jsx              "Report a mistake" / "Collaborate with us" (→ feedback_submissions)
    ui/SiteNav.jsx, ui/SiteFooter.jsx, ui/InfoPage.jsx, ui/PageLink.jsx, …
  lib/
    supabase.js, ProfileContext.jsx (shared profile fetch), points.js, visas.js, site.js
public/
  favicon.svg, favicon.ico, apple-touch-icon.png, pwa-192x192.png, pwa-512x512.png
scripts/
  db-roundtrip.mjs        live save/read-back check against Supabase
  cv-pipeline-check.mjs   live CV upload → extraction → profile → points check
tests/e2e/                Playwright specs
```

## Live database round-trip

`npm run test:db` signs in as a **throwaway** account, saves an entry in every
profile section the way the app does, reads it back, checks the derived points,
and then **deletes all of that account's data**. Never use a real account.

Both live scripts read `TEST_EMAIL` / `TEST_PASSWORD` from the environment, or
from `.env.test.local` (git-ignored):

```ini
TEST_EMAIL=throwaway@example.com
TEST_PASSWORD=...
```

Checks marked `TODO` need migration `20261122000000_sync_points_from_profile`
applied to the database.
