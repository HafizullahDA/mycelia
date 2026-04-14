# Phase 1 Implementation Checklist

## Objective
Build the first fully working version of the myCELIA core loop:
- upload notes
- extract content
- generate UPSC GS1 MCQs
- attempt quiz
- save results

We should not move to the next phase until this is stable and tested.

## Status snapshot
Current implementation already includes:
- auth flows
- source submission for PDF, image, and pasted text
- extraction route
- MCQ generation route
- server-side prompt management
- validation and retry flow
- quiz UI
- result save flow

What still matters now:
- end-to-end testing with real samples
- readback and continuity around saved quiz sessions
- Phase 1.1 post-quiz improvements
- documentation staying aligned with the code

## Section A: Upload Flow
### Goal
Allow the student to provide source material in a clean and reliable way.

### Build tasks
- Support:
  - PDF upload
  - image upload
  - pasted text
- Save raw files to Supabase Storage
- Save upload metadata in database
- Keep learner-facing wording simple:
  - upload / paste
  - choose question count
  - generate MCQs

### Current status
- implemented

### Done when
- a student can submit one valid input
- file or text is stored successfully
- UI clearly shows success or error

## Section B: Extraction Pipeline
### Goal
Turn uploaded content into clean text that can be used for question generation.

### Build tasks
- Maintain `POST /api/extract-notes`
- Accept uploaded file reference or raw text
- If PDF/image:
  - run OCR or extraction through `gemini-2.5-flash`
- If pasted text:
  - normalize and clean input
- Validate extraction output
- Retry once if extraction output fails validation

### Current status
- implemented

### Done when
- extracted text is returned reliably
- OCR works on at least one real sample
- failures return understandable messages

## Section C: MCQ Generation
### Goal
Generate high-quality UPSC-style MCQs from extracted notes.

### Build tasks
- Maintain `POST /api/generate-mcqs`
- Accept extracted content
- Use server-side GS1 prompt management
- Use `gemini-2.5-pro`
- Return structured MCQ output:
  - question
  - 4 options
  - correct answer
  - explanation
  - concept tag if available
  - source support
  - quality check metadata
- Add response validation
- Add controlled retry behavior
- Add human-readable error handling

### Current status
- implemented for UPSC GS Paper 1

### Done when
- route returns stable JSON
- 5 / 10 / 15 MCQs are generated from a sample note set
- output feels UPSC-oriented, not generic trivia

## Section D: Quiz Attempt UI
### Goal
Let students attempt generated questions in a serious, focused flow.

### Build tasks
- Maintain quiz session UI
- Keep learner flow simple:
  - submit notes
  - generate MCQs
  - attempt quiz
- Allow answer selection
- Reveal feedback immediately on selection
- Highlight correct answer in green
- Highlight wrong selected answer in red
- Show explanation inline
- Show final result summary

### Current status
- implemented

### Done when
- a user can complete one full quiz session
- feedback is visible and understandable
- end-of-session summary works properly

## Section E: Result Persistence
### Goal
Save quiz outcomes so sessions are no longer disposable.

### Build tasks
- Maintain Supabase tables for:
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
  - concept tag if available
  - time taken if available
- Confirm results can be read back later

### Current status
- save path implemented
- readback / history UI still needs stronger follow-through

### Done when
- a completed quiz is stored in Supabase
- question-level results are available after refresh
- prior quiz sessions can be surfaced back to the learner cleanly

## Section F: Testing Requirements
### Minimum test pass before Phase 2
- upload works
- extraction works
- MCQ generation works
- quiz can be completed
- result data is saved
- at least one real sample note upload has been tested

## Section G: Phase 1.1 Improvements
### Goal
Make the completed quiz loop feel more polished and useful without pretending we already have a mastery engine.

### Planned tasks
- post-quiz summary
- review quiz action
- more questions from same source
- missed concepts in this quiz
- optional quick recap from this quiz

### Important guardrail
These features must stay session-bound.

Do not frame them as:
- long-term mastery
- deep strengths analysis
- full weak-zone intelligence

## Recommended build order
1. Upload UI and storage wiring
2. Extraction API route
3. MCQ generation API route
4. Quiz UI
5. Supabase result persistence
6. Real sample testing and stabilization
7. Phase 1.1 summary / review / more questions work

## Phase 1 stop condition
Do not move to the knowledge wiki phase until:
- the core loop works end to end
- at least one real sample note upload has been tested
- question quality is acceptable
- errors are understandable
- saved result data can be trusted
- the app behavior is stable across desktop, laptop, tablet, and mobile
