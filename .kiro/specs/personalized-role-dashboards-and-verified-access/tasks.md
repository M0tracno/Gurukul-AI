# Implementation Plan: Personalized Role Dashboards and Verified Access

## Overview

This plan implements personalized, role-scoped dashboards and a verified parent OTP login flow on top of the existing `secure-admin-user-management` and `student-parent-api-routes` work. The approach is additive and bottom-up: shared pure utilities and data models first, then HTTP-agnostic services (OTP, SMS, linkage, faculty self-scope, dashboard scoping), then auditing, then route/controller wiring, and finally the frontend friendly-state primitives and the environment-guarded demo-data reset script.

Implementation language is **TypeScript** (matching the existing Express + Mongoose backend and React frontend). Property-based tests use `fast-check` with Jest, follow the existing `*.property.test.ts` convention, run a minimum of 100 iterations, and use `mongodb-memory-server` for persistence and an in-memory SMS transport spy plus injected clock/fake timers for time-dependent behavior. Each property test is tagged `// Feature: personalized-role-dashboards-and-verified-access, Property {number}: {property_text}`.

## Tasks

- [x] 1. Extend data models and shared pure utilities
  - [x] 1.1 Add `isDemo` markers and extend the AuditLog action enum
    - Add `isDemo: boolean (default false)` to `backend/src/models/Student.ts`, `Faculty.ts`, and `Parent.ts` (additive, no field removed; retain `Student.parentPhone` for display/sync only)
    - Extend the `AuditAction` enum in `backend/src/models/AuditLog.ts` with `parent_otp_login`, `otp_delivered`, and `data_reset`, keeping existing actions intact
    - _Requirements: 10.1, 8.1, 8.2, 10.7_

  - [x] 1.2 Create the `ParentStudentRelation` model
    - Create `backend/src/models/ParentStudentRelation.ts` bound to the existing `parent_student_relations` collection so existing data is preserved
    - Fields: `parentId` (ref Parent), `studentId` (ref Student), `linkagePhone` (normalized), `isActive` (default true), `isDemo` (default false), timestamps
    - Indexes: partial unique on `{ studentId, linkagePhone }` where `isActive: true`; `{ parentId, isActive }`
    - _Requirements: 7.1, 7.2, 7.3, 10.1_

  - [x] 1.3 Create the `OtpChallenge` model
    - Create `backend/src/models/OtpChallenge.ts` with `relationId`, `parentId`, `studentId`, `otpHash` (`select:false`), `expiresAt` (TTL index), `attempts` (default 0), `consumedAt?`, `lastSentAt`, timestamps
    - Add index `{ relationId, consumedAt, expiresAt }` for latest-active lookup
    - _Requirements: 5.2, 5.3_

  - [x] 1.4 Implement the greeting utility
    - Create `backend/src/utils/greeting.ts` with `phraseForHour(localHour)` and `computeGreeting(localHour, firstName?)`
    - Boundaries: `[5,12) → "Good morning"`, `[12,17) → "Good afternoon"`, `[17,24) ∪ [0,5) → "Good evening"`; trim name and fall back to phrase-only with no `undefined`/`null` token
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.5 Write property test for greeting time-of-day mapping
    - **Property 1: Greeting time-of-day mapping is total and boundary-correct**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
    - Place in `backend/src/utils/greeting.property.test.ts`; generate hours 0..23 and assert exactly one boundary-correct phrase

  - [x] 1.6 Write property test for greeting name formatting and fallback
    - **Property 2: Greeting name formatting and safe fallback**
    - **Validates: Requirements 1.1, 1.6**
    - Generate names including null/undefined/whitespace; assert phrase-plus-name when present and phrase-only with no `"undefined"`/`"null"` token when absent

  - [x] 1.7 Implement the phone normalization utility
    - Create `backend/src/utils/phone.ts` with `normalizePhone(raw)` producing a canonical E.164-style value
    - _Requirements: 4.6_

  - [x] 1.8 Write property test for phone normalization
    - **Property 8: Phone normalization is idempotent and match-invariant under formatting**
    - **Validates: Requirements 4.6**
    - Generate formatting variants (spaces/punctuation/country-code) and assert equal canonical output, idempotence, and match-invariance

  - [x] 1.9 Implement the active-record listing filter utility
    - Create `backend/src/utils/recordFilter.ts` with `isListable(record, predicates)` returning true iff `active === true` and all predicates hold; reference resolution must not filter on `active`
    - _Requirements: 3.4, 3.5_

  - [x] 1.10 Write property test for active-listing membership
    - **Property 7: Active-listing membership and historical reference resolution**
    - **Validates: Requirements 3.4, 3.5**
    - Assert listing membership iff `active` true and all predicates hold, and that references to inactive records still resolve and return data

