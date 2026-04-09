# myCELIA Repo Structure

## Main directories
- `frontend/`: Next.js app, auth, dashboard, extraction flow, MCQ generation, quiz attempt UI
- `backend/`: future AI orchestration, extraction services, MCQ workflows, health checks
- `docs/`: PRD and phased implementation planning
- `supabase/`: SQL setup and database support files

## Core AI split
- `Gemini 3.1 Pro`: nuanced MCQ generation, reasoning, concept compilation, analysis
- `Gemini Flash 3.x`: OCR, extraction, lightweight preprocessing

## Cost constraint
myCELIA is being built with **Google Cloud free credits as the primary AI budget constraint**.

That means:
- prefer Google Cloud and Gemini over additional paid AI vendors
- minimize unnecessary model calls
- keep preprocessing and validation lightweight before inference
- avoid architecture that increases baseline AI cost too early

## How to run
From the repo root:
- `npm run dev`

Or directly:
- `npm --prefix frontend run dev`

## Supabase setup order
Run these SQL files in Supabase before testing the full Phase 1 loop:
- `supabase/sql/001_phase1_source_uploads.sql`
- `supabase/sql/002_phase1_quiz_results.sql`

## Current state
- Frontend is the active application surface
- Backend is still scaffolded for later phases
- Phase 1 now covers upload metadata, extraction, MCQ generation, quiz attempt, and quiz result persistence in code
- Build and stabilize the Phase 1 core loop before moving into the knowledge wiki and retention system
