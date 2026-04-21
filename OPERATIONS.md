# Operations Runbook

## Purpose

Defines how to set up, run, verify, troubleshoot, and prepare myCELIA Phase 1 for testing or release. This is the practical runbook for developers and testers.

Use this document before running `TEST_PLAN.md`.

## Operating Principles

- Keep Phase 1 simple and stable before adding future intelligence features.
- Verify setup with `/api/health` before testing the full quiz loop.
- Use Google Cloud and Gemini first because free credits are the primary AI budget constraint.
- Avoid duplicate model calls during troubleshooting.
- Never expose server secrets to browser code.
- Document setup gaps instead of hiding them behind generic errors.

## Local Prerequisites

Required:

- Node.js compatible with Next.js 14
- npm
- Supabase project
- Google Cloud or Gemini API access
- Browser for manual testing

Recommended:

- A test Supabase user account
- One short UPSC pasted-note sample
- One PDF sample
- One image or scanned notes sample

## Repo Layout

- `frontend/` - Next.js application
- `frontend/app/` - pages and API routes
- `frontend/components/` - UI components
- `frontend/lib/server/` - server-side AI, validation, Supabase, token, and persistence logic
- `frontend/lib/supabase/` - browser Supabase helpers
- `supabase/sql/` - SQL setup files
- `docs/` - planning docs

## Install Dependencies

From the repo root:

```bash
npm install
```

If working directly in the frontend:

```bash
npm --prefix frontend install
```

## Environment Setup

Create:

```text
frontend/.env.local
```

If an example file exists, copy it first:

```bash
copy frontend\.env.example frontend\.env.local
```

On non-Windows shells:

```bash
cp frontend/.env.example frontend/.env.local
```

### Minimum Variables for Auth and Dashboard

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

These are browser-exposed values. They are required for auth and dashboard load.

### Required Variables for Full Phase 1

```env
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLOUD_API_KEY=
GOOGLE_CLOUD_PROJECT_ID=
GEMINI_FLASH_MODEL=
GEMINI_PRO_MODEL=
```

These enable backend persistence, extraction, and MCQ generation.
MCQ generation uses `GEMINI_PRO_MODEL` for higher-quality UPSC-style output. Keep `GEMINI_FLASH_MODEL` for OCR, extraction, and lightweight preprocessing.

### Secret Handling Rules

- Do not commit `.env.local`.
- Do not put service-role keys in client components.
- Do not prefix server-only secrets with `NEXT_PUBLIC_`.
- Do not paste secrets into issue descriptions, screenshots, or docs.

## Supabase Setup

### SQL Order

Run these in Supabase SQL editor in order:

1. `supabase/sql/001_phase1_source_uploads.sql`
2. `supabase/sql/002_phase1_quiz_results.sql`
3. `supabase/sql/003_phase1_question_quality.sql`
4. `supabase/sql/004_phase1_quiz_feedback.sql`

### Storage Setup

Create or verify this bucket:

```text
raw-notes
```

Purpose:

- stores uploaded PDFs and images

Expected behavior:

- files are uploaded under user-scoped paths
- backend downloads files from this bucket during extraction/generation
- pasted text is stored in the database, not storage

### Auth Setup

Confirm Supabase Auth allows the intended local test flow:

- email/password login
- signup behavior
- password reset behavior if testing recovery

If email confirmation is enabled, signup may route differently than immediate-login setups. Record this in the test report.

## Google/Gemini Setup

Configured models:

- `GEMINI_FLASH_MODEL` for extraction/OCR and lightweight preprocessing
- `GEMINI_PRO_MODEL` as the default MCQ generation model for more nuanced generation

Operational rules:

- Keep model calls server-side.
- Prefer local PDF text parsing before model OCR when possible.
- Avoid rerunning generation repeatedly with the same large source unless debugging requires it.
- Track failures by source type: pasted text, PDF, image.

## Running the App

From repo root:

```bash
npm run dev
```

Direct frontend command:

