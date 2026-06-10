# Implementation Plan: Secure Admin User Management

## Overview

This plan implements milestone 1 in two halves: (1) security hardening that re-enables `authMiddleware` and `requireRoles('admin')` on student/faculty/course/enrollment routes and proves fail-closed wiring via the route map, and (2) admin-driven account and credential management (create, update, soft-delete, reactivate, list/filter, secure credential delivery, and password reset).

Implementation language is **TypeScript** (matching the existing Express + Mongoose backend). The work is additive: new `credentialService`, `emailService` abstraction, `auditContext` helper, admin service methods, Zod schemas, controllers, and per-endpoint rate limiting, plus small schema additions to `Student`/`Faculty` and the `AuditLog` action enum. Property-based tests use `fast-check` and live in `backend/tests/property/`; service/model property tests use `mongodb-memory-server`.

## Tasks

- [x] 1. Extend data models with setup-token fields and audit actions
  - [x] 1.1 Add setup-token fields to Student and Faculty schemas
    - Add `setupTokenHash?` (`select:false`), `setupTokenExpiresAt?`, and `setupTokenUsedAt?` to `backend/src/models/Student.ts` and `backend/src/models/Faculty.ts`
    - Preserve the existing bcrypt pre-save hook and `password` `select:false` behavior
    - Confirm `active` and `deletedAt` fields exist and are usable for soft-delete/reactivate
    - _Requirements: 8.3, 8.6, 7.1, 7.4_

  - [x] 1.2 Extend the AuditLog action enum
    - Add `account_created`, `account_updated`, `account_deactivated`, `account_reactivated`, and `access_denied` to the `action` enum in `backend/src/models/AuditLog.ts`
    - Keep existing actions (`password_change`, etc.) intact
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 1.3 Write property test for setup-token validity invariant
    - **Property 14: Expired or used setup tokens are rejected without changing the password**
    - **Validates: Requirements 8.6**
    - Use `mongodb-memory-server`; generate fresh/expired/used token states; assert only fresh-and-unused tokens are valid and stored password hash is unchanged for invalid tokens

- [x] 2. Implement credentialService (secret generation and setup-token lifecycle)
  - [x] 2.1 Create credentialService with delivery-method preparation
    - Create `backend/src/services/credentialService.ts` implementing `ICredentialService` (`prepareCredential`, `generateTemporaryPassword`, `generateSetupToken`, `hashSetupToken`, `validateAdminPassword`)
    - Temporary passwords: `crypto.randomBytes` over a mixed alphabet, length >= 12
    - Setup tokens: `crypto.randomBytes(32).toString('hex')`, persist only `sha256(raw)`, expiry `now + 24h`
    - `validateAdminPassword` throws `AppError.badRequest` when password < 8 chars; never write secrets to logs
    - Export via `backend/src/services/index.ts`
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 2.2 Write property test for temporary password generation
    - **Property 12: Temporary passwords are long, hashed, and revealed exactly once**
    - **Validates: Requirements 8.2, 9.1**
    - Assert generated temp passwords are always >= 12 chars across iterations

  - [x] 2.3 Write property test for setup-token generation bounds
    - **Property 13: Setup links are single-use, time-limited, and store only a hash**
    - **Validates: Requirements 8.3, 9.2**
    - Assert expiry is within 24h, only the hash is returned for persistence, and the raw token is never equal to the stored hash

  - [x] 2.4 Write unit tests for admin password policy validation
    - Test `validateAdminPassword` accepts >= 8 chars and rejects shorter values with 400
    - _Requirements: 8.1_

- [x] 3. Implement emailService abstraction
  - [x] 3.1 Create typed emailService wrapper
    - Create `backend/src/services/emailService.ts` implementing `IEmailService` (`sendSetupLink`, `isAvailable`)
    - Wrap the existing legacy mail transport; reject/return false when transport is unavailable so the 502 path is detectable
    - Export via `backend/src/services/index.ts`
    - _Requirements: 8.3, 8.4_

  - [x] 3.2 Write unit test for email-unavailable detection
    - Mock the transport to fail and assert `sendSetupLink` rejects and `isAvailable` reports false
    - _Requirements: 8.4_

- [x] 4. Implement audit context helper and redaction guard
  - [x] 4.1 Create auditContext helper and secret redaction guard
    - Create `backend/src/utils/auditContext.ts` exporting `AuditContext` and `auditContextFrom(req)` building `{ userId, role, ip, correlationId }` from the authenticated request (`req.ip`/`X-Forwarded-For`, correlationId middleware)
    - Add a redaction guard that strips `password`, `temporaryPassword`, `setupToken`, and `token` keys from any audit/log metadata before write
    - _Requirements: 11.1, 11.4, 8.5_

  - [x] 4.2 Write property test for secret redaction
    - **Property 15: Secrets are redacted from all audit and application logs**
    - **Validates: Requirements 8.5, 11.4**
    - Generate metadata objects containing secret keys and assert no plaintext password or raw setup token survives redaction

