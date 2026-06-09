# Requirements Document

## Introduction

The Gurukul AI educational platform (the "Portal") is an existing TypeScript/Express + React application that connects administrators, teachers, students, and parents. This spec defines requirements for a four-phase overhaul that hardens the API and access model, redesigns the user experience, deepens AI-assisted assessment, and adds secure real-time communication and video conferencing.

The overhaul is structured so that each phase delivers an independently valuable, fully functional increment. Phases 1 and 2 are **foundational** (must-have) and establish a clean, consistent, secure, and polished base. Phases 3 and 4 are **advanced** capabilities built on that foundation. The Portal MUST remain operational and backwards compatible at the completion of every phase.

Requirements are organized under one `## Requirements` section and grouped into four phases plus cross-cutting concerns. Each requirement title carries a phase/priority tag: **[P1 — Foundational]**, **[P2 — Foundational]**, **[P3 — Advanced]**, **[P4 — Advanced]**, or **[Cross-Cutting]**. Phase banners separate the groups for readability.

## Glossary

- **Portal**: The complete Gurukul AI platform, comprising the backend API and the React frontend.
- **API**: The backend Express/Mongoose service that exposes resources under the `/api/{resource}` namespace.
- **Endpoint**: A single HTTP route (method + path) exposed by the API.
- **Route_Map**: The canonical, documented inventory of every Endpoint, its method, path, required role, and request/response shape.
- **Response_Envelope**: The standardized JSON wrapper for all API responses.
- **Success_Envelope**: A Response_Envelope of the form `{ "success": true, "data": <payload> }`.
- **Error_Envelope**: A Response_Envelope of the form `{ "success": false, "message": <string>, "details": <optional object> }`.
- **RBAC_Service**: The combined `rbacMiddleware` (`requireRoles`) and `authorizationService` enforcing role and data-level access.
- **Admin**: A user role with full monitoring and override authority across all modules.
- **Teacher**: A user role (Faculty) scoped to courses, students, marks, and attendance the Teacher owns or is assigned to.
- **Student**: A user role scoped to the Student's own records.
- **Parent**: A user role scoped to the records of the Parent's linked Student(s).
- **Seed_Data**: A relational fixture dataset that makes the Portal immediately testable end-to-end.
- **Design_System**: The reusable frontend component library, tokens, and patterns used across the Portal UI.
- **Data_Table**: A reusable UI component supporting sorting, filtering, and pagination of tabular data.
- **Assessment**: A test or assignment authored in the Portal and answered by Students.
- **AI_Grader**: The asynchronous service that evaluates Assessment answers using NLP and returns scores and feedback.
- **Analytics_Engine**: The component that computes student performance patterns and predictive insights.
- **Grading_Job**: An asynchronous unit of work tracked from submission through completion (modeled by `GradingJob`).
- **Lambda_Worker**: A Python AWS Lambda function that performs AI grading and analytics off the main request path.
- **Messaging_Service**: The real-time messaging subsystem built on Socket.IO.
- **Channel**: A secure, role-constrained conversation between two participant types.
- **PTM**: A Parent-Teacher Meeting conducted over WebRTC video.
- **Video_Service**: The WebRTC-based subsystem that establishes and manages PTM video sessions.
- **Recording_Store**: The Amazon S3 storage used for optional PTM recording archives.
- **WCAG_AA**: Web Content Accessibility Guidelines 2.1 Level AA.

## Requirements

<!-- ===================== PHASE 1: Architecture Audit & API Refactoring (FOUNDATIONAL) ===================== -->

### Requirement 1: Canonical Route Map [P1 — Foundational]

**User Story:** As an Admin, I want a documented inventory of every API endpoint, so that I can understand and govern the full surface of the Portal.

#### Acceptance Criteria

1. THE API SHALL expose a Route_Map that lists every Endpoint with method, path, required role, request schema, and response schema.
2. WHEN a new Endpoint is added to the API, THE Route_Map SHALL include an entry for that Endpoint.
3. IF an Endpoint exists in the API but is absent from the Route_Map, THEN THE API SHALL be treated as non-compliant and the Endpoint SHALL be documented before release.
4. THE Route_Map SHALL document the existing resource namespaces: attendance, auth, course, enrollment, faculty, grading, health, mark, metrics, parentMe, studentMe, and student.

