# Documentation Guide for myCELIA

This guide defines the documentation sequence for myCELIA so product planning, AI-assisted implementation, and engineering work stay aligned. Each document should reduce ambiguity, protect scope, and make the next build step easier to test.

## Recommended Documentation Order

1. `PRD.md` - Product Requirements Document
2. `APP_FLOW.md` - Application flow, navigation, routes, entry points, and decision branches
3. `USER_FLOW.md` - Detailed user journeys, screens, states, and edge cases
4. `BACKEND_STRUCTURE.md` - Backend ownership, data movement, storage boundaries, APIs, and server modules
5. `FRONTEND_GUIDELINES.md` - Visual design rules, UI patterns, states, accessibility, and frontend style boundaries
6. `TECHNICAL_SPEC.md` - Architecture, APIs, data contracts, services, and implementation constraints
7. `DATA_MODEL.md` - Database schema, entities, relationships, storage, and migrations
8. `AI_PROMPTS.md` - AI model roles, prompts, input/output schemas, validation rules, and retry behavior
9. `IMPLEMENTATION_PLAN.md` - Phases, tasks, owners, acceptance checks, and release order
10. `TEST_PLAN.md` - Manual and automated test cases for product flows, APIs, data, and AI outputs
11. `OPERATIONS.md` - Environment variables, deployment, monitoring, cost controls, and troubleshooting

The first document to create is the PRD. After that, create `APP_FLOW.md` because it maps every page, route, entry point, user path, and decision branch before implementation details are chosen. Then create `USER_FLOW.md` for deeper screen-level states and acceptance checks.

## Document 1: PRD.md (Product Requirements Document)

### Purpose

Your contract with AI. Defines **what** you are building, **who** it is for, and **what success looks like**. No ambiguity allowed.

For myCELIA, the PRD should keep the product grounded in the real learning loop:

1. Student uploads or pastes notes
2. Notes are extracted and normalized
3. UPSC-style MCQs are generated
4. Student attempts the quiz
5. Results are saved
6. Future product phases use those results to improve weak-zone detection and revision

### Best Practices from Research

- Start with user goals and problems, not features
- Include explicit out-of-scope items to prevent scope creep
- Use SMART criteria for success metrics: Specific, Measurable, Achievable, Relevant, Time-bound
- Keep it concise but comprehensive: modern PRDs are blog-post length, not 37-page docs
- Make it a living document that evolves with the product
- Use clear, specific language and avoid vague terms
- Include user stories in `As a [user], I want [goal], so that [benefit]` format
- Separate current product reality from future product ambition
- Make AI behavior testable through input/output expectations, not just intent

### Structure Template

```md
# Product Requirements Document (PRD)

## 1. Product Overview
- **Project Title**: [Name]
- **Version**: 1.0
- **Last Updated**: [Date]
- **Owner**: [Name]

## 2. Problem Statement
[What user/business problem are you solving? Be specific.]

## 3. Goals & Objectives
### Business Goals
- [Goal 1 with metric]
- [Goal 2 with metric]

### User Goals
- [What users want to accomplish]

## 4. Success Metrics
- [Metric 1]: [Target]
- [Metric 2]: [Target]
- [How you will measure success]

## 5. Target Users & Personas
### Primary Persona: [Name]
- **Demographics**:
- **Pain Points**:
- **Goals**:
- **Technical Proficiency**:

### Secondary Persona: [Name]
[Same format]

## 6. Features & Requirements
### Must-Have Features (P0)
1. **[Feature Name]**
   - Description: [What it does]
   - User Story: As a [user], I want [goal] so that [benefit]
   - Acceptance Criteria:
     - [ ] [Specific, testable criterion]
     - [ ] [Specific, testable criterion]
   - Success Metric: [How you measure this feature's success]

2. [Repeat for each P0 feature]

### Should-Have Features (P1)
[Same format]

### Nice-to-Have Features (P2)
[Same format]

## 7. Explicitly OUT OF SCOPE
- [Thing 1 you will NOT build]
- [Thing 2 you will NOT build]

This section is critical. It prevents AI or developers from adding features you never requested.

## 8. User Scenarios
### Scenario 1: [Name]
- **Context**: [When does this happen?]
- **Steps**:
  1. [User action]
  2. [System response]
  3. [User action]
- **Expected Outcome**: [What success looks like]
- **Edge Cases**: [What could go wrong?]

## 9. Dependencies & Constraints
- **Technical Constraints**: [Platform limits, API restrictions, etc.]
- **Business Constraints**: [Budget, timeline, team size]
- **External Dependencies**: [Third-party services, APIs]

## 10. Timeline & Milestones
- **MVP**: [Date] - [Features included]
- **V1.0**: [Date] - [Features included]

## 11. Risks & Assumptions
### Risks
- [Risk 1 and mitigation strategy]

### Assumptions
- [Assumption 1 and validation plan]

## 12. Non-Functional Requirements
- **Performance**: [Load time, concurrent users]
- **Security**: [Authentication, data protection]
- **Accessibility**: [WCAG compliance level]
- **Scalability**: [Expected growth]

## 13. References & Resources
- [Links to research, competitor analysis, user interviews]
```

