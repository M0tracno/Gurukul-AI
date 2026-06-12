# Implementation Plan: Communication, Feedback, and Admin APIs

## Overview

This plan implements four backend capability areas in TypeScript on the existing Express/Mongoose backend: Messaging REST endpoints, a new Feedback model with endpoints, an admin parents list endpoint, and faculty quiz analytics. Each area is a thin route → controller → service slice that reuses the established pipeline (`authMiddleware` → `requireRoles`/`adminOnly` → `validateRequest` → controller → service → `AuthorizationService`), the canonical `Envelope`, per-endpoint rate limiting, and `auditService`. Property-based tests (`fast-check`) cover the pure-logic/scoping/aggregation layers; example, integration, and smoke tests cover middleware wiring and route placement. Tasks build incrementally and end by wiring routes into `server.ts`/`routes/index.ts` and the frontend screens to the real endpoints.

## Tasks

- [x] 1. Add shared authorization and config primitives for the new endpoints
  - [x] 1.1 Extend `AuthorizationService` with message/feedback assertions
    - Add `assertConversationParticipant`, `assertMessageRecipient`, `assertMessageParticipant`, and `assertFeedbackTarget` methods that throw `AppError.forbidden` when the authenticated user is not authorized
    - Derive all scope from the passed `userId`/`role`, never from client input
    - _Requirements: 2.2, 4.2, 5.2, 9.2, 12.5_

  - [x] 1.2 Add feedback/analytics configuration constants module
    - Create a constants module exporting `RATING_MIN=1`, `RATING_MAX=5`, `POSITIVE_THRESHOLD=4`, `NEEDS_ATTENTION_THRESHOLD=2`, `COMMENT_MAX_LENGTH=2000`, score bands, and `PASS_THRESHOLD=40`
    - Centralize so the rating scale and thresholds are configurable in one place
    - _Requirements: 6.2, 8.2_

- [x] 2. Implement the Feedback data model
  - [x] 2.1 Create the `Feedback` Mongoose model
    - Add `src/models/Feedback.ts` with `IFeedback`/`IFeedbackReply` (authorId/authorModel/authorRole, targetType/targetId via refPath, rating, comment, replies, isDeleted/deletedAt, timestamps)
    - Add indexes `{ targetType, targetId, createdAt: -1 }` and `{ authorId, createdAt: -1 }`; add a `toJSON` transform that strips `isDeleted`/`__v`
    - _Requirements: 6.1, 7.1, 8.1_

  - [x] 2.2 Write unit tests for the Feedback model
    - Test schema validation (rating bounds, comment max length, required target fields) and the `toJSON` transform
    - _Requirements: 6.1, 6.2_

- [x] 3. Implement the Messaging service and controller
  - [x] 3.1 Implement `messageService` list and thread methods
    - Add `src/services/messageService.ts` with `listConversations` (reusing `Message.getUserConversations`, role→model mapping, excludes `isDeleted`) and `getThread` (ordered ascending by `createdAt`, excludes deleted, calls `assertConversationParticipant`, returns `conversationExists` flag)
    - Map documents to `MessageDTO`/`ConversationSummary`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.7_

  - [x] 3.2 Write property test for conversation listing scope
    - **Property 1: Conversation listing is scoped to the participant and excludes deleted content**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 3.3 Write property test for conversation summary computation
    - **Property 2: Conversation summaries are computed correctly**
    - **Validates: Requirements 1.3**

  - [x] 3.4 Write property test for thread ordering and deleted exclusion
    - **Property 4: Conversation threads are ordered and exclude deleted messages**
    - **Validates: Requirements 2.1**

  - [x] 3.5 Write property test for thread access and existence vs emptiness
    - **Property 5: Thread access requires participation and distinguishes existence from emptiness**
    - **Validates: Requirements 2.2, 2.3, 2.6, 2.7**

  - [x] 3.6 Implement `messageService` send, markRead, and softDelete methods
    - Add `send` (derive sender from `req.user`, call `validateMessagingPermission`, persist, audit via `auditService.logEvent` with `redactSecrets`), `markRead` (authorize recipient before existence, idempotent `readAt`), and `softDelete` (existence→ownership, set `isDeleted`/`deletedAt`, audit, throw if write not confirmed)
    - _Requirements: 3.1, 3.3, 3.4, 3.6, 4.1, 4.2, 4.3, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.10_

  - [x] 3.7 Write property test for send content preservation and sender derivation
    - **Property 6: Sending a message preserves content and derives the sender from the authenticated user**
    - **Validates: Requirements 3.1**

  - [x] 3.8 Write property test for messaging-permission gating
    - **Property 8: Message sending is gated by messaging permission with no side effect on denial**
    - **Validates: Requirements 3.3, 3.4**

  - [x] 3.9 Write property test for mark-read recipient-only idempotency
    - **Property 9: Marking read is recipient-only and idempotent**
    - **Validates: Requirements 4.1, 4.2, 4.4, 4.6**

  - [x] 3.10 Write property test for participant-only soft delete
    - **Property 10: Deleting a message is participant-only and soft**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 3.11 Implement `messageController`
    - Add `src/controllers/messageController.ts` with thin handlers reading `req.user` only, building `AuditContext` via `auditContextFrom(req)`, wrapping results with `success()`, paginating with `page`/`limit` in `meta`, and forwarding errors via `next(error)`
    - _Requirements: 1.4, 2.4, 3.5, 4.5, 5.6, 12.2, 12.5_

  - [x] 3.12 Write unit tests for messageController edge cases
    - Test unknown id → 404 (4.5, 5.4), non-recipient on unknown id → 403 (4.3), all-deleted vs non-existent conversation distinctness (2.6, 2.7), empty results → 200 empty (1.7), audit spy on send/delete (3.6, 5.5), and failure-path persistence mock (5.10)
    - _Requirements: 1.7, 2.6, 2.7, 3.6, 4.3, 4.5, 5.4, 5.5, 5.10_