### Requirement 2: Standardized Response Envelopes [P1 — Foundational]

**User Story:** As a frontend developer, I want every API response to follow one consistent shape, so that I can handle data and errors uniformly.

#### Acceptance Criteria

1. WHEN an Endpoint completes successfully, THE API SHALL return a Success_Envelope of the form `{ "success": true, "data": <payload> }`.
2. IF an Endpoint encounters an error, THEN THE API SHALL return an Error_Envelope of the form `{ "success": false, "message": <string>, "details": <optional object> }`.
3. THE API SHALL set the HTTP status code consistent with the Response_Envelope outcome, using 2xx for a Success_Envelope and 4xx or 5xx for an Error_Envelope.
4. WHEN a validation error occurs, THE API SHALL populate the `details` field of the Error_Envelope with field-level error descriptions.
5. THE API SHALL apply the Response_Envelope format to all Endpoints across all resource namespaces.

### Requirement 3: Dead Code and Duplicate Route Elimination [P1 — Foundational]

**User Story:** As a maintainer, I want dead code and duplicate routes removed, so that the codebase is clean and unambiguous.

#### Acceptance Criteria

1. THE API SHALL expose exactly one Endpoint for each unique combination of resource action and HTTP method.
2. IF two or more routes resolve to the same resource action, THEN THE API SHALL retain one route and remove the duplicate routes.
3. THE API SHALL contain no controller, service, or repository function that is unreachable from any registered Endpoint.
4. WHEN dead code or a duplicate route is removed, THE Route_Map SHALL be updated to reflect the removal.

### Requirement 4: Role-Based Access Control via IAM Principles [P1 — Foundational]

**User Story:** As a security owner, I want strict role and data-level access control, so that each user sees and changes only what their role permits.

#### Acceptance Criteria

1. WHERE a request targets a protected Endpoint, THE RBAC_Service SHALL require a valid JWT access token before processing the request.
2. WHEN an authenticated Admin requests any module, THE RBAC_Service SHALL grant read access across all modules.
3. WHERE an Admin invokes an override action, THE RBAC_Service SHALL permit the Admin to modify records across all modules.
4. WHEN a Teacher requests records, THE RBAC_Service SHALL return only records for courses, students, marks, and attendance the Teacher owns or is assigned to.
5. WHEN a Student requests records, THE RBAC_Service SHALL return only the Student's own records.
6. WHEN a Parent requests records, THE RBAC_Service SHALL return only records belonging to the Parent's linked Student(s).
7. IF an authenticated user requests a record outside the user's authorized scope, THEN THE RBAC_Service SHALL deny the request with an Error_Envelope and HTTP status 403.
8. IF a request lacks a valid access token for a protected Endpoint, THEN THE RBAC_Service SHALL deny the request with an Error_Envelope and HTTP status 401.
9. WHEN an Admin override modifies a record, THE API SHALL write an AuditLog entry recording the actor, action, target record, and timestamp.

### Requirement 5: Removal of Placeholder UI Components [P1 — Foundational]

**User Story:** As a user, I want every screen to present real functionality, so that I never encounter unfinished placeholders.

#### Acceptance Criteria

1. THE Portal SHALL contain no UI component that displays "Stay tuned" or equivalent placeholder text.
2. WHERE a feature is not yet available, THE Portal SHALL hide the corresponding navigation entry rather than display a placeholder screen.
3. WHEN a user navigates to any visible route, THE Portal SHALL render functional content backed by live API data.

### Requirement 6: Realistic Relational Seed Data [P1 — Foundational]

**User Story:** As a developer or tester, I want realistic seed data, so that the Portal is instantly testable end-to-end.

#### Acceptance Criteria

1. WHEN the seed routine runs against an empty database, THE Portal SHALL create Admin, Teacher, Student, and Parent accounts.
2. THE Seed_Data SHALL create courses, enrollments, marks, attendance records, messages, and system metrics that reference the seeded accounts.
3. THE Seed_Data SHALL link each Parent to at least one Student and each Student to at least one Course.
4. WHEN seeding completes, THE Portal SHALL allow an Admin, a Teacher, a Student, and a Parent to log in and view non-empty data for each user's authorized scope.
5. IF the seed routine is run against a database that already contains Seed_Data, THEN THE Portal SHALL complete without creating duplicate records.