### Sample AI Prompt for PRD Generation

```md
Create a comprehensive Product Requirements Document (PRD) for [YOUR APP IDEA].

Context:
- Target Users: [WHO]
- Main Problem: [WHAT PROBLEM]
- Unique Value: [WHY THIS SOLUTION]

Structure the PRD with these sections:

1. PROBLEM STATEMENT
Write a clear, specific problem statement that describes the user pain point or business need.

2. GOALS & OBJECTIVES
Define 3-5 SMART goals with specific, measurable targets.

3. SUCCESS METRICS
Identify 3-5 quantifiable metrics to measure success, for example "30% reduction in task completion time".

4. TARGET PERSONAS
Create 2 detailed user personas with:
- Demographics
- Pain points
- Goals
- Technical proficiency level

5. FEATURES & REQUIREMENTS
Organize features into three tiers:
- P0 (Must-Have): Core features required for MVP
- P1 (Should-Have): Important but not critical for launch
- P2 (Nice-to-Have): Future enhancements

For each feature, include:
- Clear description
- User story format: "As a [user], I want [goal] so that [benefit]"
- 3-5 acceptance criteria that are specific and testable
- Success metric

6. EXPLICITLY OUT OF SCOPE
List 5-10 things you will NOT build in this version. Be specific.

7. USER SCENARIOS
Create 3 detailed end-to-end scenarios showing:
- Context: when this happens
- Step-by-step user actions and system responses
- Expected outcomes
- Edge cases and error handling

8. NON-FUNCTIONAL REQUIREMENTS
Specify performance, security, accessibility, and scalability requirements.

9. DEPENDENCIES & CONSTRAINTS
List technical and business constraints, external dependencies such as APIs and services.

10. TIMELINE
Define MVP and V1.0 milestone dates with included features.

CRITICAL REQUIREMENTS:
- Use specific, measurable criteria, not vague language
- Avoid technical implementation details
- Focus on WHAT to build, not HOW to build it
- Make every requirement testable
- Include edge cases and error states
- Be explicit about what is NOT included

OUTPUT FORMAT: Markdown document with clear headers and bullet points.
```

## Document 2: APP_FLOW.md (Application Flow & Navigation)

### Purpose

Maps every page, every user path, and every decision point. Prevents AI from guessing navigation patterns.

For myCELIA, this document should describe the current Phase 1 navigation surface:

- public entry pages
- auth pages
- protected dashboard
- dashboard actions
- API-backed transitions
- success paths
- error branches
- out-of-scope future routes

### Best Practices from Research

- Start with user goals, not pages
- Document entry points explicitly: how users arrive
- Show decision points and branching logic
- Include success paths and error states
- Keep flows focused on single goals: one flow per task
- Use visual flowchart standards so shapes have meaning
- Document what triggers each flow

### Why This Comes Next

The PRD says what should exist. `APP_FLOW.md` decides how users move through the application. It prevents accidental route creation, unclear redirects, hidden branches, and invented navigation patterns.

### Structure Template

```md
# Application Flow & Navigation

## 1. Overview
- **Product**: [Name]
- **Version**: 1.0
- **Last Updated**: [Date]
- **Primary Navigation Goal**: [Short description]

## 2. Flowchart Legend
- `[Page]` = user-facing page or screen
- `(Action)` = user action
- `{Decision}` = branching condition
- `[[API]]` = backend route
- `((State))` = loading, success, error, or empty state
- `-->` = next step

## 3. Route Map
### Public Pages
- `/`
- `/login`
- `/signup`

### Protected Pages
- `/dashboard`

### API Routes
- `/api/...`

## 4. Entry Points
### Entry Point: [Name]
- **Trigger**:
- **Flow**:
- **Expected Outcome**:
- **Error States**:

## 5. Goal Flows
### Flow: [Single Goal]
- **Goal**:
- **Trigger**:
- **Flowchart**:

```text
[Page]
  --> (Action)
  --> {Decision?}
    --> Yes --> [Next Page]
    --> No --> ((Error State))
```

- **Success Path**:
- **Decision Points**:
- **Error States**:

## 6. Global Navigation Rules
- [Rule 1]
- [Rule 2]

## 7. Out-of-Scope Routes
- [Future route not included now]
- [Future route not included now]

## 8. Acceptance Checklist
- [ ] Every current user-facing route is listed
- [ ] Every current API route is listed
- [ ] Every primary user goal has one focused flow
- [ ] Every flow includes triggers, decision points, success paths, and error states
```

