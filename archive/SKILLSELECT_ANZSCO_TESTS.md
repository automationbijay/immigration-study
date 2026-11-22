# SkillSelect to ANZSCO mapping tests

Archived baseline for the original lookup. See the [deployed mapping and versioned tests](../docs/australia/skillselect-anzsco-mapping.md).

The baseline uses the linked Supabase database and a read-only SQL statement. The query models the proposed resolver and left join with CTEs. It also exercises deliberate ambiguities and duplicate title rows with synthetic fixtures. The proposed migration and application integration have their own acceptance tests below.

## Reproduce the baseline

Run the SQL in the Supabase SQL editor or pass it to `supabase db query` for the intended project. Snapshot counts below are for the 1,642-row import. On later imports, use the current source counts and inspect changes in match coverage.

```sql
with occupations as (
    select anzsco_code, principal_title
    from public.scra_abs_anzsco_code_2013
    where anzsco_code between 100000 and 999999
),
raw_titles as (
    select anzsco_code, principal_title as title, 'principal_title' as method
    from occupations
    union all
    select a.anzsco_code, a.description, 'alternative_title'
    from public.anzsco_alternative_title a
    join occupations c using (anzsco_code)
    where a.category = 'Alternative Title'
),
titles as (
    select anzsco_code, method,
           lower(btrim(regexp_replace(title, '[[:space:]]+', ' ', 'g'))) as label
    from raw_titles
),
cutoffs as (
    select p.*,
           lower(btrim(regexp_replace(occupation, '[[:space:]]+', ' ', 'g'))) as label
    from public.scr_skillselect_invitation_pts p
),
labels as (
    select distinct label from cutoffs
),
matches as (
    select l.label, count(distinct t.anzsco_code) as code_count,
           min(t.anzsco_code) as candidate_code,
           case when count(distinct t.anzsco_code) = 0 then 'unmatched'
                when count(distinct t.anzsco_code) > 1 then 'ambiguous'
                when bool_or(t.method = 'principal_title') then 'principal_title'
                else 'alternative_title' end as match_method
    from labels l left join titles t using (label)
    group by l.label
),
joined as (
    select p.*, m.match_method, c.anzsco_code, c.principal_title
    from cutoffs p
    left join matches m on m.label = p.label
    left join occupations c
        on m.code_count = 1 and c.anzsco_code = m.candidate_code
),
payload_diff as (
    (select round_date, occupation, subclass_189_points, subclass_491_points from cutoffs
     except all
     select round_date, occupation, subclass_189_points, subclass_491_points from joined)
    union all
    (select round_date, occupation, subclass_189_points, subclass_491_points from joined
     except all
     select round_date, occupation, subclass_189_points, subclass_491_points from cutoffs)
),
duplicate_round_codes as (
    select round_date, anzsco_code from joined
    where anzsco_code is not null
    group by 1, 2 having count(*) > 1
),
history_lookup(input) as (
    values ('  Physical   Therapist  '), ('Physiotherapist'), ('252511')
),
history_codes as (
    select h.input,
           array(select distinct t.anzsco_code from titles t
                 where t.label = lower(btrim(regexp_replace(h.input, '[[:space:]]+', ' ', 'g')))
                 union
                 select c.anzsco_code from occupations c
                 where c.anzsco_code::text = h.input) as codes
    from history_lookup h
),
exception_inputs(label, expected_title) as (
    values ('engineering professionals (nec)', 'Engineering Professionals nec'),
           ('life scientist (nec)', 'Life Scientists nec'),
           ('medical radiation therapist+', 'Medical Radiation Therapist'),
           ('patho', 'Pathologist'),
           ('psychologist (nec)', 'Psychologists nec'),
           ('registered nurses (nec)', 'Registered Nurses nec'),
           ('software and applications programmers (nec)', 'Software and Applications Programmers nec')
),
exception_candidates as (
    select p.round_date, p.occupation, p.subclass_189_points, p.subclass_491_points,
           e.expected_title, c.anzsco_code as candidate_code,
           exists (select 1 from joined j
                   where j.round_date = p.round_date and j.anzsco_code = c.anzsco_code)
               as clashes_with_exact_match
    from cutoffs p
    join exception_inputs e using (label)
    left join occupations c on lower(c.principal_title) = lower(e.expected_title)
),
fixture_titles(label, anzsco_code, method) as (
    values ('duplicate same code', 100001, 'principal_title'),
           ('duplicate same code', 100001, 'alternative_title'),
           ('cross-code collision', 100001, 'principal_title'),
           ('cross-code collision', 100002, 'alternative_title'),
           ('alias only', 100002, 'alternative_title')
),
fixture_labels(label, expected_count, expected_method) as (
    values ('duplicate same code', 1, 'principal_title'),
           ('cross-code collision', 2, 'ambiguous'),
           ('alias only', 1, 'alternative_title'),
           ('unknown', 0, 'unmatched')
),
fixture_results as (
    select f.label, f.expected_count, f.expected_method,
           count(distinct t.anzsco_code) as actual_count,
           case when count(distinct t.anzsco_code) = 0 then 'unmatched'
                when count(distinct t.anzsco_code) > 1 then 'ambiguous'
                when bool_or(t.method = 'principal_title') then 'principal_title'
                else 'alternative_title' end as actual_method
    from fixture_labels f left join fixture_titles t using (label)
    group by f.label, f.expected_count, f.expected_method
)
select 'baseline' as section, jsonb_build_object(
    'source_rows', (select count(*) from cutoffs),
    'distinct_raw_labels', (select count(distinct occupation) from cutoffs),
    'normalized_labels', (select count(*) from labels),
    'rounds', (select count(distinct round_date) from cutoffs),
    'joined_rows', (select count(*) from joined),
    'payload_differences', (select count(*) from payload_diff),
    'duplicate_round_codes', (select count(*) from duplicate_round_codes),
    'alias_rows_outside_2013', (
        select count(*) from public.anzsco_alternative_title a
        where a.category = 'Alternative Title'
          and not exists (select 1 from occupations c where c.anzsco_code = a.anzsco_code)
    )
) as result
union all
select 'coverage', jsonb_build_object('method', match_method,
    'labels', count(distinct label), 'cutoff_rows', count(*))
from joined group by match_method
union all
select 'alias history', jsonb_build_object(
    'input', input, 'codes', codes,
    'history_rows', (select count(*) from joined j where j.anzsco_code = any(h.codes)),
    'history_dates', (select jsonb_agg(j.round_date order by j.round_date)
                      from joined j where j.anzsco_code = any(h.codes)))
from history_codes h
union all
select 'exception candidate', to_jsonb(e) from exception_candidates e
union all
select 'rule fixture', to_jsonb(f) || jsonb_build_object(
    'passed', actual_count = expected_count and actual_method = expected_method)
from fixture_results f
order by 1, 2;
```