<!-- ===================== PHASE 2: UI/UX Redesign (FOUNDATIONAL) ===================== -->

### Requirement 7: Cohesive Design System [P2 — Foundational]

**User Story:** As a user, I want a polished, consistent interface, so that the Portal feels like a premium product rather than a generic template.

#### Acceptance Criteria

1. THE Design_System SHALL provide reusable components for buttons, cards, tables, forms, modals, and navigation.
2. WHEN a screen renders a UI element of a given type, THE Portal SHALL render the corresponding Design_System component rather than a one-off implementation.
3. THE Design_System SHALL derive colors, typography, spacing, and elevation from the shared design tokens defined in `designTokens.ts` and `createEnhancedTheme.js`.
4. THE Design_System SHALL apply a single visual style inspired by modern SaaS dashboards across all components.

### Requirement 8: Responsive Layout [P2 — Foundational]

**User Story:** As a user on any device, I want the interface to adapt to my screen, so that the Portal is usable from phone to large monitor.

#### Acceptance Criteria

1. WHILE the viewport width is between 320 and 2560 pixels, THE Portal SHALL render all primary screens without horizontal scrolling.
2. WHEN the viewport width crosses a defined breakpoint, THE Portal SHALL adjust layout and navigation to the corresponding responsive arrangement.
3. WHILE the viewport width is at or below 768 pixels, THE Portal SHALL present navigation in a collapsible mobile pattern.

### Requirement 9: Accessibility Compliance [P2 — Foundational]

**User Story:** As a user with disabilities, I want the Portal to meet accessibility standards, so that I can operate it with assistive technology.

#### Acceptance Criteria

1. THE Portal SHALL meet WCAG_AA success criteria for color contrast on all text and interactive elements.
2. WHEN a user navigates with a keyboard, THE Portal SHALL expose a visible focus indicator and allow operation of all interactive controls without a pointing device.
3. THE Portal SHALL provide programmatic labels and roles for all interactive controls so that screen readers announce each control's purpose.
4. WHERE an image conveys information, THE Portal SHALL provide descriptive alternative text.

### Requirement 10: Admin Data Tables [P2 — Foundational]

**User Story:** As an Admin, I want powerful data tables, so that I can explore and manage large datasets efficiently.

#### Acceptance Criteria

1. WHEN an Admin views a Data_Table, THE Portal SHALL support sorting by any sortable column.
2. WHEN an Admin applies a filter to a Data_Table, THE Portal SHALL display only rows matching the filter criteria.
3. WHEN a dataset exceeds the configured page size, THE Data_Table SHALL paginate results and allow navigation between pages.
4. WHEN an Admin selects a Data_Table row, THE Portal SHALL open a drill-down view of the selected record's details.

### Requirement 11: Admin Metrics and Override Controls [P2 — Foundational]

**User Story:** As an Admin, I want real metrics and override controls, so that I can monitor the Portal and intervene when needed.

#### Acceptance Criteria

1. WHEN an Admin opens the dashboard, THE Portal SHALL display system metrics sourced from the metrics Endpoints rather than static placeholder values.
2. WHILE an Admin views a record the Admin is authorized to override, THE Portal SHALL present override controls for that record.
3. WHEN an Admin submits an override, THE Portal SHALL call the corresponding override Endpoint and display the updated record on success.
4. IF an override request fails, THEN THE Portal SHALL display the Error_Envelope message to the Admin and leave the displayed record unchanged.

<!-- ===================== PHASE 3: AI Integration for Assignments & Grading (ADVANCED) ===================== -->

### Requirement 12: Assessment Authoring and Submission [P3 — Advanced]

**User Story:** As a Teacher, I want to create tests and assignments and have Students submit answers, so that I can assess learning through the Portal.

#### Acceptance Criteria

1. WHEN a Teacher creates an Assessment, THE Portal SHALL persist the Assessment with its questions and association to a Course.
2. WHERE an Assessment includes subjective questions, THE Portal SHALL allow free-text answer fields for those questions.
3. WHEN a Student submits Assessment answers within the submission window, THE Portal SHALL persist the submission and acknowledge receipt with a Success_Envelope.
4. IF a Student submits after the submission window closes, THEN THE Portal SHALL reject the submission with an Error_Envelope.