- [x] 5. Checkpoint - core credential and audit utilities
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement admin account service methods for students
  - [x] 6.1 Add createWithCredentials to studentService
    - Extend `backend/src/services/studentService.ts`: check `email` + `studentId` uniqueness (409), call `credentialService.prepareCredential`, persist (model hook hashes), set `active:true`; for `temporary_password` return plaintext once; for `setup_link` send email before committing a usable credential and translate transport failure to 502; map bcrypt failure to 500 without persisting
    - Write a success audit entry via `auditService` using `AuditContext`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 5.7, 8.1, 8.2, 8.3, 8.4, 11.1_

  - [x] 6.2 Add updateAccount, deactivate, and reactivate to studentService
    - `updateAccount`: 404 if missing, email-uniqueness within Student (409), exclude password from result; `deactivate`: idempotent soft-delete (`active:false`, `deletedAt:now`); `reactivate`: `active:true`, clear `deletedAt`
    - Write success audit entries for each lifecycle action
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.4, 11.1_

  - [x] 6.3 Add resetPassword to studentService
    - Generate new credential per method; revoke all refresh tokens via `authTokenService.revokeTokenFamily(id)`; return plaintext only for `temporary_password`; never return password data otherwise; 404 if account missing
    - Write a password-change audit entry without any password value
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 11.2_

  - [x] 6.4 Add list/search/filter with pagination to studentService
    - Apply `search` (name/email regex), `active` filter, `grade` filter; reject `grade`+`department` combination (400); enforce page size 1..100 (400 otherwise); exclude password from every entry; return `meta` with total and page
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 7. Implement admin account service methods for faculty
  - [x] 7.1 Add createWithCredentials to facultyService
    - Extend `backend/src/services/facultyService.ts` symmetric to student create using `employeeId`/`department`; uniqueness on `email` + `employeeId` (409); without admin privileges set `isAdmin:false` and `role:'faculty'`; same credential-delivery, 502, 500, and audit behavior as student create
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8, 8.1, 8.2, 8.3, 8.4, 11.1_

  - [x] 7.2 Add updateAccount, deactivate, reactivate, and resetPassword to facultyService
    - Mirror the student lifecycle and reset methods using faculty fields; email-uniqueness within Faculty (409); refresh-token revocation on reset; audit entries for each action
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.4, 9.1, 9.2, 9.3, 9.5, 11.1, 11.2_

  - [x] 7.3 Add list/search/filter with pagination to facultyService
    - Apply `search`, `active`, and `department` filters; reject `grade`+`department` (400); enforce page size 1..100 (400 otherwise); exclude password; return `meta`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 7.4 Write property test for password hashing and exclusion
    - **Property 8: Passwords are always stored hashed and never returned**
    - **Validates: Requirements 4.2, 4.3, 5.2, 5.3, 6.4, 8.1, 9.5**
    - Across create/update/reset for students and faculty, assert stored password is a bcrypt hash verifying against plaintext and never equals it, and no response contains a password field

  - [x] 7.5 Write property test for valid creation outcomes
    - **Property 9: Valid account creation succeeds with an active account**
    - **Validates: Requirements 4.1, 4.7, 5.1, 5.8**
    - Assert valid creates yield `active:true`, and faculty without admin privileges yield `isAdmin:false`, `role:'faculty'`

  - [x] 7.6 Write property test for identifier uniqueness
    - **Property 10: Identifier uniqueness is enforced on create and update**
    - **Validates: Requirements 4.4, 4.5, 5.4, 5.5, 6.3, 12.3**
    - Assert duplicate `email`/`studentId`/`employeeId` within a type yields 409 and no record is created/modified

  - [x] 7.7 Write property test for not-found and soft-delete semantics
    - **Property 16: Update of a missing account is a not-found, and delete is a soft-delete**
    - **Validates: Requirements 6.2, 7.1, 7.2, 12.2**
    - Assert update/delete/reset on missing id returns 404 with no record; delete of existing sets `active:false`, records `deletedAt`, retains record, returns 200

  - [x] 7.8 Write property test for password-reset token revocation
    - **Property 18: Password reset revokes all active refresh tokens**
    - **Validates: Requirements 9.3**
    - Seed active refresh tokens and assert a successful reset revokes every one

  - [x] 7.9 Write property tests for list filter soundness and pagination
    - **Property 19: List results are sound with respect to filters and exclude passwords**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
    - **Property 20: Pagination is bounded and reports accurate metadata**
    - **Validates: Requirements 10.6**
    - **Property 21: Out-of-range page size and conflicting filters are rejected with 400**
    - **Validates: Requirements 10.5, 10.7**
    - Each property is its own `fast-check` test (>= 100 iterations) over generated datasets and filter combinations

  - [x] 7.10 Write example test for bcrypt hashing failure
    - Mock `bcrypt` to throw and assert create responds 500 and does not persist the account
    - _Requirements: 5.7_

