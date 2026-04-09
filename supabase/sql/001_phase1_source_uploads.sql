-- Phase 1 source ingestion setup for myCELIA
-- Run this in the Supabase SQL editor before testing uploads end to end.

create extension if not exists "pgcrypto";

create table if not exists public.source_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  upload_type text not null check (upload_type in ('pdf', 'image', 'text')),
  title text,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  storage_bucket text,
  storage_path text,
  raw_text text,
  status text not null default 'uploaded',
  extraction_status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.source_uploads enable row level security;

create policy "source_uploads_select_own"
on public.source_uploads
for select
using (auth.uid() = user_id);

create policy "source_uploads_insert_own"
on public.source_uploads
for insert
with check (auth.uid() = user_id);

create policy "source_uploads_update_own"
on public.source_uploads
for update
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('raw-notes', 'raw-notes', false)
on conflict (id) do nothing;

create policy "raw_notes_select_own"
on storage.objects
for select
using (
  bucket_id = 'raw-notes'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "raw_notes_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'raw-notes'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "raw_notes_update_own"
on storage.objects
for update
using (
  bucket_id = 'raw-notes'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);