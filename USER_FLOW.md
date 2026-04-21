# User Flow Specification

## 1. Overview

- **Product**: myCELIA
- **Version**: Phase 1 / Phase 1.1 working core
- **Last Updated**: 2026-04-21
- **Primary Flow**: Student signs in, uploads or pastes notes, generates UPSC-style MCQs, attempts the quiz, saves results, and can review past quiz sessions.

## 2. Primary User Journey

### Flow: Notes to Saved Quiz Result

- **User Goal**: Turn study notes into a focused UPSC MCQ practice session and preserve the result for future review.
- **Start Point**: Authenticated student opens `/dashboard`.
- **End Point**: Quiz result is saved to Supabase, or saved locally if cloud persistence is not yet configured.

### Steps

1. **Session Check**
   - User sees: `Checking your session...` while authentication is verified.
   - User can do: Wait.
   - System does: Reads the Supabase session.
   - Success state: Authenticated user reaches the dashboard.
   - Error state: Unauthenticated user is redirected to `/login`.

2. **Dashboard Workspace**
   - User sees: myCELIA workspace, signed-in identity, source count, selected MCQ target, quiz-ready count, upload controls, quiz session panel, and recent past sessions when available.
   - User can do: Sign out, choose file upload or pasted text, enter a source title, choose 5, 10, or 15 MCQs, refresh/open past sessions.
   - System does: Loads recent `source_uploads` and saved quiz sessions.
   - Success state: Workspace is ready for a new quiz or review.
   - Error state: Missing Supabase browser config shows an environment setup notice instead of the workspace.

3. **Source Input**
   - User sees: Either a PDF/image upload drop area or a pasted-notes textarea.
   - User can do: Upload a PDF or image up to 50 MB, paste text notes, optionally add a source title, and click `Generate MCQs`.
   - System does: Validates input type, validates file size, saves source metadata, uploads files to the `raw-notes` bucket, or stores pasted text in `source_uploads`.
   - Success state: Source is queued for quiz generation and the app moves into preparation.
   - Error state: User sees a specific message for invalid file type, oversized file, missing text, missing auth, missing Supabase setup, missing bucket, or failed upload.

4. **Source Preparation**
   - User sees: `Preparing your source...`
   - User can do: Wait.
   - System does: Saves the source and prepares a generation request.
   - Success state: MCQ generation starts automatically.
   - Error state: User sees a retryable error and remains in the workspace.

5. **MCQ Generation**
   - User sees: `Generating MCQs...`, elapsed time, and generation stages:
     - Reading source
     - Building revision context
     - Writing MCQs
     - Quality check
   - User can do: Wait.
   - System does: Calls `/api/generate-mcqs` with source details and selected question count.
   - Success state: Quiz session appears with generated questions.
   - Error state: User sees `MCQ generation failed.` or `MCQ generation request failed. Try again.`

6. **Quiz Attempt**
   - User sees: Current question, answer options, question navigation, answered count, and optional quiz feedback form.
   - User can do: Select one answer per question, move between questions, submit optional generation feedback, and submit the quiz after every question is answered.
   - System does: Reveals immediate answer feedback after selection, highlights correct and wrong answers, displays explanations and source support when available.
   - Success state: All questions are answered and the user can submit the quiz.
   - Error state: If the user tries to submit early, the app shows `Answer every question before submitting the quiz.`

7. **Quiz Completion**
   - User sees: Score, accuracy, right/wrong count, session duration when available, and actions for `Save results`, `Review quiz`, and `More questions`.
   - User can do: Save results, review every question, or generate more questions from the same source.
   - System does: Builds result records from selected answers and generated MCQ data.
   - Success state: Result summary is visible and ready to save.
   - Error state: Missing answers or invalid quiz state blocks saving.

8. **Result Save**
   - User sees: Save button state changes to `Saving results...`, then `Results saved` or `Saved locally`.
   - User can do: Wait, then continue reviewing or generate more questions.
   - System does: Calls `/api/quiz/file-back` with selected answers, quiz token, source upload ID, and duration.
   - Success state: Results are saved to Supabase and the past-session list refreshes.
   - Fallback state: If quiz persistence tables are not configured, submitted results are saved locally in the browser.
   - Error state: User sees a specific save failure message and can retry.

