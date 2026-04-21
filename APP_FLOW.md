# Application Flow & Navigation

## Purpose

Maps every page, every user path, and every decision point in myCELIA. This prevents AI-assisted development from guessing navigation patterns, adding unplanned pages, or exposing internal processing as learner-facing steps.

## Best Practices

- Start with user goals, not pages
- Document entry points explicitly: how users arrive
- Show decision points and branching logic
- Include success paths and error states
- Keep flows focused on single goals: one flow per task
- Use visual flowchart standards so shapes have meaning
- Document what triggers each flow

## Flowchart Legend

- `[Page]` = user-facing page or screen
- `(Action)` = user action
- `{Decision}` = branching condition
- `[[API]]` = backend route
- `((State))` = loading, success, error, or empty state
- `-->` = next step

## Application Route Map

### Public Pages

- `/` - landing or app entry page
- `/login` - sign-in page
- `/signup` - account creation page
- `/forgot-password` - password recovery request page
- `/reset-password` - password reset completion page
- `/privacy` - privacy policy page
- `/terms` - terms page

### Protected Pages

- `/dashboard` - main myCELIA workspace for source input, MCQ generation, quiz attempt, result save, and past quiz review

### API Routes

- `/api/health` - service and setup health check
- `/api/extract-notes` - note extraction support route
- `/api/generate-mcqs` - MCQ generation route
- `/api/quiz/file-back` - quiz result persistence route
- `/api/quiz/sessions` - saved quiz session list route
- `/api/quiz/sessions/[sessionId]` - saved quiz session detail route
- `/api/quiz/question-quality` - internal question quality label route
- `/api/quiz/generation-feedback` - quiz generation feedback route

## Entry Points

### Entry Point: New Visitor

Trigger:
- User opens `/`
- User follows a shared product link

Flow:

```text
[Home /] --> (User chooses sign in or sign up)
  --> [Login /login] or [Signup /signup]
```

Expected outcome:
- User authenticates and moves to `/dashboard`.

Error states:
- Auth provider unavailable
- Invalid credentials
- Missing Supabase browser configuration

### Entry Point: Returning Student

Trigger:
- User opens `/dashboard`
- User has an existing browser session

Flow:

```text
[Dashboard /dashboard]
  --> ((Checking your session))
  --> {Authenticated?}
    --> Yes --> [Dashboard Workspace]
    --> No --> [Login /login]
```

Expected outcome:
- Authenticated student sees the workspace.

Error states:
- Expired session redirects to login
- Missing environment variables show setup notice

### Entry Point: Password Recovery

Trigger:
- User cannot sign in and opens `/forgot-password`

Flow:

```text
[Forgot Password /forgot-password]
  --> (Submit email)
  --> ((Recovery email sent))
  --> [Reset Password /reset-password]
  --> (Submit new password)
  --> [Login /login]
```

Expected outcome:
- User resets password and signs in again.

Error states:
- Invalid email
- Expired reset link
- Weak or invalid password

## Core Goal Flows

### Flow 1: Sign In and Reach Workspace

Goal:
- Student wants to access myCELIA practice tools.

Trigger:
- User submits login form.

Flow:

```text
[Login /login]
  --> (Submit credentials)
  --> {Credentials valid?}
    --> Yes --> [Dashboard /dashboard]
    --> No --> ((Login error))
```

Success path:
- User lands on `/dashboard`.
- Dashboard checks session and loads workspace data.

Decision points:
- Are credentials valid?
- Is Supabase configured?
- Does the user have an active session?

Error states:
- Invalid credentials
- Missing Supabase env vars
- Auth request failure

### Flow 2: Create Account and Reach Workspace

Goal:
- New student wants to create an account and begin practice.

Trigger:
- User submits signup form.

Flow:

```text
[Signup /signup]
  --> (Submit account details)
  --> {Signup accepted?}
    --> Yes --> [Dashboard /dashboard] or [Login /login]
    --> No --> ((Signup error))
```

Success path:
- User reaches dashboard when session is active, or login when confirmation is required.

Decision points:
- Are required fields valid?
- Does Supabase require email confirmation?
- Is the session available immediately?

Error states:
- Existing account
- Invalid email
- Weak password
- Auth service failure

### Flow 3: Generate MCQs from Uploaded File

Goal:
- Student wants to convert a PDF or image into UPSC-style MCQs.

Trigger:
- User selects `File upload`, chooses a file, selects question count, and clicks `Generate MCQs`.

Flow:

