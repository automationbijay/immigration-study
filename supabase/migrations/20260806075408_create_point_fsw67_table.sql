create table public.point_fsw67 (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) not null,
    experience_points integer default 0,
    age_points integer default 0,
    education_points integer default 0,
    language_reading_points integer default 0,
    language_writing_points integer default 0,
    language_listening_points integer default 0,
    language_speaking_points integer default 0,
    arranged_employment_points integer default 0,
    adaptability_spouse_lang integer default 0,
    adaptability_past_study integer default 0,
    adaptability_spouse_study integer default 0,
    adaptability_past_work integer default 0,
    adaptability_spouse_work integer default 0,
    adaptability_arranged_emp integer default 0,
    adaptability_relative integer default 0,
    total_points integer default 0,
    is_eligible boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.point_fsw67 enable row level security;

-- Create policies
create policy "Users can view own FSW points"
    on public.point_fsw67 for select
    using (auth.uid() = user_id);

create policy "Users can insert own FSW points"
    on public.point_fsw67 for insert
    with check (auth.uid() = user_id);

create policy "Users can update own FSW points"
    on public.point_fsw67 for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own FSW points"
    on public.point_fsw67 for delete
    using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger set_updated_at
    before update on public.point_fsw67
    for each row
    execute function public.handle_updated_at();
