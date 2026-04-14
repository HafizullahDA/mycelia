# myCELIA API Plan

## Principles
- keep API routes in Next.js for now
- avoid premature backend complexity
- validate input clearly
- keep response shapes stable

## Early routes to build
### 1. `POST /api/generate-mcqs`
Purpose:
- generate UPSC-style MCQs from extracted notes or wiki-backed content

Model:
- gemini-2.5-pro

Expected responsibilities:
- validate payload
- build prompt safely
- request structured output
- return questions with explanations and concept references

### 2. `POST /api/extract-notes`
Purpose:
- extract usable text from PDF/image/text input

Model:
- gemini-2.5-flash for OCR/extraction and preprocessing

Expected responsibilities:
- normalize extracted text
- return clean content blocks
- preserve source metadata

### 3. `POST /api/compile-wiki`
Purpose:
- convert extracted content into structured concept knowledge

Model:
- gemini-2.5-pro

### 4. `POST /api/quiz/file-back`
Purpose:
- write quiz results back into knowledge records

## Later routes
- PYQ analysis routes
- weekly health check routes
- recommendation generation routes
- current affairs connector routes

## Important prompt note
All prompt and model logic should be written for:
- UPSC specificity
- concept precision
- explanation quality
- traceability to source material

## Non-goal for now
Do not overbuild a large API surface before the core routes are stable and tested.
