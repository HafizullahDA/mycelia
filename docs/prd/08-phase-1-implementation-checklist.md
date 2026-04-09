# Phase 1 Implementation Checklist

## Objective
Build the first fully working version of the myCELIA core loop:
- upload notes
- extract content
- generate UPSC MCQs
- attempt quiz
- save results

We should not move to the next phase until this is stable and tested.

## Section A: Upload Flow
### Goal
Allow the student to provide source material in a clean and reliable way.

### Build tasks
- Create upload page or upload module
- Support:
  - PDF upload
  - image upload
  - pasted text
- Show clear upload states:
  - idle
  - uploading
  - uploaded
  - failed
- Save raw files to Supabase Storage
- Save upload metadata in database

### Done when
- a student can upload one valid input
- file or text is stored successfully
- UI clearly shows success or error

## Section B: Extraction Pipeline
### Goal
Turn uploaded content into clean text that can be used for question generation.

### Build tasks
- Create `POST /api/extract-notes`
- Accept uploaded file reference or raw text
- If PDF/image:
  - run OCR or extraction through Gemini Flash 3.x
- If pasted text:
  - normalize and clean input
- Return:
  - extracted text
  - source metadata
  - extraction status

### Done when
- extracted text is returned reliably
- OCR works on at least one real sample
- failures return understandable messages

## Section C: MCQ Generation
### Goal
Generate high-quality UPSC-style MCQs from extracted notes.

### Build tasks
- Create `POST /api/generate-mcqs`
- Accept extracted content
- Build prompt for Gemini 3.1 Pro
- Return structured MCQ output:
  - question
  - 4 options
  - correct answer
  - explanation
  - optional concept tag
- Add response validation
- Add human-readable error handling

### Done when
- route returns stable JSON
- 5 to 10 MCQs are generated from a sample note set
- output feels UPSC-oriented, not generic trivia

## Section D: Quiz Attempt UI
### Goal
Let students attempt generated questions in a serious, focused flow.

### Build tasks
- Create quiz session UI
- Show one question at a time or a stable multi-question layout
- Allow answer selection
- Show next/submit actions
- Show explanation after answer or at summary stage
- Show final result summary

### Done when
- a user can complete one full quiz session
- answers are visible and understandable
- end-of-session summary works properly

## Section E: Result Persistence
### Goal
Save quiz outcomes so sessions are no longer disposable.

### Build tasks
- Create or confirm Supabase tables for:
  - quiz session
  - question results
- Save:
  - user id
  - session id
  - question
  - chosen answer
  - correct answer
  - correctness
  - explanation
  - time taken if available
- Confirm results can be read back later

### Done when
- a completed quiz is stored in Supabase
- question-level results are available after refresh

## Section F: Testing Requirements
### Minimum test pass before Phase 2
- upload works
- extraction works
- MCQ generation works
- quiz can be completed
- result data is saved

## Recommended build order
1. Upload UI and storage wiring
2. Extraction API route
3. MCQ generation API route
4. Quiz UI
5. Supabase result persistence

## Phase 1 stop condition
Do not move to the knowledge wiki phase until:
- the core loop works end to end
- at least one real sample note upload has been tested
- question quality is acceptable
- errors are understandable