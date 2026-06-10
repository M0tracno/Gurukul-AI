# Requirements Document

## Introduction

This feature delivers personalized, role-scoped dashboards for every role on the Gurukul AI platform (admin, teacher/faculty, student, and parent) and introduces a verified parent OTP login flow. It builds directly on the completed `secure-admin-user-management` spec, which already provides JWT authentication (`authMiddleware`), role-based access control (`requireRoles`/`adminOnly`), admin-driven student and faculty account and credential management, the `AuditLog` model, `Student` and `Faculty` models (bcrypt hashing, `active`/`deletedAt`, setup-token fields), and per-endpoint rate limiting. It also builds on the `student-parent-api-routes` spec, which provides the student `/api/students/me/*` and parent `/api/parents/me/*` data routes and the `ParentStudentRelation` linkage collection. This infrastructure is treated as existing and is reused rather than rebuilt.

The feature has four pillars:

1. **Personalized, role-scoped dashboards.** On login, each dashboard greets the user by first name with a time-of-day greeting and shows only data scoped to that specific user. A teacher sees only their own classes, courses, students, and schedule; a student sees only their own records; a parent sees only their linked child's data; an admin sees the management surface. This scoping is enforced server-side, not merely hidden in the UI.

2. **Authoritative records as the single source of truth.** The maintained `Student` and `Faculty` collections are the authoritative records. All dashboards and downstream views derive their data from these records (and the records linked to them) rather than duplicating or hardcoding data.

3. **Verified parent linkage + OTP login.** A parent authenticates by supplying a student ID and a phone number. Access proceeds only when that phone number is stored and linked to that specific student. Only then is a single-use, time-limited OTP sent to the phone; the parent must enter the correct OTP to authenticate. Mismatches are handled without revealing whether the student or phone exists (anti-enumeration).

4. **Security, auditing, and friendliness.** Consistent server-side per-user authorization across all dashboard-feeding endpoints, audit logging of sensitive access via the existing `AuditLog`, and friendly, consistent error and empty states.

A fifth concern, replacing demo/seed data with real data and credentials, is captured as a data-reset/seed requirement. Because real personal data and credentials cannot be fabricated by the System and wiping data is destructive and environment-specific, this requirement is environment-guarded, idempotent, and tied to the existing admin-driven onboarding flows. Several genuinely open decisions (SMS/OTP provider, exact per-role dashboard contents, real-data source, and demo-data-removal authorization) are recorded in the Open Questions section for clarification before design.

## Glossary

