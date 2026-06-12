# Requirements Document

## Introduction

This feature closes four backend gaps in the Gurukul AI platform that the existing React frontend already expects but the Express/Mongoose/TypeScript backend does not yet serve. Today the affected UIs render errors, empty placeholders, or hardcoded mock data because the supporting REST endpoints are missing.

The four areas are:

1. **Communication / Messaging** — REST endpoints over the existing `Message` model so faculty and parents can list conversations, read a thread, send a message, mark messages read, and delete messages, each strictly scoped to the authenticated user.
2. **Feedback** — a new `Feedback` model plus scoped endpoints so students and parents can submit feedback and ratings about a teacher or course, and faculty can view feedback addressed to them with aggregate statistics.
3. **Admin Parents List** — an admin-only paginated parents list endpoint, consistent with the existing `GET /api/faculty` and `GET /api/students` admin list endpoints.
4. **Quiz Analytics** — a faculty-scoped analytics endpoint that computes real metrics from the authoritative `Assessment` and `Submission` collections, replacing the mock numbers in the Quiz Analytics UI.

Every new endpoint reuses the platform's established pipeline (`authMiddleware` → `requireRoles`/`adminOnly` → `validateRequest` → controller → service → `AuthorizationService`), the canonical success/failure envelope (`utils/envelope.ts`), per-endpoint rate limiting, and `auditService` for sensitive actions. All authorization scope is derived from `req.user` only and never from client-supplied identifiers. The frontend services and components are then wired to consume these real endpoints in place of the current mock or graceful-empty stubs.

## Glossary

- **System**: The Gurukul AI backend application as a whole.
- **Messaging_API**: The set of Express route handlers mounted under `/api/messages` that serve authenticated message data.
- **Feedback_API**: The set of Express route handlers mounted under `/api/feedback` that serve feedback submission and retrieval.
- **Admin_Parents_API**: The Express route handler serving the admin-only paginated parents list under `/api/parents`.
- **Quiz_Analytics_API**: The Express route handler serving faculty-scoped quiz analytics under `/api/faculty/me/quiz-analytics`.
- **Auth_Middleware**: The existing `authMiddleware` that validates the JWT Bearer token and attaches `userId` and `role` to the request as `req.user`.
- **RBAC_Middleware**: The existing `requireRoles`/`adminOnly` role-based access control middleware.
- **Validation_Middleware**: The existing `validateRequest` Zod-based middleware that validates request body, params, and query.
- **Authorization_Service**: The existing service-layer `AuthorizationService` that verifies per-record ownership and linkage at the data layer.
- **Audit_Service**: The existing `auditService` that writes entries to the `AuditLog` collection for security-relevant actions.
- **Rate_Limiter**: The existing per-endpoint rate-limiting middleware applied to write endpoints.
- **Envelope**: The canonical response shape — success `{ success: true, data, meta? }` or failure `{ success: false, message, details? }` — produced by `utils/envelope.ts`.
- **Message**: An existing Mongoose document in the `messages` collection representing a single message between a parent and a faculty member about a student, with `conversationId`, `senderId`/`senderModel`, `recipientId`/`recipientModel`, `studentId`, `isRead`, `messageType`, `priority`, `deliveryStatus`, `isDeleted`, and timestamps.
- **Conversation**: The set of `Message` documents sharing one `conversationId`, ordered by creation time.
- **Feedback**: A new Mongoose document representing one feedback/rating submission by a student or parent about a target teacher or course.
- **Feedback_Author**: The authenticated student or parent who submits a Feedback document.
- **Feedback_Target**: The faculty member or course that a Feedback document is addressed to.
- **Feedback_Stats**: The aggregate summary computed for a faculty member's received feedback — total count, positive count, needs-attention count, and average rating.
- **Assessment**: An existing Mongoose document representing a quiz/assessment authored by a faculty member for a course, containing questions with `maxScore`, `opensAt`, and `closesAt`.
- **Submission**: An existing Mongoose document representing a student's submission to an Assessment, containing `gradingStatus`, optional `gradedAnswers` (each with `score`/`maxScore`), and a `finalized` flag.
- **Quiz_Analytics**: The computed metrics for a faculty member's assessments — total attempts, average score, completion rate, pass rate, score distribution, and completion status.
- **Authenticated_User**: The principal identified by `req.user` (a `userId` and `role`) after Auth_Middleware succeeds.
- **Faculty**: A user with role `teacher` (also referred to as faculty), stored in the `Faculty` collection.
- **Parent**: A user with role `parent`, stored in the `Parent` collection.
- **Student**: A user with role `student`, stored in the `Student` collection.
- **Admin**: A user with role `admin`.

