# Frontend Guidelines

## Purpose

Defines how myCELIA should look and feel. This document tells AI and developers **how the interface should be designed**, so new screens stay consistent with the product instead of drifting into generic SaaS, marketing-page, or playful quiz-app patterns.

myCELIA is a serious UPSC preparation workspace. The UI should feel focused, premium, calm, and exam-oriented.

## Product Design Principles

- Build the actual study workspace first, not a marketing surface.
- Prioritize clarity, focus, and fast comprehension over visual decoration.
- Make the learner feel guided without exposing internal AI pipeline details.
- Keep the interface serious enough for exam preparation.
- Use restrained polish: subtle borders, shadows, and state changes are better than loud effects.
- Every screen should make the next action obvious.
- Every error should give a recovery path.
- Do not imply future intelligence features before the backend exists.

## Visual Identity

### Brand Tone

myCELIA should feel:

- focused
- trustworthy
- disciplined
- intelligent
- premium but not flashy
- built for serious aspirants

It should not feel:

- like a children's quiz game
- like a generic AI chatbot
- like a crypto dashboard
- like a bright marketing landing page
- like a social app

### Current Brand Signal

Use the existing `BrandWordmark` component for the product mark.

Current brand elements:

- `myCELIA` wordmark
- dark workspace background
- muted gold accent
- compact radial mark
- subtle rule line

Do not replace the wordmark with plain text unless the component is unavailable in that context.

## Color System

### Core Colors

Use the current palette as the source of truth:

- App background: `#0A0F1A`
- Elevated surface: `#111827`
- Deep panel surface: `#0F1726`
- Input surface: `#1F2937`
- Primary text: `#F9FAFB`
- Secondary text: `#9CA3AF`
- Muted text: `#6B7280`
- Brand accent gold: `#C8A44A`
- Brand accent light: `#E7C66D`
- Success: emerald/green tones already used in quiz feedback
- Error: red tones already used in validation feedback

### Color Rules

- Keep dark mode as the default and primary experience.
- Use gold only for brand, primary action, selected state, active state, or important status.
- Do not create a one-note gold/brown interface; gold is an accent, not the whole palette.
- Use neutral dark surfaces for layout hierarchy.
- Use green only for correct/success states.
- Use red only for incorrect/error states.
- Avoid purple-blue gradient themes, beige-heavy palettes, and decorative color blobs.

## Typography

### Text Style

- Use clear, modern sans-serif typography from the app stack.
- Keep body copy readable at `14px` to `15px`.
- Use compact uppercase labels sparingly for metadata and section labels.
- Do not use negative letter spacing for small text.
- Avoid viewport-scaled font sizes.
- Make headings strong but not oversized.

### Copy Tone

Use direct, calm, study-oriented copy.

Good:

- `Generate MCQs from your notes.`
- `Upload a PDF or image file only.`
- `Answer every question before submitting the quiz.`
- `Quiz results saved to Supabase.`

Avoid:

- hype-heavy copy
- jokes in core workflows
- vague AI language
- exposing model names in learner-facing UI
- claiming mastery or weak-zone intelligence before those systems exist

## Layout Rules

### Workspace Layout

- Use `/dashboard` as the main application workspace.
- Keep the main content centered with a practical max width.
- Use vertical rhythm: clear spacing between major sections.
- Prefer one focused primary workflow per screen.
- Do not create extra pages for actions that belong inside the dashboard.

### Cards and Panels

Current UI uses rounded panels with dark surfaces.

Rules:

- Use panels for major workspace regions.
- Use cards for repeated items such as past quiz sessions or question review blocks.
- Do not nest decorative cards inside other cards.
- Do not make every section look like an isolated floating card.
- Keep border radius consistent with the existing UI, usually `20px` to `28px` for major panels and `12px` to `18px` for controls/items.
- Use subtle borders such as `border-white/10`.
- Use shadows sparingly and consistently.

### Responsive Behavior

- The app must work on desktop, laptop, tablet, and mobile.
- Controls must not overflow on mobile.
- Long file names, source titles, and question text must wrap cleanly.
- Question options must remain tappable on mobile.
- Button text must fit without clipping.
- Avoid UI that depends on hover only.

## Component Guidelines

### Buttons

Primary buttons:

- Gold background
- Dark text
- Strong weight
- Used for the main next action

Examples:

- `Generate MCQs`
- `Next question`
- `Submit quiz`
- `Save results`

Secondary buttons:

- Dark background or transparent
- Subtle border
- Light text

Examples:

- `Previous`
- `Review quiz`
- `Refresh`
- `Sign out`

Button rules:

- Disable buttons during active requests.
- Use specific loading text: `Preparing source...`, `Generating MCQs...`, `Saving results...`
- Do not leave users guessing whether a click worked.
- Use icons only when they clarify a familiar action; do not add icons as decoration.

### Inputs

Use:

- dark input backgrounds
- subtle borders
- clear labels
- helpful placeholders
- visible focus states using gold
- visible confirmation for selected upload files

Validation rules:

- Validate before expensive backend work.
- Show short, direct errors near the relevant workflow.
- Keep errors actionable.
- Show selected image batches as a list before generation.
- Let users clear the selected file list before upload.

### Segmented Controls

Use segmented controls for mutually exclusive modes:

- `File upload`
- `Paste text`

Rules:

- Active state should be visually obvious.
- Switching modes should clear unrelated success/error messages.
- Do not create extra pages for upload versus paste.

### File Uploads

Rules:

- Support one PDF at a time.
- Support up to 10 images at once.
- Do not allow mixed PDF and image selections.
- Show selected files before upload with file names and sizes.
- Make the file count obvious, for example `3 images selected`.
- Provide a `Clear` action before generation.
- Keep the upload copy explicit: `Drop one PDF or up to 10 images here`.