- [x] 4. Wire messaging validators and routes
  - [x] 4.1 Create messaging Zod schemas and `messageRoutes`
    - Add send-message Zod schema (subject non-empty ≤200, content non-empty ≤2000, required recipient/recipientModel/student ids) and `src/routes/messageRoutes.ts` mounting GET `/conversations`, GET `/conversations/:conversationId`, POST `/`, PATCH `/:messageId/read`, DELETE `/:messageId` with pipeline `authMiddleware → requireRoles('teacher','parent') → validateRequest → controller`; apply the write `Rate_Limiter` to POST and DELETE in the order `Rate_Limiter → auth → rbac → validate`
    - _Requirements: 3.2, 3.7, 3.8, 3.9, 4.7, 5.7, 5.8, 5.9, 12.1, 12.8_

  - [x] 4.2 Write property test for send validation
    - **Property 7: Send validation accepts valid input and rejects invalid input**
    - **Validates: Requirements 3.2**

  - [x] 4.3 Write integration/example tests for messaging auth, RBAC, and rate limiting
    - Test 401 missing token (1.5, 2.5, 3.8, 4.7, 5.8) and 403 disallowed role (1.6, 3.9) for each route; exceed write limit → 429 (3.7, 5.7); delete failure-ordering with simultaneous conditions (5.9); pipeline order auth→rbac→validate→controller (12.1)
    - _Requirements: 1.5, 1.6, 2.5, 3.7, 3.8, 3.9, 4.7, 5.7, 5.8, 5.9, 12.1, 12.8_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the Feedback service and controller
  - [x] 6.1 Implement `feedbackService` submit and listOwn methods
    - Add `src/services/feedbackService.ts` with `submit` (derive author from `req.user`, validate target exists and not soft-deleted, persist after write confirmed, audit) and `listOwn` (author-scoped, ordered `createdAt` desc, paginated)
    - _Requirements: 6.1, 6.3, 6.4, 7.1, 7.2, 7.4_

  - [x] 6.2 Write property test for feedback content preservation and author derivation
    - **Property 11: Submitting feedback preserves content and derives the author from the authenticated user**
    - **Validates: Requirements 6.1, 6.4**

  - [x] 6.3 Write property test for own-feedback listing scope and order
    - **Property 13: Own-feedback listing is author-scoped and ordered**
    - **Validates: Requirements 7.1, 7.2, 7.4**

  - [x] 6.4 Implement `feedbackService` listReceived, reply, and requestFeedback methods
    - Add `listReceived` (target-scoped, ordered desc, returns `FeedbackStats` computed on read), `reply` (404 if feedback missing, `assertFeedbackTarget` → 403, persist reply only after write confirmed), and `requestFeedback` (send `Message` documents to eligible recipients, audit)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.8_

  - [x] 6.5 Write property test for received-feedback listing scope and order
    - **Property 14: Received-feedback listing is target-scoped and ordered**
    - **Validates: Requirements 8.1, 8.3, 8.4**

  - [x] 6.6 Write property test for feedback statistics reference computation
    - **Property 15: Feedback statistics equal an independent reference computation**
    - **Validates: Requirements 8.2, 8.5**

  - [x] 6.7 Write property test for reply restriction and persistence
    - **Property 16: Replying is restricted to the targeted teacher and persists with the feedback**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 6.8 Implement `feedbackController`
    - Add `src/controllers/feedbackController.ts` with thin handlers reading `req.user` only, building `AuditContext`, wrapping with `success()`, returning `{ data, meta: { page, limit, total, stats } }` for `/received`, and forwarding errors via `next(error)`
    - _Requirements: 6.3, 7.3, 7.5, 8.5, 9.4, 9.5, 12.2_

  - [x] 6.9 Write unit tests for feedbackController edge cases
    - Test empty own/received → 200 empty with zeroed stats (7.5, 8.5), unknown feedback id reply → 404 (9.4), 201 bodies for submit/reply (6.3, 9.5), and failure-path persistence mock (6.3, 9.8)
    - _Requirements: 6.3, 7.5, 8.5, 9.4, 9.5, 9.8_

