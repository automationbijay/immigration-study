# SkillSelect occupation mapping for ANZSCO 2013 and 2022

The mapping was deployed to Supabase on 22 November 2026. It maps all 1,642 SkillSelect cutoff rows to 2013 codes and 1,629 to a single 2022 code. It uses `public.scra_abs_anzsco_title_2013` and `public.scra_abs_anzsco_title_2022` as title sources. Each exposes `anzsco_code`, `title`, and `category`. The original unversioned lookup is documented in the archive. [Original plan](../../archive/SKILLSELECT_ANZSCO_PLAN.md), [Original tests](../../archive/SKILLSELECT_ANZSCO_TESTS.md)

SkillSelect 189 and family-sponsored 491 history uses the 2013 classification. The 2022 code is a separate comparison field. [Home Affairs skilled occupation list](https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list), [SkillSelect rounds](https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/rounds)

## Test results

| Match method | 2013 labels | 2013 cutoff rows | 2022 labels | 2022 cutoff rows |
|---|---:|---:|---:|---:|
| Exact principal title | 210 | 1,635 | 199 | 1,546 |
| Exact alternative title | 0 | 0 | 2 | 20 |
| Approved source label correction | 7 | 7 | 7 | 7 |
| Explicit renamed-title match | 0 | 0 | 7 | 56 |
| No single matching code | 0 | 0 | 2 | 13 |
| Total | 217 | 1,642 | 217 | 1,642 |

The join preserved every source row, label, and points value, including `NULL` scores. There were no duplicate round/code pairs in either edition and no resolved codes missing from their corresponding edition's code table. The principal title `Physiotherapist` and its alternative title `Physical Therapist` each returned code `252511` and the same 14 rounds under either edition.

Five labels resolved to different numeric codes through exact title matching.

| SkillSelect label | 2013 | 2022 |
|---|---:|---:|
| Agricultural Scientist | 234112 | 234114 |
| Management Consultant | 224711 | 224713 |
| Plumber (General) | 334111 | 334116 |
| Statistician | 224113 | 224116 |
| Zoologist | 234518 | 234522 |

The first pass had nine unmatched 2022 labels. The second pass checked the corresponding principal titles under seven retained codes.

| SkillSelect label | 2022 principal title | 2022 code |
|---|---|---:|
| Fibrous Plasterer | Plasterer (Wall and Ceiling) | 333211 |
| Forester | Forester / Forest Scientist | 234113 |
| Naval Architect | Naval Architect / Marine Designer | 233916 |
| Painting Trades Worker | Painter | 332211 |
| Sheetmetal Trades Worker | Sheetmetal Worker | 322211 |
| Speech Pathologist | Speech Pathologist / Speech Language Therapist | 252712 |
| Welder (First Class) | Welder (First Class) (Aus) / Welder (NZ) | 322313 |

### Two labels need more than one 2022 candidate

| SkillSelect label | 2013 code | Cutoff rows | 2022 comparison |
|---|---:|---:|---|
| Cabinetmaker | 394111 | 8 | Cabinet Maker `394112` and Furniture Maker `394113` |
| ICT Security Specialist | 262112 | 5 | Several distinct cyber security occupations. The published cutoff has no specialisation detail. |