### Question Count Controls

Use fixed choice buttons for:

- `5`
- `10`
- `15`

Rules:

- Selected count uses gold accent.
- Keep the choices stable until backend cost/performance assumptions change.

### Quiz Question UI

Question UI must prioritize readability.

Rules:

- Show one active question at a time.
- Provide question navigation chips.
- Show answered progress.
- Disable next-step actions when the current state does not allow them.
- Format multi-statement UPSC questions with readable line breaks.
- Show concept tags when available, but do not let tags dominate the question.

### Answer Feedback

When a learner selects an answer:

- reveal feedback immediately
- mark the correct answer in green
- mark the wrong selected answer in red
- show explanation
- show source support when available

Do not:

- make the learner wait until final submit for basic correctness feedback
- hide explanations behind tiny controls
- use playful animations for right/wrong feedback

### Result Summary

After quiz submission, show:

- score
- accuracy
- right/wrong count
- session duration when available
- save result action
- review action
- more questions action

Save status must be explicit:

- `Results saved`
- `Saved locally`
- `Saving results...`

Cloud save and local fallback should not feel identical.

### Past Sessions

Past session cards should show:

- title
- date
- score
- accuracy

Opening a past session should replace the active quiz panel with review mode, not navigate to a new page in Phase 1.

## Loading States

Use branded loading states for meaningful waits.

Current loading states:

- `Restoring your workspace...`
- `Checking your session...`
- `Preparing your source...`
- `Generating MCQs...`
- generation progress stages
- `Saving results...`

Rules:

- Long-running generation must show progress copy.
- Do not show raw backend terms such as OCR, prompt, token, or model unless in developer-facing diagnostics.
- For large files, explain that longer processing is normal.

## Empty States

Empty states should be instructional but brief.

Examples:

- No quiz generated yet
- Generated questions will appear after source upload or pasted notes
- Past sessions panel stays hidden when there are no sessions

Rules:

- Empty states should point to the next action.
- Do not use marketing copy in workflow empty states.

## Error States

Errors should be:

- short
- specific
- recoverable
- placed in context

Good examples:

- `Upload a PDF or image file only.`
- `Keep files under 50 MB.`
- `Paste some notes first.`
- `Sign in again before saving quiz results.`
- `The original material is not available for this session. Upload or paste the notes again to generate more MCQs.`

Avoid:

- raw stack traces
- vague `Something went wrong`
- AI/provider jargon
- errors that do not tell the user what to do next

## Accessibility

Minimum expectations:

- Text contrast must be readable on dark surfaces.
- Interactive elements must be keyboard reachable.
- Focus states must be visible.
- Buttons must have meaningful text.
- Form labels must be connected to inputs.
- Loading states should include visible text, not only spinners.
- Do not rely on color alone for correctness; include labels or explanatory text.
- Touch targets should be comfortable on mobile.

## Motion and Effects

Allowed:

- subtle spinner for loading
- gentle hover/focus changes
- subtle shadow and border changes
- simple active/selected state transitions

Avoid:

- excessive animation
- decorative animated backgrounds
- particle effects
- playful celebratory effects after quiz completion
- motion that distracts from reading questions

## Page-Specific Guidelines

### `/`

Current behavior:
- Restores workspace by redirecting authenticated users to `/dashboard` and unauthenticated users to `/login`.

Guideline:
- Keep this page lightweight unless a real landing page is intentionally added to scope.

### Auth Pages

Guidelines:

- Keep forms focused and responsive.
- Use the brand wordmark.
- Explain only what the user needs to complete auth.
- Do not show dashboard controls.
- Show auth errors clearly.

### `/dashboard`

Guidelines:

- This is the main Phase 1 product surface.
- Keep upload/paste, generation, quiz attempt, save, and review inside this workspace.
- Do not add separate learner-facing pages for extraction, prompt tuning, model selection, knowledge wiki, or mastery until those are in active scope.
- Keep top stats useful and honest.
- Make the main next action visually obvious.

### Legal Pages

Guidelines:

- `/privacy` and `/terms` should be readable and plain.
- They should not require authentication.
- They should not include app workflow controls.

## Out-of-Scope UI Patterns for Phase 1

Do not add:

- knowledge wiki screens
- concept graph visualizations
- persistent mastery dashboards
- weak-zone intelligence dashboards
- flashcard decks backed by concept tracking
- study guides backed by compiled knowledge
- PYQ engine screens
- current affairs connector screens
- model selector UI for learners
- prompt editor UI for learners

These may be designed later only after PRD, app flow, backend structure, and data model support exist.

## Implementation Notes

- Prefer existing component patterns before creating new abstractions.
- Keep styling in Tailwind unless the app introduces a formal design system.
- Reuse `BrandWordmark`.
- Keep colors consistent with existing hex values.
- Keep API/model details out of learner-facing components.
- Add new shared components only when the same UI pattern repeats meaningfully.
- Do not introduce a UI library unless there is a clear product need.

## Acceptance Checklist

- [ ] New screens match the dark focused myCELIA workspace style.
- [ ] Brand gold is used as an accent, not as the whole palette.
- [ ] Primary action is obvious on every workflow screen.
- [ ] Loading, empty, error, and success states are present.
- [ ] Error copy gives a recovery path.
- [ ] Quiz questions and options remain readable on mobile.
- [ ] Buttons and controls do not overflow on small screens.
- [ ] Auth pages stay separate from dashboard controls.
- [ ] `/dashboard` remains the main Phase 1 workspace.
- [ ] No future intelligence UI is added without matching backend/product scope.
