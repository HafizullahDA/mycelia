# Backend Structure

## Purpose

Defines how data works in myCELIA: where data enters, how it moves through backend routes, where it is stored, how AI processing reads and writes data, and which server modules own each responsibility.

This document answers **how the application data layer works**. It should prevent AI-assisted development from inventing new storage patterns, bypassing validation, exposing server-only logic to the client, or mixing future knowledge-engine ideas into the current Phase 1 backend.

## Backend Principles

- Keep backend logic in Next.js API routes and server-only helpers for Phase 1.
- Store user-owned durable data in Supabase.
- Store uploaded files in Supabase Storage, not in the app filesystem.
- Keep Gemini calls server-side.
- Validate request payloads before calling AI models or writing database rows.
- Keep response shapes stable for frontend components.
- Prefer small, focused routes over a large premature backend surface.
- Treat extraction as an internal backend step, not a separate learner-facing product stage.
- Keep Phase 1 data honest: quiz sessions and source uploads exist; long-term mastery intelligence does not yet exist.

## Runtime Boundaries

### Client-Side Responsibilities

Owned mainly by:

- `frontend/components/dashboard/upload-workspace.tsx`
- `frontend/components/quiz/mcq-generation-panel.tsx`
- `frontend/components/quiz/quiz-session-panel.tsx`
- `frontend/lib/supabase/client.ts`

Client responsibilities:

- Manage user input and UI state.
- Read the browser Supabase session.
- Upload raw files to Supabase Storage.
- Insert basic source metadata when appropriate.
- Call backend API routes.
- Render loading, success, error, empty, and review states.
- Save local fallback quiz sessions only when cloud persistence is not configured.

Client must not:

- Call Gemini directly.
- Hold service-role Supabase credentials.
- Build server prompts.
- Trust client-generated quiz answers without server validation.
- Pretend knowledge-wiki or mastery data exists before backend support exists.

### Server-Side Responsibilities

Owned mainly by:

- `frontend/app/api/**/route.ts`
- `frontend/lib/server/**`

Server responsibilities:

- Validate API request payloads.
- Verify authenticated users for protected data routes.
- Use Supabase admin/server clients for trusted reads and writes.
- Download source files from Supabase Storage when needed.
- Extract text from files or pasted text.
- Call Gemini models.
- Validate AI outputs.
- Generate and verify quiz tokens.
- Save quiz sessions, question results, feedback, and quality labels.
- Return stable JSON responses.

## Data Stores

### Supabase Auth

Purpose:
- Own user identity and browser sessions.

Used by:
- Dashboard access control.
- API authorization via bearer token.
- User-scoped data queries.

Important rule:
- All durable learner data must be tied to `user_id`.

### Supabase Database

Current Phase 1 tables:

- `source_uploads`
- `quiz_sessions`
- `question_results`
- `quiz_generation_feedback`

Planned or referenced future tables:

- `profiles`
- `student_knowledge`
- `wiki_files`

Future tables should not be treated as active product capability until migrations, APIs, and UI flows exist.

### Supabase Storage

Current bucket:

- `raw-notes`

Purpose:
- Store uploaded PDFs and images.

Rules:

- File uploads are saved under a user-scoped path.
- Backend reads uploaded files from storage for extraction/generation.
- Pasted text is stored in the database, not in storage.

## Core Data Entities

### Source Upload

Stored in:
- `source_uploads`

Represents:
- A user-submitted PDF, image, or pasted text source.

Important fields:

- `id`
- `user_id`
- `upload_type`
- `title`
- `original_filename`
- `mime_type`
- `file_size_bytes`
- `storage_bucket`
- `storage_path`
- `raw_text`
- `status`
- extracted text fields when extraction runs

Lifecycle:

```text
Client source input
  --> source_uploads metadata row
  --> raw-notes storage object when file-based
  --> extraction/generation reads source
  --> extracted text may be saved back to source_uploads
```

### Quiz Session

Stored in:
- `quiz_sessions`

Represents:
- One submitted quiz attempt by a user.

Important fields:

- `id`
- `user_id`
- `source_upload_id`
- `title`
- `question_count`
- `correct_count`
- `score_percent`
- `duration_seconds`
- `created_at`

Lifecycle:

```text
Generated quiz
  --> user answers all questions
  --> user submits quiz
  --> user saves results
  --> quiz_sessions row created
  --> question_results rows created
```

