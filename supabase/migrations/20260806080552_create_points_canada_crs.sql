create table public.points_canada_crs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) not null,
    q1 text,
    q2i text,
    q2ii text,
    q3 text,
    q4 text,
    q4b text,
    q4c text,
    q5i text,
    q5i_a text,
    q6i text,
    q6ii text,
    q7 text,
    q8 text,
    q8a text,
    q9 text,
    q10i text,
    q10 text,
    q11 text,
    q12i text,
    total_points integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.points_canada_crs enable row level security;

-- Create policies
create policy "Users can view own CRS points"
    on public.points_canada_crs for select
    using (auth.uid() = user_id);

create policy "Users can insert own CRS points"
    on public.points_canada_crs for insert
    with check (auth.uid() = user_id);

create policy "Users can update own CRS points"
    on public.points_canada_crs for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own CRS points"
    on public.points_canada_crs for delete
    using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger set_updated_at
    before update on public.points_canada_crs
    for each row
    execute function public.handle_updated_at();
