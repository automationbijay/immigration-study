-- Create the cv_metadata table
create table if not exists public.cv_metadata (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    file_url text not null,
    file_name text not null,
    parsed_skills text[],
    parsed_experience_years integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add an index on user_id for faster lookups
create index if not exists cv_metadata_user_id_idx on public.cv_metadata(user_id);

-- Create updated_at trigger (if the function doesn't exist already)
-- Usually there is a common trigger function. If not, here's a basic one:
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger cv_metadata_updated_at
before update on public.cv_metadata
for each row execute procedure public.handle_updated_at();

-- Enable Row Level Security
alter table public.cv_metadata enable row level security;

-- Policies for RLS
create policy "Users can view their own CV metadata"
on public.cv_metadata for select
to authenticated
using ( auth.uid() = user_id );

create policy "Users can insert their own CV metadata"
on public.cv_metadata for insert
to authenticated
with check ( auth.uid() = user_id );

create policy "Users can update their own CV metadata"
on public.cv_metadata for update
to authenticated
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );

create policy "Users can delete their own CV metadata"
on public.cv_metadata for delete
to authenticated
using ( auth.uid() = user_id );