Use `NULL` for the single 2022 code in these rows and retain the reason as a classification split. If the app needs to display candidate codes, expose them in a separate relation as candidates. The original cutoff belongs to the 2013 occupation. [ABS Cabinet and Furniture Makers](https://www.abs.gov.au/statistics/classifications/anzsco-australian-and-new-zealand-standard-classification-occupations/2022/browse-classification/3/39/394/3941), [ABS ICT Security Specialists unit group](https://www.abs.gov.au/statistics/classifications/anzsco-australian-and-new-zealand-standard-classification-occupations/2022/browse-classification/2/26/262/2621)

The seven approved source corrections resolve to the same codes in each edition. These include five `(nec)` variants, `Medical Radiation Therapist+`, and `Patho`. The `Patho` mapping to Pathologist `253915` is a user-approved interpretation of the abbreviated source label. [Home Affairs previous rounds](https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/rounds/previous-rounds)

## Deployed mapping table

`public.skillselect_occupation_map` stores one row per normalized source label. It has separate `anzsco_code_2013` and nullable `anzsco_code_2022` integer fields, each referencing the corresponding version's code table. It stores a matched title and match method per edition and a note for manual decisions, renamed titles, and classification splits. Both code fields are indexed. The table uses RLS and the cutoff table's service-role access model. [Migration](../../supabase/migrations/20261122163900_create_skillselect_occupation_map.sql)

The resolver builds title candidates independently by edition. It compares principal and alternative titles after lowercasing and normalizing whitespace, preserves occupation qualifiers, and requires a single distinct code per edition. The seven source corrections and seven 2022 title renames are explicit rules. The two classification splits are recorded with `match_method_2022 = 'split'`.

To read the cutoff history with both versioned codes, join on the normalized label. The left join keeps raw rows visible when a future upload introduces a label without a mapping.

```sql
select p.round_date, p.occupation, m.anzsco_code_2013, m.anzsco_code_2022,
       p.subclass_189_points, p.subclass_491_points
from public.scr_skillselect_invitation_pts p
left join public.skillselect_occupation_map m
    on m.normalized_occupation = public.normalize_skillselect_occupation(p.occupation)
order by p.round_date desc, p.occupation;
```

After importing new cutoff rows, run `select public.backfill_skillselect_occupation_map();` through the service-role path. The function inserts mappings for new labels with one 2013 code and preserves existing decisions. Inspect new rows without a 2013 mapping using the left join above, and run the comparison query below to review unresolved candidates and code differences between editions. Fresh databases need both edition-specific title tables and their code data loaded before running the backfill.

Deployment validation confirmed 217 mapping rows, zero changes to the raw cutoff payload, and zero duplicate round/code pairs in either edition. All persisted codes matched the read-only audit, and a service-role backfill rerun inserted zero rows. The live recheck confirmed the migration is recorded, RLS is enabled, and the service role can read the mapping table. Direct reads by the anonymous and authenticated roles are denied.

## Australia Occupation Explorer

The Australia Occupation Explorer calls `get_skillselect_cutoffs(p_anzsco_code)` with the selected occupation's 2013 code. Anonymous and authenticated users can call this read-only RPC, which returns only the round date and the two published cutoffs. Direct reads from its source tables require the service role. The page shows a chart and a keyboard-accessible table that starts expanded, preserves missing scores, and displays a separate message when the request fails.

The collision-handling migration requires exactly one source row per round and code before publishing that round. A rollback test against Supabase retrieved 14 Physiotherapist rounds as an anonymous caller, confirmed direct table access was denied, and withheld the affected round after a duplicate source row was introduced within the test transaction. [Duplicate handling migration](../../supabase/migrations/20261122230001_withhold_conflicting_skillselect_cutoffs.sql)

## Reproduce the read-only test

Run the following query against the target database. The two outputs for `edition differences` with a null 2022 code are expected for this snapshot.

```sql
with raw_titles(edition, anzsco_code, title, category) as (
    select 2013, anzsco_code, title, category from public.scra_abs_anzsco_title_2013
    union all
    select 2022, anzsco_code, title, category from public.scra_abs_anzsco_title_2022
), titles as (
    select *, lower(btrim(regexp_replace(title, '[[:space:]]+', ' ', 'g'))) as title_key
    from raw_titles
    where category in ('Principal Title', 'Alternative Title')
      and anzsco_code between 100000 and 999999
), cutoffs as (
    select *, lower(btrim(regexp_replace(occupation, '[[:space:]]+', ' ', 'g'))) as label
    from public.scr_skillselect_invitation_pts
), labels as (
    select label, count(*) as cutoff_rows,
           array_agg(distinct occupation order by occupation) as spellings
    from cutoffs group by label
), manual(label, title_key) as (
    values ('engineering professionals (nec)', 'engineering professionals nec'),
           ('life scientist (nec)', 'life scientists nec'),
           ('psychologist (nec)', 'psychologists nec'),
           ('registered nurses (nec)', 'registered nurses nec'),
           ('software and applications programmers (nec)', 'software and applications programmers nec'),
           ('medical radiation therapist+', 'medical radiation therapist'),
           ('patho', 'pathologist')
), renamed_2022(label, title_key) as (
    values ('fibrous plasterer', 'plasterer (wall and ceiling)'),
           ('forester', 'forester / forest scientist'),
           ('naval architect', 'naval architect / marine designer'),
           ('painting trades worker', 'painter'),
           ('sheetmetal trades worker', 'sheetmetal worker'),
           ('speech pathologist', 'speech pathologist / speech language therapist'),
           ('welder (first class)', 'welder (first class) (aus) / welder (nz)')
), tested as (
    select l.*, e.edition,
           count(distinct t.anzsco_code) as code_count,
           array_agg(distinct t.anzsco_code order by t.anzsco_code)
               filter (where t.anzsco_code is not null) as candidates,
           array_agg(distinct t.title order by t.title)
               filter (where t.title is not null) as titles,
           case when count(distinct t.anzsco_code) = 0 then 'unmatched'
                when count(distinct t.anzsco_code) > 1 then 'ambiguous'
                when m.label is not null then 'manual'
                when r.label is not null then 'renamed_title'
                when bool_or(t.category = 'Principal Title') then 'principal_title'
                else 'alternative_title' end as method
    from labels l
    cross join (values (2013), (2022)) e(edition)
    left join manual m using (label)
    left join renamed_2022 r on r.label = l.label and e.edition = 2022
    left join titles t on t.edition = e.edition
        and t.title_key = coalesce(m.title_key, r.title_key, l.label)
        and (coalesce(m.label, r.label) is null or t.category = 'Principal Title')
    group by l.label, l.cutoff_rows, l.spellings, e.edition, m.label, r.label
), comparison as (
    select a.label, a.spellings, a.cutoff_rows,
           a.candidates as codes_2013, b.candidates as codes_2022,
           a.method as method_2013, b.method as method_2022
    from tested a join tested b using (label)
    where a.edition = 2013 and b.edition = 2022
), joined as (
    select p.round_date, p.occupation, p.subclass_189_points, p.subclass_491_points,
           case when cardinality(c.codes_2013) = 1 then c.codes_2013[1] end as code_2013,
           case when cardinality(c.codes_2022) = 1 then c.codes_2022[1] end as code_2022
    from cutoffs p left join comparison c using (label)
), payload_diff as (
    (select round_date, occupation, subclass_189_points, subclass_491_points from cutoffs
     except all
     select round_date, occupation, subclass_189_points, subclass_491_points from joined)
    union all
    (select round_date, occupation, subclass_189_points, subclass_491_points from joined
     except all
     select round_date, occupation, subclass_189_points, subclass_491_points from cutoffs)
), round_collisions as (
    select e.edition, round_date, e.code
    from joined j cross join lateral (values (2013,j.code_2013), (2022,j.code_2022)) e(edition,code)
    where e.code is not null group by 1,2,3 having count(*) > 1
), alias_codes as (
    select edition, title_key, array_agg(distinct anzsco_code order by anzsco_code) as codes
    from titles where title_key in ('physical therapist', 'physiotherapist') group by 1,2
)
select 'coverage' as kind, jsonb_build_object('edition', edition, 'method', method,
    'labels', count(*), 'cutoffs', sum(cutoff_rows)) as details
from tested group by edition, method
union all
select 'exceptions', to_jsonb(c) from comparison c where method_2013 = 'manual' or method_2022 in ('manual', 'renamed_title')
union all
select 'edition differences', to_jsonb(c) from comparison c
where codes_2013 is distinct from codes_2022 or method_2013 in ('ambiguous','unmatched')
   or method_2022 in ('ambiguous','unmatched')
union all
select 'alias', to_jsonb(a) || jsonb_build_object('history_rows',
    (select count(*) from joined j
     where case a.edition when 2013 then j.code_2013 else j.code_2022 end = any(a.codes)))
from alias_codes a
union all
select 'invariants', jsonb_build_object('source_rows', (select count(*) from cutoffs),
    'joined_rows', (select count(*) from joined), 'payload_differences', (select count(*) from payload_diff),
    'round_code_collisions', (select count(*) from round_collisions),
    'code_2013_fk_gaps', (select count(distinct code_2013) from joined j where code_2013 is not null
        and not exists (select 1 from public.scra_abs_anzsco_code_2013 c where c.anzsco_code = j.code_2013)),
    'code_2022_fk_gaps', (select count(distinct code_2022) from joined j where code_2022 is not null
        and not exists (select 1 from public.scra_abs_anzsco_code_2022 c where c.anzsco_code = j.code_2022)))
order by 1,2;
```