### Question Result

Stored in:
- `question_results`

Represents:
- One answered question inside a saved quiz session.

Important fields:

- `id`
- `quiz_session_id`
- `question_index`
- `question`
- `options`
- `selected_answer`
- `correct_answer`
- `is_correct`
- `explanation`
- `concept_tag`
- `source_support`
- `quality_label`

Lifecycle:

```text
Quiz session save
  --> one question_results row per question
  --> past review reads rows
  --> optional quality label update
```

### Quiz Generation Feedback

Stored in:
- `quiz_generation_feedback`

Represents:
- Optional learner feedback about a generated quiz set.

Important fields:

- `id`
- `user_id`
- `source_upload_id`
- `quiz_title`
- `question_count`
- `feedback_text`
- `created_at`

Lifecycle:

```text
Active quiz
  --> user submits feedback up to 100 words
  --> API validates auth/source ownership
  --> feedback row inserted
```

## Main Backend Flows

### Flow 1: File Source to Generated Quiz

```text
Dashboard file input
  --> Supabase Storage raw-notes upload
  --> source_uploads metadata insert
  --> POST /api/generate-mcqs
  --> generate-mcqs server helper
  --> extract-notes server helper if needed
  --> Gemini Flash for extraction/OCR when needed
  --> Gemini Pro for MCQ generation
  --> MCQ validation
  --> quiz token creation
  --> JSON response to client
```

Data written:

- `raw-notes` storage object
- `source_uploads` row
- extracted source fields when extraction completes

Data returned:

- quiz title
- question count
- MCQs
- explanations
- concept tags
- source support
- quiz token

### Flow 2: Pasted Text to Generated Quiz

```text
Dashboard text input
  --> source_uploads row with raw_text
  --> POST /api/generate-mcqs
  --> generate-mcqs server helper
  --> Gemini Pro for MCQ generation
  --> MCQ validation
  --> quiz token creation
  --> JSON response to client
```

Data written:

- `source_uploads` row

Data returned:

- same quiz response shape as file-based generation

### Flow 3: Save Completed Quiz

```text
Submitted quiz
  --> POST /api/quiz/file-back
  --> bearer token auth check
  --> quiz token verification
  --> source ownership validation when source_upload_id exists
  --> save-quiz-results server helper
  --> quiz_sessions insert
  --> question_results bulk insert
  --> JSON result to client
```

Data written:

- `quiz_sessions`
- `question_results`

Fallback:

- If quiz persistence tables are missing, the client may save the submitted result in browser local storage and display a setup message.

### Flow 4: Review Saved Quiz Sessions

```text
Dashboard load or refresh
  --> GET /api/quiz/sessions
  --> bearer token auth check
  --> query quiz_sessions for current user
  --> summary JSON response

Open session
  --> GET /api/quiz/sessions/[sessionId]
  --> bearer token auth check
  --> query quiz_sessions for current user
  --> query question_results for session
  --> detailed JSON response
```

Data read:

- `quiz_sessions`
- `question_results`

### Flow 5: Save Question Quality Label

```text
Past quiz review
  --> POST /api/quiz/question-quality
  --> bearer token auth check
  --> validate question result belongs to user's quiz session
  --> update question_results.quality_label
  --> success JSON response
```

Data updated:

- `question_results`

### Flow 6: Save Quiz Generation Feedback

```text
Active quiz feedback
  --> POST /api/quiz/generation-feedback
  --> bearer token auth check
  --> validate feedback text
  --> validate source ownership when source_upload_id exists
  --> insert quiz_generation_feedback
  --> success JSON response
```

Data written:

- `quiz_generation_feedback`

### Flow 7: Health Check

```text
GET /api/health
  --> check browser Supabase config visibility
  --> check Vertex AI/Gemini config
  --> check key database tables
  --> check raw-notes bucket reachability
  --> JSON status response
```

Data read:

- table existence checks
- storage bucket reachability checks

## API Ownership

### `POST /api/generate-mcqs`

Owns:
- Generation request validation.
- Source input normalization.
- Calling MCQ generation server logic.
- Returning generated quiz data.

Does not own:
- Saving completed quiz results.
- User navigation.
- Long-term mastery updates.

### `POST /api/extract-notes`

Owns:
- Extraction request validation.
- Text extraction from pasted text or storage-backed files.
- Returning normalized extraction output.

