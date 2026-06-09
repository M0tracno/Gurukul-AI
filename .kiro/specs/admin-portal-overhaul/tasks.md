# Implementation Plan: Admin Portal Overhaul

## Overview

This plan converts the four-phase design into incremental TypeScript coding tasks for the existing Express/Mongoose backend (`backend/src`) and React/MUI/Vite frontend (`src`). Each task builds on prior work and ends by wiring new behavior into the running Portal so no code is left orphaned. Phase 1 standardizes cross-cutting concerns (response envelope, route map, RBAC/audit, seed) that all later phases inherit; Phase 2 redesigns the UI; Phase 3 adds AI assessment/grading/analytics; Phase 4 adds messaging, PTM scheduling, WebRTC video, and recordings.

Property-based tests (fast-check) implement the 31 correctness properties from the design and are marked optional (`*`) along with unit/integration tests. Backend property tests run under Jest with `mongodb-memory-server`; frontend property tests run under Vitest. Each property test runs a minimum of 100 generated cases and is tagged `// Feature: admin-portal-overhaul, Property {n}: {text}`.

## Tasks

- [x] 1. Standardize the response envelope and error handling (Phase 1 foundation)
  - [x] 1.1 Implement canonical response envelope helpers
    - Create `backend/src/utils/envelope.ts` with `success<T>(data, meta?)` → `{ success: true, data, meta? }` and `failure(message, details?)` → `{ success: false, message, details? }`
    - Add the shared `SuccessEnvelope<T>`, `ErrorEnvelope`, `ResponseEnvelope<T>` types
    - _Requirements: 2.1, 2.2_

  - [x] 1.2 Wire envelope and field-level details into the error layer
    - Update `backend/src/middleware/errorHandler.ts` to map `AppError` and unknown errors to an `ErrorEnvelope` with correct status (401/403/400/404/409/500)
    - Populate `details[]` as `{ field, reason }` from `validateRequest` validation failures and disallowed content
    - Ensure 2xx status accompanies `success: true` and 4xx/5xx accompanies `success: false`
    - _Requirements: 2.2, 2.3, 2.4, 22.5_

  - [x] 1.3 Write property tests for envelopes and validation
    - **Property 3: Success envelope shape** — _Validates: Requirements 2.1, 2.5, 20.2_
    - **Property 4: Error envelope shape** — _Validates: Requirements 2.2, 2.5_
    - **Property 5: Status code consistency** — _Validates: Requirements 2.3_
    - **Property 6: Validation errors populate field-level details** — _Validates: Requirements 2.4, 22.5_
    - Place in `backend/src/utils/envelope.property.test.ts`

  - [x] 1.4 Apply the envelope across all controllers and namespaces
    - Adapt controllers/serialisers in `backend/src/controllers/` to emit the envelope, nesting pagination `meta` with `data`
    - Verify all namespaces (attendance, auth, course, enrollment, faculty, grading, health, mark, metrics, parentMe, studentMe, student) return the standardized shape
    - _Requirements: 2.5, 20.2_