## Requirements

### Requirement 1: List Authenticated User Conversations

**User Story:** As a faculty member or parent, I want to list my conversations, so that I can see all message threads I participate in.

#### Acceptance Criteria

1. WHEN an Authenticated_User with role `teacher` or `parent` requests their conversations, THE Messaging_API SHALL filter at the Conversation level and return only those Conversations in which the Authenticated_User is the sender or the recipient, excluding Message documents where `isDeleted` is `true`.
2. THE Messaging_API SHALL derive the participant scope from `req.user` only and SHALL NOT accept a user identifier from the request to determine scope.
3. THE Messaging_API SHALL return each Conversation summary with the latest message, the unread count for the Authenticated_User, and the total message count.
4. WHEN pagination query parameters `page` and `limit` are provided, THE Messaging_API SHALL return the corresponding page of Conversation summaries and include `page`, `limit`, and `total` in the Envelope `meta` field.
5. IF the request omits a valid Bearer token, THEN THE Auth_Middleware SHALL reject the request with HTTP 401 and a failure Envelope.
6. IF the Authenticated_User has a role other than `teacher` or `parent`, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403 and a failure Envelope.
7. WHEN the Authenticated_User has no conversations, THE Messaging_API SHALL return HTTP 200 with a success Envelope containing an empty collection.

### Requirement 2: Fetch a Conversation Thread

**User Story:** As a faculty member or parent, I want to open a conversation thread, so that I can read the messages exchanged about a student.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests a Conversation thread by `conversationId`, THE Messaging_API SHALL return the Message documents for that `conversationId` ordered by creation time, excluding Message documents where `isDeleted` is `true`.
2. WHEN an Authenticated_User requests a Conversation thread, THE Authorization_Service SHALL verify that the Authenticated_User is the sender or recipient of that Conversation before any message content is returned.
3. IF the Authenticated_User is neither sender nor recipient of the requested Conversation, THEN THE Authorization_Service SHALL reject the request with HTTP 403 and a failure Envelope, including WHEN the Conversation contains no viewable messages.
4. WHEN pagination query parameters `page` and `limit` are provided, THE Messaging_API SHALL return the corresponding page of Message documents and include `page`, `limit`, and `total` in the Envelope `meta` field.
5. IF the request omits a valid Bearer token, THEN THE Auth_Middleware SHALL reject the request with HTTP 401 and a failure Envelope.
6. IF the requested `conversationId` matches no Message documents, THEN THE Messaging_API SHALL return HTTP 200 with a success Envelope containing an empty collection.
7. WHEN a Conversation exists but all of its Message documents have `isDeleted` set to `true`, THE Messaging_API SHALL return HTTP 200 with an empty message collection and Envelope `meta` indicating that the Conversation exists but has no viewable messages, distinct from the response for a non-existent Conversation.

### Requirement 3: Send a Message

**User Story:** As a faculty member or parent, I want to send a message, so that I can communicate with the other party about a student.

#### Acceptance Criteria

1. WHEN an Authenticated_User submits a message with subject, content, recipient identifier, recipient model, and student identifier, THE Messaging_API SHALL persist a new Message document with `senderId` and `senderModel` derived from `req.user`.
2. THE Validation_Middleware SHALL reject a send request with HTTP 400 and a failure Envelope WHEN the subject is empty, the content is empty, the content exceeds 2000 characters, the subject exceeds 200 characters, or a required recipient or student identifier is missing.
3. WHEN an Authenticated_User sends a message, THE Authorization_Service SHALL verify that the Authenticated_User is permitted to message the specified recipient before the Message document is persisted.
4. IF the Authenticated_User is not permitted to message the specified recipient, THEN THE Authorization_Service SHALL reject the request with HTTP 403 and a failure Envelope and SHALL NOT persist a Message document.
5. WHEN a message is persisted successfully, THE Messaging_API SHALL return HTTP 201 with a success Envelope containing the created Message.
6. WHEN a message is persisted successfully, THE Audit_Service SHALL record an audit entry capturing the actor, the action, and the message identifier.
7. WHERE a write rate limit is configured for the send endpoint, THE Rate_Limiter SHALL reject requests exceeding the configured limit with HTTP 429 and a failure Envelope.
8. IF the request omits a valid Bearer token, THEN THE Auth_Middleware SHALL reject the request with HTTP 401 and a failure Envelope.
9. IF the Authenticated_User has a role other than `teacher` or `parent`, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403 and a failure Envelope.

