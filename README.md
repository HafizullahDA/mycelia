# myCELIA Repo Structure

## Main directories
- `frontend/`: Next.js app, auth, dashboard, extraction flow, MCQ generation, quiz attempt UI
- `docs/`: PRD and phased implementation planning
- `supabase/`: SQL setup and database support files

## Documentation
- `guide.md`: documentation sequence and templates for PRD, app flow, user flow, backend structure, frontend guidelines, technical spec, data model, prompts, implementation plan, tests, and operations
- `APP_FLOW.md`: application route map, entry points, decision branches, navigation rules, and goal-based flowcharts
- `USER_FLOW.md`: current Phase 1 user journey from sign-in through notes upload, MCQ generation, quiz attempt, result save, and past-session review
- `BACKEND_STRUCTURE.md`: backend ownership, data movement, storage boundaries, API responsibilities, and server-side data rules
- `FRONTEND_GUIDELINES.md`: visual design rules, component behavior, UI states, accessibility, and page-specific frontend guidance
- `TECHNICAL_SPEC.md`: implementation reference for frontend, backend, APIs, data, AI pipeline, security, environment, and verification
- `IMPLEMENTATION_PLAN.md`: canonical build order with milestones, done criteria, status, stabilization, and release-readiness gates
- `TEST_PLAN.md`: manual, API, data, responsive, accessibility, and release-gate verification plan
- `OPERATIONS.md`: local setup, environment, Supabase, storage, health checks, troubleshooting, and release runbook
- `docs/prd/`: existing product architecture, phased PRD notes, API plan, data model, and implementation checklist

Recommended order for new product work:
1. update the PRD or relevant phase doc
2. update `APP_FLOW.md`
3. update `USER_FLOW.md`
4. update `BACKEND_STRUCTURE.md`
5. update `FRONTEND_GUIDELINES.md`
6. update the technical/API/data/prompt docs
7. update implementation and test plans

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

For full setup, troubleshooting, and release-readiness steps, see `OPERATIONS.md`.

## Basic health check
Once the app is running, you can verify the core service state at:
- `/api/health`

The endpoint reports whether the app can currently see:
- browser Supabase configuration
- Vertex AI configuration
- the `source_uploads` table
- the `quiz_sessions` table
- the `raw-notes` storage bucket

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