- [x] 2. Checkpoint - models and utilities
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement the pluggable SMS service
  - [x] 3.1 Create `smsService` with console and Twilio transports
    - Create `backend/src/services/smsService.ts` with `ISmsTransport`, `ConsoleSmsTransport` (logs redacted, never the code at `info`), `TwilioSmsTransport`, and `selectSmsTransport()` reading `SMS_PROVIDER` (defaults to console outside production)
    - Export via `backend/src/services/index.ts`
    - _Requirements: 4.2, 4.5, 8.4_

  - [x] 3.2 Write unit tests for transport selection and redaction
    - Assert `selectSmsTransport()` returns console by default and Twilio when configured, and that the console transport never logs the OTP value
    - _Requirements: 4.5, 8.4_

- [x] 4. Implement secret redaction and audit integration
  - [x] 4.1 Ensure secret redaction covers OTP, password, and raw tokens
    - Extend `redactSecrets` in `backend/src/utils/auditContext.ts` to strip OTP, password, and raw-token fields and remain idempotent; route all new audit writes through it
    - _Requirements: 8.4_

  - [x] 4.2 Write property test for secret redaction
    - **Property 20: Secret redaction removes OTPs, passwords, and raw tokens**
    - **Validates: Requirements 8.4**
    - Place in `backend/src/services/audit.property.test.ts`; assert redacted output contains none of the secret values and redaction is idempotent

  - [x] 4.3 Wire audit events for sensitive actions
    - Emit `parent_otp_login` on successful OTP auth, `otp_delivered` (match-outcome category only, never full phone/OTP) on delivery, and ensure `access_denied` is emitted for out-of-scope `AuthorizationService` denials
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 4.4 Write property test for sensitive-event auditing
    - **Property 21: Sensitive events are audited with required fields**
    - **Validates: Requirements 8.1, 8.2, 8.3**
    - Assert each event writes an `AuditLog` entry with required fields (actor/parent/student ids where applicable, action, timestamp, source IP, correlation id) and never the OTP or full phone

