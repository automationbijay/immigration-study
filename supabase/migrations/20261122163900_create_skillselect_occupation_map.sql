create function public.normalize_skillselect_occupation(occupation text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
    select lower(btrim(regexp_replace(occupation, '[[:space:]]+', ' ', 'g')));
$$;

revoke all on function public.normalize_skillselect_occupation(text)
    from public, anon, authenticated;
grant execute on function public.normalize_skillselect_occupation(text) to service_role;

create table public.skillselect_occupation_map (
    normalized_occupation text primary key
        check (normalized_occupation <> '' and
            normalized_occupation = public.normalize_skillselect_occupation(normalized_occupation)),
    anzsco_code_2013 integer not null
        references public.scra_abs_anzsco_code_2013 (anzsco_code) on delete restrict
        check (anzsco_code_2013 between 100000 and 999999),
    anzsco_code_2022 integer
        references public.scra_abs_anzsco_code_2022 (anzsco_code) on delete restrict
        check (anzsco_code_2022 between 100000 and 999999),
    matched_title_2013 text not null check (btrim(matched_title_2013) <> ''),
    matched_title_2022 text check (btrim(matched_title_2022) <> ''),
    match_method_2013 text not null
        check (match_method_2013 in ('principal_title', 'alternative_title', 'manual')),
    match_method_2022 text not null,
    review_note text,
    updated_at timestamptz not null default now(),
    check (
        (anzsco_code_2022 is not null and matched_title_2022 is not null
            and match_method_2022 in ('principal_title', 'alternative_title', 'manual', 'renamed_title'))
        or (anzsco_code_2022 is null and matched_title_2022 is null
            and match_method_2022 in ('split', 'ambiguous', 'unmatched'))
    ),
    check (
        (match_method_2013 <> 'manual' and match_method_2022 not in ('manual', 'renamed_title', 'split'))
        or coalesce(btrim(review_note), '') <> ''
    )
);

create index skillselect_occupation_map_2013_code_idx
    on public.skillselect_occupation_map (anzsco_code_2013);
create index skillselect_occupation_map_2022_code_idx
    on public.skillselect_occupation_map (anzsco_code_2022)
    where anzsco_code_2022 is not null;

comment on table public.skillselect_occupation_map is
    'Maps SkillSelect invitation labels to ANZSCO 2013 codes and single-code ANZSCO 2022 comparisons.';
comment on column public.skillselect_occupation_map.anzsco_code_2022 is
    'Null when no single 2022 comparison is supported. See match_method_2022 and review_note.';

alter table public.skillselect_occupation_map enable row level security;
revoke all on public.skillselect_occupation_map from public, anon, authenticated;
grant select, insert, update on public.skillselect_occupation_map to service_role;

create function public.backfill_skillselect_occupation_map()
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
    inserted_count bigint;
begin
    with raw_titles(edition, anzsco_code, title, category) as (
        select 2013, anzsco_code, title, category from public.scra_abs_anzsco_title_2013
        union all
        select 2022, anzsco_code, title, category from public.scra_abs_anzsco_title_2022
    ), titles as (
        select *, public.normalize_skillselect_occupation(title) as title_key
        from raw_titles
        where category in ('Principal Title', 'Alternative Title')
            and anzsco_code between 100000 and 999999
    ), labels as (
        select distinct public.normalize_skillselect_occupation(occupation) as label
        from public.scr_skillselect_invitation_pts
    ), source_corrections(label, title_key, note) as (
        values ('engineering professionals (nec)', 'engineering professionals nec',
                '2024-06-13. Accepted the parenthesized nec variant.'),
               ('life scientist (nec)', 'life scientists nec',
                '2024-06-13. Accepted the singular and parenthesized nec variant.'),
               ('psychologist (nec)', 'psychologists nec',
                '2024-06-13. Accepted the singular and parenthesized nec variant.'),
               ('registered nurses (nec)', 'registered nurses nec',
                '2024-06-13. Accepted the parenthesized nec variant.'),
               ('software and applications programmers (nec)', 'software and applications programmers nec',
                '2024-06-13. Accepted the parenthesized nec variant.'),
               ('medical radiation therapist+', 'medical radiation therapist',
                '2024-11-07. Accepted the source label with a trailing plus sign.'),
               ('patho', 'pathologist',
                '2023-05-25. User approved interpreting the published abbreviation Patho as Pathologist.')
    ), renamed_2022(label, title_key) as (
        values ('fibrous plasterer', 'plasterer (wall and ceiling)'),
               ('forester', 'forester / forest scientist'),
               ('naval architect', 'naval architect / marine designer'),
               ('painting trades worker', 'painter'),
               ('sheetmetal trades worker', 'sheetmetal worker'),
               ('speech pathologist', 'speech pathologist / speech language therapist'),
               ('welder (first class)', 'welder (first class) (aus) / welder (nz)')
    ), splits_2022(label, note) as (
        values ('cabinetmaker', 'ANZSCO 2022 distinguishes Cabinet Maker (394112) from Furniture Maker (394113).'),
               ('ict security specialist', 'ANZSCO 2022 lists multiple cyber security occupations (262114–262118) and the source provides no specialisation.')
    ), candidates as (
        select l.label, e.edition, count(distinct t.anzsco_code) as code_count,
               min(t.anzsco_code) as candidate_code,
               coalesce(min(t.title) filter (where t.category = 'Principal Title'), min(t.title)) as matched_title,
               bool_or(t.category = 'Principal Title') as has_principal,
               m.note as correction_note, r.title_key as renamed_title_key, s.note as split_note
        from labels l
        cross join (values (2013), (2022)) e(edition)
        left join source_corrections m using (label)
        left join renamed_2022 r on r.label = l.label and e.edition = 2022
        left join splits_2022 s on s.label = l.label and e.edition = 2022
        left join titles t on t.edition = e.edition
            and s.label is null
            and t.title_key = coalesce(m.title_key, r.title_key, l.label)
            and (coalesce(m.title_key, r.title_key) is null or t.category = 'Principal Title')
        group by l.label, e.edition, m.note, r.title_key, s.note
    ), matches as (
        select label, edition,
               case when code_count = 1 then candidate_code end as anzsco_code,
               case when code_count = 1 then matched_title end as matched_title,
               case when split_note is not null then 'split'
                    when code_count = 0 then 'unmatched'
                    when code_count > 1 then 'ambiguous'
                    when correction_note is not null then 'manual'
                    when renamed_title_key is not null then 'renamed_title'
                    when has_principal then 'principal_title'
                    else 'alternative_title' end as match_method,
               case when split_note is not null then split_note
                    when code_count = 1 and correction_note is not null then
                        correction_note || ' Source: https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/rounds/previous-rounds'
                    when code_count = 1 and renamed_title_key is not null then
                        'The 2022 title index lists the renamed principal title ' || matched_title || '.'
               end as review_note
        from candidates
    )
    insert into public.skillselect_occupation_map (
        normalized_occupation, anzsco_code_2013, anzsco_code_2022, matched_title_2013,
        matched_title_2022, match_method_2013, match_method_2022, review_note
    )
    select m13.label, m13.anzsco_code, m22.anzsco_code, m13.matched_title,
           m22.matched_title, m13.match_method, m22.match_method,
           nullif(concat_ws(' ', m13.review_note,
               case when m22.review_note is distinct from m13.review_note then m22.review_note end), '')
    from matches m13
    join matches m22 using (label)
    where m13.edition = 2013 and m22.edition = 2022 and m13.anzsco_code is not null
    on conflict (normalized_occupation) do nothing;

    get diagnostics inserted_count = row_count;
    return inserted_count;
end;
$$;

revoke all on function public.backfill_skillselect_occupation_map()
    from public, anon, authenticated;
grant execute on function public.backfill_skillselect_occupation_map() to service_role;

-- The edition-specific title tables are imported separately on a fresh database.
do $$
begin
    if to_regclass('public.scra_abs_anzsco_title_2013') is not null
        and to_regclass('public.scra_abs_anzsco_title_2022') is not null
    then
        perform public.backfill_skillselect_occupation_map();
    end if;
end;
$$;
