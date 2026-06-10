# Requirements Document

## Introduction

This feature is milestone 1 of the initiative to make the Gurukul AI platform fully functional. It has two goals: (1) close a critical security gap, and (2) deliver admin-driven management of student and teacher (faculty) accounts and their login credentials.

Today, the backend exposes real CRUD routes for students (`/api/students`), faculty (`/api/faculty`), courses (`/api/courses`), and enrollments (`/api/enrollment`), but the JWT authentication middleware (`authMiddleware`) and admin role-based access control (`requireRoles('admin')`) are commented out on these routes. As a result, creating, updating, and deleting students and teachers is currently reachable without authentication. Both middleware functions already exist (`backend/src/middleware/authMiddleware.ts`, `backend/src/middleware/rbacMiddleware.ts`) and JWT access/refresh tokens are issued via `authTokenService`. The `Student` and `Faculty` Mongoose models already hash passwords with bcrypt on save and mark the password field `select: false`. An `AuditLog` model exists for recording privileged actions. The admin frontend (`src/components/admin/UserManagementNew.js`) is the UI surface that will consume the secured endpoints using the admin's bearer token.

This spec is scoped to security hardening plus admin user and credential management. It explicitly excludes course planning UI, AI features, and role-specific dashboards, which are later milestones. Course and enrollment endpoints are included only to the extent of applying authentication and role enforcement to close the security gap; their business behavior is otherwise unchanged.

## Glossary

- **System**: The Gurukul AI backend application (Express + Mongoose + TypeScript) and its protected HTTP API.
- **Admin**: An authenticated user whose JWT role claim is `admin`. The only role permitted to manage student and faculty accounts.
- **Non_Admin**: Any authenticated user whose role is not `admin` (for example `student`, `teacher`/`faculty`, or `parent`).
- **Anonymous_Requester**: Any caller that presents no Authorization header, or an invalid, malformed, or expired access token.
- **Auth_Middleware**: The existing `authMiddleware` that validates the `Authorization: Bearer <token>` access token and attaches `{ userId, role }` to the request.
- **RBAC_Middleware**: The existing `requireRoles(...roles)` middleware that authorizes a request only when the authenticated user's role is in the allowed set.
- **Admin_Management_Endpoint**: Any route that performs list, read, create, update, or delete of student or faculty records, or credential operations on those records.
- **Student_Account**: A `Student` model record that includes login credentials (email, hashed password), profile fields, and an `active` flag.
- **Faculty_Account**: A `Faculty` model record (teacher) that includes login credentials (email, hashed password), profile fields, and an `active` flag.
- **User_Account**: A Student_Account or a Faculty_Account.
- **Credential**: The email/password pair used by a User_Account to authenticate.
- **Temporary_Password**: A System-generated password issued at account creation or password reset, intended to be changed by the account holder.
- **Setup_Link**: A time-limited, single-use tokenized link emailed to the account holder allowing them to set their initial password without the Admin handling plaintext.
- **Credential_Delivery_Method**: The mechanism chosen per account-creation request for establishing initial credentials: `admin_set` (Admin supplies password), `temporary_password` (System generates and displays once), or `setup_link` (System emails a Setup_Link).
- **Audit_Log**: A persisted `AuditLog` record capturing actor, action, target, timestamp, IP, and correlation ID for a privileged action.
- **Soft_Delete**: Deactivation of a User_Account by setting `active` to false and recording `deletedAt`, without physically removing the record.
- **Email_Service**: The SMTP-backed mail sender configured via environment variables, used to deliver Setup_Links and credential notifications.

## Requirements

### Requirement 1: Authenticate all admin-management endpoints

**User Story:** As a platform owner, I want every student, faculty, course, and enrollment management endpoint to require a valid access token, so that no privileged data operation is reachable anonymously.

#### Acceptance Criteria

