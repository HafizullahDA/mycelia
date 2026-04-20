-- Phase 1 quality-control labels for generated MCQs.
-- Run this after 002_phase1_quiz_results.sql.

alter table public.question_results
add column if not exists quality_label text
check (
  quality_label is null
  or quality_label in ('good', 'too_easy', 'malformed', 'off_style', 'unsupported')
);

alter table public.question_results
add column if not exists quality_note text;

alter table public.question_results
add column if not exists quality_marked_at timestamptz;
