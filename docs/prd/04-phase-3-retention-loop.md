# Phase 3: Retention And Compounding Loop

## Goal
Use quiz results to improve what myCELIA knows about the student.

This is the feedback loop that creates compounding value.

## What gets built
### 1. File-back engine
After each quiz:
- map each question to a concept
- update student understanding
- increase or decrease strength signals
- record last tested date
- calculate next review date

### 2. Weak zone rebuilder
The system should identify:
- repeatedly weak concepts
- concepts answered slowly
- concepts guessed correctly but not confidently

It should then:
- generate targeted drills
- resurface them at the right time

### 3. Mistake book
Every wrong answer should be saved and made useful.

Each entry should show:
- the mistake
- the correct reasoning
- related concept
- what to review next

### 4. Review scheduling
Use basic spaced repetition logic.

Examples:
- weak concepts return sooner
- improving concepts return later
- mastered concepts reduce frequency

## Why this phase matters
This phase makes students come back because the app becomes personally relevant.

Instead of generic practice, they get:
- their weak areas
- their overdue concepts
- their next best session

## Success criteria
Phase 3 is complete only when:
- quiz results update knowledge records
- weak concepts are clearly identified
- students can review mistakes intentionally
- the app can recommend what to study next