1. WHEN a request is received for any student, faculty, course, or enrollment list, read, create, update, or delete endpoint, THE System SHALL execute Auth_Middleware before the route handler.
2. IF an Anonymous_Requester calls any student, faculty, course, or enrollment endpoint, THEN THE System SHALL reject the request with HTTP status 401 and SHALL NOT execute the route handler.
3. IF a request presents an expired access token to any student, faculty, course, or enrollment endpoint, THEN THE System SHALL respond with HTTP status 401 and an error code indicating the token has expired, and SHALL NOT execute the route handler.
4. IF a request presents a malformed Authorization header to any student, faculty, course, or enrollment endpoint, THEN THE System SHALL respond with HTTP status 401 and SHALL NOT execute the route handler.
5. WHEN Auth_Middleware validates a token successfully, THE System SHALL attach the authenticated `userId` and `role` to the request before authorization is evaluated.
6. WHEN an Anonymous_Requester is rejected with HTTP status 401 from an Admin_Management_Endpoint, THE System SHALL log the failed authentication attempt and SHALL apply rate limiting to repeated failed attempts from the same source.

### Requirement 2: Restrict account management to admins

**User Story:** As a platform owner, I want student and faculty account management restricted to admins, so that students and teachers cannot create, modify, or delete accounts or escalate privileges.

#### Acceptance Criteria

1. WHEN an authenticated request reaches a create, update, or delete endpoint for a Student_Account or Faculty_Account, THE System SHALL execute RBAC_Middleware requiring the `admin` role after Auth_Middleware.
2. IF a Non_Admin calls a create, update, or delete endpoint for a Student_Account or Faculty_Account, THEN THE System SHALL respond with HTTP status 403 and SHALL NOT modify any record.
3. WHEN an Admin calls a create, update, or delete endpoint for a Student_Account or Faculty_Account, THE System SHALL permit the request to proceed to the route handler and SHALL respond with HTTP status 200 only after the requested operation completes successfully.
4. IF a request attempts to set or change a Faculty_Account `role` or `isAdmin` field and the requester is a Non_Admin, THEN THE System SHALL respond with HTTP status 403 and SHALL NOT change the `role` or `isAdmin` field.
5. WHEN the System enforces authorization, THE System SHALL respond with HTTP status 401 for an unauthenticated requester and HTTP status 403 for an authenticated requester lacking the required role.

### Requirement 3: Verify no admin-management endpoint is reachable unauthenticated

**User Story:** As a security reviewer, I want assurance that every admin-management endpoint enforces authentication and authorization, so that the placeholder security gap is verifiably closed.

#### Acceptance Criteria

1. THE System SHALL apply Auth_Middleware to every Admin_Management_Endpoint.
2. THE System SHALL apply RBAC_Middleware requiring the `admin` role to every create, update, and delete Admin_Management_Endpoint for Student_Accounts and Faculty_Accounts.
3. WHEN the route map for the application is enumerated, THE System SHALL expose, for every Admin_Management_Endpoint, the required roles via the RBAC_Middleware `__roles` property.
4. IF an Admin_Management_Endpoint lacks the required Auth_Middleware or RBAC_Middleware in its middleware chain, THEN THE System SHALL fail closed by denying the request rather than allowing unauthenticated or unauthorized access.
5. IF any required middleware is missing from an Admin_Management_Endpoint's middleware chain, THEN THE System SHALL deny the request regardless of whether the rest of the chain is complete.

### Requirement 4: Admin creates a student account with credentials

**User Story:** As an Admin, I want to create a student account with login credentials, so that the student can sign in to the platform.

#### Acceptance Criteria

1. WHEN an Admin submits a valid student creation request containing first name, last name, email, student ID, grade, and a Credential_Delivery_Method, THE System SHALL create a Student_Account and respond with HTTP status 201.
2. WHEN a Student_Account is created, THE System SHALL store the password in bcrypt-hashed form and SHALL NOT persist the password in plaintext.
3. WHEN a Student_Account is created, THE System SHALL exclude the password field from the response body.
4. IF a student creation request supplies an email that matches an existing Student_Account email, THEN THE System SHALL respond with HTTP status 409 and SHALL NOT create a duplicate account.
5. IF a student creation request supplies a `studentId` that matches an existing Student_Account `studentId`, THEN THE System SHALL respond with HTTP status 409 and SHALL NOT create a duplicate account.
6. IF a student creation request fails field validation, THEN THE System SHALL respond with HTTP status 400 and SHALL NOT create the Student_Account.
7. WHEN a Student_Account is created, THE System SHALL set the `active` flag to true.

### Requirement 5: Admin creates a teacher (faculty) account with credentials

