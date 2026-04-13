# Phase 1: Working Core

## Goal
Get the main product loop working reliably:
- upload notes
- extract content in the backend
- generate UPSC GS1 MCQs
- attempt quiz
- save results

This phase must work before advanced intelligence features are built.

## Scope
### 1. Authentication
Included.

Current surface:
- login
- signup
- forgot password
- reset password

Expectation:
- these flows should be reliable and responsive across desktop, laptop, tablet, and mobile

### 2. Upload input flow
Students should be able to submit:
- PDF
- image
- pasted text

Minimum acceptable result:
- raw input reaches the backend successfully
- file metadata is stored
- learner-facing UI stays simple and does not expose internal storage/extraction jargon

### 3. Extraction pipeline
Purpose:
- turn uploaded content into usable text

Model use:
- `gemini-2.5-flash` for OCR/extraction

Output:
- normalized extracted text
- key topics
- source title / metadata as needed

Important product note:
- extraction is a backend step
- it should not appear as a separate learner-facing phase in the main dashboard flow

### 4. MCQ generation route
Purpose:
- generate UPSC-style questions from extracted content

Model use:
- `gemini-2.5-pro`

Current implementation rules:
- UPSC GS Paper 1 only
- server-side prompt management in Next.js
- strict structured output validation
- controlled retry flow when model output fails validation
- stable JSON response shape
- source-grounded explanations and `sourceSupport`

### 5. Quiz attempt flow
Purpose:
- let the student answer generated questions in a serious, focused flow

Minimum requirements:
- stable quiz screen
- answer selection
- immediate feedback on selection
- correct answer highlighted clearly
- wrong selected answer highlighted clearly
- explanation reveal
- final result summary

### 6. Result persistence
Save:
- question
- correct answer
- selected answer
- is_correct
- explanation
- concept tag if available
- source support if available
- time taken if available
- session score

### 7. Phase 1.1 extensions
These are acceptable once the core loop is stable:
- post-quiz summary
- review quiz flow
- more questions from the same source
- missed concepts in this quiz
- quick recap from this quiz

These are allowed because they are session-bound and do not require pretending we already have a real mastery engine.

## What is out of scope in Phase 1
- knowledge wiki
- concept linking across sources
- persistent mastery engine
- real strengths / growth intelligence
- health checks
- PYQ engine
- current affairs connector
- flashcards backed by true concept tracking
- study guides backed by a compiled knowledge layer

## Success criteria
Phase 1 is complete only when:
- uploads work
- extraction works
- MCQ generation works
- quiz results save successfully
- the flow is tested end to end with real samples
- the learner-facing UI feels coherent and production-like across devices

## Build note
We should keep Phase 1 intentionally simple.

The purpose is not to make it perfect.
The purpose is to make the product real, stable, and honest.
