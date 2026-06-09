# Implementation Plan: Student & Parent API Routes

## Overview

Implement student self-service and parent ward-monitoring API routes following the existing 3-layer architecture (route → controller → service). All new files use TypeScript with Express, Mongoose, and Zod validation. Routes are mounted under `/api/students/me/*` and `/api/parents/me/*`.

## Tasks

- [x] 1. Create student self-service service layer
  - [x] 1.1 Create `backend/src/services/studentMeService.ts`
    - Implement `getCourses(studentId: string)` — queries `Enrollment.find({ student: studentId, status: 'active' })` and populates Course (name, code, faculty)
    - Implement `getGrades(studentId: string)` — finds active enrollments, queries `Mark.find({ enrollment: { $in: ids } })`, populates enrollment→course, groups results by course
    - Implement `getAttendance(studentId: string, dateRange?: { startDate?: Date; endDate?: Date })` — finds active enrollments, queries Attendance with optional date filter, populates enrollment→course, sorts by date desc
    - Export singleton instance `studentMeService`
    - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.2, 3.3_

- [x] 2. Create student self-service controller
  - [x] 2.1 Create `backend/src/controllers/studentMeController.ts`
    - Implement `getMyCourses(req, res)` — extracts `userId` from `(req as AuthenticatedRequest).user`, calls `studentMeService.getCourses(userId)`, returns `{ success: true, data }`
    - Implement `getMyGrades(req, res)` — extracts userId, calls `studentMeService.getGrades(userId)`, returns `{ success: true, data }`
    - Implement `getMyAttendance(req, res)` — extracts userId, parses `startDate`/`endDate` query params, calls `studentMeService.getAttendance(userId, dateRange)`, returns `{ success: true, data }`
    - Wrap each handler in try/catch that calls `next(error)` for the global error handler
    - _Requirements: 1.1, 2.1, 3.1, 8.1, 8.3, 8.5_

- [x] 3. Create student self-service routes
  - [x] 3.1 Create `backend/src/routes/studentMeRoutes.ts`
    - Define Zod schemas: `dateRangeQuerySchema` with optional `startDate` and `endDate` coerced to Date
    - `GET /me/courses` → `authMiddleware` → `requireRoles('student')` → `studentMeController.getMyCourses`
    - `GET /me/grades` → `authMiddleware` → `requireRoles('student')` → `studentMeController.getMyGrades`
    - `GET /me/attendance` → `authMiddleware` → `requireRoles('student')` → `validateRequest({ query: dateRangeQuerySchema })` → `studentMeController.getMyAttendance`
    - Export default router
    - _Requirements: 1.2, 1.3, 2.3, 2.4, 3.4, 3.5_

- [x] 4. Create parent self-service service layer
  - [x] 4.1 Create `backend/src/services/parentMeService.ts`
    - Implement `getChildren(parentId: string)` — queries `ParentStudentRelation.find({ parentId, isActive: true })`, gets studentIds, queries `Student.find({ _id: { $in: studentIds } })`, returns `{ id, firstName, lastName, studentId, grade, active }` for each
    - Implement private helper `verifyChildAccess(parentId, childId, role)` — calls `authorizationService.assertParentAccess(parentId, childId, role)`, then verifies `Student.findById(childId)` exists (throws 404 if not)
    - Implement `getChildCourses(parentId, childId, role)` — calls verifyChildAccess, then same logic as studentMeService.getCourses(childId)
    - Implement `getChildGrades(parentId, childId, role)` — calls verifyChildAccess, then same logic as studentMeService.getGrades(childId)
    - Implement `getChildAttendance(parentId, childId, role, dateRange?)` — calls verifyChildAccess, then same logic as studentMeService.getAttendance(childId, dateRange)
    - Export singleton instance `parentMeService`
    - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4_

- [x] 5. Create parent self-service controller
  - [x] 5.1 Create `backend/src/controllers/parentMeController.ts`
    - Implement `getMyChildren(req, res)` — extracts userId (parentId) from auth, calls `parentMeService.getChildren(parentId)`, returns `{ success: true, data }`
    - Implement `getChildCourses(req, res)` — extracts parentId from auth, `childId` from `req.params`, calls `parentMeService.getChildCourses(parentId, childId, role)`, returns `{ success: true, data }`
    - Implement `getChildGrades(req, res)` — same pattern with `parentMeService.getChildGrades`
    - Implement `getChildAttendance(req, res)` — same pattern, parses date range query params, calls `parentMeService.getChildAttendance`
    - Wrap each handler in try/catch that calls `next(error)` for the global error handler
    - _Requirements: 4.1, 5.1, 6.1, 7.1, 8.2, 8.4, 8.6_