- [x] 7. Wire feedback validators and routes
  - [x] 7.1 Create feedback Zod schemas and `feedbackRoutes`
    - Add submit/reply/request Zod schemas (rating within `[RATING_MIN, RATING_MAX]`, required target id, targetType in `teacher`/`course`, comment ≤ `COMMENT_MAX_LENGTH`) and `src/routes/feedbackRoutes.ts` mounting POST `/` (student/parent), GET `/me` (student/parent), GET `/received` (teacher), POST `/:feedbackId/replies` (teacher), POST `/requests` (teacher); apply the write `Rate_Limiter` to POST routes
    - _Requirements: 6.2, 6.5, 6.6, 6.7, 7.6, 7.7, 8.6, 8.7, 8.8, 9.6, 9.7, 12.1, 12.8_

  - [x] 7.2 Write property test for feedback validation
    - **Property 12: Feedback validation accepts valid input and rejects invalid input**
    - **Validates: Requirements 6.2**

  - [x] 7.3 Write integration/example tests for feedback auth, RBAC, and rate limiting
    - Test 401 missing token (6.6, 7.6, 8.6, 9.7) and 403 disallowed role (6.7, 7.7, 8.7, 8.8) per route; exceed write limit → 429 (6.5, 9.6); pipeline order (12.1)
    - _Requirements: 6.5, 6.6, 6.7, 7.6, 7.7, 8.6, 8.7, 8.8, 9.6, 9.7, 12.1, 12.8_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement the Admin Parents List API
  - [x] 9.1 Implement `parentService.list` and `parentController`
    - Add `src/services/parentService.ts` `list(filters, pagination)` mirroring `facultyService.list` (limit bounded to 100, optional `search` over firstName/lastName/email/phoneNumber/parentId, password excluded explicitly), and `src/controllers/parentController.ts` returning a paginated success envelope with `page`/`limit`/`total` in `meta`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 12.2_

  - [x] 9.2 Write property test for admin parents page size bound
    - **Property 17: Admin parents page size is bounded**
    - **Validates: Requirements 10.2**

  - [x] 9.3 Write property test for admin parents search matching
    - **Property 18: Admin parents search returns only matching records**
    - **Validates: Requirements 10.3**

  - [x] 9.4 Write property test for password exclusion
    - **Property 19: Admin parents responses never expose passwords**
    - **Validates: Requirements 10.4**

  - [x] 9.5 Create `parentRoutes` and mount before `parentMeRoutes`
    - Add `src/routes/parentRoutes.ts` with GET `/` (`authMiddleware → adminOnly → validateRequest → controller`), apply `adminManagementRateLimit` like `facultyRoutes`, and register in `routes/index.ts`/`server.ts` so `/api/parents` mounts before `parentMeRoutes`
    - _Requirements: 10.6, 10.7, 10.8, 12.1_

  - [x] 9.6 Write integration tests for parents route placement and access
    - Assert GET `/api/parents` resolves to admin list and `/api/parents/me/*` resolves to self-service (10.8); 401 missing token (10.6), 403 non-admin / 200 admin (10.7), empty → 200 empty (10.5)
    - _Requirements: 10.5, 10.6, 10.7, 10.8_