- **System**: The Gurukul AI backend application (Express + Mongoose + TypeScript) and its protected HTTP API, together with the React frontend that consumes it.
- **Role**: The authenticated user's role claim, one of `admin`, `faculty` (teacher), `student`, or `parent`.
- **Authenticated_User**: A caller that has presented a valid JWT access token, with `userId` and `role` attached by Auth_Middleware.
- **Auth_Middleware**: The existing `authMiddleware` that validates the `Authorization: Bearer <token>` access token and attaches `{ userId, role }` to the request.
- **RBAC_Middleware**: The existing `requireRoles(...roles)`/`adminOnly` middleware that authorizes a request only when the Authenticated_User's role is in the allowed set.
- **Authorization_Service**: The existing service-layer module that verifies per-record data ownership (student self-access, faculty ownership of their courses/classes, parent-to-child linkage).
- **Dashboard**: A role-specific frontend view that aggregates and displays data for a single Authenticated_User.
- **Dashboard_Scope**: The set of records a single Authenticated_User is permitted to view, determined by their role and identity (for example, a faculty member's own courses, a student's own records, a parent's linked children's records).
- **Authoritative_Record**: A `Student` document or `Faculty` document in the maintained `students` or `faculty` collections, treated as the single source of truth for that person's identity and profile.
- **Dashboard_Endpoint**: Any HTTP endpoint that returns data consumed by a Dashboard.
- **Greeting**: The personalized salutation shown on a Dashboard, composed of a time-of-day phrase and the Authenticated_User's first name.
- **Local_Time**: The wall-clock time in the Authenticated_User's own time zone, used to select the time-of-day phrase.
- **Parent**: A user, represented by a `Parent` document, who is granted read access to one or more linked students' data.
- **Parent_Child_Linkage**: A verified association between a Parent (identified by a stored phone number) and a specific Student, represented by an active `ParentStudentRelation` document and/or a stored phone-to-student linkage on the Authoritative_Record.
- **Linkage_Phone**: A phone number stored by the System and associated with a specific Parent_Child_Linkage, used as the destination for OTP delivery.
- **OTP**: A One-Time Passcode: a numeric code generated by the System, delivered to a Linkage_Phone, and required to complete parent authentication.
- **OTP_Request**: A request submitted by a prospective Parent containing a student ID and a phone number, initiating the parent login flow.
- **OTP_Challenge**: The server-side state created when a valid OTP_Request matches a Parent_Child_Linkage, comprising the hashed OTP, its expiry, its attempt counter, and its consumed flag.
- **SMS_Service**: A pluggable outbound SMS delivery component used to send an OTP to a Linkage_Phone; the concrete provider is configured via environment variables and selected later (see Open Questions).
- **Audit_Log**: A persisted `AuditLog` record capturing actor, action, target, timestamp, source IP, and correlation ID for a sensitive action.
- **Demo_Record**: A `Student`, `Faculty`, `Parent`, or related document created for demonstration or seeding purposes and flagged as non-production data.
- **Real_Record**: An Authoritative_Record or related document representing an actual person, established through admin-driven onboarding.
- **Data_Reset_Mechanism**: An idempotent, environment-guarded operation that removes Demo_Records and prepares the database for Real_Records.
- **Empty_State**: The response and UI shown when a Dashboard_Endpoint has no data to return for the current Dashboard_Scope.

## Requirements

### Requirement 1: Personalized time-of-day greeting

**User Story:** As any authenticated user, I want my dashboard to greet me by name with a greeting that matches the time of day, so that the platform feels personal and oriented to me.

#### Acceptance Criteria

1. WHEN an Authenticated_User loads a Dashboard, THE System SHALL display a Greeting composed of a time-of-day phrase followed by the Authenticated_User's first name taken from the Authoritative_Record or Parent record.
2. WHILE the Authenticated_User's Local_Time is from 05:00 up to but not including 12:00, THE System SHALL use the time-of-day phrase "Good morning".
3. WHILE the Authenticated_User's Local_Time is from 12:00 up to but not including 17:00, THE System SHALL use the time-of-day phrase "Good afternoon".
4. WHILE the Authenticated_User's Local_Time is from 17:00 up to but not including 24:00, THE System SHALL use the time-of-day phrase "Good evening".
5. WHILE the Authenticated_User's Local_Time is from 00:00 up to but not including 05:00, THE System SHALL use the time-of-day phrase "Good evening".
6. IF the Authenticated_User's first name is unavailable from their record, THEN THE System SHALL display the time-of-day phrase without a name and SHALL NOT display a placeholder token such as "undefined" or "null".

### Requirement 2: Server-side per-user data scoping

**User Story:** As a platform owner, I want every dashboard data request scoped to the requesting user on the server, so that no user can see another user's data even if the UI is bypassed.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests data from a Dashboard_Endpoint, THE System SHALL restrict the returned data to the Dashboard_Scope derived from that user's `userId` and `role`.
2. THE System SHALL derive Dashboard_Scope from the authenticated identity attached by Auth_Middleware and SHALL NOT derive Dashboard_Scope from a client-supplied user identifier in the request body, query, or path when that identifier differs from the authenticated identity.
3. IF a request includes a target resource identifier that is outside the Authenticated_User's Dashboard_Scope, THEN THE System SHALL respond with HTTP status 403 and SHALL NOT return the out-of-scope data.
4. WHEN an authenticated faculty member requests their own classes, courses, students, or schedule, THE System SHALL return only records for which that faculty member is the assigned owner via the Authoritative_Record linkage.
5. WHEN an authenticated student requests their records, THE System SHALL return only records associated with that student's own Authoritative_Record.
6. WHEN an authenticated Parent requests a child's data, THE Authorization_Service SHALL verify an active Parent_Child_Linkage between the Parent and the specified child before returning data, and IF no active Parent_Child_Linkage exists, THEN THE System SHALL respond with HTTP status 403.
7. IF an unauthenticated caller requests any Dashboard_Endpoint, THEN THE Auth_Middleware SHALL respond with HTTP status 401 and SHALL NOT execute the route handler.
8. IF an Authenticated_User whose role is not permitted for a Dashboard_Endpoint requests that endpoint, THEN THE RBAC_Middleware SHALL respond with HTTP status 403 and SHALL NOT execute the route handler.