### Sample AI Prompt for APP_FLOW.md

```md
Create APP_FLOW.md for myCELIA based on the PRD and current app routes.

Context:
- myCELIA is an AI-powered UPSC preparation app.
- Phase 1 flow: student uploads or pastes notes, generates UPSC-style MCQs, attempts the quiz, and saves results.
- Current protected workspace is /dashboard.
- Extraction and AI processing happen internally and should not become separate learner-facing routes.

Include:
- Route map for public pages, protected pages, and API routes
- Entry points and how users arrive
- One focused flow per user goal
- Flowcharts using clear shape notation
- Decision points and branching logic
- Success paths and error states
- Global navigation rules
- Out-of-scope future routes
- Acceptance checklist

CRITICAL REQUIREMENTS:
- Start with goals, not pages
- Do not invent new routes
- Keep /dashboard as the Phase 1 workspace
- Do not add knowledge-wiki, mastery-engine, or weak-zone intelligence routes unless marked future/out of scope
- Make every decision branch explicit

OUTPUT FORMAT: Markdown document with clear headers and checklists.
```

## Document 3: USER_FLOW.md

Create this after `APP_FLOW.md`. It documents screen-level behavior after navigation is clear.

It should define:

- Required screens
- User actions and system responses
- Loading states
- Empty states
- Error states
- Success states
- Validation rules
- Copy requirements
- Acceptance checklist

## Document 4: BACKEND_STRUCTURE.md

Create this after `APP_FLOW.md` and `USER_FLOW.md`. It tells the AI and developers **how data works**.

It should define:

- Backend principles
- Client/server boundaries
- Data stores
- Core data entities
- Main backend data flows
- API route ownership
- Server module ownership
- Data access rules
- AI data rules
- Error handling rules
- Current backend capability boundary

## Document 5: FRONTEND_GUIDELINES.md

Create this after `APP_FLOW.md` and `USER_FLOW.md`. It tells the AI and developers **how the application should look and feel**.

It should define:

- Product design principles
- Visual identity
- Color system
- Typography rules
- Layout rules
- Component guidelines
- Loading, empty, error, and success states
- Accessibility expectations
- Motion and effects rules
- Page-specific UI guidance
- Out-of-scope UI patterns

## Document 6: TECHNICAL_SPEC.md

Create this after `APP_FLOW.md`, `USER_FLOW.md`, `BACKEND_STRUCTURE.md`, and `FRONTEND_GUIDELINES.md`. It translates product, flow, backend data, and frontend design decisions into implementation decisions.

It should define:

- Frontend routes and major components
- Backend API endpoints
- Request and response contracts
- Supabase tables and storage buckets used by each flow
- Gemini model responsibilities
- Validation rules
- Error handling rules
- Environment variables
- Security boundaries
- Cost-control decisions

Do not write this before the user flow is clear. Technical specs created too early tend to overbuild the wrong thing.

## Document 7: DATA_MODEL.md

Create this when the product flow and technical boundaries are stable.

It should define:

- Tables
- Columns
- Relationships
- Indexes
- Row-level security expectations
- Storage bucket usage
- Migration order
- Seed data, if needed
- Data retention assumptions

For myCELIA, this document should be honest about what exists now versus what is planned for the future knowledge layer.

## Document 8: AI_PROMPTS.md

Create this when AI behavior needs to be stable and repeatable.

It should define:

- Model responsibilities
- Prompt versions
- Input schemas
- Output schemas
- Validation rules
- Retry rules
- Failure behavior
- Cost controls
- Examples of acceptable and unacceptable outputs

For myCELIA, this is where extraction and MCQ generation should be documented separately.

## Document 9: IMPLEMENTATION_PLAN.md

Create this when the requirements, flow, technical spec, data model, and AI behavior are clear enough to build.

It should define:

- Work phases
- Task list
- Dependencies between tasks
- Acceptance criteria
- Manual verification steps
- What must be completed before moving to the next phase

## Document 10: TEST_PLAN.md

Create this before release or before a stabilization pass.

It should define:

- Manual test cases
- API tests
- Database checks
- AI output quality checks
- Accessibility checks
- Regression checklist
- Known risks and untested areas

## Document 11: OPERATIONS.md

Create this once the app needs repeatable setup, deployment, or maintenance.

It should define:

- Environment variables
- Local setup
- Supabase setup order
- Deployment steps
- Health checks
- Monitoring
- Troubleshooting
- Cost-control practices

## Short Rule

After `PRD.md`, create `APP_FLOW.md`.

The PRD decides what should exist. The app flow decides how users navigate it. The user flow decides how each screen behaves in detail. The backend structure decides how data works. The frontend guidelines decide how it should look. Only after those are clear should you create the technical spec.
