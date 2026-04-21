# Test Plan

## Purpose

Defines how to verify myCELIA Phase 1 before moving to future phases. This document turns the implementation milestones and acceptance checklists into repeatable manual, API, data, UI, and release-readiness tests.

The test plan proves the core loop works:

```text
sign in
  --> upload or paste notes
  --> generate MCQs
  --> attempt quiz
  --> save results
  --> reopen past session
```

## Test Principles

- Test the full learner journey before testing future enhancements.
- Use real UPSC-style notes, not only tiny dummy text.
- Verify success paths and failure paths.
- Confirm data is saved and can be read back.
- Keep Phase 1 claims honest: no mastery engine, knowledge wiki, or weak-zone intelligence should appear.
- Record failures with the route, user action, expected result, actual result, and screenshot/log if available.

## Source Documents

- `APP_FLOW.md`
- `USER_FLOW.md`
- `BACKEND_STRUCTURE.md`
- `FRONTEND_GUIDELINES.md`
- `TECHNICAL_SPEC.md`
- `IMPLEMENTATION_PLAN.md`

## Test Environment

### Required Local Setup

- App runs from repo root with `npm run dev`.
- Frontend runs directly with `npm --prefix frontend run dev` if needed.
- `frontend/.env.local` exists.
- Supabase project is configured.
- Gemini/Google Cloud values are configured for full Phase 1.
- `raw-notes` storage bucket exists.

### Required Environment Variables

