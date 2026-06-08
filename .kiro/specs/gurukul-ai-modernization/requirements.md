# Requirements Document

## Introduction

Gurukul AI is a comprehensive educational platform bridging traditional schooling with modern technology. It serves four user roles: Teacher, Student, Parent, and Admin. This modernization initiative addresses outdated dependencies, legacy code patterns, UI/UX polish, AI pipeline scalability, role-based data segregation, and deployment readiness across the full stack (React/Vite frontend, Express/MongoDB backend, Socket.IO real-time layer, and CI/CD infrastructure).

## Glossary

- **Platform**: The Gurukul AI application comprising frontend, backend, and infrastructure layers
- **Backend_Service**: The Express.js server application handling API requests, authentication, and business logic
- **Frontend_App**: The React/Vite single-page application serving the user interface
- **Auth_System**: The authentication and authorization subsystem using JWT tokens and Firebase Admin SDK
- **RBAC_Engine**: The role-based access control middleware enforcing data segregation between Teacher, Student, Parent, and Admin roles
- **AI_Pipeline**: The NLP and computer vision services responsible for automated grading of test papers and assignments
- **Realtime_Layer**: The Socket.IO-based messaging and notification subsystem
- **CI_CD_Pipeline**: The GitHub Actions workflows, Docker configurations, and deployment scripts
- **Build_System**: The Vite-based frontend build toolchain and backend TypeScript compilation
- **Component_Library**: The shared UI component set built with MUI and design tokens
- **API_Gateway**: The unified REST API layer exposed by Backend_Service
- **Database_Layer**: The MongoDB/Mongoose data persistence layer including schemas, indexes, and connection pooling
- **Monitoring_System**: The observability stack including logging, error tracking, and performance metrics

## Requirements

### Requirement 1: Dependency Modernization

**User Story:** As a developer, I want all project dependencies updated to their latest stable versions with deprecated packages replaced, so that the platform benefits from security patches, performance improvements, and modern API support.

#### Acceptance Criteria

1. WHEN a build is triggered, THE Build_System SHALL compile successfully with zero deprecation warnings emitted by the Node.js runtime and zero deprecated-package warnings reported by npm install across both frontend and backend workspaces
2. THE Platform SHALL use Node.js version 20 LTS (minimum 20.x) as its runtime target, specified in the engines field of all package.json files and enforced in CI matrix configuration
3. WHEN the CI_CD_Pipeline executes a security audit, THE Platform SHALL report zero high-severity or critical vulnerabilities in production dependencies as classified by the npm audit severity rating (CVSS score 7.0 or above)
4. THE Backend_Service SHALL use ESM module syntax (import/export) consistently across all application source files, including controllers, routes, models, middleware, and services directories, excluding third-party configuration files that require CommonJS
5. THE Frontend_App SHALL use React 18 with StrictMode enabled at the application root, and shall use the createRoot API for rendering
6. WHEN a dependency is replaced due to deprecation, THE Build_System SHALL maintain equivalent functionality verified by all existing test suites passing with zero new test failures compared to the pre-replacement baseline, and IF the replacement causes test failures, THEN THE Build_System SHALL fail the build and require manual intervention before proceeding
7. IF a replaced dependency introduces a breaking API change, THEN THE Build_System SHALL ensure that all call sites referencing the replaced dependency's API are updated and that the full test suite passes with no regressions

### Requirement 2: Backend API Modernization

**User Story:** As a developer, I want the backend restructured with consistent API conventions, input validation, and error handling, so that the API is predictable, maintainable, and well-documented.

#### Acceptance Criteria

