-- Phase 1 optional aspirant feedback on generated quiz quality.
-- Run this after 003_phase1_question_quality.sql.

create table if not exists public.quiz_generation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_upload_id uuid references public.source_uploads(id) on delete set null,
  quiz_title text not null,
  question_count integer not null check (question_count > 0),
  feedback_text text not null check (
    length(trim(feedback_text)) > 0
    and array_length(regexp_split_to_array(trim(feedback_text), '\s+'), 1) <= 100
  ),
  created_at timestamptz not null default now()
);

alter table public.quiz_generation_feedback enable row level security;

create policy "quiz_generation_feedback_select_own"
on public.quiz_generation_feedback
for select
using (auth.uid() = user_id);

create policy "quiz_generation_feedback_insert_own"
on public.quiz_generation_feedback
for insert
with check (auth.uid() = user_id);
