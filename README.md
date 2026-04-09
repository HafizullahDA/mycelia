# myCELIA Repo Structure

## Main directories
- `frontend/`: Next.js app, auth, dashboard, upload flow, quiz UI
- `backend/`: future AI orchestration, extraction services, MCQ workflows, health checks
- `docs/`: PRD and phased implementation planning
- `supabase/`: SQL setup and database support files

## AI split
- `Gemini 3.1 Pro`: nuanced MCQ generation, reasoning, concept compilation, health checks
- `Gemini 3 Flash`: OCR, extraction, lightweight preprocessing

## How to run
From the repo root:
- `npm run dev`

Or directly:
- `npm --prefix frontend run dev`

## Current state
- Frontend is active and working
- Backend is scaffolded for future phases
- Build Phase 1 section by section before expanding backend complexity