9. **Past Quiz Review**
   - User sees: Recent past quiz sessions with title, date, score, and accuracy.
   - User can do: Refresh sessions, open a saved session, expand review, mark internal question quality, or request more questions when source material is available.
   - System does: Calls `/api/quiz/sessions` and `/api/quiz/sessions/[sessionId]`.
   - Success state: Past results are shown with answer review and quality labels.
   - Error state: User sees a message if the session cannot be opened or auth has expired.

## 3. Screens

### Screen: Login and Auth Redirect

- **Purpose**: Ensure only authenticated students can use the dashboard.
- **Primary Actions**: Sign in, sign up, reset password.
- **Secondary Actions**: Navigate from forgot-password or reset-password flows.
- **Required Content**: Auth form, error feedback, redirect behavior.
- **Validation Rules**: Valid Supabase configuration and authenticated session required for dashboard access.
- **Empty State**: Not applicable.
- **Loading State**: `Checking your session...`
- **Error State**: Auth errors shown on auth pages; dashboard redirects unauthenticated users to `/login`.
- **Success State**: User reaches `/dashboard`.

### Screen: Dashboard Workspace

- **Purpose**: Main working area for source submission, MCQ generation, active quiz attempts, and past session review.
- **Primary Actions**: Upload file, paste notes, choose MCQ count, generate MCQs.
- **Secondary Actions**: Sign out, refresh past sessions, open past session.
- **Required Content**: Signed-in identity, workspace stats, source title input, upload/paste switch, question-count selector, quiz session panel.
- **Validation Rules**: Requires browser Supabase env vars and signed-in user.
- **Empty State**: Quiz panel says no quiz has been generated yet.
- **Loading State**: Auth checking, source preparation, MCQ generation stages.
- **Error State**: Missing env setup, invalid source input, upload failure, generation failure, session loading failure.
- **Success State**: Source is saved and the generated quiz appears.

### Screen: Source Input

- **Purpose**: Capture the study material that will become quiz questions.
- **Primary Actions**: Choose PDF/image, paste text, click `Generate MCQs`.
- **Secondary Actions**: Enter or edit source title, switch between file and text modes.
- **Required Content**: File drop area or notes textarea, source title, question count controls.
- **Validation Rules**: PDF or image only for files; max file size 50 MB; pasted text must not be empty.
- **Empty State**: No file selected or empty textarea.
- **Loading State**: `Preparing source...`
- **Error State**: `Upload a PDF or image file only.`, `Keep files under 50 MB.`, `Paste some notes first.`
- **Success State**: Source is saved and generation starts.

### Screen: Generation Progress

- **Purpose**: Keep the user informed while extraction and MCQ generation run internally.
- **Primary Actions**: Wait.
- **Secondary Actions**: None.
- **Required Content**: Elapsed time, active generation stage, concise progress copy.
- **Validation Rules**: Generation requires a queued source and selected question count.
- **Empty State**: Not applicable.
- **Loading State**: Reading source, building revision context, writing MCQs, quality check.
- **Error State**: Generation failure message.
- **Success State**: Quiz appears.

### Screen: Active Quiz Session

- **Purpose**: Let the student attempt generated UPSC MCQs with immediate feedback.
- **Primary Actions**: Select answer, move to next question, submit quiz.
- **Secondary Actions**: Send optional generation feedback, skip feedback.
- **Required Content**: Question stem, options, current progress, answer feedback, explanations, source support when available.
- **Validation Rules**: One answer per question; all questions must be answered before submit.
- **Empty State**: `No quiz generated yet`.
- **Loading State**: Not applicable once quiz is loaded.
- **Error State**: Submit blocked until every question is answered.
- **Success State**: Quiz complete summary appears.

### Screen: Quiz Complete

- **Purpose**: Show performance and let the student preserve or review the result.
- **Primary Actions**: Save results, review quiz, generate more questions.
- **Secondary Actions**: Continue reviewing answer explanations.
- **Required Content**: Score, accuracy, right/wrong count, duration when available.
- **Validation Rules**: Save requires submitted quiz and authenticated session.
- **Empty State**: Not applicable.
- **Loading State**: `Saving results...`
- **Error State**: Save failure, expired session, missing persistence setup.
- **Success State**: Results saved to Supabase or locally in browser.