```bash
npm --prefix frontend run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Health Check

After starting the app, open:

```text
/api/health
```

The endpoint should report whether the app can see:

- browser Supabase configuration
- Vertex/Gemini configuration
- `source_uploads` table
- `quiz_sessions` table
- `raw-notes` storage bucket

### Health Check Interpretation

If browser Supabase config fails:

- verify `NEXT_PUBLIC_SUPABASE_URL`
- verify `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- restart dev server after changing env vars

If Vertex/Gemini config fails:

- verify `GOOGLE_CLOUD_API_KEY`
- verify `GOOGLE_CLOUD_PROJECT_ID`
- verify model env vars
- restart dev server

If table checks fail:

- rerun SQL files in order
- verify the Supabase project matches `.env.local`

If `raw-notes` bucket fails:

- create the bucket
- verify storage policies if applicable

## Manual Smoke Test

Run after health check passes:

1. Open `/`.
2. Confirm unauthenticated user routes to `/login`.
3. Sign in.
4. Confirm `/dashboard` loads.
5. Paste short UPSC notes.
6. Choose `5`.
7. Click `Generate MCQs`.
8. Answer all questions.
9. Submit quiz.
10. Save results.
11. Refresh dashboard.
12. Open past quiz session.

Expected result:

- Full notes-to-saved-quiz loop works without developer help.

## Full Test Procedure

Use:

```text
TEST_PLAN.md
```

Recommended order:

1. Foundation tests
2. Auth/navigation tests
3. Source input tests
4. Extraction tests
5. MCQ generation tests
6. Quiz attempt tests
7. Result persistence tests
8. Past session review tests
9. Responsive/accessibility tests
10. API tests
11. Data verification
12. Phase 1 release gate

## Troubleshooting

### Dashboard Shows Setup Notice

Likely causes:

