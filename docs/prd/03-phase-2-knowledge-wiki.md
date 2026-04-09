# Phase 2: Personal Knowledge Wiki

## Goal
Turn myCELIA from a stateless quiz tool into a stateful preparation system.

## Why this phase matters
This is the most important shift in the whole product.

Without this phase:
- every session starts from zero
- the app behaves like a disposable utility

With this phase:
- every upload adds to a knowledge base
- every quiz improves future study

## What gets built
### 1. Student knowledge records
Create concept-level records for each student.

Each record should represent:
- concept
- subject
- source
- understanding level
- testing history

### 2. Wiki files or structured concept entries
Each important concept should have a reusable article-like record.

Each entry should contain:
- concept title
- key explanation
- important facts
- links to related topics
- source references
- student understanding summary

### 3. Compilation step after upload
After raw notes are extracted:
- Gemini 3.1 Pro should identify concepts
- organize them clearly
- create or update wiki content

### 4. MCQ generation must read the knowledge layer first
Questions should no longer be based only on raw text.

Instead:
- read compiled concept knowledge
- target exact concepts
- preserve source traceability

## What this unlocks
Once this phase is complete, myCELIA can support:
- better question quality
- better concept targeting
- persistent learning
- personalization

## Success criteria
Phase 2 is complete only when:
- uploads create structured knowledge
- the same concept can be updated over time
- generated quizzes read from that stored knowledge
- students do not start from zero every session
