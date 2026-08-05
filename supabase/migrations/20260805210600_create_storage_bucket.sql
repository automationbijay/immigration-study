-- Insert the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('cv-uploads', 'cv-uploads', false)
on conflict (id) do nothing;

-- Ensure RLS is enabled for storage.objects
-- (This is handled by Supabase by default and we cannot alter it directly as the migration user)


-- Storage Policies for 'cv-uploads' bucket
-- Users can only upload, read, update, and delete files in a folder that matches their user ID

drop policy if exists "Users can upload their own CV" on storage.objects;
create policy "Users can upload their own CV"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'cv-uploads' and
    auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can view their own CV" on storage.objects;
create policy "Users can view their own CV"
on storage.objects for select to authenticated
using (
    bucket_id = 'cv-uploads' and
    auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own CV" on storage.objects;
create policy "Users can update their own CV"
on storage.objects for update to authenticated
using (
    bucket_id = 'cv-uploads' and
    auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their own CV" on storage.objects;
create policy "Users can delete their own CV"
on storage.objects for delete to authenticated
using (
    bucket_id = 'cv-uploads' and
    auth.uid()::text = (storage.foldername(name))[1]
);