**User Story:** As an Admin, I want to create a teacher account with login credentials, so that the teacher can sign in to the platform.

#### Acceptance Criteria

1. WHEN an Admin submits a valid faculty creation request containing first name, last name, email, employee ID, department, and a Credential_Delivery_Method, THE System SHALL create a Faculty_Account and respond with HTTP status 201.
2. WHEN a Faculty_Account is created, THE System SHALL store the password in bcrypt-hashed form and SHALL NOT persist the password in plaintext.
3. WHEN a Faculty_Account is created, THE System SHALL exclude the password field from the response body.
4. IF a faculty creation request supplies an email that matches an existing Faculty_Account email, THEN THE System SHALL respond with HTTP status 409 and SHALL NOT create a duplicate account.
5. IF a faculty creation request supplies an `employeeId` that matches an existing Faculty_Account `employeeId`, THEN THE System SHALL respond with HTTP status 409 and SHALL NOT create a duplicate account.
6. IF a faculty creation request fails field validation, THEN THE System SHALL respond with HTTP status 400 and SHALL NOT create the Faculty_Account.
7. IF bcrypt hashing of the password fails during creation of a Student_Account or Faculty_Account, THEN THE System SHALL respond with HTTP status 500 and SHALL NOT persist the account.
8. WHEN an Admin creates a Faculty_Account without specifying administrative privileges, THE System SHALL set `isAdmin` to false and `role` to `faculty`.

### Requirement 6: Admin updates a user account

**User Story:** As an Admin, I want to update student and teacher profile details, so that account information stays accurate.

#### Acceptance Criteria

1. WHEN an Admin submits a valid update for an existing User_Account, THE System SHALL apply the changes and respond with HTTP status 200.
2. IF an Admin submits an update for a User_Account identifier that does not exist, THEN THE System SHALL respond with HTTP status 404 and SHALL NOT create a record.
3. IF an Admin updates a User_Account email to a value already used by another User_Account of the same type, THEN THE System SHALL respond with HTTP status 409 and SHALL NOT apply the change.
4. WHEN an Admin updates a User_Account, THE System SHALL exclude the password field from the response body.
5. IF an update request fails field validation, THEN THE System SHALL respond with HTTP status 400 and a description of the invalid fields.

### Requirement 7: Admin deactivates or removes a user account

**User Story:** As an Admin, I want to deactivate or remove a student or teacher account, so that former members can no longer access the platform while history is preserved.

#### Acceptance Criteria

1. WHEN an Admin requests deletion of an existing User_Account, THE System SHALL perform a Soft_Delete by setting `active` to false and recording `deletedAt`, and SHALL respond with HTTP status 200.
2. IF an Admin requests deletion of a User_Account identifier that does not exist, THEN THE System SHALL respond with HTTP status 404.
3. WHILE a User_Account has `active` set to false, THE System SHALL deny authentication for that account's Credential.
4. WHEN an Admin reactivates a previously deactivated User_Account by setting `active` to true, THE System SHALL clear `deletedAt` and remove the deactivation-based authentication block for that account, while any other authentication conditions continue to apply.

### Requirement 8: Secure initial credential delivery

**User Story:** As an Admin, I want to establish a new account's initial credentials securely, so that login secrets are never exposed in plaintext beyond a deliberate one-time display.

#### Acceptance Criteria

1. WHERE the Credential_Delivery_Method is `admin_set`, THE System SHALL accept an Admin-provided password of at least 8 characters, store it bcrypt-hashed, and exclude it from the response body.
2. WHERE the Credential_Delivery_Method is `temporary_password`, THE System SHALL generate a random Temporary_Password of at least 12 characters, store it bcrypt-hashed, and return the plaintext Temporary_Password exactly once in the creation response.
3. WHERE the Credential_Delivery_Method is `setup_link`, THE System SHALL generate a single-use Setup_Link that expires within 24 hours, store only the hashed setup token, and send the Setup_Link to the account email via the Email_Service.
4. WHERE the Credential_Delivery_Method is `setup_link` and the Email_Service is unavailable, THE System SHALL respond with HTTP status 502 and SHALL NOT leave the account in a state that exposes a usable credential.
5. THE System SHALL exclude any plaintext password and any raw setup token from all Audit_Log entries and application log output.
6. IF a Setup_Link token is presented after expiry or after it has already been used, THEN THE System SHALL reject the request with HTTP status 400 and SHALL NOT change the account password.