### Requirement 3: Authoritative records as single source of truth

**User Story:** As a platform owner, I want all dashboards to read from the maintained student and teacher records, so that data is consistent and never duplicated or hardcoded.

#### Acceptance Criteria

1. WHEN any Dashboard_Endpoint returns student or faculty identity or profile data, THE System SHALL source that data from the Authoritative_Record rather than from hardcoded, mock, or duplicated values.
2. WHEN an Authoritative_Record is updated through the admin-management flows, THE System SHALL reflect the updated values in subsequent Dashboard responses that derive from that record.
3. WHEN a Dashboard_Endpoint returns data derived from related collections such as Enrollment, Mark, Attendance, or Course, THE System SHALL resolve the owning person through references to the Authoritative_Record rather than through copied identity fields.
4. WHILE an Authoritative_Record has `active` set to false, THE System SHALL exclude that record from Dashboard listings of active members, while still resolving historical references that point to that record so that such references always resolve and return the record's data.
5. WHERE an Authoritative_Record is active but fails an additional listing criterion defined for a given Dashboard_Endpoint, THE System SHALL exclude that record from that listing, so that appearing in an active-member listing requires both `active` being true and satisfying any other applicable criteria.

### Requirement 4: Parent login initiation with verified linkage

**User Story:** As a parent, I want to start login by entering my child's student ID and my phone number, so that only a verified parent can request access to a child's data.

#### Acceptance Criteria

1. WHEN a prospective Parent submits an OTP_Request containing a student ID and a phone number, THE System SHALL determine whether the submitted phone number is stored as a Linkage_Phone linked to the Student identified by the submitted student ID through an active Parent_Child_Linkage.
2. WHERE the submitted (student ID, phone number) pair matches an active Parent_Child_Linkage, THE System SHALL create an OTP_Challenge and send an OTP to the Linkage_Phone via the SMS_Service.
3. IF the submitted (student ID, phone number) pair does not match any active Parent_Child_Linkage, THEN THE System SHALL respond with the same generic acknowledgement message and HTTP status used for a successful OTP_Request and SHALL NOT send an OTP, so that the response does not reveal whether the student or phone number exists.
4. WHEN the System responds to any OTP_Request, THE System SHALL exclude from the response, and from any other channel visible to the caller including error messages, status codes, response timing, and caller-accessible logs, any indication of whether the student ID exists, whether the phone number exists, or whether a linkage exists.
5. IF the SMS_Service fails to accept the OTP for delivery, THEN THE System SHALL record the delivery failure server-side and SHALL return the same generic acknowledgement to the caller without exposing the delivery failure.
6. WHEN the System stores a phone number for matching, THE System SHALL normalize the submitted phone number and the stored Linkage_Phone to a canonical format before comparison so that equivalent numbers match consistently.

### Requirement 5: OTP generation and lifecycle

**User Story:** As a security reviewer, I want OTPs to be short-lived, single-use, and stored only as hashes, so that intercepted or reused codes cannot grant access.

#### Acceptance Criteria