- [x] 5. Implement the OTP service
  - [x] 5.1 Implement `otpService.request` with matching, throttling, and anti-enumeration
    - Create `backend/src/services/otpService.ts`; normalize phone, match active `ParentStudentRelation`, on match generate a 6-digit code via `crypto.randomInt`, store only the hash with 5-minute expiry, invalidate prior unconsumed challenges, enforce the 60s resend interval, send via `smsService`, and always return the same generic acknowledgement
    - Catch SMS failures, record server-side, and never surface to the caller
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.6, 6.4, 6.5_

  - [x] 5.2 Implement `otpService.verify` with expiry, attempt limits, and single-use
    - Verify code against the active challenge hash: expired → 401, attempts ≥ 5 → invalidate, wrong → increment + 401 with constant body, correct → consume + issue parent token pair via `authTokenService`; reject reuse of a consumed/superseded code
    - _Requirements: 5.4, 5.5, 6.1, 6.2, 6.3_

  - [x] 5.3 Write property test for anti-enumeration request responses
    - **Property 9: OTP request responses are indistinguishable between match and non-match**
    - **Validates: Requirements 4.3, 4.4**
    - Place in `backend/src/services/otpService.property.test.ts`; assert identical status/body for match vs non-match and no challenge/SMS on non-match

  - [x] 5.4 Write property test for single challenge and single dispatch on match
    - **Property 10: A matching OTP request creates exactly one challenge and dispatches one message**
    - **Validates: Requirements 4.1, 4.2**
    - Use the in-memory SMS spy; assert exactly one persisted `OtpChallenge` and one `send` call

  - [x] 5.5 Write property test for hidden SMS delivery failure
    - **Property 11: SMS delivery failure is hidden from the caller**
    - **Validates: Requirements 4.5**
    - Force `send` to fail; assert the generic acknowledgement is returned and a delivery-failure record is written server-side

  - [x] 5.6 Write property test for OTP generation invariants
    - **Property 12: OTP generation invariants (format, hashing, expiry)**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - Assert generated OTP matches `^\d{6}$`, only a hash (≠ plaintext) is persisted, and `expiresAt - createdAt` equals the 5-minute TTL

  - [x] 5.7 Write property test for expired OTP rejection
    - **Property 13: Expired OTPs never authenticate**
    - **Validates: Requirements 5.4**
    - Use fake timers; assert verification of an expired challenge returns 401 and issues no tokens regardless of code correctness

  - [x] 5.8 Write property test for single-use OTP
    - **Property 14: Correct OTP is single-use**
    - **Validates: Requirements 5.5, 6.1**
    - Assert the correct code consumes the challenge and issues a token pair, and any subsequent submission of the same code is rejected

  - [x] 5.9 Write property test for latest-OTP-only validity
    - **Property 15: Only the most recently issued OTP is valid per linkage**
    - **Validates: Requirements 5.6**
    - Re-issue a code; assert the previous unconsumed code no longer verifies and only the latest succeeds

  - [x] 5.10 Write property test for attempt limiting and invalidation
    - **Property 16: Incorrect submissions increment attempts, leak no count, and invalidate at the limit**
    - **Validates: Requirements 6.2, 6.3**
    - Assert each wrong submission increments attempts and returns a constant 401 body, and at 5 the challenge is invalidated such that even the correct code is rejected until a new request

  - [x] 5.11 Write property test for resend throttling
    - **Property 17: Resend throttling enforces the minimum interval**
    - **Validates: Requirements 6.4, 6.5**
    - Use fake timers; assert a second resend within 60s sends no additional OTP and responds 429

- [x] 6. Checkpoint - OTP and SMS
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement the parent linkage service
  - [x] 7.1 Implement `parentLinkageService` (admin-only link/unlink/list)
    - Create `backend/src/services/parentLinkageService.ts` with `link` (stores `normalizePhone(input)`, references parent + specific student, idempotent on `(studentId, normalized phone)`), `unlink` (sets `isActive=false`), and `listForStudent` (masks phone for non-admin, full value for admin)
    - Export via `backend/src/services/index.ts`
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 7.2 Write property test for normalized, idempotent linkage storage
    - **Property 18: Linkage storage normalizes the phone and is idempotent**
    - **Validates: Requirements 7.1, 7.3**
    - Place in `backend/src/services/parentLinkageService.property.test.ts`; assert stored `linkagePhone === normalizePhone(input)`, both refs present, and re-linking yields exactly one active linkage

  - [x] 7.3 Write property test for phone masking by viewer role
    - **Property 19: Linkage phone is masked for non-admin viewers**
    - **Validates: Requirements 7.5**
    - Assert non-admin list responses omit the full phone (masked form) while admin receives the full value