### Requirement 4: Mark a Message as Read

**User Story:** As a faculty member or parent, I want to mark a message as read, so that my unread counts stay accurate.

#### Acceptance Criteria

1. WHEN an Authenticated_User marks a message as read by message identifier, THE Messaging_API SHALL set `isRead` to `true` and set `readAt` to the current time for that Message document.
2. WHEN an Authenticated_User marks a message as read, THE Authorization_Service SHALL verify that the Authenticated_User is the recipient of that Message before the update is applied.
3. THE Messaging_API SHALL evaluate authorization before message-existence validation, so that an Authenticated_User lacking access MAY receive HTTP 403 even WHEN the supplied message identifier matches no Message document.
4. IF the Authenticated_User is not the recipient of the Message, THEN THE Authorization_Service SHALL reject the request with HTTP 403 and a failure Envelope.
5. IF the specified message identifier matches no Message document and authorization does not otherwise fail, THEN THE Messaging_API SHALL return HTTP 404 and a failure Envelope.
6. WHEN the Message is already marked read, THE Messaging_API SHALL return HTTP 200 with a success Envelope and SHALL leave `readAt` unchanged; otherwise THE Messaging_API SHALL set `readAt` to the current time.
7. IF the request omits a valid Bearer token, THEN THE Auth_Middleware SHALL reject the request with HTTP 401 and a failure Envelope.

### Requirement 5: Delete a Message

**User Story:** As a faculty member or parent, I want to delete a message, so that I can remove a message I sent or received from my view.

#### Acceptance Criteria

1. WHEN an Authenticated_User deletes a message by message identifier, THE Messaging_API SHALL set `isDeleted` to `true` and set `deletedAt` to the current time for that Message document.
2. WHEN an Authenticated_User deletes a message, THE Authorization_Service SHALL verify that the Authenticated_User is the sender or recipient of that Message before the update is applied.
3. IF the Authenticated_User is neither sender nor recipient of the Message, THEN THE Authorization_Service SHALL reject the request with HTTP 403 and a failure Envelope.
4. IF the specified message identifier matches no Message document, THEN THE Messaging_API SHALL return HTTP 404 and a failure Envelope.
5. WHEN a message is deleted successfully, THE Audit_Service SHALL record an audit entry capturing the actor, the action, and the message identifier.
6. WHEN the soft-delete is confirmed persisted, THE Messaging_API SHALL return HTTP 200 with a success Envelope.
7. WHERE a write rate limit is configured for the delete endpoint, THE Rate_Limiter SHALL reject requests exceeding the configured limit with HTTP 429 and a failure Envelope.
8. IF the request omits a valid Bearer token, THEN THE Auth_Middleware SHALL reject the request with HTTP 401 and a failure Envelope.
9. THE Messaging_API SHALL evaluate the delete request in the order Auth_Middleware → RBAC_Middleware → Rate_Limiter → message-existence validation → ownership authorization, and WHEN multiple failure conditions occur simultaneously the earliest condition in that order SHALL determine the returned error.
10. IF the soft-delete operation fails to persist, THEN THE Messaging_API SHALL return an error status with a failure Envelope and SHALL NOT return HTTP 200.

### Requirement 6: Submit Feedback

**User Story:** As a student or parent, I want to submit feedback and a rating about a teacher or course, so that I can share my experience.

#### Acceptance Criteria