1. THE API_Gateway SHALL expose all endpoints following RESTful naming conventions with versioned paths (e.g., /api/v1/resource), using lowercase plural nouns for resource names and HTTP methods to indicate actions
2. WHEN a request contains invalid input, THE Backend_Service SHALL return HTTP status 400 with a JSON response body containing an "error" field with a machine-readable error code, a "message" field with a human-readable description, and a "details" array where each entry identifies the invalid field name, the rejected value, and the reason for rejection; this error response format SHALL only be used for actual validation failures and SHALL NOT be returned when the request is valid
3. THE Backend_Service SHALL validate all incoming request bodies, query parameters, and path parameters against defined validation schemas before executing controller logic, rejecting any request that contains unrecognized fields or fails type, format, or constraint checks
4. WHEN an unhandled exception occurs, THE Backend_Service SHALL return HTTP status 500 with a static message indicating an internal error, log the full error stack trace to the server log, and exclude stack traces, file paths, database identifiers, and environment variables from the response body
5. THE Backend_Service SHALL generate OpenAPI 3.0 documentation from route definitions, accessible at the /api/v1/docs endpoint, and the documentation SHALL include request/response schemas, authentication requirements, and example payloads for every registered route
6. THE Backend_Service SHALL implement controller-service-repository layered architecture where controllers do not directly import data-access modules, and service modules do not reference HTTP request or response objects
7. IF a request targets a route that is not registered, THEN THE Backend_Service SHALL return HTTP status 404 with a JSON response body containing an "error" field and a "message" field indicating the requested route does not exist
8. WHEN any API endpoint returns an error (4xx or 5xx), THE Backend_Service SHALL use a consistent JSON error envelope containing at minimum the fields "error" (machine-readable code) and "message" (human-readable description)

### Requirement 3: Database Optimization

**User Story:** As a developer, I want the MongoDB layer optimized with proper indexing, connection pooling, and query efficiency, so that the platform performs well under load.

#### Acceptance Criteria

1. THE Database_Layer SHALL define compound indexes on collections for fields used in query filter and sort operations, covering at minimum: Attendance (enrollment + date), Enrollment (student + course), Mark (enrollment + examType), and Message (sender + receiver + createdAt)
2. WHEN the Backend_Service starts, THE Database_Layer SHALL establish a Mongoose connection pool with a configurable minimum of 2 and maximum of 10 connections, where both values are overridable via environment variables and the maximum SHALL NOT exceed 50
3. THE Database_Layer SHALL use Mongoose lean queries for all read-only operations that do not require document instance methods
4. WHEN a query execution exceeds 500 milliseconds, THE Monitoring_System SHALL log a slow-query warning including the collection name, query filter, and execution time in milliseconds
5. THE Database_Layer SHALL implement soft-delete patterns using a deletedAt timestamp field rather than permanent removal for the following collections: Student, Faculty, Parent, Course, and Message
6. THE Database_Layer SHALL enforce schema-level validation rules matching the API input validation constraints, and IF a document fails schema validation, THEN THE Database_Layer SHALL reject the write operation and return an error indicating which field failed validation and the violated constraint
7. IF the connection pool is fully utilized and a new database operation is requested, THEN THE Database_Layer SHALL queue the operation and serve it when a connection becomes available within 30 seconds, and IF the operation is not served within 30 seconds, THEN THE Database_Layer SHALL reject it with a timeout error indicating resource unavailability; IF the queuing mechanism itself fails or is unavailable, THEN THE Database_Layer SHALL immediately reject the operation with a resource unavailability error without attempting to queue it

### Requirement 4: Authentication and Authorization Hardening

**User Story:** As an Admin, I want the authentication system hardened with secure token management and strict role enforcement, so that each user role accesses only their authorized data.

#### Acceptance Criteria

