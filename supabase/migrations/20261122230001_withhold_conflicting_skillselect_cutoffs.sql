-- Public read path for SkillSelect minimum invitation points by ANZSCO 2013 code.
-- The underlying tables stay service_role-only; this function exposes just the
-- per-round cut-offs for one occupation. Withhold any round/code pair where
-- multiple source rows would require a review before publication.
create or replace function public.get_skillselect_cutoffs(p_anzsco_code integer)
returns table (
    round_date date,
    subclass_189_points smallint,
    subclass_491_points smallint
)
language sql
stable
security definer
set search_path = ''
as $$
    select p.round_date,
           min(p.subclass_189_points) as subclass_189_points,
           min(p.subclass_491_points) as subclass_491_points
    from public.scr_skillselect_invitation_pts p
    join public.skillselect_occupation_map m
      on m.normalized_occupation = public.normalize_skillselect_occupation(p.occupation)
    where m.anzsco_code_2013 = p_anzsco_code
    group by p.round_date
    having count(*) = 1
        and (min(p.subclass_189_points) is not null
             or min(p.subclass_491_points) is not null)
    order by p.round_date;
$$;

revoke all on function public.get_skillselect_cutoffs(integer) from public;
grant execute on function public.get_skillselect_cutoffs(integer) to anon, authenticated, service_role;
