# Phase 1: Working Core

## Goal
Get the main product loop working reliably:
- upload notes
- generate MCQs
- attempt quiz
- save results

This phase must work before advanced intelligence features are built.

## Scope
### 1. Authentication
Already in progress.

Includes:
- login
- signup
- forgot password
- reset password

### 2. Upload input flow
Students should be able to submit:
- PDF
- image
- pasted text

Minimum acceptable result:
- raw input reaches the backend successfully
- file metadata is stored

### 3. Extraction pipeline
Purpose:
- turn uploaded content into usable text

Model use:
- Gemini Flash 3.x for OCR/extraction

Output:
- normalized extracted text
- source references

### 4. MCQ generation route
Purpose:
- generate UPSC-style questions from extracted content

Model use:
- Gemini 3.1 Pro

Requirements:
- server-side route in Next.js
- clear validation
- graceful error handling
- stable JSON response shape

### 5. Quiz attempt flow
Purpose:
- let the student answer generated questions cleanly

Minimum requirements:
- one question at a time or stable quiz screen
- answer selection
- explanation reveal
- score summary

### 6. Result persistence
Save:
- question
- correct answer
- selected answer
- is_correct
- time taken if available
- session score

## What is out of scope in Phase 1
- knowledge wiki
- concept linking
- weak zone rebuilding
- health checks
- PYQ engine
- current affairs connector

## Success criteria
Phase 1 is complete only when:
- uploads work
- extraction works
- MCQ generation works
- quiz results save successfully
- flow is tested end to end

## Build note
We should keep Phase 1 intentionally simple.

The purpose is not to make it perfect.
The purpose is to make the product real and stable.