1. WHEN an Authenticated_User with role `student` or `parent` submits feedback with a Feedback_Target, a rating, and a comment, THE Feedback_API SHALL persist a new Feedback document with the Feedback_Author identifier and role derived from `req.user`.
2. THE Validation_Middleware SHALL reject a submission with HTTP 400 and a failure Envelope WHEN the rating is outside the configured rating scale, the Feedback_Target identifier is missing, the Feedback_Target type is not `teacher` or `course`, or the comment exceeds the configured maximum length.
3. WHEN the database confirms the Feedback document write, THE Feedback_API SHALL return HTTP 201 with a success Envelope containing the created Feedback, and SHALL NOT return HTTP 201 before the write is confirmed.
4. THE Feedback_API SHALL set the Feedback_Author scope from `req.user` only and SHALL NOT accept an author identifier from the request.
5. WHERE a write rate limit is configured for the submission endpoint, THE Rate_Limiter SHALL reject requests exceeding the configured limit with HTTP 429 and a failure Envelope.
6. IF the request omits a valid Bearer token, THEN THE Auth_Middleware SHALL reject the request with HTTP 401 and a failure Envelope.
7. IF the Authenticated_User has a role other than `student` or `parent`, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403 and a failure Envelope.

### Requirement 7: View Own Submitted Feedback

**User Story:** As a student or parent, I want to view the feedback I have submitted, so that I can review my past submissions.

#### Acceptance Criteria

1. WHEN an Authenticated_User with role `student` or `parent` requests their submitted feedback, THE Feedback_API SHALL return only the Feedback documents authored by the Authenticated_User.
2. THE Feedback_API SHALL derive the author scope from `req.user` only and SHALL NOT accept an author identifier from the request.
3. WHEN pagination query parameters `page` and `limit` are provided, THE Feedback_API SHALL return the corresponding page of Feedback documents and include `page`, `limit`, and `total` in the Envelope `meta` field.
4. WHEN the Authenticated_User has submitted feedback, THE Feedback_API SHALL return those authored Feedback documents ordered by creation time descending.
5. WHEN the Authenticated_User has submitted no feedback, THE Feedback_API SHALL return HTTP 200 with a success Envelope containing an empty collection.
6. IF the request is missing a Bearer token or presents a malformed or invalid Bearer token, THEN THE Auth_Middleware SHALL validate the token first and reject the request with HTTP 401 and a failure Envelope before any business logic executes.
7. IF the Authenticated_User has a role other than `student` or `parent`, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403 and a failure Envelope.

### Requirement 8: View Feedback Addressed to a Faculty Member with Aggregate Statistics

**User Story:** As a faculty member, I want to view feedback addressed to me along with aggregate statistics, so that I can understand how I am being rated.

#### Acceptance Criteria

1. WHEN an Authenticated_User with role `teacher` requests feedback addressed to them, THE Feedback_API SHALL return only Feedback documents whose Feedback_Target is the Authenticated_User.
2. WHEN an Authenticated_User with role `teacher` requests their feedback summary, THE Feedback_API SHALL return Feedback_Stats containing the total feedback count, the positive feedback count, the needs-attention feedback count, and the average rating computed only from Feedback documents addressed to the Authenticated_User.
3. THE Feedback_API SHALL derive the Feedback_Target scope from `req.user` only and SHALL NOT accept a target identifier from the request.
4. WHEN the Authenticated_User requests recent feedback, THE Feedback_API SHALL return the most recent Feedback documents addressed to the Authenticated_User ordered by creation time descending.
5. WHEN no feedback is addressed to the Authenticated_User, THE Feedback_API SHALL return HTTP 200 with a success Envelope containing an empty collection and Feedback_Stats with zero counts and a zero average rating.
6. IF the request is missing a Bearer token or presents a malformed or invalid Bearer token, THEN THE Auth_Middleware SHALL validate the token first and reject the request with HTTP 401 and a failure Envelope before any business logic executes.
7. IF the Authenticated_User has a role other than `teacher`, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403 and a failure Envelope.
8. IF an Authenticated_User with role `teacher` fails an additional authorization constraint beyond the role check, THEN THE Authorization_Service SHALL reject the request with HTTP 403 and a failure Envelope.

### Requirement 9: Faculty Reply To or Request Feedback

**User Story:** As a faculty member, I want to reply to feedback addressed to me or request feedback, so that I can engage with the people who rate me.

#### Acceptance Criteria