```text
[Dashboard Workspace]
  --> (Select File upload)
  --> (Choose PDF or image)
  --> {Valid file?}
    --> No --> ((File validation error))
    --> Yes --> (Choose 5, 10, or 15 MCQs)
      --> (Click Generate MCQs)
      --> ((Preparing your source))
      --> {Upload to raw-notes succeeds?}
        --> No --> ((Upload or bucket error))
        --> Yes --> [[/api/generate-mcqs]]
          --> ((Generating MCQs))
          --> {Generation succeeds?}
            --> Yes --> [Active Quiz Session]
            --> No --> ((Generation error))
```

Success path:
- Generated MCQs appear in the quiz session panel.

Decision points:
- Is the user authenticated?
- Is the file a PDF or image?
- Is the file under 50 MB?
- Does the `raw-notes` bucket exist?
- Does generation return a valid quiz result?

Error states:
- `Upload a PDF or image file only.`
- `Keep files under 50 MB.`
- `Create the raw-notes bucket in Supabase before uploading files.`
- `The file could not be uploaded. Try again.`
- `MCQ generation failed.`
- `MCQ generation request failed. Try again.`

### Flow 4: Generate MCQs from Pasted Text

Goal:
- Student wants to convert pasted notes into UPSC-style MCQs without uploading a file.

Trigger:
- User selects `Paste text`, enters notes, selects question count, and clicks `Generate MCQs`.

Flow:

```text
[Dashboard Workspace]
  --> (Select Paste text)
  --> (Paste notes)
  --> {Text present?}
    --> No --> ((Paste text error))
    --> Yes --> (Choose 5, 10, or 15 MCQs)
      --> (Click Generate MCQs)
      --> ((Preparing your source))
      --> {Metadata save succeeds?}
        --> No --> ((Source save error))
        --> Yes --> [[/api/generate-mcqs]]
          --> ((Generating MCQs))
          --> {Generation succeeds?}
            --> Yes --> [Active Quiz Session]
            --> No --> ((Generation error))
```

Success path:
- Generated MCQs appear in the quiz session panel.

Decision points:
- Is the user authenticated?
- Is pasted text non-empty?
- Is source metadata saved or recoverable?
- Does generation return a valid quiz result?

Error states:
- `Paste some notes first.`
- `The notes could not be processed completely. Try again.`
- `MCQ generation failed.`
- `MCQ generation request failed. Try again.`

### Flow 5: Attempt and Submit Quiz

Goal:
- Student wants to answer generated questions and see performance.

Trigger:
- MCQ generation succeeds and quiz session appears.

Flow:

```text
[Active Quiz Session]
  --> (Select answer)
  --> ((Immediate feedback shown))
  --> (Move through questions)
  --> {All questions answered?}
    --> No --> ((Submit blocked))
    --> Yes --> (Submit quiz)
      --> [Quiz Complete]
```

Success path:
- Student sees score, accuracy, right/wrong count, duration when available, and next actions.

Decision points:
- Has the current question been answered?
- Has every question been answered?
- Has the quiz already been submitted?

Error states:
- `Answer every question before submitting the quiz.`
- Navigation controls are disabled when the current state should not allow movement.

### Flow 6: Save Quiz Result

Goal:
- Student wants to preserve the completed quiz result.

Trigger:
- User clicks `Save results` after submitting quiz.

Flow:

```text
[Quiz Complete]
  --> (Click Save results)
  --> {Authenticated session exists?}
    --> No --> ((Sign in again error))
    --> Yes --> [[/api/quiz/file-back]]
      --> {Cloud save succeeds?}
        --> Yes --> ((Results saved))
        --> No --> {Persistence setup missing?}
          --> Yes --> ((Saved locally))
          --> No --> ((Save error))
```

Success path:
- Results save to Supabase.
- Past sessions refresh.

Fallback path:
- Results save locally in the browser when quiz persistence tables are not configured.

Decision points:
- Is the user still authenticated?
- Does Supabase quiz persistence exist?
- Did the API return a valid saved session?

Error states:
- `Sign in again before saving quiz results.`
- `Quiz results could not be saved.`
- `Quiz results request failed. Try again.`

### Flow 7: Review Past Quiz Session

Goal:
- Student wants to revisit a saved quiz result.

Trigger:
- User clicks a past session in the dashboard.

Flow:

```text
[Dashboard Workspace]
  --> (Click past quiz session)
  --> {Authenticated session exists?}
    --> No --> ((Sign in again error))
    --> Yes --> [[/api/quiz/sessions/[sessionId]]]
      --> {Session found?}
        --> Yes --> [Past Quiz Session]
        --> No --> ((Past session error))
```

