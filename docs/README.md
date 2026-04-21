# myCELIA Documentation Index

This index maps the current documentation set into the recommended sequence from `../guide.md`.

## Core Sequence

1. **Product requirements**
   - `prd/00-overview.md`
   - `prd/01-product-architecture.md`
   - `prd/02-phase-1-core.md`
   - `prd/03-phase-2-knowledge-wiki.md`
   - `prd/04-phase-3-retention-loop.md`
   - `prd/05-phase-4-exam-intelligence.md`

2. **Application flow and navigation**
   - `../APP_FLOW.md`

3. **User flow**
   - `../USER_FLOW.md`

4. **Backend structure**
   - `../BACKEND_STRUCTURE.md`

5. **Frontend guidelines**
   - `../FRONTEND_GUIDELINES.md`

6. **Technical spec**
   - `../TECHNICAL_SPEC.md`
   - `prd/07-api-plan.md`
   - `prd/01-product-architecture.md`

7. **Data model**
   - `prd/06-data-model.md`
   - `../supabase/sql/001_phase1_source_uploads.sql`
   - `../supabase/sql/002_phase1_quiz_results.sql`
   - `../supabase/sql/003_phase1_question_quality.sql`
   - `../supabase/sql/004_phase1_quiz_feedback.sql`

8. **AI prompts and behavior**
   - Current implementation source:
     - `../frontend/lib/server/prompts/`
     - `../frontend/lib/server/generate-mcqs.ts`
     - `../frontend/lib/server/extract-notes.ts`
   - Dedicated `AI_PROMPTS.md` is still pending.

9. **Implementation plan**
   - `../IMPLEMENTATION_PLAN.md`
   - `prd/08-phase-1-implementation-checklist.md`

10. **Test plan**
   - `../TEST_PLAN.md`
   - Use this as the release-gate verification plan for Phase 1.

11. **Operations**
   - `../OPERATIONS.md`
   - Current setup notes live in `../README.md`.
   - Use this as the setup, troubleshooting, and release runbook.

## Current Product Boundary

Phase 1 is the active product surface:

- authentication
- source upload or pasted notes
- backend extraction
- UPSC GS1 MCQ generation
- quiz attempt
- quiz result persistence
- past quiz review
- session-bound feedback and question-quality labeling

The following remain future phases unless explicitly promoted into active scope:

- personal knowledge wiki
- concept graph
- persistent mastery engine
- true strengths / weak-zone intelligence
- flashcards backed by concept tracking
- study guides backed by a compiled knowledge layer

## Rule for Updating Docs

When product behavior changes, update docs in this order:

1. Product requirement or phase doc
2. `../APP_FLOW.md`
3. `../USER_FLOW.md`
4. `../BACKEND_STRUCTURE.md`
5. `../FRONTEND_GUIDELINES.md`
6. API, data, prompt, or technical notes
7. Implementation checklist
8. Test or operations docs if the change affects release readiness
