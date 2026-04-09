-- Phase 1 quiz persistence setup for myCELIA
-- Run this after 001_phase1_source_uploads.sql.

create extension if not exists "pgcrypto";

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_upload_id uuid references public.source_uploads(id) on delete set null,
  title text not null,
  question_count integer not null check (question_count > 0),
  correct_count integer not null check (correct_count >= 0),
  score_percent numeric(5,2) not null check (score_percent >= 0 and score_percent <= 100),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.question_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_index integer not null check (question_index >= 0),
  question text not null,
  options_json jsonb not null,
  selected_answer text not null check (selected_answer in ('A', 'B', 'C', 'D')),
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  is_correct boolean not null,
  explanation text not null,
  concept_tag text,
  created_at timestamptz not null default now()
);

alter table public.quiz_sessions enable row level security;
alter table public.question_results enable row level security;

create policy "quiz_sessions_select_own"
on public.quiz_sessions
for select
using (auth.uid() = user_id);

create policy "quiz_sessions_insert_own"
on public.quiz_sessions
for insert
with check (auth.uid() = user_id);

create policy "question_results_select_own"
on public.question_results
for select
using (auth.uid() = user_id);

create policy "question_results_insert_own"
on public.question_results
for insert
with check (auth.uid() = user_id);