1. THE Auth_System SHALL issue short-lived access tokens with a maximum lifetime of 15 minutes and long-lived refresh tokens with a maximum lifetime of 7 days
2. WHEN a refresh token is used, THE Auth_System SHALL invalidate the consumed refresh token and issue a new token pair (rotation); token rotation SHALL only be performed when a refresh token is actually consumed
3. THE RBAC_Engine SHALL enforce data-level isolation ensuring that a Student cannot access another Student's records, a Parent can access only their linked ward's data, and a Teacher can access only their assigned courses and enrolled students
4. WHEN a request lacks a valid authentication token, THE Auth_System SHALL return HTTP status 401 with an error code indicating the specific failure reason (expired, malformed, or missing); WHEN a request has a valid token but insufficient permissions for the requested resource, THE Backend_Service SHALL return HTTP status 403 with an error code indicating the required permission that was not met
5. THE Auth_System SHALL hash all stored passwords using bcrypt with a minimum cost factor of 12
6. WHEN five consecutive failed login attempts occur for a single account within 10 minutes, THE Auth_System SHALL temporarily lock the account for 15 minutes and notify the account holder via email
7. THE RBAC_Engine SHALL validate role permissions at both the route middleware level and the service layer to prevent privilege escalation through direct service calls
8. IF a previously invalidated refresh token is presented, THEN THE Auth_System SHALL revoke the entire token family for that user and require re-authentication

### Requirement 5: Frontend Architecture Modernization

**User Story:** As a developer, I want the frontend migrated to TypeScript with a consistent component architecture and state management approach, so that the codebase is type-safe, testable, and maintainable.

#### Acceptance Criteria

1. THE Frontend_App SHALL have all files within the `src/` directory (excluding `*.test.ts`, `*.test.tsx`, and type declaration `*.d.ts` files) written in TypeScript with strict mode enabled and zero instances of the `any` type, as verified by the `no-explicit-any` ESLint rule with no suppression comments
2. THE Frontend_App SHALL manage server state exclusively through TanStack React Query, where each resource type (e.g., students, courses, attendance, marks) has a configured `staleTime` and `gcTime`, and related queries are invalidated upon successful mutations to the same resource
3. THE Frontend_App SHALL implement code-splitting at the route level using React.lazy and Suspense so that each top-level route loads as a separate chunk not included in the initial entry bundle
4. WHEN the Frontend_App loads the initial route, THE Build_System SHALL produce an entry chunk (excluding lazily-loaded route chunks and third-party vendor chunks split by the bundler) smaller than 200 KB gzipped, with exceptions allowed for essential functionality such as authentication, error handling, and core framework code that must be immediately available
5. THE Frontend_App SHALL use a centralized error boundary hierarchy where an error boundary exists at the layout level (wrapping all page content) and at each page level, with each boundary rendering a fallback UI that displays a user-facing error message and a retry action
6. THE Frontend_App SHALL organize components into feature modules (teacher, student, parent, admin, shared) where each module exposes a single barrel `index.ts` file as its public API, and no module imports from another module's internal files directly; a module SHALL be considered compliant only when it both prevents direct internal imports AND exposes barrel exports
7. IF a TanStack React Query request fails after 3 retry attempts, THEN THE Frontend_App SHALL render an inline error state within the requesting component indicating the failure and providing a manual retry action

### Requirement 6: UI/UX Design System

**User Story:** As a user of any role, I want a polished, consistent visual experience that blends a traditional school aesthetic with modern technology cues, so that the platform feels trustworthy, professional, and engaging.

#### Acceptance Criteria

1. THE Component_Library SHALL implement a design token system defining color palettes, typography scales (minimum 6 steps), spacing units (based on a 4px or 8px base grid), border radii, and elevation shadows (minimum 4 levels) as semantic tokens consumed by all UI components
2. THE Frontend_App SHALL default to the light color theme for new sessions and support switching between light and dark themes, persisting the user's preference in local storage so that it is restored on subsequent sessions and applied to all pages without un-themed elements
3. WHEN a user triggers a click, tap, or keyboard activation on an interactive element, THE Frontend_App SHALL provide visual feedback through a state change or micro-animation that must actually be rendered and visible to the user, completing within 200 milliseconds of the interaction event
4. THE Frontend_App SHALL meet WCAG 2.1 Level AA conformance for all interactive elements including keyboard navigation with visible focus indicators, minimum color contrast ratio of 4.5:1 for normal text and 3:1 for large text and UI components, and programmatic ARIA labels for non-text elements
5. THE Component_Library SHALL provide responsive layouts across viewports from 320px to 2560px wide using at least 3 defined breakpoints, ensuring all content remains readable, all interactive elements remain reachable, and no horizontal scrolling or content overflow occurs
6. WHILE data is being fetched for a view, THE Frontend_App SHALL display a skeleton loading state that mirrors the layout structure of the expected content rather than showing blank screens or spinners; the skeleton state MAY persist after data fetching completes until the actual content is ready to render
7. IF a data-fetching view remains in the skeleton loading state for longer than 10 seconds, THEN THE Frontend_App SHALL display an error message indicating the request timed out and offer a retry action