Success path:
- Past session opens with score, accuracy, right/wrong count, and review controls.

Decision points:
- Is the user authenticated?
- Does the session belong to the user?
- Does the session still exist?

Error states:
- `Sign in again before opening past quiz sessions.`
- `Past quiz session could not be opened.`
- `Past quiz session request failed. Try again.`

### Flow 8: Generate More Questions

Goal:
- Student wants another MCQ set from the same source.

Trigger:
- User clicks `More questions` after completing a quiz or reviewing a saved session.

Flow:

```text
[Quiz Complete or Past Quiz Session]
  --> (Click More questions)
  --> {Original source available in current session?}
    --> No --> ((Source unavailable error))
    --> Yes --> [[/api/generate-mcqs]]
      --> ((Generating MCQs))
      --> {Generation succeeds?}
        --> Yes --> [Active Quiz Session]
        --> No --> ((Generation error))
```

Success path:
- A new quiz appears using the same source material.

Decision points:
- Is the original source still available in client state?
- Does generation succeed?

Error states:
- `The original material is not available for this session. Upload or paste the notes again to generate more MCQs.`
- Generation failure messages.

### Flow 9: Submit Quiz Generation Feedback

Goal:
- Student wants to tell myCELIA how to improve a generated set.

Trigger:
- User enters optional feedback in the active quiz session and clicks `Send feedback`.

Flow:

```text
[Active Quiz Session]
  --> (Enter feedback up to 100 words)
  --> (Click Send feedback)
  --> {Authenticated session exists?}
    --> No --> ((Sign in again error))
    --> Yes --> [[/api/quiz/generation-feedback]]
      --> {Feedback save succeeds?}
        --> Yes --> ((Feedback saved))
        --> No --> ((Feedback save error))
```

Success path:
- Feedback panel closes and success message appears.

Decision points:
- Is feedback non-empty?
- Is feedback within 100 words?
- Is the user authenticated?

Error states:
- `Sign in again before sending quiz feedback.`
- `Quiz feedback could not be saved.`
- `Quiz feedback request failed. Try again.`

### Flow 10: Mark Question Quality

Goal:
- Internal quality review labels a saved question as good, too easy, malformed, off-style, or unsupported.

Trigger:
- User opens a saved quiz review and clicks a quality label.

Flow:

```text
[Past Quiz Session Review]
  --> (Click quality label)
  --> {Question result ID exists?}
    --> No --> ((No action))
    --> Yes --> {Authenticated session exists?}
      --> No --> ((Sign in again error))
      --> Yes --> [[/api/quiz/question-quality]]
        --> {Label save succeeds?}
          --> Yes --> ((Quality label saved))
          --> No --> ((Quality label error))
```

Success path:
- Selected quality label is persisted and visually applied.

Decision points:
- Does the question have a saved result ID?
- Is a label save already in progress?
- Is the user authenticated?

Error states:
- `Sign in again before marking question quality.`
- `Question quality could not be saved.`
- `Question quality request failed. Try again.`

## Global Navigation Rules

- `/dashboard` is the only protected learner workspace in Phase 1.
- Unauthenticated users attempting `/dashboard` must be redirected to `/login`.
- Public legal pages must not require authentication.
- Auth pages should not expose dashboard controls.
- The dashboard should not expose extraction as a separate learner-facing route.
- MCQ generation, result save, feedback, and quality labeling are actions inside the dashboard, not separate pages.
- Future pages for knowledge wiki, mastery engine, flashcards, study guides, or weak-zone intelligence are out of scope until promoted by PRD.

## Decision Point Summary

- Authenticated or not
- Supabase browser env configured or not
- File mode or text mode
- Valid source or invalid source
- Cloud setup complete or missing
- Generation success or failure
- All questions answered or incomplete quiz
- Cloud save success, local fallback, or save failure
- Past session available or unavailable
- Original source available or unavailable for more questions

## Acceptance Checklist

- [ ] Every current user-facing route is listed.
- [ ] Every current API route is listed.
- [ ] Every primary user goal has one focused flow.
- [ ] Every flow includes its trigger.
- [ ] Every flow includes decision points.
- [ ] Every flow includes success and error states.
- [ ] `/dashboard` remains the only protected Phase 1 workspace route.
- [ ] Extraction remains internal to source preparation and generation.
- [ ] Future intelligence features are marked out of scope, not implied as current navigation.