- [x] 10. Implement Faculty Quiz Analytics
  - [x] 10.1 Implement `quizAnalyticsService.compute`
    - Add `src/services/quizAnalyticsService.ts` that resolves the teacher's `Assessment` ids (`teacherId === userId`), then computes `totalAttempts`, `averageScorePercent`, `scoreDistribution` (bands), and `completionStatus` from associated `Submission` documents only; compute `completionRatePercent` via `Enrollment` denominator and `passRatePercent` via `PASS_THRESHOLD`, omitting each when source data is absent; zeroed metrics for assessments with no submissions
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [x] 10.2 Write property test for analytics reference computation
    - **Property 20: Quiz analytics equal an independent reference computation over only the teacher's data**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6**

  - [x] 10.3 Write property test for omission of unsourced metrics
    - **Property 21: Unsourced analytics metrics are omitted rather than fabricated**
    - **Validates: Requirements 11.8**

  - [x] 10.4 Add quiz-analytics handler and route to facultyMe
    - Add a handler on `facultyMeController` delegating to `quizAnalyticsService` (scope from `req.user`) and register GET `/me/quiz-analytics` on `facultyMeRoutes` (`authMiddleware → requireRoles('teacher','admin') → controller`), wrapping the result in a success envelope
    - _Requirements: 11.2, 11.7, 11.9, 11.10, 12.2_

  - [x] 10.5 Write integration tests for quiz-analytics access and zeroed metrics
    - Test 401 missing token (11.9), 403 non-teacher (11.10), and assessment with no submissions → 200 zeroed metrics (11.7)
    - _Requirements: 11.7, 11.9, 11.10_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Cross-cutting envelope, scope, and audit guarantees
  - [x] 12.1 Verify and harden envelope/scope/audit usage across new endpoints
    - Ensure all new controllers use `success()`/global error handler exclusively, derive scope only from `req.user`, and pass all audit/log metadata through `redactSecrets`; confirm collection endpoints return 200 empty envelopes
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 12.2 Write property test for authenticated-user scope derivation
    - **Property 22: Scope is always derived from the authenticated user, never from client input**
    - **Validates: Requirements 1.2, 6.4, 8.3, 11.2, 12.5**

  - [x] 12.3 Write property test for success envelope shape
    - **Property 23: Every successful response is a well-formed success envelope**
    - **Validates: Requirements 12.2**

  - [x] 12.4 Write property test for failure envelope shape
    - **Property 24: Every error response is a well-formed failure envelope with a non-empty message**
    - **Validates: Requirements 12.3, 12.4**

  - [x] 12.5 Write property test for empty-collection success envelope
    - **Property 25: Collection endpoints return an empty success envelope when nothing matches**
    - **Validates: Requirements 1.7, 7.5, 12.6**

  - [x] 12.6 Write property test for pagination metadata consistency
    - **Property 3: Pagination metadata is consistent across all paginated endpoints**
    - **Validates: Requirements 1.4, 2.4, 7.3, 10.1**

  - [x] 12.7 Write property test for secret redaction in audit/log metadata
    - **Property 26: Audit and log metadata never contain secret values**
    - **Validates: Requirements 12.7**

- [x] 13. Wire frontend screens to the real endpoints
  - [x] 13.1 Wire faculty Communication interface to the Messaging API
    - Replace mock/graceful-empty stubs with calls to the conversation and thread endpoints; surface a friendly error state on failure envelopes
    - _Requirements: 13.1, 13.6_

  - [x] 13.2 Wire faculty Feedback interface to the Feedback API
    - Populate the received feedback list and `Feedback_Stats` from `/received`; surface a friendly error state on failure
    - _Requirements: 13.2, 13.6_

  - [x] 13.3 Wire student Feedback submission to the Feedback API
    - Send submissions to the feedback submission endpoint; surface a friendly error state on failure
    - _Requirements: 13.3, 13.6_

  - [x] 13.4 Wire admin User Management to the Admin Parents API
    - Fetch parents from `/api/parents` alongside faculty and student lists; surface a friendly error state on failure
    - _Requirements: 13.4, 13.6_

  - [x] 13.5 Wire faculty Quiz Analytics to the Quiz Analytics API
    - Replace hardcoded values with metrics from `/api/faculty/me/quiz-analytics`; surface a friendly error state on failure
    - _Requirements: 13.5, 13.6_

  - [x] 13.6 Write frontend component/integration tests for real-endpoint wiring
    - Verify each screen calls the real endpoint instead of mock/empty stubs and renders a friendly error state (without internal details) on failure envelopes
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific requirement sub-clauses for traceability.
- Property tests use `fast-check` with a minimum of 100 iterations and must be tagged `// Feature: communication-feedback-and-admin-apis, Property {number}: {property_text}`.
- Checkpoints ensure incremental validation as each backend area completes.
- Backend implementation language is TypeScript, matching the existing Express/Mongoose codebase.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "9.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "6.1", "9.2", "9.3", "9.4", "9.5", "10.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "6.2", "6.3", "6.4", "9.6", "10.2", "10.3", "10.4"] },
    { "id": 3, "tasks": ["3.7", "3.8", "3.9", "3.10", "3.11", "6.5", "6.6", "6.7", "6.8", "10.5"] },
    { "id": 4, "tasks": ["3.12", "4.1", "6.9", "7.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "7.2", "7.3", "12.1"] },
    { "id": 6, "tasks": ["12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "13.1", "13.2", "13.3", "13.4", "13.5"] },
    { "id": 7, "tasks": ["13.6"] }
  ]
}
```
