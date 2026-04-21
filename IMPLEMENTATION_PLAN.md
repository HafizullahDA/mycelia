# Implementation Plan

## Purpose

Defines **what order to build myCELIA in**. This document turns the PRD, app flow, user flow, backend structure, frontend guidelines, and technical spec into an ordered execution plan.

The goal is to prevent AI-assisted development from jumping ahead, building future intelligence features too early, or polishing secondary features before the core loop is stable.

## Build Principle

Build one working slice at a time:

```text
Foundation
  --> Auth
  --> Source input
  --> Extraction
  --> MCQ generation
  --> Quiz attempt
  --> Result persistence
  --> Readback and review
  --> Stabilization
  --> Phase 1.1 session-bound improvements
```

Do not start Phase 2 knowledge-wiki work until Phase 1 is tested end to end with real samples.

## Source Documents

- `PRD.md` or current PRD/phase docs under `docs/prd/`
- `APP_FLOW.md`
- `USER_FLOW.md`
- `BACKEND_STRUCTURE.md`
- `FRONTEND_GUIDELINES.md`
- `TECHNICAL_SPEC.md`
- `docs/prd/08-phase-1-implementation-checklist.md`

## Current Status Snapshot

Already implemented in code:

- auth flows
- source submission for PDF, image, and pasted text
- source metadata storage
- Supabase Storage upload path
- extraction route
- MCQ generation route
- server-side prompt management
- structured validation and retry flow
- quiz attempt UI
- immediate answer feedback
- result save path
- saved quiz session readback
- past session review
- more questions from same source when source is available
- quiz generation feedback
- question quality labeling
- health endpoint

Still needs priority attention:

- real-sample end-to-end testing
- stronger stabilization around failure states
- mobile and tablet verification
- final Phase 1 acceptance pass
- dedicated `DATA_MODEL.md`
- dedicated `AI_PROMPTS.md`

## Milestone 0: Documentation and Scope Lock

### Goal

Make sure AI and developers know the product boundary before changing code.

### Build Order

1. Confirm current PRD/phase scope.
2. Confirm `APP_FLOW.md` route and navigation boundaries.
3. Confirm `USER_FLOW.md` screen and state behavior.
4. Confirm `BACKEND_STRUCTURE.md` data movement and API ownership.
5. Confirm `FRONTEND_GUIDELINES.md` visual/UI rules.
6. Confirm `TECHNICAL_SPEC.md` implementation constraints.

### Done When

- Every new implementation task can point to a source document.
- Future knowledge-wiki and mastery-engine work is clearly out of scope for Phase 1.
- `/dashboard` remains the only protected learner workspace.

### Status

- Complete for the current Phase 1 planning baseline.
- Keep updated as product behavior changes.

## Milestone 1: Project Foundation

### Goal

Ensure the app can run locally and has the required environment and database setup.

### Build Order

1. Verify root scripts:
   - `npm run dev`
   - `npm run build`
   - `npm run lint`
2. Verify frontend scripts:
   - `npm --prefix frontend run dev`
   - `npm --prefix frontend run build`
   - `npm --prefix frontend run lint`