- [x] 2. Generate the canonical Route Map
  - [x] 2.1 Implement the route map generator
    - Create `backend/src/utils/routeMap.ts` with `buildRouteMap(app)` walking the Express router stack, plus `findDuplicateRoutes(entries)` and `findMissingDocs(entries, swaggerPaths)`
    - Emit `RouteMapEntry = { method, path, namespace, requiredRole, requestSchemaRef?, responseSchemaRef? }` reconciled against `config/swagger.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2_

  - [x] 2.2 Write property tests for the route map
    - **Property 1: Route map completeness and compliance** — _Validates: Requirements 1.1, 1.2, 1.3_
    - **Property 2: Route uniqueness (no duplicates)** — _Validates: Requirements 3.1, 3.2_
    - Place in `backend/src/utils/routeMap.property.test.ts`

  - [x] 2.3 Remove duplicate routes and dead code, regenerate the map in CI
    - Remove duplicate routes flagged by `findDuplicateRoutes` and prune controller/service/repository functions unreachable from any registered Endpoint
    - Add a CI step that regenerates the Route_Map and fails on missing-doc drift
    - _Requirements: 3.2, 3.3, 3.4, 1.3_

  - [x] 2.4 Write unit tests for namespace coverage
    - Assert every documented resource namespace appears in the generated map
    - _Requirements: 1.4_

- [x] 3. Formalize RBAC, data isolation, and admin audit
  - [x] 3.1 Implement admin override with audit recording
    - Wrap admin override mutations to call `auditService.record({ actor, action, target, timestamp })` via `models/AuditLog.ts`
    - Confirm `requireRoles` returns 401 (no user) / 403 (role not allowed) and `authorizationService.assert*Access` enforces fine-grained isolation with admin bypass
    - _Requirements: 4.2, 4.3, 4.9, 22.3_

  - [x] 3.2 Write property tests for access control
    - **Property 7: Authentication required for protected endpoints** — _Validates: Requirements 4.1, 4.8, 22.1_
    - **Property 8: Data-scope isolation** — _Validates: Requirements 4.4, 4.5, 4.6, 4.7, 15.4, 22.2_
    - **Property 9: Admin full access** — _Validates: Requirements 4.2, 4.3_
    - **Property 10: Admin override is audited** — _Validates: Requirements 4.9, 22.3_
    - Place in `backend/src/services/authorization.property.test.ts`

  - [x] 3.3 Write unit tests for authorization edge cases
    - Test expired/malformed token rejection and out-of-scope denial messages
    - _Requirements: 4.7, 4.8, 22.1_

- [x] 4. Build realistic relational seed data
  - [x] 4.1 Extend the seed routine with an idempotent relational graph
    - Update `backend/scripts/seedAllUsers.js` to upsert by stable natural keys (e.g., email) and create Admin/Teacher/Student/Parent accounts, courses, enrollments, marks, attendance, messages, metrics with Parent→Student and Student→Course links
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 4.2 Write property tests for the seed routine
    - **Property 11: Seed idempotence** — _Validates: Requirements 6.5_
    - **Property 12: Seed relational integrity** — _Validates: Requirements 6.3_
    - Place in `backend/scripts/seed.property.test.ts`

  - [x] 4.3 Write integration tests for multi-role login journeys
    - Seed an empty DB and assert Admin/Teacher/Student/Parent each see non-empty authorized data
    - _Requirements: 6.4_

- [x] 5. Checkpoint - Phase 1 complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Build the cohesive design system and data tables
  - [x] 6.1 Normalize reusable design-system components
    - Add/normalize `Button`, `Card`, `Form` controls, `Modal`, `Navigation` in `src/design-system/components/`, all consuming shared tokens from `designTokens.ts`/`createEnhancedTheme.js` with a single SaaS-dashboard visual style
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 6.2 Implement the DataTable component
    - Create `src/design-system/components/DataTable.tsx` supporting column sort, filter predicate, pagination, row selection, and a drill-down callback
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 6.3 Write property tests for DataTable operations
    - **Property 13: Data table sort ordering** — _Validates: Requirements 10.1_
    - **Property 14: Data table filter soundness** — _Validates: Requirements 10.2_
    - **Property 15: Data table pagination integrity** — _Validates: Requirements 10.3_
    - Place in `src/design-system/components/DataTable.property.test.tsx`

  - [x] 6.4 Write unit tests for token derivation and drill-down
    - Assert components derive styles from tokens (no one-off styles) and row selection opens drill-down
    - _Requirements: 7.2, 7.3, 10.4_

- [x] 7. Implement responsive layout and accessibility
  - [x] 7.1 Implement breakpoint-driven responsive layout
    - Update `src/components/layout/` for no horizontal scroll across 320–2560px and a collapsible mobile navigation at ≤768px
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 7.2 Implement accessibility utilities
    - Add `src/utils/accessibilityHelpers.js` for focus-visible styles, ARIA roles/labels, alt-text conventions, and contrast-checked token pairs
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 7.3 Write accessibility and viewport tests
    - axe-core contrast/labels/alt checks, keyboard-navigation tests, and a Playwright viewport sweep for no horizontal scroll
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 8.1_

- [x] 8. Remove placeholders and wire the admin dashboard
  - [x] 8.1 Remove placeholder UI and hide unavailable navigation
    - Eliminate "Stay tuned"/placeholder screens, hide nav entries for unavailable features, and back every visible route with live API data
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 8.2 Implement admin dashboard metrics and override controls
    - Build `src/pages/AdminDashboard.tsx` / `src/features/admin/` to render live metrics from the metrics Endpoints and present override controls calling override Endpoints, displaying updated records on success
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 8.3 Write unit tests for override controls and failure display
    - Assert override controls render for authorized records and that a failed override shows the Error_Envelope message while leaving the record unchanged
    - _Requirements: 11.2, 11.4_

- [x] 9. Checkpoint - Phase 2 complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement assessment authoring and submission
  - [x] 10.1 Create Assessment and Submission models
    - Add Mongoose models for `IAssessment`/`IQuestion` and `ISubmission`/`IAnswer`/`IGradedAnswer` per the design data models
    - _Requirements: 12.1_

  - [x] 10.2 Implement the assessment service
    - Create `backend/src/services/assessmentService.ts` with `createAssessment` (persist questions + Course association) and `submitAnswers` (accept within `[opensAt, closesAt]`, reject after close with an Error_Envelope, support free-text subjective answers)
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 10.3 Write property tests for submission and persistence
    - **Property 16: Submission window enforcement** — _Validates: Requirements 12.3, 12.4_
    - **Property 17: Assessment persistence round-trip** — _Validates: Requirements 12.1_
    - Place in `backend/src/services/assessment.property.test.ts`

  - [x] 10.4 Write unit tests for subjective free-text affordance
    - Assert subjective questions accept free-text answer fields
    - _Requirements: 12.2_

- [x] 11. Implement the AI grading pipeline
  - [x] 11.1 Enqueue a grading job on subjective submission
    - On submission containing at least one subjective answer, enqueue exactly one `GradingJob` via `jobs/gradingQueue.ts` and return the response without waiting for grading
    - _Requirements: 13.1, 14.1_

  - [x] 11.2 Implement worker grading, persistence, and status machine
    - In `jobs/gradingWorker.ts`/`services/gradingService.ts`, evaluate answers producing `{ score, maxScore, confidence, feedback }`, persist graded answers on completion, and expose `getJobStatus(jobId)` over the `queued → processing → (completed | failed)` machine with a result reference when completed; run grading off the request path on the Lambda_Worker
    - _Requirements: 13.2, 13.3, 14.2, 14.3, 14.4_

  - [x] 11.3 Implement teacher override and failure handling
    - Allow a Teacher to override AI score/feedback before finalization; on evaluation failure mark the job `failed` and notify the owning Teacher
    - _Requirements: 13.4, 13.5_

  - [x] 11.4 Write property tests for grading behavior
    - **Property 18: Subjective submission enqueues a grading job** — _Validates: Requirements 13.1, 14.1_
    - **Property 19: Graded answer bounds and persistence** — _Validates: Requirements 13.2, 13.3_
    - **Property 20: Grading failure handling** — _Validates: Requirements 13.5_
    - **Property 21: Grading job status validity** — _Validates: Requirements 14.3, 14.4_
    - Place in `backend/src/services/grading.property.test.ts`

  - [x] 11.5 Write property test for grading queue ordering
    - **Property 31: Grading queue order preservation** — _Validates: Requirements 23.2_
    - Place in `backend/src/jobs/gradingQueue.property.test.ts`

- [x] 12. Implement performance analytics and predictive insights
  - [x] 12.1 Implement the analytics service
    - Create `backend/src/services/analyticsService.ts` with `computeStudentTrend`, `courseAnalytics`, and `predictiveInsight` (indicator + confidence), restricting access to authorized Teachers, the Student, and linked Parents
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 12.2 Write property tests for analytics
    - **Property 22: Predictive insight bounds** — _Validates: Requirements 15.3_
    - **Property 23: Analytics aggregation correctness** — _Validates: Requirements 15.1, 15.2_
    - Place in `backend/src/services/analytics.property.test.ts`

- [x] 13. Checkpoint - Phase 3 complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement secure role-constrained messaging
  - [x] 14.1 Implement channel constraints, delivery, persistence, and offline queue
    - In `realtime/socketManager.ts`/`messageHandler.ts`/`messagingRbac.ts`, define Parent↔Teacher, Teacher↔Student, Teacher↔Admin channels; enforce `canJoin`/`canPost` (403 Error_Envelope on violation); deliver in real time to authorized participants; persist every message; retain undelivered messages for offline recipients and flush exactly once on reconnect
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 14.2 Write property tests for messaging
    - **Property 24: Messaging channel role constraint** — _Validates: Requirements 16.1, 16.3_
    - **Property 25: Message persistence round-trip** — _Validates: Requirements 16.4_
    - **Property 26: Offline message retain-and-deliver** — _Validates: Requirements 16.5_
    - Place in `backend/src/realtime/messaging.property.test.ts`

- [x] 15. Implement PTM scheduling
  - [x] 15.1 Implement the PTM scheduling service
    - Create `backend/src/services/ptmService.ts` with `schedule` (persist participants/date/time, notify invitees), overlap conflict detection for the same Teacher (reject with conflict Error_Envelope), and join authorization limited to PTM parties
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [x] 15.2 Write property tests for PTM
    - **Property 27: PTM persistence round-trip** — _Validates: Requirements 17.1_
    - **Property 28: PTM conflict detection** — _Validates: Requirements 17.3_
    - **Property 29: PTM and recording authorization** — _Validates: Requirements 17.4, 19.4_
    - Place in `backend/src/services/ptm.property.test.ts`

- [x] 16. Implement WebRTC video and recording archives
  - [x] 16.1 Implement WebRTC signaling and the video service
    - Add the WebRTC client in `src/services` and Socket.IO signaling in `realtime/` to establish offer/answer/ICE at/after start time, transmit audio/video while active, reconnect on drop, and release media on leave
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 16.2 Implement the recording service with S3 and signed URLs
    - Create `backend/src/services/recordingService.ts` to capture sessions to the Recording_Store when enabled, associate the reference with the PTM, and expose `getRecordingUrl(ptmId, user)` returning a time-limited signed URL for authorized participants (403 otherwise)
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

  - [x] 16.3 Write property tests for recording
    - **Property 30: Recording association** — _Validates: Requirements 19.2_
    - Place in `backend/src/services/recording.property.test.ts` (Property 29's recording authorization is covered in task 15.2)

  - [x] 16.4 Write integration tests for video and recording
    - WebRTC signaling/transmit/reconnect/release and S3 capture with signed-URL access
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 19.1, 19.3_

- [x] 17. Final checkpoint - all phases complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (unit, property, and integration tests) and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific granular requirements clauses for traceability.
- Property tests use fast-check (≥100 runs each), are tagged with their design property number, and validate the universal correctness properties; unit and integration tests cover specific examples, UI, and infrastructure behavior.
- Backwards compatibility is gated at each checkpoint: the full existing suite must stay green and existing journeys intact (Requirement 20).
- Non-property cross-cutting items (TLS transport 22.4, performance p95 targets 21.x, Lambda/S3 elasticity 23.1/23.3/23.4, WCAG manual review) are validated via smoke/load/manual tests outside this coding plan as described in the design Testing Strategy.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "4.1", "6.1", "10.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "6.2", "7.2", "10.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "2.3", "3.1", "6.3", "7.1", "11.1"] },
    { "id": 3, "tasks": ["2.4", "3.2", "4.2", "6.4", "8.1", "11.2", "12.1"] },
    { "id": 4, "tasks": ["3.3", "4.3", "7.3", "8.2", "11.3", "12.2", "14.1", "15.1", "16.1"] },
    { "id": 5, "tasks": ["8.3", "10.3", "10.4", "11.4", "11.5", "14.2", "15.2", "16.2"] },
    { "id": 6, "tasks": ["16.3", "16.4"] }
  ]
}
```