- [x] 8. Checkpoint - admin service layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Enforce active flag at login and validate setup-token consumption
  - [x] 9.1 Add active-flag enforcement to authentication
    - Update `authController.login` / `findUserByEmail` in `backend/src/controllers/authController.ts` to reject login when `active === false` with 401 (`ACCOUNT_INACTIVE`) without revealing account existence; leave lockout and other conditions intact
    - _Requirements: 7.3, 7.4_

  - [x] 9.2 Implement account-setup token consumption
    - Add service logic to validate a presented setup token (hash match, not expired, not used), set the new password (model hook hashes), mark `setupTokenUsedAt`; reject expired/used tokens with 400 leaving the stored password unchanged
    - _Requirements: 8.6_

  - [x] 9.3 Write property test for deactivation/reactivation auth blocking
    - **Property 17: Deactivation blocks authentication; reactivation restores it**
    - **Validates: Requirements 7.3, 7.4**
    - Assert auth is denied while `active:false`, and deactivate-then-reactivate clears `deletedAt`, sets `active:true`, and removes the deactivation-based block

- [x] 10. Implement Zod validation schemas for admin endpoints
  - [x] 10.1 Define credential-delivery and list-query schemas
    - Add the `credentialDeliverySchema` discriminated union (`admin_set` requires `password.min(8)`; `temporary_password` and `setup_link` carry no password) and student/faculty list-query schemas extending pagination (`grade`/`department`/`active`/`search`, `limit` bounded `1..100`)
    - Compose creation/update schemas for students and faculty referencing these, using the existing `validateRequest` middleware
    - _Requirements: 4.6, 5.6, 6.5, 8.1, 10.5, 10.7, 12.1_

  - [x] 10.2 Write property test for validation rejection
    - **Property 11: Invalid requests are rejected with 400 and field details**
    - **Validates: Requirements 4.6, 5.6, 6.5, 12.1**
    - Generate invalid create/update/list inputs and assert 400 with a `details` array and no persisted change

- [x] 11. Implement admin controllers and wire audit context
  - [x] 11.1 Add admin account handlers to studentController and facultyController
    - In `backend/src/controllers/studentController.ts` and `facultyController.ts`, add create, update, deactivate, reactivate, password-reset, and list handlers that build `AuditContext` via `auditContextFrom(req)` and delegate to the services; shape responses per `StudentResponse`/`FacultyResponse`/`CreateAccountResult`/`ResetResult`
    - _Requirements: 4.1, 5.1, 6.1, 7.1, 9.1, 10.1, 11.1, 11.2_

  - [x] 11.2 Add public account-setup controller
    - Add a handler (e.g. in a new `accountSetupController.ts`) for `POST /api/account-setup/:token` that consumes the setup token via the service logic from task 9.2
    - _Requirements: 8.6_

  - [x] 11.3 Write example tests for admin success status codes
    - **Property 24: Error responses conform to the standard envelope**
    - **Validates: Requirements 12.4, 12.5**
    - Assert one example per operation that admin requests reach the handler and return 2xx after completion, and that error envelopes carry code + message with correct 401/403 status
    - _Requirements: 2.3_

- [x] 12. Harden routes with authentication and role enforcement
  - [x] 12.1 Re-enable auth and RBAC on student and faculty routes
    - In `backend/src/routes/studentRoutes.ts` and `facultyRoutes.ts`, switch imports to `authMiddleware` and `adminOnly`/`requireRoles`; apply chain rate limiter -> `authMiddleware` -> role middleware -> `validateRequest` -> controller; list/read use `requireRoles('admin','teacher')`, create/update/delete use `adminOnly`
    - Register new routes: `POST /:id/password-reset`, `POST /:id/reactivate` (adminOnly), and the public `POST /api/account-setup/:token`
    - _Requirements: 1.1, 1.5, 2.1, 2.4, 3.1, 3.2, 3.3_

  - [x] 12.2 Re-enable auth and RBAC on course and enrollment routes
    - In `backend/src/routes/courseRoutes.ts` and `enrollmentRoutes.ts`, apply `authMiddleware`, with `requireRoles('admin','teacher')` for reads and `adminOnly` for writes; business logic unchanged
    - _Requirements: 1.1, 2.1, 3.1, 3.2_

  - [x] 12.3 Write property tests for security wiring
    - **Property 1: Authentication is wired on every admin-management endpoint**
    - **Validates: Requirements 1.1, 3.1**
    - **Property 2: Admin role enforcement is wired on every create/update/delete endpoint**
    - **Validates: Requirements 2.1, 3.2, 3.3**
    - **Property 3: Endpoints fail closed when a required middleware is absent**
    - **Validates: Requirements 3.4, 3.5**
    - Use `buildRouteMap(app)` over an in-memory app; each property is its own `fast-check` test asserting `authMiddleware` presence, `__roles` includes `admin`, and removal of a required middleware denies the request