3. Create `frontend/.env.local` from `frontend/.env.example` if needed.
4. Configure minimum auth variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Configure full Phase 1 variables:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_CLOUD_API_KEY`
   - `GOOGLE_CLOUD_PROJECT_ID`
   - `GEMINI_FLASH_MODEL`
   - `GEMINI_PRO_MODEL`
6. Run Supabase SQL setup in order:
   - `supabase/sql/001_phase1_source_uploads.sql`
   - `supabase/sql/002_phase1_quiz_results.sql`
   - `supabase/sql/003_phase1_question_quality.sql`
   - `supabase/sql/004_phase1_quiz_feedback.sql`
7. Create or verify `raw-notes` storage bucket.
8. Check `/api/health`.

### Done When

- App starts locally.
- Auth config is visible to browser code.
- Server can reach Supabase and Gemini configuration.
- Required tables and `raw-notes` bucket are reachable.

### Status

- Implemented in structure.
- Requires environment-specific verification.

## Milestone 2: Authentication and Workspace Access

### Goal

Users can enter and leave the protected workspace reliably.

### Build Order

1. Implement or verify `/login`.
2. Implement or verify `/signup`.
3. Implement or verify `/forgot-password`.
4. Implement or verify `/reset-password`.
5. Implement root `/` redirect:
   - authenticated user goes to `/dashboard`
   - unauthenticated user goes to `/login`
6. Protect `/dashboard` with browser session check.
7. Show setup notice when Supabase browser env vars are missing.
8. Implement sign out from dashboard.

### Done When

- Unauthenticated users cannot use `/dashboard`.
- Authenticated users reach dashboard.
- Missing environment config produces a clear setup message.
- Auth pages work across desktop and mobile.

### Status

- Implemented.
- Needs regression check during stabilization.

## Milestone 3: Source Input and Storage

### Goal

Students can provide source material through PDF, image, or pasted text.

### Build Order

1. Build dashboard source input shell.
2. Add mode switch:
   - `File upload`
   - `Paste text`
3. Add source title field.
4. Add question count selector:
   - `5`
   - `10`
   - `15`
5. Validate file type:
   - PDF
   - image
6. Validate file size:
   - under 50 MB
7. Upload valid files to `raw-notes`.
8. Insert file metadata in `source_uploads`.
9. Insert pasted text in `source_uploads`.
10. Show source preparation state.
11. Show actionable errors for invalid input or missing setup.

### Done When

- PDF upload works.
- Image upload works.
- Pasted text works.
- Source metadata is stored.
- Learner-facing copy stays simple.
- No internal storage jargon appears unless setup is missing.

### Status

- Implemented.
- Needs real-file verification.

## Milestone 4: Extraction Pipeline

### Goal

Turn uploaded or pasted source material into usable text for generation.

### Build Order

1. Maintain `POST /api/extract-notes`.
2. Validate `text` input mode.
3. Validate `storage` input mode.
4. Download storage-backed files from `raw-notes`.
5. Parse text-bearing PDFs cheaply where practical.
6. Use Gemini Flash for OCR/extraction when needed.
7. Normalize extraction output.
8. Validate extraction output.
9. Save extracted text back to `source_uploads` when available.
10. Return stable JSON and clear errors.

### Done When

- Pasted text normalizes reliably.
- At least one real PDF extracts successfully.
- At least one real image extracts successfully.
- Extraction failure returns an understandable message.
- Extraction remains internal to the learner flow.

### Status

- Implemented.
- Needs real-sample OCR/PDF verification.

## Milestone 5: MCQ Generation

### Goal

Generate UPSC GS1-style MCQs from source material.

### Build Order

1. Maintain `POST /api/generate-mcqs`.
2. Validate generation payload.
3. Enforce supported question counts:
   - 5
   - 10
   - 15
4. Reuse saved extracted text when available.
5. Trigger extraction for storage-backed sources when needed.
6. Build server-side UPSC GS1 prompt.
7. Call Gemini Pro.
8. Validate generated MCQ structure.
9. Retry in a controlled way when validation fails.
10. Generate quiz token.
11. Return stable quiz response shape.
12. Show generation progress stages in UI.

### Done When

- 5-question generation works from pasted notes.
- 5-question generation works from a real PDF or image.
- 10 and 15 question counts work within acceptable time/cost.
- Output has four options, correct answer, explanation, concept tag when available, and source support.
- Output feels UPSC-oriented, not generic trivia.

### Status

- Implemented.
- Needs quality testing with real UPSC notes.

## Milestone 6: Quiz Attempt

### Goal

Let students complete a serious quiz session with immediate learning feedback.

### Build Order

1. Render empty quiz state before generation.
2. Render active quiz after generation.
3. Show question navigation chips.
4. Show one active question at a time.
5. Allow one answer selection per question.
6. Reveal correctness immediately after selection.
7. Highlight correct answer in green.
8. Highlight wrong selected answer in red.
9. Show explanation inline.
10. Show source support when available.
11. Block submit until every question is answered.
12. Show final result summary after submit.

### Done When

- User can complete a full quiz.
- Feedback is readable and understandable.
- Submit is blocked until all questions are answered.
- Summary shows score, accuracy, right/wrong count, and duration when available.

### Status

- Implemented.
- Needs responsive and accessibility verification.

## Milestone 7: Result Persistence

### Goal

Save completed quiz sessions so practice is not disposable.

### Build Order

1. Maintain `POST /api/quiz/file-back`.
2. Verify bearer auth.
3. Verify quiz token.
4. Validate source ownership when source ID exists.
5. Save `quiz_sessions` row.
6. Save one `question_results` row per question.
7. Roll back session insert if question result insert fails.
8. Return save summary to client.
9. Show cloud save success state.
10. Use local browser fallback only when persistence setup is missing.
11. Clearly distinguish cloud save from local fallback.

### Done When

- Completed quiz saves to Supabase.
- Saved results include question, selected answer, correct answer, correctness, explanation, concept tag, source support, and session score.
- Save failure is recoverable.
- Local fallback message tells the user how to enable cloud save.

### Status

- Implemented.
- Needs database verification with real saved sessions.

## Milestone 8: Saved Session Readback and Review

### Goal

Let students reopen prior quiz sessions and review results.

### Build Order

1. Maintain `GET /api/quiz/sessions`.
2. Maintain `GET /api/quiz/sessions/[sessionId]`.
3. Load recent sessions on dashboard.
4. Add refresh action.
5. Open session details in dashboard.
6. Show score, accuracy, and right/wrong count.
7. Add expandable quiz review.
8. Show selected answer, correct answer, explanation, and source support.
9. Support question quality labels for saved question results.

### Done When

- Past sessions survive refresh.
- User can reopen a saved session.
- Question-level review is clear.
- Question quality label updates validate ownership and persist.

### Status

- Implemented.
- Needs end-to-end verification after cloud save.

## Milestone 9: Phase 1.1 Session-Bound Improvements

### Goal

Make the completed quiz loop more useful without claiming long-term intelligence.

### Build Order

1. Add or verify review quiz action.
2. Add or verify more questions from same source.
3. Add post-quiz summary if not already sufficient.
4. Add missed concepts in this quiz.
5. Add optional quick recap from this quiz.
6. Keep all language session-bound.

### Guardrails

Do not frame these as:

- long-term mastery
- deep strengths analysis
- full weak-zone intelligence
- persistent concept tracking

### Done When

- Improvements work from a completed quiz.
- Claims are honest and session-bound.
- No Phase 2 data model is required.

### Status

- Review and more questions are implemented.
- Post-quiz summary, missed concepts, and quick recap need product approval before build.

## Milestone 10: Stabilization and QA

### Goal

Prove Phase 1 is stable enough before moving to Phase 2.

### Build Order

1. Run app locally.
2. Verify `/api/health`.
3. Test auth flows.
4. Test pasted text to saved quiz.
5. Test PDF upload to saved quiz.
6. Test image upload to saved quiz.
7. Test invalid file type.
8. Test oversized file.
9. Test empty pasted text.
10. Test generation failure state.
11. Test save failure state.
12. Test local fallback if persistence setup is missing.
13. Test past session readback after refresh.
14. Test mobile layout.
15. Test tablet layout.
16. Run build.
17. Run lint if available and compatible.
18. Record remaining issues in `TEST_PLAN.md`.

### Done When

- One real sample note upload completes end to end.
- One pasted text sample completes end to end.
- Saved result data can be trusted.
- Errors are understandable.
- UI is coherent across desktop, laptop, tablet, and mobile.
- No out-of-scope future features are exposed.

### Status

- Pending full verification pass.

## Milestone 11: Release Readiness

### Goal

Prepare the Phase 1 loop for a controlled release or user testing.

### Build Order

1. Finalize `DATA_MODEL.md`.
2. Finalize `AI_PROMPTS.md`.
3. Finalize `TEST_PLAN.md`.
4. Finalize `OPERATIONS.md`.
5. Confirm SQL setup order.
6. Confirm environment variable list.
7. Confirm health check expectations.
8. Confirm known limitations.
9. Confirm rollback or recovery path for broken setup.

### Done When

- A new developer can set up the app from docs.
- A tester can run the Phase 1 flow from docs.
- Known gaps are documented.
- Phase 2 work has an explicit approval gate.

### Status

- Pending.
- `TEST_PLAN.md` and `OPERATIONS.md` are now created.
- `DATA_MODEL.md` and `AI_PROMPTS.md` are still pending.

## Phase 1 Stop Condition

Do not move to Phase 2 until all are true:

- Upload or pasted text works.
- Extraction works on real samples.
- MCQ generation works for 5, 10, and 15 questions.
- Quiz can be completed.
- Results save to Supabase.
- Past sessions can be reopened after refresh.
- At least one real sample note upload has been tested end to end.
- Question quality is acceptable for UPSC GS1 practice.
- Errors are understandable.
- UI is stable across desktop, laptop, tablet, and mobile.
- Documentation reflects actual code behavior.

## Build Order Summary

1. Documentation and scope lock
2. Project foundation
3. Authentication and workspace access
4. Source input and storage
5. Extraction pipeline
6. MCQ generation
7. Quiz attempt
8. Result persistence
9. Saved session readback and review
10. Phase 1.1 session-bound improvements
11. Stabilization and QA
12. Release readiness

## Handoff Rule for AI Agents

Before implementing a task, identify:

- which milestone it belongs to
- which source document defines the behavior
- what data it reads or writes
- what user-visible state changes
- what acceptance check proves it is done

If a task belongs to a future milestone or future phase, do not build it unless the PRD and implementation plan are updated first.
