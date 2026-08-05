# Australia Visa Migration Assistant

A modern, mobile-first React application designed to help potential immigrants calculate their points for the Australian Skilled Nominated Visa (Subclass 190). 

## 🚀 Project Overview
This repository contains two main components:
1. **Frontend Web App**: A premium, minimalist React UI optimized for smartphone users. Includes secure authentication, user profiles, an age-slider interface, a dynamic countries dropdown, and an interactive points calculator. It simplifies data entry for users by collecting raw inputs (e.g. raw IELTS/PTE scores instead of subjective dropdowns).
2. **Data Pipeline**: Python and Node.js-based scripts that automatically fetch the latest Australian ANZSCO skilled occupation lists as well as global university data (from Hipolabs) and securely seed them into a Supabase PostgreSQL database.

*Note: In the future, a separate logic layer will be built to convert the user's raw basic profile data into equivalent form values for probability and score calculations, further simplifying the user experience.*

---

## 🛠️ Tech Stack
- **Frontend**: React, Vite, React Router, Lucide Icons, Vanilla CSS (Mobile-first Minimalist design, "Trust & Authority" palette, Plus Jakarta Sans)
- **Database / Backend**: Supabase (PostgreSQL, Auth, RLS Policies)
- **Scraping Engine**: Python, Playwright (Headless Browser)
- **Hosting**: Vercel

---

## 📁 Directory Structure
- `/web-app` - Contains the React Vite application (Home dashboard, Auth flow, Profile builder).
- `/docs/australia` - Contains the raw scraped JSON datasets for the MLTSSL, ROL, and STSOL occupation lists.
- `/docs/universities.json` - Raw fetched JSON dataset of global universities from Hipolabs.
- `/script` - Contains the Python/Node automation, seeding, and test scripts, plus `/script/fixtures` (sample files used by the test scripts, e.g. a sample CV).
  - `seed_universities.js` - Connects directly to PostgreSQL via `pg` to batch-insert global universities.
  - `remove_duplicates.js` - Cleans up duplicate language test entries across all test tables.
- `/docs/reports` - Point-in-time audit and fix-plan documents (not living documentation).
- `/supabase/migrations` - Contains SQL schemas and seed data (e.g., `profiles` and `countries` tables).

---

## 💻 Getting Started

### 1. Frontend Web App
To run the Migration Assistant locally:
```bash
cd web-app
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser. The app expects environment variables for Supabase (in `web-app/.env.local`).

### 2. Environment Variables
To use the data pipeline scripts, configure a `.env` file at the root of the project with your Supabase database connection string:
```ini
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
```

### 3. Database Deployment
To push new migrations (like the `countries` table) to your remote Supabase database:
```bash
npx supabase db push
```

### 4. Scraping Occupation Lists
We use Playwright to bypass pagination and extract the exact tables from ANZSCO Search. To scrape the latest data to JSON:
```bash
# Scrape individual lists
python script/scrape_mltssl.py
python script/scrape_rol.py
python script/scrape_stsol.py

# Or run the master script to scrape all three simultaneously
python script/scrape_all.py
```

### 5. Seeding the Database
To inject the scraped JSON data into your live Supabase database tables, run:
```bash
python script/seed_mltssl.py
python script/seed_rol.py
python script/seed_stsol.py
```
*Note: These scripts will automatically drop the existing tables, recreate them with an optimized `anzsco_code` index, and securely bulk-insert the new data.*

### 6. Seeding Universities Data
To fetch the latest global universities data from the Hipolabs API, save the JSON locally in `docs/universities.json`, and bulk insert it into the `universities` table, run:
```bash
node script/seed_universities.js
```
*Make sure you have run `npm install pg` in the root folder, and your `.env.local` contains the remote database credentials or connection string if connecting to a hosted database.*