Minimum auth/dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Full Phase 1:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLOUD_API_KEY`
- `GOOGLE_CLOUD_PROJECT_ID`
- `GEMINI_FLASH_MODEL`
- `GEMINI_PRO_MODEL`

### Required SQL Setup

Run in order:

1. `supabase/sql/001_phase1_source_uploads.sql`
2. `supabase/sql/002_phase1_quiz_results.sql`
3. `supabase/sql/003_phase1_question_quality.sql`
4. `supabase/sql/004_phase1_quiz_feedback.sql`

## Test Data

Use at least:

- one short pasted UPSC GS1 note sample
- one PDF with selectable text
- one scanned PDF or image requiring extraction/OCR
- one invalid file type
- one file over 50 MB or a simulated oversized file
- one intentionally empty pasted-text submission

Recommended sample topics:

- Indian polity: Fundamental Rights and DPSP
- Modern history: Swadeshi movement
- Geography: monsoon mechanism
- Art and culture: temple architecture

## Test Status Key

- `Not Run` - not tested yet
- `Pass` - works as expected
- `Fail` - does not meet expected result
- `Blocked` - cannot test due to setup or dependency issue
- `Needs Review` - technically works but quality or UX needs human judgment

## Foundation Tests

### T-001: App Starts Locally

- **Milestone**: Project foundation
- **Steps**:
  1. Run `npm run dev`.
  2. Open the local app URL.
- **Expected Result**:
  - App starts without fatal errors.
  - Root page shows restore state briefly, then routes to login or dashboard.
- **Status**: Not Run

### T-002: Build Completes

- **Milestone**: Project foundation
- **Steps**:
  1. Run `npm run build`.
- **Expected Result**:
  - Production build completes.
- **Status**: Not Run

### T-003: Lint Completes

- **Milestone**: Project foundation
- **Steps**:
  1. Run `npm run lint`.
- **Expected Result**:
  - Lint completes or known lint setup issue is documented.
- **Status**: Not Run

### T-004: Health Endpoint Reports Setup

- **Milestone**: Project foundation
- **Steps**:
  1. Start the app.
  2. Open `/api/health`.
- **Expected Result**:
  - Response reports Supabase browser config, Vertex/Gemini config, required tables, and `raw-notes` bucket status.
- **Status**: Not Run

## Auth and Navigation Tests

### T-010: Root Redirects Unauthenticated User

- **Milestone**: Authentication and workspace access
- **Steps**:
  1. Sign out or clear session.
  2. Open `/`.
- **Expected Result**:
  - User is routed to `/login`.
- **Status**: Not Run

### T-011: Dashboard Redirects Unauthenticated User

- **Milestone**: Authentication and workspace access
- **Steps**:
  1. Sign out or clear session.
  2. Open `/dashboard`.
- **Expected Result**:
  - User sees session check, then is redirected to `/login`.
- **Status**: Not Run

### T-012: Login Reaches Dashboard

- **Milestone**: Authentication and workspace access
- **Steps**:
  1. Open `/login`.
  2. Sign in with valid credentials.
- **Expected Result**:
  - User reaches `/dashboard`.
  - Dashboard shows signed-in identity.
- **Status**: Not Run

### T-013: Signup Flow Works

- **Milestone**: Authentication and workspace access
- **Steps**:
  1. Open `/signup`.
  2. Create a valid test account.
- **Expected Result**:
  - User reaches dashboard or receives a clear email-confirmation/login instruction depending on Supabase settings.
- **Status**: Not Run

### T-014: Sign Out Works

- **Milestone**: Authentication and workspace access
- **Steps**:
  1. Open `/dashboard` as signed-in user.
  2. Click `Sign out`.
- **Expected Result**:
  - User is signed out and routed to `/login`.
- **Status**: Not Run

## Source Input Tests

### T-020: Pasted Text Source Saves

- **Milestone**: Source input and storage
- **Steps**:
  1. Sign in.
  2. Open `/dashboard`.
  3. Select `Paste text`.
  4. Enter a source title.
  5. Paste UPSC notes.
  6. Choose `5`.
  7. Click `Generate MCQs`.
- **Expected Result**:
  - Empty/validation errors do not appear.
  - Source is saved or queued.
  - `Preparing your source...` appears before generation.
- **Status**: Not Run

### T-021: Empty Pasted Text Is Blocked

- **Milestone**: Source input and storage
- **Steps**:
  1. Select `Paste text`.
  2. Leave textarea empty.
  3. Click `Generate MCQs`.
- **Expected Result**:
  - App shows `Paste some notes first.`
  - No generation request starts.
- **Status**: Not Run

### T-022: PDF Upload Saves

- **Milestone**: Source input and storage
- **Steps**:
  1. Select `File upload`.
  2. Choose a valid PDF under 50 MB.
  3. Choose `5`.
  4. Click `Generate MCQs`.
- **Expected Result**:
  - File is accepted.
  - Source preparation starts.
  - File metadata is stored.
  - Storage object exists in `raw-notes`.
- **Status**: Not Run

### T-023: Image Upload Saves

- **Milestone**: Source input and storage
- **Steps**:
  1. Select `File upload`.
  2. Choose a valid image under 50 MB.
  3. Choose `5`.
  4. Click `Generate MCQs`.
- **Expected Result**:
  - Image is accepted.
  - Source preparation starts.
  - File metadata is stored.
  - Storage object exists in `raw-notes`.
- **Status**: Not Run

### T-024: Invalid File Type Is Blocked

- **Milestone**: Source input and storage
- **Steps**:
  1. Select `File upload`.
  2. Choose an unsupported file type.
- **Expected Result**:
  - App shows `Upload a PDF or image file only.`
  - File is not queued for upload.
- **Status**: Not Run

### T-025: Oversized File Is Blocked

- **Milestone**: Source input and storage
- **Steps**:
  1. Select `File upload`.
  2. Choose a file over 50 MB.
- **Expected Result**:
  - App shows `Keep files under 50 MB.`
  - File is not queued for upload.
- **Status**: Not Run

## Extraction Tests

### T-030: Text Extraction Path Works

- **Milestone**: Extraction pipeline
- **Steps**:
  1. Generate from pasted text.
  2. Observe generation continues past source preparation.
- **Expected Result**:
  - Text is accepted and normalized.
  - No file extraction error appears.
- **Status**: Not Run

### T-031: PDF Extraction Works

- **Milestone**: Extraction pipeline
- **Steps**:
  1. Upload a real PDF.
  2. Generate MCQs.
- **Expected Result**:
  - Source text is extracted.
  - Generation receives usable content.
  - No extraction failure appears.
- **Status**: Not Run

### T-032: Image OCR Works

- **Milestone**: Extraction pipeline
- **Steps**:
  1. Upload a real image of notes.
  2. Generate MCQs.
- **Expected Result**:
  - OCR/extraction produces usable text.
  - Generated questions relate to the image content.
- **Status**: Not Run

## MCQ Generation Tests

### T-040: Generate 5 MCQs from Pasted Text

- **Milestone**: MCQ generation
- **Steps**:
  1. Paste UPSC notes.
  2. Select `5`.
  3. Click `Generate MCQs`.
- **Expected Result**:
  - Generation progress appears.
  - Exactly 5 MCQs appear.
  - Each question has 4 options, correct answer, explanation, and source support when available.
- **Status**: Not Run

### T-041: Generate 10 MCQs

- **Milestone**: MCQ generation
- **Steps**:
  1. Provide a sufficient source.
  2. Select `10`.
  3. Generate.
- **Expected Result**:
  - Exactly 10 MCQs appear.
  - Generation completes within acceptable wait time.
- **Status**: Not Run

### T-042: Generate 15 MCQs

- **Milestone**: MCQ generation
- **Steps**:
  1. Provide a sufficient source.
  2. Select `15`.
  3. Generate.
- **Expected Result**:
  - Exactly 15 MCQs appear.
  - Generation completes within acceptable wait time.
- **Status**: Not Run

### T-043: Question Quality Review

- **Milestone**: MCQ generation
- **Steps**:
  1. Generate MCQs from real UPSC notes.
  2. Review questions manually.
- **Expected Result**:
  - Questions are UPSC GS1-oriented.
  - Questions are not generic trivia.
  - Explanations are relevant.
  - Correct answers are plausible and consistent.
- **Status**: Needs Review

## Quiz Attempt Tests

### T-050: Empty Quiz State Appears

- **Milestone**: Quiz attempt
- **Steps**:
  1. Open dashboard before generating.
- **Expected Result**:
  - Quiz panel says no quiz has been generated yet.
- **Status**: Not Run

### T-051: Answer Selection Shows Immediate Feedback

- **Milestone**: Quiz attempt
- **Steps**:
  1. Generate MCQs.
  2. Select an answer.
- **Expected Result**:
  - Correct answer is highlighted.
  - Wrong selected answer is highlighted when applicable.
  - Explanation appears.
- **Status**: Not Run

### T-052: Submit Is Blocked Until All Questions Answered

- **Milestone**: Quiz attempt
- **Steps**:
  1. Generate MCQs.
  2. Leave at least one question unanswered.
  3. Try to submit.
- **Expected Result**:
  - App shows `Answer every question before submitting the quiz.`
  - Quiz is not submitted.
- **Status**: Not Run

### T-053: Quiz Completion Summary Appears

- **Milestone**: Quiz attempt
- **Steps**:
  1. Answer every question.
  2. Submit quiz.
- **Expected Result**:
  - Score appears.
  - Accuracy appears.
  - Right/wrong count appears.
  - Save, review, and more questions actions appear.
- **Status**: Not Run

## Result Persistence Tests

### T-060: Save Results to Supabase

- **Milestone**: Result persistence
- **Steps**:
  1. Complete a quiz.
  2. Click `Save results`.
- **Expected Result**:
  - Button shows saving state.
  - App shows cloud save success.
  - `quiz_sessions` row is created.
  - `question_results` rows are created.
- **Status**: Not Run

### T-061: Saved Result Includes Required Data

- **Milestone**: Result persistence
- **Steps**:
  1. Save a completed quiz.
  2. Inspect saved session and question rows.
- **Expected Result**:
  - Saved data includes question, options, selected answer, correct answer, correctness, explanation, concept tag when available, source support when available, score, and duration when available.
- **Status**: Not Run

### T-062: Local Fallback Works When Persistence Missing

- **Milestone**: Result persistence
- **Steps**:
  1. Test in an environment where quiz persistence tables are missing, or simulate persistence setup failure.
  2. Complete and save a quiz.
- **Expected Result**:
  - App saves locally.
  - Message explains SQL setup needed for cloud save.
  - Cloud save and local save are visually distinct.
- **Status**: Not Run

## Past Session Review Tests

### T-070: Past Sessions Load

- **Milestone**: Saved session readback and review
- **Steps**:
  1. Save at least one quiz.
  2. Refresh dashboard.
- **Expected Result**:
  - Past session appears with title, date, score, and accuracy.
- **Status**: Not Run

### T-071: Open Past Session

- **Milestone**: Saved session readback and review
- **Steps**:
  1. Click a past session.
- **Expected Result**:
  - Past quiz session opens.
  - Score, accuracy, and right/wrong count appear.
- **Status**: Not Run

### T-072: Review Past Session Questions

- **Milestone**: Saved session readback and review
- **Steps**:
  1. Open a past session.
  2. Click `Review quiz`.
- **Expected Result**:
  - User sees selected answer, correct answer, correctness, explanation, and source support when available.
- **Status**: Not Run

### T-073: Mark Question Quality

- **Milestone**: Saved session readback and review
- **Steps**:
  1. Open a saved session.
  2. Expand review.
  3. Select a quality label.
- **Expected Result**:
  - Label saves.
  - UI reflects selected label.
  - Refresh preserves the label.
- **Status**: Not Run

## Phase 1.1 Tests

### T-080: More Questions from Same Source

- **Milestone**: Phase 1.1 session-bound improvements
- **Steps**:
  1. Complete a generated quiz.
  2. Click `More questions`.
- **Expected Result**:
  - New generation starts from same source when source is available.
  - If source is unavailable, app asks user to upload or paste notes again.
- **Status**: Not Run

### T-081: Quiz Generation Feedback Saves

- **Milestone**: Phase 1.1 session-bound improvements
- **Steps**:
  1. Generate a quiz.
  2. Enter feedback under 100 words.
  3. Click `Send feedback`.
- **Expected Result**:
  - Feedback saves.
  - Success message appears.
  - `quiz_generation_feedback` row is created.
- **Status**: Not Run

### T-082: Session-Bound Language Check

- **Milestone**: Phase 1.1 session-bound improvements
- **Steps**:
  1. Review dashboard, quiz complete, past session, and any Phase 1.1 text.
- **Expected Result**:
  - UI does not claim long-term mastery, concept graph intelligence, or persistent weak-zone detection.
- **Status**: Not Run

## Responsive and Accessibility Tests

### T-090: Mobile Dashboard

- **Milestone**: Stabilization and QA
- **Viewport**: 390px wide or similar
- **Steps**:
  1. Open dashboard.
  2. Use upload/paste controls.
  3. Generate and attempt a quiz.
- **Expected Result**:
  - No horizontal overflow.
  - Buttons fit.
  - Quiz options are readable and tappable.
- **Status**: Not Run

### T-091: Tablet Dashboard

- **Milestone**: Stabilization and QA
- **Viewport**: tablet size
- **Steps**:
  1. Open dashboard.
  2. Complete a quiz flow.
- **Expected Result**:
  - Layout remains coherent.
  - Controls do not overlap.
- **Status**: Not Run

### T-092: Keyboard Navigation

- **Milestone**: Stabilization and QA
- **Steps**:
  1. Use keyboard to navigate auth and dashboard controls.
- **Expected Result**:
  - Interactive controls are reachable.
  - Focus is visible.
- **Status**: Not Run

### T-093: Color Is Not Sole Feedback

- **Milestone**: Stabilization and QA
- **Steps**:
  1. Select correct and incorrect quiz answers.
- **Expected Result**:
  - Feedback includes text/explanation in addition to color.
- **Status**: Not Run

## API Tests

### T-100: `GET /api/health`

- **Expected Result**:
  - Returns setup status JSON.
- **Status**: Not Run

### T-101: `POST /api/generate-mcqs` Rejects Invalid Payload

- **Expected Result**:
  - Invalid input returns `400` with `{ "error": "..." }`.
- **Status**: Not Run

### T-102: `POST /api/quiz/file-back` Requires Auth

- **Expected Result**:
  - Missing bearer token returns `401`.
- **Status**: Not Run

### T-103: `GET /api/quiz/sessions` Requires Auth

- **Expected Result**:
  - Missing bearer token returns `401`.
- **Status**: Not Run

### T-104: `GET /api/quiz/sessions/[sessionId]` Enforces Ownership

- **Expected Result**:
  - User cannot open another user's session.
- **Status**: Not Run

### T-105: `POST /api/quiz/question-quality` Enforces Ownership

- **Expected Result**:
  - User cannot label another user's question result.
- **Status**: Not Run

### T-106: `POST /api/quiz/generation-feedback` Validates Input

- **Expected Result**:
  - Missing or invalid feedback returns stable error.
  - Valid feedback saves for authenticated user.
- **Status**: Not Run

## Data Verification

After a full successful cloud-saved quiz:

- [ ] `source_uploads` has the submitted source.
- [ ] File source has `storage_path` and storage object exists.
- [ ] Text source has `raw_text`.
- [ ] `quiz_sessions` has one row for the submitted quiz.
- [ ] `question_results` has one row per generated question.
- [ ] Result rows have selected/correct answer and correctness.
- [ ] Explanations are saved.
- [ ] Concept tags and source support are saved when present.
- [ ] Past session API returns the saved data.

## Phase 1 Release Gate

Phase 1 is ready for controlled user testing only when:

- [ ] T-001 through T-004 pass or known setup issues are documented.
- [ ] Auth tests pass.
- [ ] Pasted text end-to-end flow passes.
- [ ] PDF end-to-end flow passes.
- [ ] Image/OCR end-to-end flow passes.
- [ ] 5, 10, and 15 MCQ generation are verified.
- [ ] Quiz attempt and completion tests pass.
- [ ] Cloud result save passes.
- [ ] Past session readback passes after refresh.
- [ ] Mobile and tablet checks pass.
- [ ] `/api/health` reflects expected setup.
- [ ] No Phase 2 intelligence UI or claims are visible.

## Known Untested Areas

Record after each test pass:

- Real sample file names tested:
- Browser and device tested:
- Auth provider behavior:
- Supabase setup gaps:
- Gemini generation quality notes:
- Failed cases:
- Follow-up issues:

## Test Report Template

```md
## Test Run: [Date]

- Tester:
- Environment:
- Browser/device:
- Commit or branch:
- Supabase project:
- Gemini models:

### Summary
- Passed:
- Failed:
- Blocked:
- Needs Review:

### Critical Failures
- [Issue]

### Notes
- [Observation]

### Release Recommendation
- [Ready / Not Ready / Ready with known issues]
```
