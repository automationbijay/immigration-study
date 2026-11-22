# Supabase Database Schema Overview

How the Supabase database is organised. Tables are grouped by prefix. Every
per-user table has Row Level Security: a signed-in user can only read and write
their own rows, and signed-out visitors see nothing.

## 1. User profile (`profile_` prefix)

Facts the user enters on the Profile page or that the CV import fills in.

- **`profile_basic`**: name, date of birth, email, phone, country, location, marital status (key: `id` = user id).
- **`profile_education`**: qualifications (`level` uses the Profile form's values: `High School`, `Diploma`, `Bachelor`, `Masters`, `Doctorate`, `Unrecognized`).
- **`profile_experience`**: jobs (`company_name`, `role`, `country`, `start_date` are required; `end_date` null means current).
- **`profile_family`**: partner and family members (key column: `profile_id`).
- **`profile_job_classification`**: the occupation chosen in the ANZSCO tool.

## 2. Points and estimates (`point_` / `points_` prefix)

- **`point_australia`**: one row per user (`id` = user id). The Australian points-test inputs.
  - `age`, `english`, `education`, `partnerSkills` are stored as **points**.
  - `overseasExp` and `ausExp` are stored as **years**.
  - `NULL` means "not answered yet". New users start with `NULL`s (migration `20261122000000`).
  - `experienceAnzsco` / `educationAnzsco` hold the chosen occupation code.
- **`point_fsw67`**: saved Canada Federal Skilled Worker estimate (`user_id`, per-factor points, `total_points`, `is_eligible`).
- **`points_canada_crs`**: reserved for Canada CRS estimates.

### Derived values (database triggers)

`point_australia` is kept in step with the profile tables automatically. The
calculator can also set these columns directly. Whichever edit is latest wins.

| Source table | Updates | Rule |
|---|---|---|
| `test_ielts`, `test_pte`, `test_toefl`, `test_cambridge`, `test_oet` | `english` | Best `pr_points` across all tests; `NULL` when none remain. Recalculated on insert, update **and delete**. |
| `profile_education` | `education` | Highest completed qualification: Doctorate 20, Masters/Bachelor 15, Diploma 10, otherwise 0. In-progress (future end date) scores 0. `NULL` when no entries. |
| `profile_experience` | `overseasExp`, `ausExp` | Distinct days worked in the last 10 years, split by Australia vs elsewhere, in whole years. `NULL` when no entries. |

The helper functions (`recompute_*`) are `SECURITY DEFINER` and not callable by
clients; only the triggers run them.

## 3. Language tests (`test_` prefix)

`test_ielts`, `test_toefl`, `test_pte`, `test_cambridge`, `test_oet`: one row per
test sitting (`listening`, `reading`, `writing`, `speaking`, `overall`,
`test_date`). A `BEFORE` trigger fills `classification` and `pr_points` from
`aus_language_classification`.

## 4. CV processing (`cv_` prefix)

- **`cv_metadata`**: uploaded file reference and `extraction_status` (`processing`, `extracted`, `applied`, `failed`).
- **`cv_llamaparsed`**: audit copy of every value the extraction found.

See [cv-pipeline-n8n.md](cv-pipeline-n8n.md) for the full flow.

## 5. Site feedback

- **`feedback_submissions`**: "Report a mistake" and "Collaborate with us" form entries (`kind`, `category`, `name`, `email`, `organisation`, `page_url`, `message`, `status`).
  - Anyone can **insert**; nobody can read, change or delete through the API. Review submissions in the Supabase dashboard (Table editor → `feedback_submissions`), and set `status` to `in_progress`, `resolved` or `spam`.
  - Check constraints cap lengths, validate email, and require a name and email for collaboration requests.

## 6. ANZSCO occupations (`anzsco_` prefix)

Reference data, readable by everyone.

- **`anzsco`**, **`anzsco_titles`**, **`anzsco_occupations`**: occupation groups, alternative titles, requirements.
- **`anzsco_mltssl`**, **`anzsco_stsol`**, **`anzsco_rol`**, **`anzsco_csol`**: the skilled occupation lists.
- RPC **`search_job_titles(search_term, match_threshold, match_count)`**: typo-tolerant occupation search.

## 7. Other reference tables

- **`universities`** with RPC **`search_universities(...)`**: fuzzy institution search.
- **`countries`**: standard country list.
- **`aus_language_classification`**: English test score thresholds.

## 8. Account data deletion

RPC **`clear_user_data()`** (called by the `delete-user-data` edge function)
deletes the signed-in user's rows from every profile, points (including saved
Canada estimates), occupation, test and CV table, and detaches their feedback
submissions. `npm run test:db` verifies that nothing is left behind.
The edge function also removes their files from `cv-uploads`. The sign-in
account itself remains until removed in Supabase Auth.

---
**Note:** Legacy tables (`profiles`, `basic_details`, `language_proficiency`,
`education`, `skilled_occupations`) were migrated or renamed into the prefixed
structure above.
