# Implementation Plan: Gurukul AI Modernization

## Overview

Incremental modernization of the Gurukul AI educational platform across 12 requirement areas. The implementation follows a layered strategy: foundational infrastructure first (dependencies, TypeScript, architecture scaffolding), then core systems (auth, database, API), then features (AI grading, real-time messaging), then quality/deployment layers (testing, CI/CD, observability, security). Each task builds on previous work and the system remains functional at every step.

## Tasks

- [x] 1. Project infrastructure and dependency modernization
  - [x] 1.1 Update Node.js engine requirements and ESM configuration
    - Update all `package.json` files to specify `"engines": { "node": ">=20.0.0" }` and `"type": "module"`
    - Configure TypeScript (`tsconfig.json`) for backend with `"module": "ESNext"`, `"moduleResolution": "NodeNext"`, `"strict": true`
    - Add `tsconfig.json` for backend at `backend/tsconfig.json`
    - Convert `backend/server.js` to `backend/src/server.ts` as ESM entry point
    - _Requirements: 1.2, 1.4_

  - [x] 1.2 Update backend dependencies to latest stable versions
    - Update Express, Mongoose, jsonwebtoken, bcryptjs, helmet, cors, dotenv, winston, multer, socket.io, and all other production dependencies
    - Replace deprecated packages with maintained alternatives
    - Run `npm audit fix` and resolve all high/critical vulnerabilities
    - _Requirements: 1.1, 1.3_

  - [x] 1.3 Update frontend dependencies and configure React 18 strict mode
    - Update React, React DOM, Vite, TanStack React Query, MUI, React Router, and all frontend dependencies
    - Ensure `createRoot` API is used in `main.tsx` with `<StrictMode>` wrapping the app
    - Update `tsconfig.json` to enforce `strict: true` and `noExplicitAny` via ESLint rule `@typescript-eslint/no-explicit-any`
    - _Requirements: 1.1, 1.3, 1.5, 5.1_

  - [x] 1.4 Set up backend project structure with layered architecture scaffolding
    - Create directory structure: `backend/src/{controllers,services,repositories,middleware,models,config,types,routes,realtime,jobs}`
    - Create `backend/src/types/api.ts` with `ApiErrorResponse`, `ApiSuccessResponse<T>` interfaces
    - Create `backend/src/types/common.ts` with shared types (`UserRole`, `Pagination`, `PaginatedResult<T>`)
    - Create `backend/src/repositories/baseRepository.ts` with `IBaseRepository<T>` interface
    - _Requirements: 2.6_

  - [x] 1.5 Set up testing infrastructure
    - Configure Jest for backend with TypeScript support (`ts-jest`) and path aliases
    - Configure Vitest for frontend with React Testing Library
    - Install `fast-check` for property-based testing in both workspaces
    - Install `mongodb-memory-server` for backend integration tests
    - Install Playwright for E2E tests
    - Add test scripts to `package.json` files
    - _Requirements: 9.1, 9.4_