### Requirement 9: Admin resets a user password

**User Story:** As an Admin, I want to reset a student's or teacher's password, so that I can restore access when a credential is lost or compromised.

#### Acceptance Criteria

1. WHEN an Admin requests a password reset for an existing User_Account using the `temporary_password` method, THE System SHALL generate a new Temporary_Password, store it bcrypt-hashed, and return the plaintext value exactly once in the response.
2. WHEN an Admin requests a password reset for an existing User_Account using the `setup_link` method, THE System SHALL generate a single-use Setup_Link that expires within 24 hours and send it to the account email via the Email_Service.
3. WHEN a User_Account password is reset, THE System SHALL revoke all active refresh tokens for that account so that existing sessions can no longer be refreshed.
4. WHEN an Admin requests a password reset for a User_Account identifier that does not exist, THE System SHALL log the failed reset attempt and SHALL apply rate limiting to repeated failed reset attempts to prevent account enumeration.
5. WHEN a password reset completes, THE System SHALL store the new password bcrypt-hashed and SHALL NOT return any password data in the response.

### Requirement 10: List, search, and filter user accounts

**User Story:** As an Admin, I want to list, search, and filter student and teacher accounts, so that I can find and manage accounts efficiently.

#### Acceptance Criteria

1. WHEN an authenticated Admin requests the student or faculty list endpoint, THE System SHALL return a paginated result containing matching User_Accounts and SHALL exclude the password field from every entry.
2. WHERE a list request includes a search term, THE System SHALL return only User_Accounts whose name or email matches the search term.
3. WHERE a list request includes an `active` filter, THE System SHALL return only User_Accounts whose `active` flag equals the requested value.
4. WHERE a student list request includes a `grade` filter, THE System SHALL return only Student_Accounts with the matching grade; WHERE a faculty list request includes a `department` filter, THE System SHALL return only Faculty_Accounts with the matching department.
5. IF a list request includes both a `grade` filter and a `department` filter, THEN THE System SHALL respond with HTTP status 400.
6. WHEN a list request includes pagination parameters, THE System SHALL return at most the requested page size and SHALL include total count and page metadata.
7. WHERE a list request specifies a page size greater than 100 or a page size of 0, THE System SHALL respond with HTTP status 400.

### Requirement 11: Audit admin account actions

**User Story:** As a security reviewer, I want every admin account action recorded, so that privileged changes are traceable.

#### Acceptance Criteria

1. WHEN an Admin successfully creates, updates, deactivates, or reactivates a User_Account, THE System SHALL write an Audit_Log entry recording the Admin's `userId`, role, source IP, the action, the target resource, the target resource identifier, a timestamp, and a correlation ID.
2. WHEN an Admin successfully resets a User_Account password, THE System SHALL write an Audit_Log entry for the password change without recording any password value.
3. IF an authorization check denies an Admin_Management_Endpoint request with HTTP status 403, THEN THE System SHALL write an Audit_Log entry recording the denied access attempt.
4. THE System SHALL exclude all plaintext credentials and raw tokens from every Audit_Log entry.

### Requirement 12: Consistent validation and error responses

**User Story:** As an Admin and as a frontend developer, I want predictable validation and error responses, so that the admin UI can present accurate, actionable feedback.

#### Acceptance Criteria

1. IF a request body or query fails schema validation, THEN THE System SHALL respond with HTTP status 400 and a body identifying the invalid fields.
2. IF a requested User_Account does not exist, THEN THE System SHALL respond with HTTP status 404.
3. IF a create or update request would violate the uniqueness of email, `studentId`, or `employeeId`, THEN THE System SHALL respond with HTTP status 409.
4. THE System SHALL return error responses in the application's standard error envelope containing a machine-readable error code and a human-readable message.
5. WHEN the System rejects a request for authentication or authorization reasons, THE System SHALL respond with HTTP status 401 for missing or invalid authentication and HTTP status 403 for insufficient role.
6. IF a request both lacks valid authentication and would also fail authorization, THEN THE System SHALL respond with HTTP status 401 for the missing authentication and SHALL NOT return HTTP status 403.