- [x] 8. Implement faculty self-scope and per-role dashboard scoping
  - [x] 8.1 Implement `facultyMeService` (teacher self-scoped reads)
    - Create `backend/src/services/facultyMeService.ts` with `getProfile`, `getCourses` (`Course.faculty === facultyId`, `deletedAt` null), `getStudents` (resolved via `Enrollment.course ∈ own courses`, distinct, joined to authoritative `Student`), and `getSchedule`
    - Export via `backend/src/services/index.ts`
    - _Requirements: 2.4, 3.1, 3.3_

  - [x] 8.2 Implement per-role dashboard summary services
    - Add scoped summary assembly for student, faculty, parent, and admin dashboards derived solely from authoritative records and references (no hardcoded/duplicated data); parent summaries gated on active `ParentStudentRelation`
    - Reuse `studentMeService`/`parentMeService` and `AuthorizationService`; scope is always derived from `req.user`
    - _Requirements: 2.1, 2.5, 2.6, 3.1, 3.2, 3.3_

  - [x] 8.3 Write property test for in-scope dashboard data
    - **Property 3: Returned dashboard data is always within the requester's scope**
    - **Validates: Requirements 2.1, 2.4, 2.5**
    - Place in `backend/src/services/dashboardScoping.property.test.ts`; generate ownership graphs and assert every returned record belongs to the requester's scope

  - [x] 8.4 Write property test for identity override and out-of-scope denial
    - **Property 4: Authenticated identity overrides client-supplied identifiers; out-of-scope targets are denied**
    - **Validates: Requirements 2.2, 2.3**
    - Assert resolved scope equals the authenticated identity regardless of client-supplied id, and out-of-scope targets yield 403 with no data

  - [x] 8.5 Write property test for parent active-linkage gating
    - **Property 5: Parent access requires an active linkage**
    - **Validates: Requirements 2.6, 7.2**
    - Assert child data returns iff an active relation links them, deactivation flips access to 403

  - [x] 8.6 Write property test for authoritative-record sourcing
    - **Property 6: Dashboards source identity from authoritative records and reflect updates through references**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Assert returned identity equals the current authoritative record, related items resolve via reference ids, and updates are reflected in subsequent responses

- [x] 9. Checkpoint - services and scoping
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Wire OTP, linkage, faculty, and dashboard routes
  - [x] 10.1 Add Zod schemas and replace the in-memory OTP store with persistent endpoints
    - Add validation schemas for OTP request/verify and linkage inputs; implement `POST /api/auth/parent/otp/request` and `POST /api/auth/parent/otp/verify` in `authController` delegating to `otpService`; remove the legacy `sendOtp`/`verifyOtp` handlers and module-level `otpStore` map; retain `parentLogin` unchanged
    - Mount OTP endpoints behind the existing `adminManagementRateLimit`
    - _Requirements: 4.1, 4.2, 5.5, 6.1, 6.2, 6.6_

  - [x] 10.2 Add admin parent-linkage routes and controller
    - Create controller + routes for linkage create/deactivate/list under `adminOnly` RBAC; return 403 for non-admin callers; mask phone for non-admin viewers
    - _Requirements: 7.4, 7.5_

  - [x] 10.3 Add faculty `/me` routes and per-role dashboard endpoints
    - Create `backend/src/routes/facultyMeRoutes.ts` mounted under `/api/faculty` (profile/courses/students/schedule) and the four dashboard summary endpoints (`/api/students/me/dashboard`, `/api/faculty/me/dashboard`, `/api/parents/me/dashboard`, `/api/admin/dashboard`)
    - Enforce the fixed pipeline `authMiddleware → requireRoles(...) → validateRequest → controller → service → AuthorizationService`; read `req.user` only
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 9.1_

  - [x] 10.4 Write integration tests for middleware ordering and RBAC matrix
    - Assert unauthenticated calls return 401 before any handler (Req 2.7), wrong-role calls return 403 (Req 2.8, 7.4), and OTP endpoints return 429 over the rate limit (Req 6.6)
    - _Requirements: 2.7, 2.8, 6.6, 7.4_

  - [x] 10.5 Write integration test for parent OTP happy path
    - End-to-end request → verify → token pair using the console transport
    - _Requirements: 4.2, 5.5, 6.1_