### Requirement 13: Automated AI Grading of Subjective Answers [P3 — Advanced]

**User Story:** As a Teacher, I want subjective answers graded automatically, so that I can scale assessment without manually grading every response.

#### Acceptance Criteria

1. WHEN a Student submits an Assessment containing subjective answers, THE Portal SHALL enqueue a Grading_Job for AI evaluation.
2. WHEN the AI_Grader evaluates a subjective answer, THE AI_Grader SHALL produce a numeric score and textual feedback for that answer.
3. WHEN a Grading_Job completes, THE Portal SHALL persist the resulting scores and feedback associated with the submission.
4. WHERE a Teacher reviews AI-generated results, THE Portal SHALL allow the Teacher to override the AI score and feedback before finalizing.
5. IF the AI_Grader fails to evaluate a submission, THEN THE Portal SHALL mark the Grading_Job as failed and notify the Teacher.

### Requirement 14: Asynchronous and Serverless Processing [P3 — Advanced]

**User Story:** As a user, I want grading and analytics to run in the background, so that the Portal stays responsive during heavy AI workloads.

#### Acceptance Criteria

1. WHEN a Grading_Job is enqueued, THE Portal SHALL return a response to the requesting user without waiting for grading to complete.
2. THE Portal SHALL execute AI grading and analytics workloads on a Lambda_Worker separated from the main request path.
3. WHILE a Grading_Job is in progress, THE Portal SHALL expose the job's status as one of queued, processing, completed, or failed.
4. WHEN a user requests the status of a Grading_Job, THE Portal SHALL return the current status and, when completed, the result reference.

### Requirement 15: Performance Analytics and Predictive Insights [P3 — Advanced]

**User Story:** As a Teacher, I want analytics on student performance and predictive insights, so that I can identify at-risk students and intervene early.

#### Acceptance Criteria

1. WHEN sufficient graded data exists for a Student, THE Analytics_Engine SHALL compute performance trend metrics for that Student.
2. WHEN a Teacher views a Course's analytics, THE Portal SHALL display aggregated performance patterns across the Teacher's enrolled Students.
3. WHERE predictive insights are available, THE Portal SHALL present a predicted performance indicator with a confidence value to the Teacher.
4. THE Portal SHALL restrict a Student's analytics to that Student's authorized Teachers, the Student, and the Student's linked Parent(s).

<!-- ===================== PHASE 4: Communication & PTM Video Infrastructure (ADVANCED) ===================== -->

### Requirement 16: Secure Role-Constrained Messaging Channels [P4 — Advanced]

**User Story:** As a user, I want real-time messaging on secure channels, so that I can communicate with the right people without crossing role boundaries.

#### Acceptance Criteria

1. THE Messaging_Service SHALL support distinct Channels for Parent-to-Teacher, Teacher-to-Student, and Teacher-to-Admin conversations.
2. WHEN a participant sends a message on a Channel, THE Messaging_Service SHALL deliver the message in real time to the other authorized participant(s) of that Channel.
3. IF a user attempts to join or post to a Channel that the user's role does not permit, THEN THE Messaging_Service SHALL deny the action with an Error_Envelope and HTTP status 403.
4. WHEN a message is sent, THE Messaging_Service SHALL persist the message so that it is retrievable in conversation history.
5. WHILE a recipient is offline, THE Messaging_Service SHALL retain undelivered messages and deliver them when the recipient reconnects.

### Requirement 17: PTM Scheduling [P4 — Advanced]

**User Story:** As a Parent or Teacher, I want to schedule Parent-Teacher Meetings, so that we can meet at an agreed time over video.

#### Acceptance Criteria

1. WHEN a Teacher or Parent schedules a PTM, THE Portal SHALL persist the meeting with its participants, date, and time.
2. WHEN a PTM is scheduled, THE Portal SHALL notify the invited participant(s).
3. IF a requested PTM time conflicts with an existing PTM for the same Teacher, THEN THE Portal SHALL reject the request with an Error_Envelope describing the conflict.
4. WHERE a user is not an authorized party to the PTM, THE Portal SHALL prevent that user from joining the meeting.

### Requirement 18: WebRTC Video Conferencing [P4 — Advanced]

**User Story:** As a Parent and Teacher, I want a video call for our meeting, so that we can talk face to face remotely.