1. WHEN the System creates an OTP_Challenge, THE System SHALL generate a numeric OTP of 6 digits using a cryptographically secure random source.
2. WHEN the System creates an OTP_Challenge, THE System SHALL store only a hash of the OTP and SHALL NOT persist the OTP in plaintext.
3. WHEN the System creates an OTP_Challenge, THE System SHALL set an expiry of 5 minutes from creation.
4. IF a Parent submits an OTP after its expiry, THEN THE System SHALL reject the submission with HTTP status 401 and SHALL NOT authenticate the Parent.
5. WHEN a Parent submits the correct OTP before expiry and before exceeding the attempt limit, THE System SHALL mark the OTP_Challenge consumed, issue parent authentication tokens, and SHALL reject any subsequent submission of the same OTP.
6. WHILE an OTP_Challenge is unexpired and unconsumed for a given Parent_Child_Linkage, THE System SHALL treat the most recently issued OTP as the only valid OTP for that linkage and SHALL invalidate any previously issued unconsumed OTP for the same linkage.

### Requirement 6: OTP verification, attempt limits, and resend throttling

**User Story:** As a security reviewer, I want OTP verification to limit guesses and resends, so that brute-force and flooding attacks are prevented.

#### Acceptance Criteria

1. WHEN a Parent submits an OTP for an active OTP_Challenge, THE System SHALL compare the submitted value against the stored OTP hash and SHALL authenticate the Parent only when the values match.
2. IF a Parent submits an incorrect OTP, THEN THE System SHALL increment the OTP_Challenge attempt counter and respond with HTTP status 401 without revealing how many attempts remain.
3. IF the OTP_Challenge attempt counter reaches 5 incorrect submissions, THEN THE System SHALL invalidate the OTP_Challenge and require a new OTP_Request before any further OTP can be accepted.
4. WHEN a Parent requests an OTP resend for the same Parent_Child_Linkage, THE System SHALL enforce a minimum interval of 60 seconds between successive OTP deliveries to the same Linkage_Phone.
5. IF a resend is requested before the minimum interval has elapsed, THEN THE System SHALL respond with HTTP status 429 and SHALL NOT send an additional OTP.
6. THE System SHALL limit the number of OTP_Requests and OTP verification attempts accepted from a single source within a rolling window using the existing per-endpoint rate limiting, and IF the limit is exceeded, THEN THE System SHALL respond with HTTP status 429.

### Requirement 7: Parent-child linkage establishment and storage

**User Story:** As an admin, I want to establish and maintain verified parent-child linkages with phone numbers, so that the OTP login flow has trustworthy linkage data.

#### Acceptance Criteria

1. WHEN an Admin establishes a Parent_Child_Linkage between a Parent and a Student, THE System SHALL store the Linkage_Phone in canonical format and SHALL associate it with both the Parent record and the specific Student.
2. WHEN an Admin deactivates a Parent_Child_Linkage, THE System SHALL set the linkage inactive and SHALL cause subsequent OTP_Requests for that (student ID, phone number) pair to be treated as non-matching per Requirement 4.
3. IF an Admin attempts to create a Parent_Child_Linkage whose phone number is already linked to the same Student, THEN THE System SHALL treat the operation as idempotent and SHALL NOT create a duplicate active linkage.
4. WHEN an Admin establishes or modifies a Parent_Child_Linkage, THE System SHALL require the `admin` role via RBAC_Middleware and SHALL respond with HTTP status 403 for any non-admin caller.
5. THE System SHALL exclude full Linkage_Phone values from list responses to non-admin callers and SHALL restrict full linkage detail to the `admin` role.

### Requirement 8: Audit of sensitive access

**User Story:** As a security reviewer, I want sensitive dashboard access and parent login events recorded, so that access to personal data is traceable.

#### Acceptance Criteria

1. WHEN a Parent successfully authenticates via OTP, THE System SHALL write an Audit_Log entry recording the Parent identifier, the linked student identifier, the action, a timestamp, the source IP, and a correlation ID, without recording the OTP value.
2. WHEN an OTP_Request results in OTP delivery, THE System SHALL write an Audit_Log entry recording the linkage match outcome category without recording the OTP value or the full Linkage_Phone.
3. WHEN a request is denied with HTTP status 403 for being outside the Authenticated_User's Dashboard_Scope, THE System SHALL write an Audit_Log entry recording the denied access attempt.
4. THE System SHALL exclude OTP values, password values, and raw tokens from every Audit_Log entry and from application log output.

