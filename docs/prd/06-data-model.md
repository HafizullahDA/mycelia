# myCELIA Data Model Plan

## Core tables already expected
- `profiles`
- `quiz_sessions`
- `question_results`

## New tables required
### 1. `student_knowledge`
Purpose:
- store concept-level understanding per student

Suggested fields:
- `id`
- `user_id`
- `concept`
- `subject`
- `exam`
- `understanding`
- `times_tested`
- `times_correct`
- `avg_time_seconds`
- `last_tested`
- `next_review`
- `is_mastered`
- `pressure_accuracy`
- `wiki_file_path`
- `source_files`
- `health_flags`

### 2. `wiki_files`
Purpose:
- store compiled concept content

Suggested fields:
- `id`
- `user_id`
- `concept`
- `subject`
- `exam`
- `content`
- `compiled_at`
- `source_files`
- `last_health_check`
- `health_score`

## Supporting storage
### Supabase Storage buckets
Suggested buckets:
- `raw-notes`
- `generated-assets` if needed later

## Data relationships
- one user has many quiz sessions
- one quiz session has many question results
- one user has many student knowledge records
- one user has many wiki files
- question results should map to concepts when possible

## Implementation note
We should not create every advanced field on day one unless it helps the current phase.

Better approach:
- create the minimum schema for the current milestone
- extend it carefully as each phase begins