#### Acceptance Criteria

1. WHEN an authorized participant joins a scheduled PTM at or after its start time, THE Video_Service SHALL establish a WebRTC connection to the other participant.
2. WHILE a PTM video session is active, THE Video_Service SHALL transmit audio and video between connected participants.
3. IF a participant's connection drops during a PTM, THEN THE Video_Service SHALL attempt to re-establish the connection.
4. WHEN a participant leaves the PTM, THE Video_Service SHALL release that participant's media connection.

### Requirement 19: Optional Recording Archives [P4 — Advanced]

**User Story:** As an authorized participant, I want to optionally record a PTM, so that the meeting can be archived for later reference.

#### Acceptance Criteria

1. WHERE recording is enabled for a PTM, THE Video_Service SHALL capture the session and store the recording in the Recording_Store.
2. WHEN a recording is stored, THE Portal SHALL associate the recording reference with the corresponding PTM.
3. WHEN an authorized participant requests a PTM recording, THE Portal SHALL provide time-limited access to the recording in the Recording_Store.
4. IF an unauthorized user requests a PTM recording, THEN THE Portal SHALL deny access with an Error_Envelope and HTTP status 403.

<!-- ===================== CROSS-CUTTING REQUIREMENTS ===================== -->

### Requirement 20: Backwards Compatibility Across Phases [Cross-Cutting — Foundational]

**User Story:** As a stakeholder, I want the Portal to keep working after each phase, so that the overhaul never leaves the system broken.

#### Acceptance Criteria

1. WHEN a phase is completed, THE Portal SHALL allow existing Admin, Teacher, Student, and Parent users to authenticate and access their authorized features.
2. WHEN an Endpoint contract changes, THE API SHALL preserve the standardized Response_Envelope format established in Phase 1.
3. IF a feature from an earlier phase is altered, THEN THE Portal SHALL retain the externally observable behavior relied upon by users unless a later requirement explicitly specifies the change.
4. WHEN a phase is completed, THE Portal SHALL pass the existing automated test suite.

### Requirement 21: Performance [Cross-Cutting — Non-Functional]

**User Story:** As a user, I want the Portal to respond quickly, so that my workflow is not interrupted by delays.

#### Acceptance Criteria

1. WHEN a user requests a read Endpoint under nominal load, THE API SHALL return a response within 500 milliseconds at the 95th percentile.
2. WHEN a user submits an action that triggers AI processing, THE Portal SHALL acknowledge the request within 500 milliseconds by enqueuing asynchronous work.
3. WHILE a Data_Table displays a paginated dataset under nominal load, THE Portal SHALL load each page within 1 second at the 95th percentile.
4. WHEN a real-time message is sent between connected participants under nominal load, THE Messaging_Service SHALL deliver the message within 1 second.

### Requirement 22: Security [Cross-Cutting — Non-Functional]

**User Story:** As a security owner, I want the Portal to protect data and access, so that user information stays confidential and tamper-resistant.

#### Acceptance Criteria

1. THE API SHALL require a valid JWT access token for every protected Endpoint and reject expired or malformed tokens with HTTP status 401.
2. THE API SHALL enforce data-level isolation so that a user retrieves only records within the user's authorized scope.
3. WHEN a privileged action or Admin override is performed, THE API SHALL record an AuditLog entry with actor, action, target, and timestamp.
4. THE Portal SHALL transmit messaging, video signaling, and recording access over encrypted connections.
5. IF input fails validation or contains disallowed content, THEN THE API SHALL reject the request with an Error_Envelope and HTTP status 400.

### Requirement 23: Scalability [Cross-Cutting — Non-Functional]

**User Story:** As an operator, I want the Portal to scale with demand, so that performance holds as users and workloads grow.

#### Acceptance Criteria

1. WHERE AI grading or analytics demand increases, THE Portal SHALL process additional Grading_Jobs by scaling Lambda_Worker capacity without changing the main request path.
2. WHEN the Grading_Job queue grows, THE Portal SHALL process jobs in queue order without dropping enqueued jobs.
3. WHILE concurrent PTM video sessions are active up to the configured capacity, THE Video_Service SHALL handle additional sessions without degrading existing sessions below acceptable quality.
4. THE Recording_Store SHALL accommodate growth in archived recordings without requiring changes to the application code.