- [x] 2. Database layer optimization
  - [x] 2.1 Create optimized Mongoose models with TypeScript and indexes
    - Convert all models in `backend/models/mongo/` to TypeScript in `backend/src/models/`
    - Add compound indexes: Attendance `{ enrollment: 1, date: -1 }`, Enrollment `{ student: 1, course: 1 }`, Mark `{ enrollment: 1, type: 1 }`, Message `{ senderId: 1, recipientId: 1, createdAt: -1 }`
    - Add `deletedAt` field and soft-delete support for Student, Faculty, Parent, Course, Message collections
    - Add schema-level validation rules matching API constraints
    - _Requirements: 3.1, 3.5, 3.6_

  - [x] 2.2 Implement database connection configuration and connection pooling
    - Create `backend/src/config/database.ts` with configurable pool sizes via environment variables (`MONGO_MIN_POOL`, `MONGO_MAX_POOL`)
    - Enforce min 2, max 10 (configurable up to 50) connections
    - Set `serverSelectionTimeoutMS: 30000` and `socketTimeoutMS: 30000`
    - _Requirements: 3.2, 3.7_

  - [x] 2.3 Implement base repository with soft-delete and lean queries
    - Create `backend/src/repositories/baseRepository.ts` implementing `IBaseRepository<T>`
    - Use `.lean()` for all read-only operations
    - Implement soft-delete pattern: standard queries exclude `deletedAt != null` by default
    - Implement `findByIdIncludingDeleted` for explicit access to soft-deleted records
    - _Requirements: 3.3, 3.5_

  - [x] 2.4 Implement slow query monitoring
    - Add Mongoose plugin or middleware that logs queries exceeding 500ms
    - Log collection name, query filter, and execution time
    - Integrate with structured logging (Winston)
    - _Requirements: 3.4_

  - [x] 2.5 Create new collections: RefreshToken, GradingJob, AuditLog
    - Create `backend/src/models/RefreshToken.ts` with indexes `{ userId: 1, familyId: 1 }`, TTL on `expiresAt`
    - Create `backend/src/models/GradingJob.ts` with indexes `{ teacherId: 1, status: 1 }`, `{ batchId: 1 }`
    - Create `backend/src/models/AuditLog.ts` with indexes `{ timestamp: -1 }`, `{ 'actor.userId': 1 }`, `{ correlationId: 1 }`
    - _Requirements: 4.2, 7.1, 12.6_

  - [x] 2.6 Write property tests for soft-delete exclusion (Property 4)
    - **Property 4: Soft-Delete Exclusion**
    - Test that records with non-null `deletedAt` never appear in standard find/list queries
    - Use fast-check to generate random documents with/without `deletedAt` and verify query results
    - **Validates: Requirements 3.5**

  - [x] 2.7 Write property tests for schema validation consistency (Property 5)
    - **Property 5: Schema Validation Consistency**
    - Test that invalid documents are rejected with proper error identifying the invalid field
    - Use fast-check to generate documents violating various schema constraints
    - **Validates: Requirements 3.6**

- [x] 3. Checkpoint - Database and infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Authentication and authorization hardening
  - [x] 4.1 Implement auth token service with JWT access/refresh token pairs
    - Create `backend/src/services/authTokenService.ts` implementing `IAuthTokenService`
    - Generate access tokens with 15-minute expiry, refresh tokens with 7-day expiry
    - Store refresh token hashes (SHA-256) in RefreshToken collection with `familyId`
    - Implement token rotation: consume old refresh token, issue new pair, link via `replacedByTokenHash`
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Implement token family revocation on replay detection
    - When an already-consumed refresh token is presented, revoke all tokens in that family
    - Force full re-authentication for the affected user
    - Log security event to AuditLog
    - _Requirements: 4.8_

  - [x] 4.3 Implement password hashing and account lockout
    - Create `backend/src/services/passwordService.ts` using bcrypt with cost factor 12
    - Implement account lockout after 5 failed attempts within 10 minutes (15-minute lock)
    - Send email notification on account lock via existing email service
    - _Requirements: 4.5, 4.6_

  - [x] 4.4 Implement RBAC middleware and service-level authorization
    - Create `backend/src/middleware/rbacMiddleware.ts` for route-level role checking
    - Implement data-level isolation in service layer: students access only own records, parents only linked ward, teachers only assigned courses
    - Validate permissions at both middleware and service layer to prevent privilege escalation
    - _Requirements: 4.3, 4.4, 4.7_

  - [x] 4.5 Implement auth controllers and login/refresh/logout routes
    - Create `backend/src/controllers/authController.ts` with login, refresh, logout endpoints
    - Wire up routes at `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`
    - Return 401 for missing/expired/malformed tokens, 403 for insufficient permissions
    - _Requirements: 4.4_

  - [x] 4.6 Write property tests for token lifetime bounds (Property 6)
    - **Property 6: Token Lifetime Bounds**
    - Test that access token expiry ≤ 15 min and refresh token expiry ≤ 7 days for any user/role
    - Use fast-check to generate random user IDs and roles
    - **Validates: Requirements 4.1**

  - [x] 4.7 Write property tests for refresh token rotation (Property 7)
    - **Property 7: Refresh Token Rotation Invalidation**
    - Test that consumed refresh tokens cannot be reused
    - **Validates: Requirements 4.2**

  - [x] 4.8 Write property tests for token family revocation (Property 8)
    - **Property 8: Token Family Revocation on Replay**
    - Test that replaying an already-consumed token revokes entire family
    - **Validates: Requirements 4.8**

  - [x] 4.9 Write property tests for password hashing (Property 11)
    - **Property 11: Password Hashing Strength**
    - Test that any stored password is bcrypt with cost factor ≥ 12
    - Use fast-check to generate random password strings
    - **Validates: Requirements 4.5, 12.5**

  - [x] 4.10 Write property tests for RBAC data isolation (Property 9)
    - **Property 9: RBAC Data Isolation**
    - Test that student A cannot access student B's records, parents access only linked ward
    - **Validates: Requirements 4.3**

  - [x] 4.11 Write property tests for authentication status codes (Property 10)
    - **Property 10: Authentication Status Codes**
    - Test 401 for invalid tokens, 403 for valid token with insufficient permissions
    - **Validates: Requirements 4.4**