- [x] 13. Implement per-endpoint rate limiting and failed-auth logging
  - [x] 13.1 Add stricter rate limiter for admin and reset endpoints
    - Create an `express-rate-limit` instance keyed by source IP for failed authentication on admin-management endpoints and for password-reset endpoints; invoke `auditService.logFailedAuth` on 401 and on failed reset attempts to prevent enumeration
    - _Requirements: 1.6, 9.4_

  - [x] 13.2 Write integration test for failed-auth logging and rate limiting
    - Assert `auditService.logFailedAuth` is invoked on 401 and repeated failures from one source engage the limiter
    - _Requirements: 1.6, 9.4_

- [x] 14. Implement route-map security verification suite
  - [x] 14.1 Add adminEndpointSecurity verification test
    - Create `backend/src/routes/__tests__/adminEndpointSecurity.test.ts` using `buildRouteMap(app)` to assert every admin-management endpoint resolves `requiredRole` including `admin` for create/update/delete and contains `authMiddleware`; the test fails if any route is missing either middleware
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 15. Wire audit denial hook and finalize integration
  - [x] 15.1 Record 403 denials and complete audit integration
    - Add an RBAC-denial hook so any admin-management request denied with 403 writes an `access_denied` audit entry; confirm all success paths write complete audit entries via `auditService`
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 15.2 Write property tests for authentication/authorization behavior and auditing
    - **Property 4: Missing or invalid authentication is rejected with 401**
    - **Validates: Requirements 1.2, 1.4**
    - **Property 5: Valid tokens attach identity before authorization**
    - **Validates: Requirements 1.5**
    - **Property 6: Authentication precedence over authorization**
    - **Validates: Requirements 2.2, 2.5, 12.5, 12.6**
    - **Property 7: Non-admins cannot change account records, role, or isAdmin**
    - **Validates: Requirements 2.2, 2.4**
    - **Property 22: Successful privileged actions produce complete audit entries**
    - **Validates: Requirements 11.1, 11.2**
    - **Property 23: Authorization denials are audited**
    - **Validates: Requirements 11.3**
    - Each property is its own `fast-check` test; middleware-behavior properties (4, 5, 6, 7) use mocked `Request`/`Response`/`NextFunction`; audit properties (22, 23) assert recorded fields and redaction

  - [x] 15.3 Write example test for expired-token rejection
    - Craft one expired JWT and assert 401 with a token-expired error code
    - _Requirements: 1.3_

- [x] 16. Final checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Run focused property suite: `npm test --prefix backend -- --runInBand tests/property`
  - Run full backend suite: `npm test --prefix backend -- --runInBand`

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability; property test tasks reference both their property number and the requirements clauses they validate.
- Each correctness property is implemented as a single `fast-check` property test running a minimum of 100 iterations, tagged `// Feature: secure-admin-user-management, Property {n}: {property text}`.
- Property tests asserting persistence use `mongodb-memory-server`; wiring properties use `buildRouteMap`; middleware-behavior properties use mocked Express objects.
- Checkpoints ensure incremental validation at natural boundaries.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["1.3", "2.2", "2.3", "2.4", "3.2", "4.2", "6.1"] },
    { "id": 2, "tasks": ["6.2", "6.3", "6.4", "7.1"] },
    { "id": 3, "tasks": ["7.2", "7.3", "9.1", "9.2", "10.1"] },
    { "id": 4, "tasks": ["7.4", "7.5", "7.6", "7.7", "7.8", "7.9", "7.10", "9.3", "10.2", "11.1", "11.2"] },
    { "id": 5, "tasks": ["11.3", "12.1", "12.2"] },
    { "id": 6, "tasks": ["12.3", "13.1", "14.1", "15.1"] },
    { "id": 7, "tasks": ["13.2", "15.2", "15.3"] }
  ]
}
```
