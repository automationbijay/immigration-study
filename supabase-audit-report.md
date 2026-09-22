# Supabase Database Audit Report

## Executive Summary
**Overall Health Score:** 80/100 (Fair)
**Total Issues Found:** 
- **Critical:** 4 (Missing RLS Policies)
- **Warning:** 2 (Volatile Functions marked as STABLE)
- **Optimization:** 15 (Unused Indexes)

## Security & RLS Gaps
All tables have Row Level Security explicitly enabled, but the following tables in the `public` schema have no policies defined, making them completely inaccessible:
- `anzsco_mltssl`
- `anzsco_rol`
- `anzsco_stsol`
- `aus_language_classification`

**Proposed Migration SQL:**
```sql
CREATE POLICY "Enable read access for all users" ON "public"."anzsco_mltssl" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."anzsco_rol" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."anzsco_stsol" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."aus_language_classification" AS PERMISSIVE FOR SELECT TO public USING (true);
```

## Schema Warnings
- `public.search_job_titles` and `public.search_universities` have functions marked as `STABLE` but contain `VOLATILE` expressions (`PERFORM` statements).

## Performance & Indexing
- **Cache Hit Rates:** Good (Index hit rate: 0.98, Table hit rate: 0.96)
- **Table Bloat:** Minimal (Highest bloat is `cv_metadata` at 4.0, but only 24 kB waste)
- **Unused Indexes (Candidates for Pruning):**
  - `public.anzsco_occupations_name_idx`
  - `public.anzsco_occupations_code_idx`
  - `public.idx_anzsco_visa_federal_residency_type`
  - `public.idx_anzsco_mltssl_anzsco_code`
  - `public.idx_anzsco_visa_federal_list_code`
  - `public.cv_llamaparsed_user_id_idx`
  - `public.idx_anzsco_rol_anzsco_code`
  - `public.cv_llamaparsed_cv_id_key`
  - `public.education_user_id_idx`
  - `public.idx_anzsco_visa_federal_subclass`
  - `public.profile_job_classification_user_id_idx`
  - `public.idx_anzsco_stsol_anzsco_code`
  - `public.cv_metadata_extraction_status_idx`

## Action Items
1. **[CRITICAL]** Add RLS policies for `anzsco_mltssl`, `anzsco_rol`, `anzsco_stsol`, and `aus_language_classification`.
2. **[WARNING]** Fix volatile expressions in `search_job_titles` and `search_universities` functions or change their volatility marker.
3. **[OPTIMIZATION]** Prune unused indexes to optimize write performance and save storage.