1. WHEN an Authenticated_User with role `teacher` replies to a Feedback document addressed to them, THE Feedback_API SHALL persist the reply associated with that Feedback document.
2. WHEN an Authenticated_User with role `teacher` replies to a Feedback document, THE Authorization_Service SHALL verify that the Feedback_Target of that document is the Authenticated_User before the reply is persisted.
3. IF the Feedback_Target of the document is not the Authenticated_User, THEN THE Authorization_Service SHALL reject the request with HTTP 403 and a failure Envelope.
4. IF the referenced Feedback document does not exist, THEN THE Feedback_API SHALL return HTTP 404 and a failure Envelope.
5. WHEN a reply or feedback request is persisted successfully, THE Feedback_API SHALL return HTTP 201 with a success Envelope.
6. WHERE a write rate limit is configured for the reply endpoint, THE Rate_Limiter SHALL reject requests exceeding the configured limit with HTTP 429 and a failure Envelope.
7. IF the request omits a valid Bearer token, THEN THE Auth_Middleware SHALL reject the request with HTTP 401 and a failure Envelope.
8. IF authorization succeeds but persistence of the reply or feedback request fails, THEN THE Feedback_API SHALL return an error status with a failure Envelope and SHALL NOT return HTTP 201.

### Requirement 10: Admin Parents List

**User Story:** As an admin, I want a paginated list of parents, so that I can manage parent accounts alongside faculty and students in user management.

#### Acceptance Criteria

1. WHEN an Authenticated_User with role `admin` requests the parents list, THE Admin_Parents_API SHALL return Parent records with pagination and SHALL include `page`, `limit`, and `total` in the Envelope `meta` field.
2. THE Admin_Parents_API SHALL accept `page` and `limit` query parameters consistent with the existing faculty and student list endpoints and SHALL bound `limit` to a maximum of 100.
3. WHEN a `search` query parameter is provided, THE Admin_Parents_API SHALL filter the returned Parent records by the search term consistent with the faculty and student list endpoints.
4. THE Admin_Parents_API SHALL exclude password fields from every returned Parent record.
5. WHEN no Parent records match the request, THE Admin_Parents_API SHALL return HTTP 200 with a success Envelope containing an empty collection.
6. IF the request is missing a Bearer token or presents a malformed or invalid Bearer token, THEN THE Auth_Middleware SHALL validate the token first and reject the request with HTTP 401 and a failure Envelope before any business logic executes.
7. IF the Authenticated_User has a role other than `admin`, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403 and a failure Envelope, while an Authenticated_User with role `admin` SHALL be granted access.
8. THE Admin_Parents_API SHALL be mounted so that the admin parents list path does not collide with the existing parent self-service routes under `/api/parents/me`.

### Requirement 11: Faculty Quiz Analytics

**User Story:** As a faculty member, I want real quiz analytics for my assessments, so that I can evaluate student performance instead of seeing placeholder numbers.

#### Acceptance Criteria

1. WHEN an Authenticated_User with role `teacher` requests quiz analytics, THE Quiz_Analytics_API SHALL first filter Assessment documents to those whose `teacherId` equals the Authenticated_User, and SHALL compute every metric only from those Assessment documents and the Submission documents associated with them.
2. THE Quiz_Analytics_API SHALL derive the faculty scope from `req.user` only and SHALL NOT accept a teacher identifier from the request.
3. THE Quiz_Analytics_API SHALL compute the total number of attempts as the count of Submission documents associated with the Authenticated_User's Assessment documents.
4. THE Quiz_Analytics_API SHALL compute the average score from the `gradedAnswers` of finalized Submission documents associated with the Authenticated_User's Assessment documents.
5. THE Quiz_Analytics_API SHALL compute the score distribution by grouping finalized Submission scores into score bands.
6. THE Quiz_Analytics_API SHALL compute the completion status as the counts of Submission documents by `gradingStatus`.
7. WHEN an Assessment selected by the request has no associated Submission documents, THE Quiz_Analytics_API SHALL return HTTP 200 with a success Envelope containing zeroed metrics for that Assessment.
8. WHERE the source data required for a requested metric does not exist in the Assessment or Submission collections, THE Quiz_Analytics_API SHALL omit that metric rather than return a fabricated value, and the omission SHALL be documented as an assumption in the design.
9. IF the request omits a valid Bearer token, THEN THE Auth_Middleware SHALL reject the request with HTTP 401 and a failure Envelope.
10. IF the Authenticated_User has a role other than `teacher`, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403 and a failure Envelope.

### Requirement 12: Standard Request Pipeline and Response Envelope

**User Story:** As a backend maintainer, I want every new endpoint to follow the established pipeline and envelope conventions, so that the API stays consistent and secure.