Current product note:
- Extraction exists as backend support. It should not become a separate learner-facing dashboard route in Phase 1.

### `POST /api/quiz/file-back`

Owns:
- Completed quiz persistence.
- Authenticated save behavior.
- Quiz token verification.
- Writing `quiz_sessions` and `question_results`.

Does not own:
- Generating new questions.
- Updating future mastery records.

### `GET /api/quiz/sessions`

Owns:
- Current user's saved quiz session summaries.

### `GET /api/quiz/sessions/[sessionId]`

Owns:
- Current user's saved quiz session detail and question results.

### `POST /api/quiz/question-quality`

Owns:
- Updating saved question quality labels after ownership validation.

### `POST /api/quiz/generation-feedback`

Owns:
- Saving optional quiz-generation feedback after ownership validation.

### `GET /api/health`

Owns:
- Reporting setup readiness for key services, tables, and storage.

## Server Module Ownership

### `frontend/lib/server/extract-notes.ts`

Owns:
- Loading storage-backed source files.
- Parsing PDFs when possible.
- Calling Gemini Flash for OCR/extraction when needed.
- Normalizing extracted text.
- Saving extraction output back to `source_uploads`.

### `frontend/lib/server/generate-mcqs.ts`

Owns:
- Building generation context.
- Reusing extracted source text when available.
- Calling extraction when file input needs it.
- Calling Gemini Pro for MCQ generation.
- Validating generated MCQs.
- Returning quiz-ready structured output.

### `frontend/lib/server/save-quiz-results.ts`

Owns:
- Creating quiz session rows.
- Creating question result rows.
- Rolling back quiz session insert when question insert fails.

### `frontend/lib/server/quiz-token.ts`

Owns:
- Creating quiz tokens for generated sets.
- Verifying quiz tokens before result save.

### `frontend/lib/server/supabase-admin.ts`

Owns:
- Server-side Supabase admin client setup.

### `frontend/lib/server/validation/**`

Owns:
- Structured validation for extraction and MCQ output.

### `frontend/lib/server/prompts/**`

Owns:
- Server-side prompt templates and UPSC-specific prompt rules.

## Data Access Rules

- Client may read browser auth session.
- Client may upload files to `raw-notes` using the configured browser Supabase client.
- Client may call API routes.
- API routes must validate auth before reading or writing user-owned data.
- Server helpers may use admin/service credentials only on the server.
- Routes that receive `sourceUploadId`, `sessionId`, or `questionResultId` must verify ownership before reading or writing.
- Generated quiz data should be protected by quiz token verification before result persistence.

## AI Data Rules

- Gemini Flash is used for OCR, extraction, and lightweight preprocessing.
- Gemini Pro is used for nuanced UPSC MCQ generation.
- Prompt logic stays server-side.
- AI output must be validated before being returned to the client or saved.
- AI explanations should remain source-grounded.
- Failed validation should use controlled retry behavior, not silent acceptance.
- AI model details should not be exposed as primary learner-facing UI.

## Error Handling Rules

- Return stable JSON error shapes: `{ "error": "Message" }`.
- Use `400` for invalid payloads.
- Use `401` for missing or invalid auth.
- Use `404` when user-owned records are not found.
- Use `500` for unexpected server failures.
- Client errors should be actionable and short.
- Missing setup should name the missing table, bucket, or environment area when helpful.

## Current Phase 1 Data Boundary

Active backend capabilities:

- user authentication
- source upload metadata
- raw file storage
- text extraction
- MCQ generation
- quiz tokening
- quiz result persistence
- saved quiz review
- quiz feedback
- question quality labeling
- health checks

Not active yet:

- personal knowledge wiki
- concept graph
- persistent mastery engine
- cross-session weak-zone intelligence
- PYQ engine
- current affairs connector
- flashcards backed by concept tracking
- study guides backed by compiled knowledge

## Acceptance Checklist

- [ ] Every backend route has one clear owner and responsibility.
- [ ] Every durable data entity is listed with storage location.
- [ ] Every user-owned read/write validates auth and ownership.
- [ ] File uploads go to Supabase Storage, not local filesystem.
- [ ] Gemini calls happen only on the server.
- [ ] AI output is validated before use.
- [ ] Quiz result save verifies a quiz token.
- [ ] Missing persistence setup has a clear fallback or error.
- [ ] Future knowledge-engine data is not treated as current capability.