- [x] 6. Create parent self-service routes
  - [x] 6.1 Create `backend/src/routes/parentMeRoutes.ts`
    - Define Zod schemas: `childIdParamSchema` with required `childId` string, `dateRangeQuerySchema` with optional dates
    - `GET /me/children` → `authMiddleware` → `requireRoles('parent')` → `parentMeController.getMyChildren`
    - `GET /me/children/:childId/courses` → `authMiddleware` → `requireRoles('parent')` → `validateRequest({ params: childIdParamSchema })` → `parentMeController.getChildCourses`
    - `GET /me/children/:childId/grades` → `authMiddleware` → `requireRoles('parent')` → `validateRequest({ params: childIdParamSchema })` → `parentMeController.getChildGrades`
    - `GET /me/children/:childId/attendance` → `authMiddleware` → `requireRoles('parent')` → `validateRequest({ params: childIdParamSchema, query: dateRangeQuerySchema })` → `parentMeController.getChildAttendance`
    - Export default router
    - _Requirements: 4.3, 4.4, 5.5, 5.6, 6.6, 6.7, 7.5, 7.6_

- [x] 7. Register routes in application
  - [x] 7.1 Update `backend/src/routes/index.ts`
    - Add exports: `export { default as studentMeRoutes } from './studentMeRoutes.js';`
    - Add exports: `export { default as parentMeRoutes } from './parentMeRoutes.js';`
    - _Requirements: 1.1, 4.1_

  - [x] 7.2 Update `backend/src/server.ts`
    - Import `studentMeRoutes` and `parentMeRoutes` from routes index
    - Mount: `app.use('/api/students', studentMeRoutes);` (after existing studentRoutes mount)
    - Mount: `app.use('/api/parents', parentMeRoutes);`
    - _Requirements: 1.1, 4.1_

- [x] 8. Checkpoint — Verify compilation and route registration
  - Ensure `npx tsc --noEmit` passes with no type errors
  - Ensure all tests pass, ask the user if questions arise.

- [x]* 9. Write unit tests for studentMeService
  - [x]* 9.1 Create `backend/src/services/__tests__/studentMeService.test.ts`
    - Test `getCourses` returns only active enrollments for given studentId
    - Test `getCourses` returns empty array when no enrollments exist
    - Test `getGrades` groups marks by course correctly
    - Test `getAttendance` filters by date range
    - Test `getAttendance` returns all records when no date range provided
    - **Property 1: Student data isolation** — verify no records from other students leak
    - **Property 5: Course enrollment filter** — verify only active enrollments returned
    - **Property 6: Date range filter correctness** — verify all returned dates within range
    - _Requirements: 1.1, 1.4, 2.1, 2.5, 3.1, 3.3, 3.6_

- [x]* 10. Write unit tests for parentMeService
  - [x]* 10.1 Create `backend/src/services/__tests__/parentMeService.test.ts`
    - Test `getChildren` returns only students with active relations
    - Test `getChildren` returns empty array when no active relations
    - Test `getChildCourses` throws 403 when no active relation exists
    - Test `getChildCourses` throws 404 when child doesn't exist
    - Test `getChildGrades` returns marks grouped by course for linked child
    - Test `getChildAttendance` applies date range filter correctly
    - **Property 2: Parent access gate** — verify 403 for unlinked parent-child pairs
    - **Property 3: Empty result consistency** — verify empty array with 200 for no data
    - _Requirements: 4.1, 4.2, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4_

- [x]* 11. Write integration tests for API routes
  - [x]* 11.1 Create `backend/src/routes/__tests__/studentMeRoutes.test.ts`
    - Test auth middleware rejects unauthenticated requests (401)
    - Test RBAC rejects non-student roles (403)
    - Test successful course/grades/attendance retrieval
    - **Property 4: Response envelope consistency** — verify all responses have `{ success: true, data }` shape
    - _Requirements: 1.2, 1.3, 2.3, 2.4, 3.4, 3.5, 8.1, 8.3_

  - [x]* 11.2 Create `backend/src/routes/__tests__/parentMeRoutes.test.ts`
    - Test auth middleware rejects unauthenticated requests (401)
    - Test RBAC rejects non-parent roles (403)
    - Test parent access gate rejects unlinked children (403)
    - Test 404 for non-existent child
    - Test successful children/courses/grades/attendance retrieval
    - **Property 4: Response envelope consistency** — verify all responses have `{ success: true, data }` shape
    - _Requirements: 4.3, 4.4, 5.5, 5.6, 6.6, 6.7, 7.5, 7.6, 8.2, 8.4_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Run `npm test` in backend directory
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The student and parent services share the same query patterns (Enrollment → Mark/Attendance) — consider extracting shared helpers during implementation
- The `parentMeService` delegates access verification to the existing `authorizationService.assertParentAccess()` method
- Routes use `/me/` prefix to avoid collision with existing admin-facing student CRUD routes