- [x] 5. Backend API modernization
  - [x] 5.1 Implement request validation middleware with Zod
    - Create `backend/src/middleware/validateRequest.ts` using Zod schemas
    - Validate body, query, and params; reject unknown fields with 400
    - Return standardized error response with `error`, `message`, `details[]`
    - _Requirements: 2.2, 2.3_

  - [x] 5.2 Implement global error handler and AppError class
    - Create `backend/src/middleware/errorHandler.ts` with `AppError` class
    - Implement global error handler returning consistent error envelope
    - Ensure unhandled exceptions return 500 with static message, no stack traces leaked
    - Handle 404 for unregistered routes
    - _Requirements: 2.4, 2.7, 2.8_

  - [x] 5.3 Implement correlation ID middleware
    - Create `backend/src/middleware/correlationId.ts`
    - Read `x-correlation-id` from request headers or generate UUID
    - Attach to request context, include in response headers, propagate to all log entries
    - _Requirements: 11.6, 11.7_

  - [x] 5.4 Implement structured logging middleware
    - Extend Winston logger to emit JSON logs with requestId, userId, role, endpoint, method, status, responseTime
    - Create request logging middleware that captures all required fields
    - _Requirements: 11.1_

  - [x] 5.5 Convert and implement resource controllers (Student, Course, Faculty, Enrollment, Attendance, Mark)
    - Create TypeScript controllers in `backend/src/controllers/` following controller-service pattern
    - Controllers only handle HTTP request/response; delegate to services
    - Wire to versioned routes at `/api/v1/{resource}`
    - _Requirements: 2.1, 2.6_

  - [x] 5.6 Implement service layer for each resource
    - Create services in `backend/src/services/` (studentService, courseService, facultyService, enrollmentService, attendanceService, markService)
    - Services contain business logic, call repositories, no HTTP objects
    - _Requirements: 2.6_

  - [x] 5.7 Implement repository layer for each resource
    - Create repositories in `backend/src/repositories/` extending base repository
    - Implement resource-specific queries with lean reads and soft-delete awareness
    - _Requirements: 2.6, 3.3, 3.5_

  - [x] 5.8 Set up OpenAPI documentation generation
    - Install `swagger-jsdoc` and `swagger-ui-express`
    - Configure OpenAPI 3.0 spec generation from route definitions
    - Expose at `/api/v1/docs` with request/response schemas, auth requirements, examples
    - _Requirements: 2.5_

  - [x] 5.9 Write property tests for API error envelope consistency (Property 1)
    - **Property 1: API Error Envelope Consistency**
    - Test that all 4xx/5xx responses contain `error` and `message` fields; 400s have `details[]`
    - Use fast-check to generate various error scenarios
    - **Validates: Requirements 2.2, 2.7, 2.8**

  - [x] 5.10 Write property tests for unhandled exception info hiding (Property 2)
    - **Property 2: Unhandled Exception Information Hiding**
    - Test that 500 responses never contain stack traces, file paths, DB identifiers, or env vars
    - Use fast-check to generate random exceptions
    - **Validates: Requirements 2.4**

  - [x] 5.11 Write property tests for unknown field rejection (Property 3)
    - **Property 3: Request Validation Rejects Unknown Fields**
    - Test that requests with unrecognized fields are rejected before controller logic
    - **Validates: Requirements 2.3**

  - [x] 5.12 Write property tests for structured log completeness (Property 27)
    - **Property 27: Structured Log Completeness**
    - Test that all HTTP request logs contain required fields
    - **Validates: Requirements 11.1**

  - [x] 5.13 Write property tests for correlation ID presence (Property 28)
    - **Property 28: Correlation ID Presence**
    - Test that responses always include correlation ID and logs reference the same ID
    - **Validates: Requirements 11.6, 11.7**