### Requirement 9: Friendly and consistent error and empty states

**User Story:** As a dashboard user, I want clear, friendly messages when there is no data or when something fails, so that I am not confused by blank screens or raw errors.

#### Acceptance Criteria

1. WHEN a Dashboard_Endpoint has no records within the current Dashboard_Scope, THE System SHALL respond with HTTP status 200, `success: true`, and an empty collection in the `data` field.
2. WHEN a Dashboard receives an Empty_State response, THE System SHALL display a friendly empty-state message rather than a blank area or an error.
3. WHEN any Dashboard_Endpoint returns an error, THE System SHALL respond using the application's standard error envelope containing a machine-readable error code and a human-readable message.
4. THE System SHALL present error and empty-state messages using consistent wording and styling across all role Dashboards.
5. IF a Dashboard_Endpoint encounters an unexpected error, THEN THE System SHALL route the error through the existing global error handler and SHALL NOT expose stack traces or internal identifiers to the client.

### Requirement 10: Environment-guarded data reset and onboarding

**User Story:** As a platform owner, I want a safe, repeatable way to remove demo data and onboard real users, so that production never contains seed data and no real credentials are fabricated.

#### Acceptance Criteria

1. THE System SHALL distinguish Demo_Records from Real_Records by a persisted marker so that the Data_Reset_Mechanism can target Demo_Records without affecting Real_Records.
2. WHERE the Data_Reset_Mechanism is invoked, THE System SHALL require an explicit confirmation parameter and SHALL require the target environment to be explicitly named, and IF either is absent, THEN THE System SHALL abort without modifying data.
3. IF the Data_Reset_Mechanism is invoked against an environment identified as production without explicit authorization, THEN THE System SHALL abort and SHALL NOT delete any records.
4. WHEN the Data_Reset_Mechanism runs successfully, THE System SHALL remove only Demo_Records and SHALL leave Real_Records unchanged.
5. WHEN the Data_Reset_Mechanism is run more than once with the same inputs, THE System SHALL produce the same resulting data state without error, where idempotence is defined by the resulting data state alone and does not require the execution process itself to be identical across runs.
6. WHEN real users are onboarded, THE System SHALL create accounts through the existing admin-driven `secure-admin-user-management` flows that generate credentials or email setup links, and SHALL NOT store fabricated plaintext passwords for real users.
7. WHEN the Data_Reset_Mechanism removes or onboards records, THE System SHALL write an Audit_Log entry recording the operation, the actor, the environment, and the counts of affected records.

## Open Questions

These decisions are genuinely open and should be resolved before or during design:

1. **SMS/OTP provider.** The OTP delivery channel is SMS and requires a provider. The requirements assume a pluggable SMS_Service configured via environment variables. Which provider should be used (for example Twilio, AWS SNS, MSG91), and for development/testing should a no-op or console transport be acceptable?
2. **Exact per-role dashboard contents.** The requirements define scoping and greeting but not the precise widgets/data each role's dashboard shows (for example which metrics the teacher, student, parent, and admin dashboards display). What is the exact content list per role?
3. **Real-data source.** Requirement 10 assumes admin-driven onboarding rather than fabricated data. Where does the real student/teacher/parent data come from (manual admin entry, CSV import, integration), and is a bulk import needed?
4. **Demo-data-removal authorization.** Wiping data is destructive and environment-specific. Which environments may be reset, who authorizes it, and how is "production" identified and protected?
5. **Parent identity model.** Linkage may be stored on the `ParentStudentRelation` collection, on the `Student.parentPhone` field, or both. Should the canonical linkage live in `ParentStudentRelation` with the phone normalized there, and should `Student.parentPhone` be deprecated or kept in sync?
6. **OTP parameters.** The requirements propose 6 digits, 5-minute expiry, 5 attempts, and a 60-second resend interval. Should these defaults be adjusted to match institutional policy?
