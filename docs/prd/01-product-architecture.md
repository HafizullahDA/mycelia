# myCELIA Product Architecture

## High-level architecture
myCELIA should be built around a persistent learning loop, not isolated sessions.

The system has 3 practical layers:
- source layer
- knowledge layer
- feedback layer

## 1. Source layer
This is where student material enters the system.

Inputs:
- PDF uploads
- image uploads
- pasted text
- typed notes

Responsibilities:
- store raw files safely
- extract text from PDFs and images
- preserve file metadata and source references

Primary tools:
- Supabase Storage
- gemini-2.5-flash for OCR/extraction and preprocessing

## 2. Knowledge layer
This is the heart of myCELIA.

Purpose:
- convert raw notes into structured, reusable knowledge
- organize concepts by subject and topic
- build a personal knowledge wiki for each student

Responsibilities:
- create concept-level topic entries
- add source traceability
- connect related concepts
- keep understanding scores per concept

Primary tools:
- Supabase tables
- markdown/wiki-style content
- gemini-2.5-pro for concept compilation and linking

## 3. Feedback layer
This is what makes the product compound.

After every session, the system should:
- identify concepts tested
- log accuracy
- log time taken
- mark weak or strong understanding
- schedule the next review

This layer powers:
- weak zone rebuilding
- mistake book
- review scheduling
- future recommendations

## Practical system loop
1. Student uploads notes
2. Raw notes are stored
3. Notes are extracted
4. Structured concept files are compiled
5. MCQs are generated from structured knowledge
6. Student takes quiz
7. Results are written back to knowledge records
8. Next session becomes more personalized

## Key product distinction
Normal quiz apps:
- read source material once
- generate questions
- forget everything

myCELIA:
- stores knowledge
- updates knowledge
- improves future outputs

## Required product surfaces
To support this architecture, the app will eventually need:
- auth
- upload flow
- quiz flow
- personal knowledge map/wiki view
- weak zones and mistake review
- progress analytics

## Technical note
The architecture should remain simple at first:
- Next.js App Router frontend and API routes
- Supabase auth, database, and storage
- Gemini model calls through server routes

No unnecessary backend complexity should be introduced before the core loop is working.