- [x] 6. Checkpoint - Backend API and auth
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Security hardening
  - [x] 7.1 Implement input sanitization middleware
    - Create `backend/src/middleware/sanitize.ts` that strips HTML tags and script content
    - Apply to all user-provided input before storage
    - Ensure idempotent sanitization (applying twice yields same result)
    - _Requirements: 12.1_

  - [x] 7.2 Implement NoSQL injection prevention
    - Create `backend/src/middleware/mongoSanitize.ts` that detects and strips/rejects MongoDB operators (`$gt`, `$ne`, `$regex`, `$where`) in user input
    - Log security events for detected injection attempts
    - _Requirements: 12.2, 12.8_

  - [x] 7.3 Implement CSRF protection
    - Configure CSRF protection for all state-changing endpoints (POST, PUT, DELETE, PATCH)
    - Use SameSite cookie attributes or synchronizer token pattern
    - _Requirements: 12.4_

  - [x] 7.4 Implement request size limits
    - Configure body-parser/express to reject request bodies > 10 MB
    - Add middleware to reject individual input fields > 10,000 characters
    - _Requirements: 12.7_

  - [x] 7.5 Configure security headers (HSTS, Helmet)
    - Configure Helmet with HSTS `max-age: 31536000`, `includeSubDomains`
    - Enforce HTTPS for all client-server communication
    - _Requirements: 12.3_

  - [x] 7.6 Implement security audit logging
    - Create `backend/src/services/auditService.ts` that logs security events to AuditLog collection
    - Track: login, logout, password change, role modification, failed auth, account lockout
    - Include timestamp, actor identity, action, target resource, source IP
    - _Requirements: 12.6_

  - [x] 7.7 Write property tests for input sanitization idempotence (Property 26)
    - **Property 26: Input Sanitization Idempotence**
    - Test that sanitize(sanitize(x)) === sanitize(x) and output has no raw HTML/script
    - Use fast-check to generate arbitrary strings with HTML, script, unicode
    - **Validates: Requirements 9.4, 12.1**

  - [x] 7.8 Write property tests for NoSQL injection prevention (Property 30)
    - **Property 30: NoSQL Injection Prevention**
    - Test that inputs with MongoDB operators are sanitized or rejected with 400
    - Use fast-check to generate strings with `$`-prefixed operators
    - **Validates: Requirements 12.2, 12.8**

  - [x] 7.9 Write property tests for CSRF protection (Property 31)
    - **Property 31: CSRF Protection for State-Changing Endpoints**
    - Test that POST/PUT/DELETE/PATCH without valid CSRF token are rejected
    - **Validates: Requirements 12.4**

  - [x] 7.10 Write property tests for security audit trail (Property 32)
    - **Property 32: Security Audit Trail**
    - Test that security events produce audit entries with all required fields
    - **Validates: Requirements 12.6**

  - [x] 7.11 Write property tests for request size enforcement (Property 33)
    - **Property 33: Request Size Enforcement**
    - Test that bodies > 10 MB and fields > 10,000 chars are rejected
    - Use fast-check to generate random payloads of varying sizes
    - **Validates: Requirements 12.7**

