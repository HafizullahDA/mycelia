# myCELIA Product Overview

## What myCELIA is
myCELIA is an AI-powered UPSC preparation system that converts student notes into exam-style MCQs and compounds with every study session.

It is not just a notes-to-quiz tool.

It should become:
- a living knowledge system for each student
- a personal weak-zone detector
- a compounding exam preparation engine

## Core product principle
Every session should leave the student stronger than before.

That means:
- uploaded notes must not disappear into a one-time quiz flow
- generated questions must come from persistent knowledge
- quiz results must update student understanding
- future sessions must improve because of past sessions

## The compounding loop
The product should work like this:

1. Student uploads notes
2. Notes are extracted and structured
3. Concepts are compiled into a personal knowledge wiki
4. MCQs are generated from that structured knowledge
5. Student answers the quiz
6. Results are filed back into knowledge records
7. Weak areas are prioritized in future sessions

## AI model strategy
myCELIA will not use Claude.

Current model decisions:
- `Gemini 3.1 Pro`: nuanced MCQ generation, wiki compilation, concept linking, analysis, health checks
- `Gemini Flash 3.x`: OCR, extraction, fast preprocessing of PDFs and images

## Product promise
After 30 days, myCELIA should understand a student's preparation gaps better than the student does.

## Build philosophy
We will build this product one section at a time.

Rules:
- build one feature group
- test it properly
- stabilize it
- move to the next feature only after approval

## Current direction
This repo is now organized to support phased execution instead of scattered feature work.

The next implementation priority is:
- complete and stabilize the core notes-to-MCQ flow
- then build the persistent knowledge layer
