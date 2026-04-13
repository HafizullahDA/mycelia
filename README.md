# myCELIA Repo Structure

## Main directories
- `frontend/`: Next.js app, auth, dashboard, extraction flow, MCQ generation, quiz attempt UI
- `docs/`: PRD and phased implementation planning
- `supabase/`: SQL setup and database support files

## Core AI split
- `gemini-2.5-pro`: nuanced MCQ generation and reasoning
- `gemini-2.5-flash`: OCR, extraction, and lightweight preprocessing

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

## Local environment setup
Before running the frontend locally, create `frontend/.env.local`.

The quickest path is:
1. copy `frontend/.env.example` to `frontend/.env.local`
2. fill in your Supabase keys
3. add Gemini/Vertex values if you want extraction and MCQ generation to work

Minimum vars needed just to stop auth/dashboard crashes:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Vars needed for the full Phase 1 loop:
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLOUD_API_KEY`
- `GOOGLE_CLOUD_PROJECT_ID`
- `GEMINI_FLASH_MODEL`
- `GEMINI_PRO_MODEL`

## Supabase setup order
Run these SQL files in Supabase before testing the full Phase 1 loop:
- `supabase/sql/001_phase1_source_uploads.sql`
- `supabase/sql/002_phase1_quiz_results.sql`

## Current state
- Frontend is the active application surface
- Phase 1 now covers upload metadata, extraction, MCQ generation, quiz attempt, and quiz result persistence in code
- Build and stabilize the Phase 1 core loop before moving into the knowledge wiki and retention system
