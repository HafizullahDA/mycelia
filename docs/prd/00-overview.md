# myCELIA Product Overview

## What myCELIA is
myCELIA is an AI-powered UPSC preparation system that converts student notes into UPSC-style MCQs and is intended to compound with every serious study session.

It is not just a notes-to-quiz tool.

It should become:
- a living knowledge system for each student
- a personal weak-zone detector
- a compounding exam preparation engine

## Core product principle
Every session should leave the student stronger than before.

That means:
- uploaded notes must not disappear into a one-time quiz flow
- generated questions must eventually come from structured knowledge
- quiz results must eventually update student understanding
- future sessions must improve because of past sessions

## Long-term compounding loop
The intended product loop is:

1. Student uploads notes
2. Notes are extracted and structured
3. Concepts are compiled into a personal knowledge wiki
4. MCQs are generated from that structured knowledge
5. Student answers the quiz
6. Results are filed back into knowledge records
7. Weak areas are prioritized in future sessions

## Current implementation reality
The repo is intentionally still in the working-core stage.

What is real today:
- authentication flow
- source submission via PDF, image, or pasted text
- backend extraction pipeline
- UPSC GS Paper 1 MCQ generation
- quiz attempt flow
- quiz result persistence

What is not real yet:
- personal knowledge wiki
- concept graph
- persistent mastery engine
- true strengths / weak-zone intelligence
- flashcards and study guides backed by a real knowledge layer

## AI model strategy
Current model decisions:
- `gemini-2.5-flash`: OCR, extraction, normalization, fast preprocessing
- `gemini-2.5-pro`: nuanced UPSC GS1 MCQ generation

Model usage notes:
- extraction and MCQ generation are split intentionally
- prompts are managed server-side
- MCQ generation uses structured validation and controlled retries

## Phase 1 UX principle
The learner should experience a simple flow:

1. Upload or paste notes
2. Choose question count
3. Click `Generate MCQs`
4. Attempt quiz
5. Save results

Important:
- extraction remains a backend step
- extraction should not be surfaced as a separate learner-facing stage
- internal model or pipeline details should not be exposed in the product UI

## Operating constraint
myCELIA should be designed with Google Cloud free credits as the primary AI budget constraint.

Implications:
- prefer Gemini and Google Cloud-native services first
- avoid unnecessary third-party paid AI dependencies
- minimize duplicate model calls
- validate and normalize cheaply before sending material to models

## Product promise
After enough consistent use, myCELIA should understand a student's preparation gaps better than the student does.

That promise is aspirational right now, not yet earned by the current implementation.

## Build philosophy
We will build this product one section at a time.

Rules:
- build one feature group
- test it properly
- stabilize it
- move to the next feature only after approval

## Current direction
The current priority remains:
- complete and stabilize the core notes-to-MCQ flow
- test it end to end with real samples
- add honest Phase 1.1 post-quiz improvements
- only then move to the persistent knowledge layer

## Immediate next roadmap
Near-term improvements that fit the current product honestly:
- post-quiz summary
- review quiz flow
- more questions from the same source
- missed concepts in this quiz
- optional quick recap from this quiz

These are Phase 1.1 improvements, not Phase 2 intelligence claims.