### Requirement 7: AI Grading Pipeline Scalability

**User Story:** As a Teacher, I want the AI grading system to process test papers and assignments reliably at scale with transparent progress feedback, so that I can grade large batches without delays or data loss.

#### Acceptance Criteria

1. WHEN a Teacher submits a batch of papers for AI grading, THE AI_Pipeline SHALL accept batches containing between 1 and 200 submissions, process them asynchronously using a job queue with a configurable concurrency limit between 1 and 20 (default: 5), and reject batches exceeding 200 submissions with an error message indicating the maximum allowed batch size
2. WHILE a grading job is in progress, THE AI_Pipeline SHALL emit a progress event after each submission completes processing, indicating the number of papers processed out of the total and the current job status (processing, completed, or completed with failures)
3. IF a grading job fails for an individual submission, THEN THE AI_Pipeline SHALL retry the submission up to 3 times with exponential backoff starting at 1 second and capped at 30 seconds, then mark it as failed with the failure reason, without affecting other submissions in the batch
4. THE AI_Pipeline SHALL persist all grading results to the Database_Layer within 5 seconds of computation completion
5. WHEN the AI_Pipeline produces a grade, THE AI_Pipeline SHALL include a confidence score between 0 and 1 (inclusive) and a plain-text explanation of the grading rationale no longer than 500 characters; IF the AI_Pipeline cannot generate either a confidence score or an explanation, THEN THE AI_Pipeline SHALL block grade production entirely and mark the submission as failed with a reason indicating metadata generation failure
6. IF a submission file exceeds 20 MB or is not one of the accepted formats (PDF, JPEG, PNG), THEN THE AI_Pipeline SHALL reject the file with an error message indicating the specific validation failure before processing begins; WHEN a batch contains files with mixed validation results, THE AI_Pipeline SHALL report individual file validation status first, then batch-level issues
7. WHEN all submissions in a batch have been processed or marked as failed, THE AI_Pipeline SHALL emit a batch-completion event to the submitting Teacher indicating the total processed count, the success count, and the failure count

### Requirement 8: Real-time Communication Enhancement

**User Story:** As a Student or Parent, I want reliable real-time messaging with delivery confirmation and typing indicators, so that I can communicate effectively with Teachers without messages being lost.

#### Acceptance Criteria

