# Australia Visa Immigration Study

A modern React-based application designed to help potential immigrants calculate their points for the Australian Skilled Nominated Visa (Subclass 190).

## 🚀 Project Overview
This repository contains two main components:
1. **Frontend Web App**: A premium React UI built with Vite for users to calculate their immigration points interactively.
2. **Data Pipeline**: Python-based web scrapers that automatically fetch the latest Australian ANZSCO skilled occupation lists and securely seed them into a Supabase PostgreSQL database.

---

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Vanilla CSS (CSS Grid, Glassmorphism design)
- **Database**: Supabase (PostgreSQL)
- **Scraping Engine**: Python, Playwright (Headless Browser)
- **Hosting**: Vercel

---

## 📁 Directory Structure
- `/web-app` - Contains the React Vite application.
- `/docs/australia` - Contains the raw scraped JSON datasets for the MLTSSL, ROL, and STSOL occupation lists.
- `/script` - Contains the Python automation scripts for scraping and database seeding.
- `/.agents/skills` - Contextual AI coding rules and best practices for Supabase and React.

---

## 💻 Getting Started

### 1. Frontend Web App
To run the points calculator locally:
```bash
cd web-app
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

### 2. Environment Variables
To use the data pipeline scripts, you must configure a `.env` file at the root of the project with your Supabase database connection string:
```ini
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
```

### 3. Scraping Occupation Lists
We use Playwright to bypass pagination and extract the exact tables from ANZSCO Search. To scrape the latest data to JSON:
```bash
# Scrape individual lists
python script/scrape_mltssl.py
python script/scrape_rol.py
python script/scrape_stsol.py

# Or run the master script to scrape all three simultaneously
python script/scrape_all.py
```

### 4. Seeding the Database
To inject the scraped JSON data into your live Supabase database tables (`anzsco_mltssl`, `anzsco_rol`, `anzsco_stsol`), run:
```bash
python script/seed_mltssl.py
python script/seed_rol.py
python script/seed_stsol.py
```
*Note: These scripts will automatically drop the existing tables, recreate them with an optimized `anzsco_code` index, and securely bulk-insert the new data.*