## Live baseline results

Executed on 2026-11-22 against the linked Supabase database with no schema or data changes.

| Check | Observed result |
|---|---|
| Source inventory | 1,642 cutoff rows, 219 raw labels, 217 normalized labels, 14 rounds |
| Unique exact principal-title matches | 210 labels, 1,635 cutoff rows |
| Unique exact alternative-title-only matches | 0 labels, 0 cutoff rows |
| Ambiguous exact matches | 0 labels, 0 cutoff rows |
| Unmatched | 7 labels, 7 cutoff rows |
| Left join row preservation | 1,642 output rows and zero raw payload differences, including missing scores |
| Duplicate round and code | 0 among exact matches |
| Alternative titles outside the 2013 code set | 65 title rows excluded |
| Alias, principal title, and numeric code | “Physical Therapist,” “Physiotherapist,” and `252511` all resolve to `252511` and the same 14 rounds |
| Rule fixtures | 4 of 4 passed. Duplicate rows for one code, a collision between codes, an alternative-only match, and an unknown label. |
| Exception proposals | All seven proposed codes exist in the 2013 table. Each occurs on a distinct round/code pair and none collides with an exact match. Source identity still requires review. |

Home Affairs publishes the original label `Patho` for the 25 May 2023 round. That verifies the scraped label. The source excerpt leaves the full occupation title unresolved. [Home Affairs previous rounds](https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/rounds/previous-rounds)

## Acceptance tests after implementation

| Test | Expected result |
|---|---|
| First backfill and rerun | The first run inserts the expected exact mappings. The second run makes zero mapping changes. |
| Source payload and unresolved rows | The internal join returns one row per raw key. Both scores and the original label match the source, including `NULL` scores. Unresolved labels remain visible to the review report. |
| Ambiguous candidate | A test label shared by two 2013 codes appears for review without an automatic mapping. |
| Manual decision survives import | Rerunning imports with an existing reviewed mapping preserves its code and review evidence. If the reference candidates change, the job reports the drift. |
| New alias on import | A new source label with one exact 2013 alternative-title match receives that code. An absent or ambiguous title is reported as unresolved. |
| Source repetition or retry | A repeated batch creates no duplicate source keys or mapping records. |
| Same-round duplicate code | Two source labels mapped to the same code in the same round appear in the collision report. Publication withholds the affected round/code until reviewed. |
| App history lookup | Alias, principal title, and numeric code return identical dates and scores. An unknown title yields no history. Ambiguous input prompts the user to select an occupation. |
| Access | The authorized server path can read history. Direct anonymous and authenticated requests to service-only tables and views are denied. |