- missing `NEXT_PUBLIC_SUPABASE_URL`
- missing `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- dev server not restarted after env change

Fix:

1. Update `frontend/.env.local`.
2. Restart dev server.
3. Reopen `/dashboard`.

### Upload Says `raw-notes` Bucket Is Missing

Likely causes:

- bucket was not created
- app points to wrong Supabase project
- storage policy blocks access

Fix:

1. Create `raw-notes` bucket.
2. Verify Supabase URL in env.
3. Retry upload.

### Source Metadata Does Not Save

Likely causes:

- `source_uploads` table missing
- SQL file `001_phase1_source_uploads.sql` not run
- wrong Supabase project
- RLS/policy mismatch

Fix:

1. Run `supabase/sql/001_phase1_source_uploads.sql`.
2. Check `/api/health`.
3. Retry source submission.

### MCQ Generation Fails

Likely causes:

- Gemini env vars missing
- source extraction failed
- model returned invalid structure
- source text too weak or empty
- provider/network issue

Fix:

1. Check `/api/health`.
2. Try pasted text with a short clean UPSC sample.
3. Try 5 questions before 10 or 15.
4. Check server logs for validation or model errors.
5. Avoid repeatedly testing with a large PDF until pasted text works.

### Image Batch Generation Is Slow

Expected behavior:

- Multiple images require OCR before MCQ generation.
- The backend processes image OCR with limited concurrency to reduce total wait time without sending all images at once.
- Larger batches and dense screenshots can still take a few minutes.

If a 5-image batch takes several minutes:

1. Retry with the same images once; cached extraction may make follow-up generation faster.
2. Test 5 questions before 10 or 15.
3. Use clearer, cropped images where possible.
4. Split unrelated images into separate smaller quizzes.

### All Source Types Take Around 160-180 Seconds

Likely cause:

- MCQ generation is reaching the Vertex request timeout window rather than completing normally.
- MCQ generation uses the Pro model by default for quality, so broad sources and 10-15 question sets can take longer.

Expected behavior:

- Focused pasted notes, PDFs with parsed/cached text, and modest image batches should complete within the Vertex timeout window.
- Very large sources or 15-question generations may take longer because quality is prioritized over raw speed.

Fix path:

1. Keep source sections focused instead of uploading very broad chapters.
2. Prefer 5 or 10 questions while testing.
3. Keep `GEMINI_PRO_MODEL` pointed at a Pro-class Gemini model for MCQ quality.
4. Check generation diagnostics in server logs for `mcqGenerationMs`, `extractionMs`, and `compressionMs`.
5. If `mcqGenerationMs` dominates, tune prompt/model settings before changing extraction.

### Vertex AI Returns 429 RESOURCE_EXHAUSTED

Meaning:

- The selected Gemini model is temporarily rate-limited or quota-limited for the project.

Expected behavior:

- MCQ generation uses `GEMINI_PRO_MODEL`.
- If all available models are exhausted, the UI should show a quota message instead of a schema/validation error.

Fix:

1. Wait a few minutes and retry.
2. Reduce repeated test generations.
3. Try 5 questions while testing.
4. Check Google Cloud quota/rate limits for the selected model and region.

### Quiz Results Do Not Save to Supabase

Likely causes:

- `quiz_sessions` or `question_results` table missing
- SQL file `002_phase1_quiz_results.sql` not run
- auth token expired
- quiz token invalid
- wrong Supabase project

Fix:

1. Run `supabase/sql/002_phase1_quiz_results.sql`.
2. Sign out and sign in again.
3. Complete a new quiz.
4. Save again.

Expected fallback:

- If persistence tables are missing, the client may save locally and show a setup message.

### Past Sessions Do Not Appear

Likely causes:

- results saved locally, not cloud
- save failed
- wrong Supabase project
- API auth failed

Fix:

1. Confirm cloud save message says `Results saved`.
2. Inspect `quiz_sessions`.
3. Refresh dashboard.
4. Check `/api/quiz/sessions` with a valid signed-in session.

### Question Quality Label Does Not Save

Likely causes:

- `003_phase1_question_quality.sql` not run
- question result does not belong to current user
- auth token expired

Fix:

1. Run `supabase/sql/003_phase1_question_quality.sql`.
2. Sign in again.
3. Reopen saved quiz session.
4. Retry label.

### Quiz Feedback Does Not Save

Likely causes:

- `004_phase1_quiz_feedback.sql` not run
- feedback is empty or invalid
- auth token expired
- source ownership validation failed

Fix:

1. Run `supabase/sql/004_phase1_quiz_feedback.sql`.
2. Sign in again.
3. Submit short feedback under the word limit.

## Release Readiness Checklist

Before controlled user testing:

- [ ] `npm run build` passes.
- [ ] `/api/health` reports expected setup.
- [ ] SQL setup is complete.
- [ ] `raw-notes` bucket exists.
- [ ] Pasted text end-to-end flow passes.
- [ ] PDF end-to-end flow passes.
- [ ] Image/OCR end-to-end flow passes.
- [ ] Results save to Supabase.
- [ ] Past session review works after refresh.
- [ ] Mobile and tablet checks pass.
- [ ] Known limitations are documented.
- [ ] No Phase 2 UI or intelligence claims are visible.

## Operational Boundaries

Allowed in Phase 1:

- stabilize auth
- stabilize source input
- stabilize extraction
- stabilize MCQ generation
- stabilize quiz attempt
- stabilize result persistence
- improve session-bound review and feedback

Not allowed without updated PRD and implementation plan:

- knowledge wiki
- concept graph
- persistent mastery engine
- weak-zone intelligence dashboard
- learner model selector
- prompt editor
- PYQ engine
- current affairs connector

## Incident Notes Template

```md
## Incident: [Short Title]

- Date:
- Environment:
- User action:
- Expected result:
- Actual result:
- Affected route/API:
- Error message:
- Health check status:
- Suspected cause:
- Fix attempted:
- Follow-up:
```

## Test Run Handoff

Before handing the app to a tester:

- confirm dev server URL
- confirm test account credentials are available privately
- confirm sample files are available
- confirm SQL setup has been run
- confirm `/api/health` status
- tell tester to use `TEST_PLAN.md`

After testing:

- collect failed test IDs
- collect screenshots or logs
- classify failures as setup, frontend, backend, AI quality, or data persistence
- update `IMPLEMENTATION_PLAN.md` if build order changes
- update `TEST_PLAN.md` if new regression cases are discovered