- [x] 8. AI grading pipeline
  - [x] 8.1 Set up Redis and BullMQ infrastructure
    - Install and configure BullMQ with Redis connection
    - Create `backend/src/config/redis.ts` with connection configuration
    - Create `backend/src/jobs/gradingQueue.ts` defining the grading queue
    - _Requirements: 7.1_

  - [x] 8.2 Implement grading service and job submission
    - Create `backend/src/services/gradingService.ts` implementing `IGradingService`
    - Validate batch size (1-200), file sizes (≤20 MB), MIME types (PDF, JPEG, PNG)
    - Submit jobs to BullMQ queue with configurable concurrency (1-20, default 5)
    - _Requirements: 7.1, 7.6_

  - [x] 8.3 Implement grading worker with retry logic
    - Create `backend/src/jobs/gradingWorker.ts` processing individual submissions
    - Integrate with Google Gemini AI for grading
    - Implement exponential backoff retry: 3 attempts, starting 1s, capped at 30s
    - Emit progress events after each submission completes
    - Ensure failure isolation: one submission's failure doesn't affect others
    - _Requirements: 7.2, 7.3_

  - [x] 8.4 Implement grading result persistence and batch completion
    - Persist grading results to GradingJob collection within 5 seconds of completion
    - Include confidence score (0-1) and explanation (≤500 chars) in results
    - Emit batch-completion event with successCount + failureCount == totalSubmissions
    - _Requirements: 7.4, 7.5, 7.7_

  - [x] 8.5 Implement grading API routes and controller
    - Create `backend/src/controllers/gradingController.ts` with submit, getProgress, cancel endpoints
    - Wire to `/api/v1/grading/batch`, `/api/v1/grading/jobs/:jobId`, `/api/v1/grading/jobs/:jobId/cancel`
    - Restrict to Teacher role via RBAC middleware
    - _Requirements: 7.1, 7.2_

  - [x] 8.6 Write property tests for batch size validation (Property 14)
    - **Property 14: Grading Batch Size Validation**
    - Test acceptance for size 1-200, rejection for size > 200
    - Use fast-check to generate random batch sizes
    - **Validates: Requirements 7.1**

  - [x] 8.7 Write property tests for progress event count (Property 15)
    - **Property 15: Grading Progress Event Count**
    - Test that exactly N progress events are emitted for N submissions
    - **Validates: Requirements 7.2**

  - [x] 8.8 Write property tests for failure isolation (Property 16)
    - **Property 16: Grading Failure Isolation**
    - Test that individual failures don't affect other submissions
    - **Validates: Requirements 7.3**

  - [x] 8.9 Write property tests for grading metadata invariants (Property 17)
    - **Property 17: Grading Result Metadata Invariants**
    - Test confidence ∈ [0,1] and explanation ≤ 500 chars for all results
    - Use fast-check to generate random scores and text
    - **Validates: Requirements 7.5**

  - [x] 8.10 Write property tests for file validation (Property 18)
    - **Property 18: Grading File Validation**
    - Test rejection for files > 20 MB or invalid MIME types
    - **Validates: Requirements 7.6**

  - [x] 8.11 Write property tests for batch completion count (Property 19)
    - **Property 19: Grading Batch Completion Count Invariant**
    - Test that successCount + failureCount == totalSubmissions
    - **Validates: Requirements 7.7**