1. WHEN a user sends a message and the recipient is connected via WebSocket, THE Realtime_Layer SHALL deliver the message to the recipient within 2 seconds, measured from the point the server acknowledges receipt of the message from the sender
2. WHEN a message is delivered to the recipient's client, THE Realtime_Layer SHALL send a delivery confirmation event containing the message identifier and a timestamp back to the sender within 1 second of successful delivery
3. WHILE a user is composing a message in a conversation, THE Realtime_Layer SHALL enforce rate limiting to prevent typing indicator broadcasts more frequent than once every 3 seconds per user, and SHALL broadcast a stopped-typing indicator when the user has not typed for 5 seconds or leaves the conversation
4. IF the WebSocket connection is first lost, THEN THE Realtime_Layer SHALL reset the backoff delay to 1 second and attempt count to 1, and automatically attempt to reconnect using exponential backoff doubling on each attempt up to a maximum delay of 30 seconds, for a maximum of 5 attempts before surfacing a connection failure status to the client
5. WHEN the WebSocket connection is re-established after a disconnection, THE Realtime_Layer SHALL retrieve and deliver to the client any messages sent during the disconnection period, using the timestamp of the last received message as the synchronization point
6. THE Realtime_Layer SHALL persist all messages to the Database_Layer before emitting a delivery confirmation event to the sender, ensuring messages survive server restarts
7. IF message persistence to the Database_Layer fails, THEN THE Realtime_Layer SHALL notify the sender with a delivery failure event containing the message identifier and SHALL NOT emit a delivery confirmation for that message
8. IF the recipient is not connected via WebSocket when a message is sent, THEN THE Realtime_Layer SHALL persist the message to the Database_Layer and deliver it to the recipient upon their next successful WebSocket connection
9. THE RBAC_Engine SHALL restrict messaging channels so that Students can message only their assigned Teachers, Parents can message only their ward's Teachers, and Teachers can message Students and Parents within their courses

### Requirement 9: Testing and Quality Assurance

**User Story:** As a developer, I want comprehensive automated test coverage across unit, integration, and end-to-end layers, so that regressions are caught before deployment.

#### Acceptance Criteria

1. THE Platform SHALL maintain a minimum of 80% line coverage for backend controllers, services, and middleware modules as measured by the test runner
2. THE Frontend_App SHALL have integration tests covering all user flows listed: login, dashboard navigation, attendance viewing, message sending, and assignment submission, with each flow exercising both the success path and at least one error path
3. WHEN a pull request is opened, THE CI_CD_Pipeline SHALL execute the full test suite including unit tests, integration tests, and linting, and SHALL report a failing status check that prevents merging only when tests actually fail or coverage drops below the 80% threshold; IF the test suite itself fails to execute, THE CI_CD_Pipeline SHALL allow the pipeline to pass and not block merging
4. THE Backend_Service SHALL include property-based tests for all data transformation functions including grade calculation, attendance percentage computation, and input sanitization, generating a minimum of 100 randomized inputs per function
5. THE Frontend_App SHALL include visual regression tests for all Component_Library components using snapshot comparison with a maximum allowable pixel diff threshold of 0.1% of total image area before a test is marked as failed
6. THE Platform SHALL include load tests simulating 500 concurrent users performing login, dashboard loading, attendance retrieval, and message listing operations with response times remaining below 1 second at the 95th percentile over a sustained 5-minute test duration
7. WHEN a test suite execution exceeds 15 minutes in the CI_CD_Pipeline, THE CI_CD_Pipeline SHALL report a warning status on the pull request indicating the test duration exceeded the budget

### Requirement 10: CI/CD and Deployment Readiness

**User Story:** As a developer, I want a reliable CI/CD pipeline with containerized deployments and environment parity, so that releases are predictable, reproducible, and require minimal manual intervention.

#### Acceptance Criteria

1. THE CI_CD_Pipeline SHALL produce Docker container images for both Frontend_App and Backend_Service using multi-stage builds, where the final production image for Frontend_App does not exceed 200 MB and the final production image for Backend_Service does not exceed 400 MB
2. WHEN code is merged to the main branch, THE CI_CD_Pipeline SHALL automatically deploy to a staging environment and run smoke tests that verify the health check endpoint returns a healthy status, at least one API route responds successfully, and the Frontend_App serves its entry page without errors; failure reports MAY be generated even when smoke tests pass for informational purposes
3. IF smoke tests fail after deployment to the staging environment, THEN THE CI_CD_Pipeline SHALL halt the promotion to production and report the failing test names and their error responses to the developer who triggered the merge
4. THE Platform SHALL provide Docker Compose configurations for local development that include MongoDB, Backend_Service, Frontend_App, and a reverse proxy, all connected on a shared network with service dependency ordering defined
5. THE CI_CD_Pipeline SHALL complete the full build-test-deploy cycle within 10 minutes for pull requests that do not modify CI configuration files or add new service dependencies; pull requests that add substantial test coverage or complex integration tests MAY exceed this time limit
6. THE Platform SHALL externalize all environment-specific configuration through environment variables with a documented .env.example file listing every required variable, its expected format, and a placeholder value for both Frontend_App and Backend_Service
7. IF a production deployment fails health checks within 60 seconds of startup, THEN THE CI_CD_Pipeline SHALL automatically roll back to the previous stable version and send a deployment failure notification identifying the failing service and the health check error status