- [x] 11. Implement friendly empty and error states
  - [x] 11.1 Ensure empty-scope and error envelopes are consistent
    - Confirm empty scope returns `200 { success: true, data: [] }` across dashboard endpoints, errors flow through `globalErrorHandler` → `failure(message, code)`, and unexpected errors return a generic 500 with no stack traces
    - _Requirements: 9.1, 9.3, 9.5_

  - [x] 11.2 Add the shared frontend greeting and empty-state primitives
    - Add a shared `<EmptyState>` component in `src/features/shared/components` with consistent copy/styling and a greeting render that consumes `firstName` from `auth/me` and `computeGreeting`
    - _Requirements: 1.1, 9.2, 9.4_

  - [x] 11.3 Write property test for empty-scope success envelope
    - **Property 22: Empty scope returns a successful empty collection**
    - **Validates: Requirements 9.1**
    - Assert any empty-scope dashboard request responds `200 { success: true, data: [] }`

  - [x] 11.4 Write property test for standard error envelope without leakage
    - **Property 23: Errors use the standard envelope without leaking internals**
    - **Validates: Requirements 9.3, 9.5**
    - Assert `AppError` maps to `{ success: false, message, code }` with the correct status and non-`AppError` yields a generic 500 with no stack trace or internal ids

  - [x] 11.5 Write component tests for empty-state and greeting render
    - Snapshot/render `<EmptyState>` and the greeting for consistent copy/styling across roles
    - _Requirements: 9.2, 9.4_

- [x] 12. Implement environment-guarded data reset and onboarding seed marker
  - [x] 12.1 Create the `resetDemoData` script with environment guards
    - Create `backend/scripts/resetDemoData.ts` (run via node, never imported by the app) that aborts without mutation unless `--confirm`, `--env <name>` matching the resolved environment, and (for production) `ALLOW_PROD_RESET=true` are present; on success `deleteMany({ isDemo: true })` across demo-marked collections only, leaving real records untouched; idempotent; write a `data_reset` `AuditLog` entry with actor, env, and per-collection counts
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.7_

  - [x] 12.2 Mark seeded records as demo and document onboarding
    - Set `isDemo: true` on everything created by `backend/scripts/seedAllUsers.js`; confirm real onboarding flows through the existing admin create flows and stores no fabricated plaintext passwords
    - _Requirements: 10.1, 10.6_

  - [x] 12.3 Write property test for reset guards
    - **Property 24: Data reset is fully guarded against unintended mutation**
    - **Validates: Requirements 10.2, 10.3**
    - Place in `backend/scripts/resetDemoData.property.test.ts`; assert zero deletions unless confirm flag, matching named env, and (for production) the override are all present

  - [x] 12.4 Write property test for demo-only idempotent reset
    - **Property 25: Reset removes only demo records and is idempotent**
    - **Validates: Requirements 10.4, 10.5**
    - Generate mixed demo/real datasets; assert only demo records are removed, real records are unchanged, and re-running yields the same final state

  - [x] 12.5 Write property test for reset auditing with counts
    - **Property 26: Reset operations are audited with counts**
    - **Validates: Requirements 10.7**
    - Assert a successful run writes a `data_reset` entry recording operation, actor, resolved environment, and per-collection affected counts

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP.
- Each task references specific granular requirements for traceability, and each property test maps to exactly one numbered design property.
- Property tests use `fast-check` (min 100 iterations), `mongodb-memory-server`, an in-memory SMS transport spy, and injected clock/fake timers for time-dependent behavior, matching the repo's `*.property.test.ts` convention.
- Checkpoints ensure incremental validation; the route-wiring epic integrates all services so no orphaned code remains.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4", "1.7", "1.9"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.5", "1.6", "1.8", "1.10", "3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "4.2", "4.3", "5.1", "7.1"] },
    { "id": 3, "tasks": ["4.4", "5.2", "7.2", "7.3", "8.1"] },
    { "id": 4, "tasks": ["5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "8.2"] },
    { "id": 5, "tasks": ["8.3", "8.4", "8.5", "8.6", "10.1", "10.2", "10.3"] },
    { "id": 6, "tasks": ["10.4", "10.5", "11.1", "11.2", "12.1", "12.2"] },
    { "id": 7, "tasks": ["11.3", "11.4", "11.5", "12.3", "12.4", "12.5"] }
  ]
}
```