- [x] 9. Checkpoint - Security and AI pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Real-time communication layer
  - [x] 10.1 Implement Socket.IO server with authentication
    - Create `backend/src/realtime/socketManager.ts` implementing `ISocketManager`
    - Authenticate WebSocket connections using JWT access tokens
    - Set up namespaces/rooms for conversations
    - _Requirements: 8.1_

  - [x] 10.2 Implement message handling with persistence-first guarantee
    - Persist messages to MongoDB before emitting delivery confirmation
    - Deliver messages to connected recipients within 2 seconds
    - Send delivery confirmation to sender within 1 second of successful delivery
    - Handle persistence failures: notify sender with delivery failure event
    - _Requirements: 8.1, 8.2, 8.6, 8.7_

  - [x] 10.3 Implement typing indicators with rate limiting
    - Broadcast typing indicators rate-limited to once per 3 seconds per user
    - Emit stopped-typing after 5 seconds of inactivity or when user leaves conversation
    - _Requirements: 8.3_

  - [x] 10.4 Implement reconnection and missed message delivery
    - Client-side exponential backoff: 1s initial, doubling, max 30s, max 5 attempts
    - On reconnection, deliver missed messages using last-received-message timestamp
    - Surface connection failure status after 5 failed attempts
    - _Requirements: 8.4, 8.5, 8.8_

  - [x] 10.5 Implement messaging RBAC restrictions
    - Students → only assigned Teachers; Parents → only ward's Teachers; Teachers → Students/Parents in their courses
    - Reject unauthorized message attempts with appropriate error
    - _Requirements: 8.9_

  - [x] 10.6 Write property tests for typing indicator rate limiting (Property 20)
    - **Property 20: Typing Indicator Rate Limiting**
    - Test that indicators aren't broadcast more than once per 3 seconds per user
    - **Validates: Requirements 8.3**

  - [x] 10.7 Write property tests for missed message delivery (Property 21)
    - **Property 21: Missed Message Delivery on Reconnection**
    - Test that all messages sent during disconnection are delivered on reconnect
    - **Validates: Requirements 8.5, 8.8**

  - [x] 10.8 Write property tests for message persistence before confirmation (Property 22)
    - **Property 22: Message Persistence Before Confirmation**
    - Test that persistence happens before delivery confirmation is emitted
    - **Validates: Requirements 8.6**

  - [x] 10.9 Write property tests for messaging RBAC (Property 23)
    - **Property 23: Messaging RBAC Restrictions**
    - Test that unauthorized sender-recipient pairs are rejected
    - **Validates: Requirements 8.9**

- [x] 11. Frontend architecture modernization
  - [x] 11.1 Set up feature module directory structure and barrel exports
    - Create `src/features/{teacher,student,parent,admin,shared}/` with `components/`, `hooks/`, `services/`, `types.ts`, `index.ts`
    - Configure ESLint import boundaries to prevent cross-module internal imports
    - Set up barrel exports in each module's `index.ts`
    - _Requirements: 5.6_

  - [x] 11.2 Implement design token system
    - Create `src/design-system/tokens/{colors,typography,spacing,elevation}.ts`
    - Define semantic tokens: color palettes, 6+ typography steps, 4px-based spacing, 4+ elevation levels, border radii
    - Create `src/design-system/theme/{lightTheme,darkTheme,createTheme}.ts`
    - _Requirements: 6.1_

  - [x] 11.3 Implement theme provider with persistence
    - Create `src/providers/ThemeProvider.tsx` with light/dark theme support
    - Default to light theme for new sessions
    - Persist preference to localStorage, restore on load
    - Apply theme to all pages without un-themed elements
    - _Requirements: 6.2_

  - [x] 11.4 Implement app providers and error boundary hierarchy
    - Create `src/providers/{QueryProvider,AuthProvider,SocketProvider}.tsx`
    - Create `src/features/shared/components/ErrorBoundary/{AppErrorBoundary,PageErrorBoundary}.tsx`
    - Layout-level boundary wraps all content; page-level boundary per route
    - Error boundaries report to Sentry and provide retry actions
    - _Requirements: 5.5, 11.2_

  - [x] 11.5 Implement route-level code splitting with lazy loading
    - Create `src/app/routes.tsx` with `React.lazy` and `Suspense` for all top-level routes
    - Each route loads as a separate chunk
    - Ensure entry chunk < 200 KB gzipped (excluding lazy chunks and vendor splits)
    - _Requirements: 5.3, 5.4_

  - [x] 11.6 Configure TanStack React Query for server state management
    - Create `src/providers/QueryProvider.tsx` with global defaults
    - Define query hooks per resource with configured `staleTime` and `gcTime`
    - Implement mutation hooks that invalidate related queries on success
    - Handle 3-retry failure with inline error state and manual retry action
    - _Requirements: 5.2, 5.7_

  - [x] 11.7 Implement skeleton loading states and timeout handling
    - Create skeleton components for each major view (dashboard, tables, forms)
    - Display skeleton while data is fetching
    - Show timeout error message with retry after 10 seconds
    - _Requirements: 6.6, 6.7_

  - [x] 11.8 Implement shared UI components with accessibility
    - Build DataTable, FormFields, buttons, and interactive elements with WCAG 2.1 AA compliance
    - Ensure keyboard navigation, visible focus indicators, 4.5:1 contrast ratio, ARIA labels
    - Implement micro-animations for interaction feedback within 200ms
    - Ensure responsive layouts from 320px to 2560px with 3+ breakpoints, no horizontal overflow
    - _Requirements: 6.3, 6.4, 6.5_

  - [x] 11.9 Implement Socket.IO client provider
    - Create `src/providers/SocketProvider.tsx` managing WebSocket connection lifecycle
    - Handle authentication, reconnection with backoff, connection failure status
    - Expose hooks for messaging, typing indicators, and real-time events
    - _Requirements: 8.4_

  - [x] 11.10 Write property tests for theme persistence round-trip (Property 12)
    - **Property 12: Theme Persistence Round-Trip**
    - Test that storing and retrieving theme from localStorage returns same value
    - Use fast-check with random theme enum values
    - **Validates: Requirements 6.2**

  - [x] 11.11 Write property tests for grade calculation (Property 24)
    - **Property 24: Grade Calculation Correctness**
    - Test weighted average: sum(score/maxScore × weight) / sum(weights)
    - Use fast-check to generate random marks with scores, maxScores, weights
    - **Validates: Requirements 9.4**

  - [x] 11.12 Write property tests for attendance percentage (Property 25)
    - **Property 25: Attendance Percentage Computation**
    - Test: (present count / total count) × 100, rounded to nearest integer
    - Use fast-check to generate random attendance records
    - **Validates: Requirements 9.4**

