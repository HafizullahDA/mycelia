# Technical Specification

## Purpose

Defines how myCELIA Phase 1 is implemented across frontend, backend, data, AI, and deployment boundaries. This document converts the product requirements, app flow, user flow, backend structure, and frontend guidelines into concrete engineering rules.

This spec is for the current working core only. Future systems such as the knowledge wiki, concept graph, mastery engine, and weak-zone intelligence remain out of scope until their PRD, app flow, backend structure, data model, and implementation plan are approved.

## Source Documents

- `guide.md`
- `APP_FLOW.md`
- `USER_FLOW.md`
- `BACKEND_STRUCTURE.md`
- `FRONTEND_GUIDELINES.md`
- `docs/prd/00-overview.md`
- `docs/prd/01-product-architecture.md`
- `docs/prd/02-phase-1-core.md`
- `docs/prd/06-data-model.md`
- `docs/prd/07-api-plan.md`
- `docs/prd/08-phase-1-implementation-checklist.md`

## Stack

### Application

- Next.js `14.2.32`
- React `18.3.1`
- TypeScript
- Tailwind CSS
- App Router

### Data and Auth

- Supabase Auth
- Supabase Database
- Supabase Storage

### AI and Document Processing

- Gemini Flash for OCR, extraction, and lightweight preprocessing
- Gemini Pro for nuanced UPSC MCQ generation
- `pdf-parse` and `pdf-lib` for PDF handling support

### Repo Layout

- `frontend/` - active Next.js application
- `frontend/app/` - pages and API routes
- `frontend/components/` - UI components
- `frontend/lib/server/` - server-only AI, validation, Supabase, persistence, and token helpers
- `frontend/lib/supabase/` - browser Supabase client helpers
- `frontend/lib/types/` - shared TypeScript types
- `supabase/sql/` - database setup files
- `docs/` - planning and product documentation

## Active Scope

Phase 1 includes:

- authentication
- dashboard workspace
- PDF/image source upload
- image batch upload up to 10 images
- pasted text source input
- source metadata storage
- raw file storage
- extraction support
- MCQ generation
- quiz attempt
- immediate answer feedback
- quiz result save
- local save fallback when persistence setup is missing
- saved quiz session review
- quiz generation feedback
- question quality labeling
- health check endpoint

Phase 1.1 may include session-bound improvements such as:

- review quiz flow
- more questions from same source
- missed concepts in this quiz
- quick recap from this quiz

Out of scope:

- knowledge wiki
- concept graph
- persistent mastery engine
- true weak-zone intelligence
- flashcards backed by concept tracking
- study guides backed by compiled knowledge
- PYQ engine
- current affairs connector
- learner-facing prompt or model controls

## Frontend Architecture

### Routes

Public routes:

- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/privacy`
- `/terms`

Protected route:

- `/dashboard`

Dashboard is the only Phase 1 learner workspace. Source input, MCQ generation, quiz attempt, save, and past review happen inside this route.

### Main Components

`frontend/app/page.tsx`

- Restores workspace by redirecting authenticated users to `/dashboard`.
- Redirects unauthenticated users to `/login`.
- Shows `Restoring your workspace...` while checking session.

`frontend/app/dashboard/page.tsx`

- Renders `DashboardUploadWorkspace`.

`frontend/components/dashboard/upload-workspace.tsx`

- Owns dashboard shell state.
- Verifies auth session.
- Loads saved sources and past sessions.
- Handles file/text source input.
- Uploads files to Supabase Storage.
- Shows selected file confirmation, including image batches.
- Saves source metadata.
- Queues generation source.
- Coordinates generation, active quiz, past session review, and success/error messages.

`frontend/components/quiz/mcq-generation-panel.tsx`

- Calls `/api/generate-mcqs`.
- Shows generation progress stages.
- Hands generated output to `QuizSessionPanel`.

`frontend/components/quiz/quiz-session-panel.tsx`

- Renders empty quiz state.
- Renders active quiz attempt.
- Handles answer selection and immediate feedback.
- Handles submit, result summary, save, review, more questions, feedback, and quality labels.
- Handles local fallback save when persistence tables are missing.

`frontend/components/brand/wordmark.tsx`

- Owns the reusable myCELIA wordmark.

`frontend/components/system/env-setup-notice.tsx`

- Shows setup guidance when required browser configuration is missing.

### Frontend State Rules

- Dashboard state remains client-side during a session.
- Generated quiz state is held in the client until saved.
- Past sessions are loaded through API routes, not direct untrusted table reads.
- Local fallback quiz sessions are allowed only after a submitted quiz cannot be cloud-saved because persistence setup is missing.
- Internal model names and prompt details must not be exposed in learner-facing UI.

### Frontend Styling Rules

- Follow `FRONTEND_GUIDELINES.md`.
- Use the existing dark palette and gold accent.
- Use Tailwind utility classes unless a repeated pattern justifies a shared component.
- Keep `/dashboard` as a focused study workspace.
- Do not introduce a new UI library without a product reason.

## Backend Architecture

Backend logic lives in:

- `frontend/app/api/**/route.ts`
- `frontend/lib/server/**`

API routes validate requests, handle auth, call server helpers, and return stable JSON. Server helpers own AI calls, persistence, validation, extraction, Supabase admin access, and quiz token logic.

### API Routes

#### `GET /api/health`

Purpose:
- Report service readiness.

Checks:
- Supabase browser configuration visibility
- Vertex/Gemini configuration
- `source_uploads` table reachability
- `quiz_sessions` table reachability
- `raw-notes` bucket reachability

Response:

```ts
{
  status: string;
  checks: Array<{
    name: string;
    status: string;
    detail: string;
  }>;
}
```

#### `POST /api/extract-notes`

Purpose:
- Extract usable text from pasted text or storage-backed files.

Input modes:
- `text`
- `storage`

Responsibilities:
- Validate input payload.
- Accept pasted text directly.
- Download file from `raw-notes` when storage-backed.
- Call extraction helper.
- Return normalized extraction result.

Errors:
- Missing source input returns `400`.
- Invalid storage payload returns `400`.
- Extraction failures return stable JSON error.

#### `POST /api/generate-mcqs`

Purpose:
- Generate UPSC-style MCQs from pasted text or uploaded source.

Input:

```ts
{
  title: string;
  sourceUploadId?: string;
  inputType: "text" | "storage" | "storage_batch";
  rawText?: string;
  storagePath?: string;
  mimeType?: string;
  storageItems?: Array<{
    sourceUploadId?: string;
    storagePath: string;
    mimeType: string;
    title: string;
  }>;
  questionCount: 5 | 10 | 15;
}
```

Responsibilities:
- Validate question count.
- Validate source input.
- Validate that image batches contain 1 to 10 items.
- Use extracted source text when available.
- Extract storage-backed files when needed.
- Extract image batches with limited concurrency, then combine extracted text into one MCQ source.
- Call Gemini Pro generation.
- Validate generated MCQs.
- Return quiz token and structured MCQs.

Output:

```ts
{
  result: {
    title: string;
    questionCount: number;
    quizToken: string;
    mcqs: Array<{
      question: string;
      options: Array<{ id: "A" | "B" | "C" | "D"; text: string }>;
      correctAnswer: "A" | "B" | "C" | "D";
      explanation: string;
      conceptTag?: string;
      sourceSupport?: string;
    }>;
  };
}
```

#### `POST /api/quiz/file-back`

Purpose:
- Save a submitted quiz result.

Input:

```ts
{
  sourceUploadId?: string;
  quizToken: string;
  selectedAnswers: Array<"A" | "B" | "C" | "D">;
  durationSeconds?: number | null;
}
```

Responsibilities:
- Validate bearer auth.
- Verify quiz token.
- Validate source ownership when source ID exists.
- Calculate result rows from token payload and selected answers.
- Insert `quiz_sessions`.
- Insert `question_results`.
- Roll back session insert if question result insert fails.

Output:

```ts
{
  result: {
    sessionId: string;
    questionCount: number;
    correctCount: number;
    scorePercent: number;
  };
}
```

#### `GET /api/quiz/sessions`

Purpose:
- Return saved quiz session summaries for the current user.

Auth:
- Bearer token required.

Output:

```ts
{
  sessions: Array<{
    id: string;
    title: string;
    questionCount: number;
    correctCount: number;
    scorePercent: number;
    createdAt: string;
  }>;
}
```

#### `GET /api/quiz/sessions/[sessionId]`

Purpose:
- Return one saved quiz session with question results.

Auth:
- Bearer token required.
- Session must belong to current user.

Output:

```ts
{
  session: {
    id: string;
    title: string;
    questionCount: number;
    correctCount: number;
    scorePercent: number;
    createdAt: string;
    results: Array<QuizResultItem>;
  };
}
```

#### `POST /api/quiz/question-quality`

Purpose:
- Save an internal quality label for a saved question result.

Input:

```ts
{
  questionResultId: string;
  label: "good" | "too_easy" | "malformed" | "off_style" | "unsupported";
}
```

Responsibilities:
- Validate bearer auth.
- Verify the question result belongs to the current user through its quiz session.
- Update `question_results.quality_label`.

#### `POST /api/quiz/generation-feedback`

Purpose:
- Save optional learner feedback about a generated quiz.

Input:

```ts
{
  sourceUploadId?: string;
  quizTitle: string;
  questionCount: number;
  feedbackText: string;
}
```

Responsibilities:
- Validate bearer auth.
- Limit feedback to the supported length.
- Validate source ownership when source ID exists.
- Insert `quiz_generation_feedback`.

## Data Model

Current active tables:

- `source_uploads`
- `quiz_sessions`
- `question_results`
- `quiz_generation_feedback`

Current storage bucket:

- `raw-notes`

Setup files:

- `supabase/sql/001_phase1_source_uploads.sql`
- `supabase/sql/002_phase1_quiz_results.sql`
- `supabase/sql/003_phase1_question_quality.sql`
- `supabase/sql/004_phase1_quiz_feedback.sql`

Rules:

- All durable learner records must be scoped to `user_id`.
- File records store `storage_path`; pasted text records store `raw_text`.
- Multi-image uploads store one `source_uploads` row and one storage object per image.
- Saved quiz sessions own many question results.
- Question results may carry concept tags, source support, and quality labels.
- Future tables such as `student_knowledge` and `wiki_files` are planning artifacts until migrations and active flows exist.

## AI Pipeline

### Extraction

Owned by:

- `frontend/lib/server/extract-notes.ts`
- `frontend/lib/server/prompts/extraction/**`
- `frontend/lib/server/validation/extraction-validator.ts`

Rules:

- Use Gemini Flash for OCR/extraction when needed.
- Prefer cheap local parsing for text-bearing PDFs where possible.
- Store or reuse extracted source text to avoid duplicate work.
- Normalize output before generation.

### MCQ Generation

Owned by:

- `frontend/lib/server/generate-mcqs.ts`
- `frontend/lib/server/prompts/mcq/**`
- `frontend/lib/server/validation/mcq-validator.ts`
- `frontend/lib/server/quiz-token.ts`

Rules:

- Use Gemini Pro for UPSC GS1 MCQ generation.
- Generate structured output only.
- Validate question shape, options, answer keys, explanations, and source grounding.
- Use controlled retries for invalid model output.
- Return a quiz token so result save can verify the generated quiz.

### Prompt Rules

- Prompts stay server-side.
- Shared UPSC rules live under `frontend/lib/server/prompts/shared/`.
- Learner-facing UI must not expose prompt text or model selection.
- Prompt changes should be documented later in `AI_PROMPTS.md`.

## Security

### Auth

- `/dashboard` requires a browser Supabase session.
- User-owned API routes require bearer token auth.
- API routes must reject missing or invalid auth with `401`.

### Ownership

Routes must verify ownership before accessing:

- `sourceUploadId`
- `sessionId`
- `questionResultId`

### Secrets

Server-only values must never be exposed to the client:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLOUD_API_KEY`
- `GOOGLE_CLOUD_PROJECT_ID`
- server prompt content
- quiz token signing secret if present

Browser-exposed values may include:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Data Protection

- Uploaded source files should be stored under user-scoped storage paths.
- Raw notes and quiz results should not be publicly readable.
- API errors should not leak stack traces, secrets, prompt text, or provider internals.

## Environment Variables

Minimum for auth/dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required for full Phase 1:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLOUD_API_KEY`
- `GOOGLE_CLOUD_PROJECT_ID`
- `GEMINI_FLASH_MODEL`
- `GEMINI_PRO_MODEL`

Recommended:

- quiz token signing secret, if supported by current server token helper

## Error Handling

API response pattern:

```ts
{
  error: string;
}
```

Status rules:

- `400` invalid input
- `401` missing or invalid auth
- `404` user-owned record not found
- `500` unexpected server error

Frontend rules:

- Show actionable messages.
- Keep errors near the workflow that produced them.
- Avoid raw provider or stack trace output.
- Preserve user progress where feasible.

## Performance and Cost

Targets:

- Dashboard auth/session check should feel immediate.
- Source upload should validate before network or AI work.
- Generation can take longer for large PDFs, but must show progress stages.
- Reuse extracted text where possible.
- Avoid duplicate model calls.
- Keep question count limited to 5, 10, and 15 until cost assumptions change.

Cost rules:

- Prefer Gemini/Google Cloud stack.
- Do not add extra paid AI vendors in Phase 1.
- Parse locally where practical before using AI extraction.
- Validate cheaply before model calls.

## Accessibility and UX Requirements

- Follow `FRONTEND_GUIDELINES.md`.
- All controls must be keyboard reachable.
- Loading states must include text, not only spinners.
- Correct/wrong feedback must include text labels or explanations, not color alone.
- Mobile layouts must avoid clipped text and overflowing controls.
- Legal pages must remain publicly accessible.

## Observability and Health

Current observability:

- `/api/health`
- server-side structured error returns
- setup checks for Supabase, Vertex/Gemini, database tables, and storage bucket

Future observability may include:

- generation latency tracking
- extraction failure rate
- validation retry rate
- quiz save success rate
- model cost summaries

Do not add broad observability infrastructure until the Phase 1 loop is stable.

## Development Commands

From repo root:

```bash
npm run dev
npm run build
npm run lint
```

Direct frontend commands:

```bash
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run lint
```

## Manual Verification

Minimum Phase 1 verification:

- Sign up or sign in.
- Open `/dashboard`.
- Upload a valid PDF or image under 50 MB.
- Generate 5 MCQs.
- Answer all questions.
- Submit quiz.
- Save results.
- Refresh/open past quiz session.
- Paste text notes and generate another quiz.
- Verify invalid file type, oversized file, empty text, generation failure, and save failure states.
- Visit `/api/health`.

## Technical Decisions

- Use Next.js API routes instead of a separate backend service for Phase 1.
- Use Supabase for auth, database, and storage.
- Use client-side file upload to Supabase Storage, with server-side processing after upload.
- Keep dashboard as a single protected workspace.
- Keep extraction internal to the source preparation/generation pipeline.
- Use server-side prompts and validation for AI output.
- Use local browser fallback only for submitted quiz results when persistence setup is missing.

## Open Technical Gaps

- Dedicated `DATA_MODEL.md` should be created or expanded from existing PRD data notes and SQL migrations.
- Dedicated `AI_PROMPTS.md` should document prompt versions, schemas, validation, retries, and examples.
- Dedicated `TEST_PLAN.md` should convert the acceptance checklists into repeatable tests.
- Dedicated `OPERATIONS.md` should pull setup, health checks, environment variables, and troubleshooting into one runbook.

## Acceptance Checklist

- [ ] Routes match `APP_FLOW.md`.
- [ ] Screen behavior matches `USER_FLOW.md`.
- [ ] Data movement matches `BACKEND_STRUCTURE.md`.
- [ ] UI implementation matches `FRONTEND_GUIDELINES.md`.
- [ ] API request and response shapes are stable.
- [ ] Auth and ownership checks exist for user-owned data.
- [ ] Gemini calls are server-side only.
- [ ] AI output is validated before use.
- [ ] Quiz save verifies generated quiz data through token logic.
- [ ] Missing Supabase setup produces actionable messages.
- [ ] No future knowledge-engine features are implemented by accident.