### Screen: Past Quiz Session

- **Purpose**: Let students revisit saved quiz performance.
- **Primary Actions**: Open saved session, review quiz, generate more questions.
- **Secondary Actions**: Refresh sessions, mark question quality labels.
- **Required Content**: Session title, date, score, accuracy, result details.
- **Validation Rules**: Requires authenticated session and available saved session ID.
- **Empty State**: Past sessions panel is hidden when no sessions exist.
- **Loading State**: Session button is disabled while opening.
- **Error State**: Session could not be opened or auth expired.
- **Success State**: Saved result review appears.

## 4. Edge Cases

- Missing Supabase browser environment: show setup notice and do not render broken dashboard controls.
- Unauthenticated dashboard visit: redirect to `/login`.
- Unsupported file type: reject file and ask for PDF or image.
- File over 50 MB: reject file and ask for a smaller source.
- Empty pasted notes: block generation and ask user to paste notes first.
- Missing `raw-notes` bucket: show bucket setup message.
- Source metadata table missing: allow limited pending state where possible and explain setup gap.
- MCQ generation API failure: show retryable generation failure message.
- Large PDF generation delay: keep progress stages visible with elapsed time.
- User tries to submit quiz before answering all questions: block submit and explain requirement.
- Quiz persistence tables missing: save locally and tell user which SQL setup enables cloud save.
- Expired auth before save or feedback: ask user to sign in again.
- Past session unavailable: keep user in dashboard and show session-open failure.
- Original source unavailable for more questions: ask user to upload or paste the notes again.

## 5. UX Rules

- Keep extraction and AI pipeline details internal; the learner should experience one simple preparation step.
- Do not expose model names in learner-facing quiz flow.
- Always give the user a next action after an error.
- Preserve generated quiz state after answer selection and during review.
- Use session-bound claims only in Phase 1. Do not imply true mastery tracking, knowledge graph intelligence, or long-term weak-zone detection until those systems exist.
- Keep question-count choices limited to 5, 10, and 15 unless the generation and cost model changes.
- Make save status explicit: cloud save and local fallback should never feel identical.

## 6. Copy Requirements

- Buttons:
  - `File upload`
  - `Paste text`
  - `Choose file`
  - `Generate MCQs`
  - `Next question`
  - `Submit quiz`
  - `Save results`
  - `Review quiz`
  - `More questions`
  - `Refresh`
  - `Sign out`
- Error messages:
  - Use short, direct messages with a recovery action.
  - Avoid implementation jargon unless the user is being told exactly which setup file or bucket is missing.
- Empty states:
  - Explain what will appear and what action starts the flow.
- Success messages:
  - Confirm the result and mention whether it was saved to Supabase or locally.

## 7. Acceptance Checklist

- [ ] User can sign in and reach `/dashboard`.
- [ ] Unauthenticated user is redirected to `/login`.
- [ ] User can upload a valid PDF or image under 50 MB.
- [ ] User can paste text notes instead of uploading a file.
- [ ] Invalid file type and oversized file are blocked before upload.
- [ ] Empty pasted notes are blocked before generation.
- [ ] User can choose 5, 10, or 15 MCQs.
- [ ] Source preparation state appears before generation.
- [ ] Generation progress stages appear while `/api/generate-mcqs` is pending.
- [ ] Generated quiz displays all requested questions.
- [ ] Selecting an answer reveals immediate correctness feedback and explanation.
- [ ] User cannot submit until every question is answered.
- [ ] Quiz complete screen shows score, accuracy, right/wrong count, and save action.
- [ ] Results save to Supabase when persistence is configured.
- [ ] Results save locally with a clear message when persistence setup is missing.
- [ ] Past sessions can be refreshed and reopened.
- [ ] Past session review shows selected answer, correct answer, explanation, and score.
- [ ] User can generate more questions from the same source when the source is still available.
- [ ] No future knowledge-wiki, mastery-engine, or weak-zone intelligence claims appear in the Phase 1 UI.