- [x] 12. Checkpoint - Frontend and real-time
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Observability and health monitoring
  - [x] 13.1 Implement health check endpoint
    - Create `/health` endpoint checking database, Redis, and external API connectivity
    - Report each service as "connected", "degraded", or "disconnected"
    - Timeout connectivity checks at 5 seconds → report "disconnected"
    - _Requirements: 11.4, 11.8_

  - [x] 13.2 Implement performance monitoring and alerting
    - Track response times per endpoint
    - Emit alert when response time > 2 seconds (configurable Admin notification channel)
    - Expose Prometheus-compatible metrics endpoint
    - _Requirements: 11.3_

  - [x] 13.3 Implement frontend error reporting to Sentry
    - Configure Sentry SDK to capture uncaught errors and unhandled promise rejections
    - Include user ID, current route, browser user-agent, OS in error reports
    - _Requirements: 11.2_

  - [x] 13.4 Configure log retention and searchability
    - Configure log storage with 30-day retention
    - Ensure logs searchable by timestamp, requestId, userId, endpoint, status
    - _Requirements: 11.5_

  - [x] 13.5 Write property tests for health endpoint service status (Property 29)
    - **Property 29: Health Endpoint Service Status**
    - Test that each service reports correct status based on connectivity state
    - **Validates: Requirements 11.4, 11.8**

- [x] 14. CI/CD and deployment
  - [x] 14.1 Create Docker multi-stage builds for frontend and backend
    - Create `Dockerfile` for backend: build stage (TypeScript compile) + production stage (< 400 MB)
    - Create `Dockerfile` for frontend: build stage (Vite build) + nginx serve stage (< 200 MB)
    - Optimize with `.dockerignore`, layer caching, and minimal base images
    - _Requirements: 10.1_

  - [x] 14.2 Create Docker Compose for local development
    - Define services: MongoDB, Redis, backend, frontend, nginx reverse proxy
    - Configure shared network and service dependency ordering
    - Map ports and environment variables from `.env` files
    - _Requirements: 10.4_

  - [x] 14.3 Create comprehensive .env.example files
    - Document all required environment variables with format and placeholder values
    - Cover both frontend and backend configurations
    - Include Redis, MongoDB, JWT secrets, Sentry DSN, SMTP, Gemini API key
    - _Requirements: 10.6_

  - [x] 14.4 Implement CI/CD pipeline with GitHub Actions
    - Create workflow: lint → test → build → deploy to staging on main merge
    - Run full test suite on PR (unit, integration, linting)
    - Enforce 80% coverage threshold; fail PR if tests fail or coverage drops
    - Warn at 15-minute test duration
    - Target < 10-minute cycle for standard PRs
    - _Requirements: 9.3, 9.7, 10.2, 10.5_

  - [x] 14.5 Implement staging smoke tests and production rollback
    - Run smoke tests after staging deploy: health check, API route, frontend serves
    - Halt promotion to production on smoke test failure
    - Implement automatic rollback on production health check failure within 60 seconds
    - _Requirements: 10.2, 10.3, 10.7_