### Requirement 11: Observability and Monitoring

**User Story:** As an Admin, I want centralized logging, error tracking, and performance metrics, so that I can detect and diagnose issues before they impact users.

#### Acceptance Criteria

1. THE Backend_Service SHALL emit structured JSON logs for all requests including request ID, user ID, role, endpoint, HTTP method, response status, and response time in milliseconds
2. THE Frontend_App SHALL report uncaught JavaScript errors and unhandled promise rejections to a centralized error tracking service including user ID, current route, browser user-agent string, and operating system
3. WHEN the Backend_Service response time exceeds 2 seconds for any endpoint, THE Monitoring_System SHALL send a notification to the configured Admin alert channel within 60 seconds of detection
4. THE Platform SHALL expose a /health endpoint returning the actual service status of each dependent service (database, cache, external APIs) as one of: "connected", "degraded", or "disconnected", determined by a connectivity check completing within 5 seconds
5. THE Monitoring_System SHALL retain application logs for a minimum of 30 days, searchable by timestamp, request ID, user ID, endpoint, and response status
6. THE Backend_Service SHALL propagate a correlation ID through all service calls within a single request lifecycle for distributed tracing
7. IF the Backend_Service receives a request without a correlation ID header, THEN THE Backend_Service SHALL generate a unique correlation ID and include it in the response headers and all associated log entries
8. IF a dependent service health check fails to respond within 5 seconds, THEN THE Platform SHALL report that service status as "disconnected" in the /health endpoint response

### Requirement 12: Security Hardening

**User Story:** As an Admin, I want the platform hardened against common web vulnerabilities, so that student and institutional data remains protected.

#### Acceptance Criteria

1. WHEN the Backend_Service receives user-provided input containing HTML tags or script content, THE Backend_Service SHALL strip or encode all HTML entities and JavaScript-executable characters before storing or rendering the content, ensuring no raw HTML or script tags appear in stored data or rendered output
2. THE Backend_Service SHALL use parameterized queries or Mongoose query builder methods exclusively, preventing NoSQL injection through user-controlled query operators
3. THE Platform SHALL enforce HTTPS for all client-server communication and set Strict-Transport-Security headers with a minimum max-age of 31536000 seconds (one year) and the includeSubDomains directive
4. THE Backend_Service SHALL implement CSRF protection for all state-changing endpoints (POST, PUT, DELETE, PATCH) using the synchronizer token pattern or SameSite cookie attributes
5. THE Platform SHALL hash all passwords using bcrypt with a minimum cost factor of 10, and encrypt all other sensitive data at rest (personal identifiers and academic records) using AES-256
6. WHEN a security-relevant event occurs (login, password change, role modification, failed authentication), THE Monitoring_System SHALL log an audit trail entry with timestamp, actor identity, action performed, target resource, and source IP address
7. IF the Backend_Service receives a request body exceeding 10 MB or a single input field exceeding 10000 characters, THEN THE Backend_Service SHALL reject the request with an error response indicating the payload exceeds the allowed size limit
8. IF the Backend_Service detects a request containing a confirmed injection pattern (NoSQL operator in user input or script injection attempt that cannot be sanitized), THEN THE Backend_Service SHALL reject the request with HTTP status 400 (Bad Request) and log the attempt as a security event