#### Acceptance Criteria

1. THE System SHALL process every new endpoint through the fixed pipeline Auth_Middleware → RBAC_Middleware → Validation_Middleware → controller → service → Authorization_Service.
2. THE System SHALL wrap every successful response from the Messaging_API, Feedback_API, Admin_Parents_API, and Quiz_Analytics_API in a success Envelope of the form `{ success: true, data, meta? }`.
3. WHEN an error occurs in any new endpoint, THE System SHALL return a failure Envelope of the form `{ success: false, message, details? }`, and THE System SHALL return a failure Envelope only when an actual error occurs.
4. THE System SHALL ensure every failure Envelope includes a `message` field that is present and non-empty.
5. THE System SHALL determine authorization scope for every new endpoint from `req.user` only and SHALL NOT use client-supplied identifiers to determine scope.
6. WHEN a collection-returning endpoint has no matching records, THE System SHALL return HTTP 200 with a success Envelope containing an empty collection.
7. THE System SHALL exclude secrets and personally identifiable information from log entries emitted by the new endpoints.
8. THE System SHALL apply Rate_Limiter to every write endpoint introduced by this feature.

### Requirement 13: Frontend Wiring to Real Endpoints

**User Story:** As a user of the faculty, student, parent, and admin interfaces, I want the existing screens to show real data, so that I no longer see mock numbers or empty stubs.

#### Acceptance Criteria

1. WHEN the faculty Communication interface loads, THE System SHALL populate it from the Messaging_API conversation and thread endpoints instead of mock or graceful-empty stubs.
2. WHEN the faculty Feedback interface loads, THE System SHALL populate the received feedback list and Feedback_Stats from the Feedback_API instead of mock data.
3. WHEN the student Feedback interface submits feedback, THE System SHALL send the submission to the Feedback_API submission endpoint.
4. WHEN the admin User Management interface loads, THE System SHALL include parents fetched from the Admin_Parents_API alongside the faculty and student lists.
5. WHEN the faculty Quiz Analytics interface loads, THE System SHALL populate its metrics from the Quiz_Analytics_API instead of hardcoded values.
6. IF a new endpoint returns a failure Envelope, THEN THE System SHALL surface a friendly error state in the corresponding interface without exposing internal error details.

## Open Questions

1. **Feedback rating scale.** What is the exact rating scale for feedback (for example 1–5 integer stars), and what thresholds define a "positive" versus a "needs-attention" feedback for Feedback_Stats? Requirement 6 and Requirement 8 reference a "configured rating scale" and counts that depend on these thresholds.
2. **Messaging transport.** A Socket.IO realtime messaging layer already exists (`backend/src/realtime`). Should the new messaging REST endpoints complement realtime delivery (REST for history/CRUD, sockets for live updates), or is REST polling sufficient for this feature? This affects whether the frontend keeps the socket client or relies on polling.
3. **Quiz analytics source data completeness.** The `Assessment` and `Submission` models support total attempts, average score, score distribution, and completion status by `gradingStatus`. However, a true "completion rate" and "pass rate" require an authoritative denominator (expected attempts per assessment, for example the count of enrolled students) and a defined pass threshold, neither of which is explicitly modeled. Should completion rate be defined as submissions divided by enrolled students for the assessment's course, and what score percentage constitutes a pass? Metrics without a confirmed source will be omitted per Requirement 11.8.
4. **Feedback target validation.** When feedback targets a teacher or course, must the System verify that the Feedback_Author has a relationship to that target (for example the student is enrolled in the course, or the parent's ward is taught by the teacher), or can any authenticated student or parent submit feedback about any teacher or course?
5. **Message and feedback retention.** Should deleted messages (soft-deleted via `isDeleted`) and feedback be retained indefinitely for audit purposes, or is there a retention or purge policy? This affects whether deletes remain soft deletes only.
6. **Admin parents list route placement.** The existing parent self-service routes are mounted at `/api/parents/me/*`. Confirm that the admin parents list should be served at `GET /api/parents` (list root) mounted before the self-service router, mirroring `GET /api/faculty` and `GET /api/students`.
7. **Faculty "request feedback" semantics.** Requirement 9 covers faculty replying to or requesting feedback. What does "request feedback" deliver to the target audience — an in-app prompt, a message via the Messaging_API, or an email — and who are the eligible recipients?