- [x] 15. Integration testing and E2E
  - [x] 15.1 Write backend integration tests
    - Test full request lifecycle with mongodb-memory-server
    - Cover auth flows, CRUD operations, error handling, RBAC enforcement
    - Test Socket.IO with socket.io-client
    - Test BullMQ grading pipeline with mock Gemini responses
    - _Requirements: 9.1, 9.2_

  - [x] 15.2 Write frontend integration tests
    - Test flows: login, dashboard navigation, attendance viewing, message sending, assignment submission
    - Each flow covers success path + at least one error path
    - _Requirements: 9.2_

  - [x] 15.3 Write visual regression tests for component library
    - Set up Storybook stories for all shared components
    - Configure snapshot comparison with 0.1% pixel diff threshold
    - _Requirements: 9.5_

  - [x] 15.4 Write load tests with k6
    - Simulate 500 concurrent users: login, dashboard, attendance, messages
    - Assert p95 response time < 1 second over 5 minutes
    - _Requirements: 9.6_

  - [x] 15.5 Write E2E tests with Playwright
    - Cover critical user flows across all roles
    - Test success and error paths
    - _Requirements: 9.2_

- [x] 16. Final checkpoint - Full integration validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- The system remains functional at each step due to the incremental migration strategy
- TypeScript is used throughout (backend and frontend) as specified in the design document
- All property-based tests use the fast-check library with minimum 100 iterations

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5"] },
    { "id": 4, "tasks": ["2.6", "2.7"] },
    { "id": 5, "tasks": ["4.1", "4.3", "5.1", "5.2", "5.3", "5.4"] },
    { "id": 6, "tasks": ["4.2", "4.4", "5.5", "5.6", "5.7"] },
    { "id": 7, "tasks": ["4.5", "5.8"] },
    { "id": 8, "tasks": ["4.6", "4.7", "4.8", "4.9", "4.10", "4.11", "5.9", "5.10", "5.11", "5.12", "5.13"] },
    { "id": 9, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 10, "tasks": ["7.7", "7.8", "7.9", "7.10", "7.11"] },
    { "id": 11, "tasks": ["8.1"] },
    { "id": 12, "tasks": ["8.2", "8.3"] },
    { "id": 13, "tasks": ["8.4", "8.5"] },
    { "id": 14, "tasks": ["8.6", "8.7", "8.8", "8.9", "8.10", "8.11"] },
    { "id": 15, "tasks": ["10.1"] },
    { "id": 16, "tasks": ["10.2", "10.3", "10.4", "10.5"] },
    { "id": 17, "tasks": ["10.6", "10.7", "10.8", "10.9"] },
    { "id": 18, "tasks": ["11.1", "11.2"] },
    { "id": 19, "tasks": ["11.3", "11.4", "11.5"] },
    { "id": 20, "tasks": ["11.6", "11.7", "11.8", "11.9"] },
    { "id": 21, "tasks": ["11.10", "11.11", "11.12"] },
    { "id": 22, "tasks": ["13.1", "13.2", "13.3", "13.4"] },
    { "id": 23, "tasks": ["13.5"] },
    { "id": 24, "tasks": ["14.1", "14.2", "14.3"] },
    { "id": 25, "tasks": ["14.4"] },
    { "id": 26, "tasks": ["14.5"] },
    { "id": 27, "tasks": ["15.1", "15.2"] },
    { "id": 28, "tasks": ["15.3", "15.4", "15.5"] }
  ]
}
```
