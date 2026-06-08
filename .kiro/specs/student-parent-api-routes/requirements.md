# Requirements Document

## Introduction

This feature adds backend API routes for the student-facing and parent-facing dashboards in the Gurukul AI education platform. Currently, the frontend dashboards display mock data. These new endpoints will provide real data by querying the existing Enrollment, Mark, Attendance, Course, and ParentStudentRelation collections. All endpoints enforce JWT authentication and role-based access control to ensure students can only view their own records and parents can only view data for their linked children (wards).

## Glossary

- **Student_API**: The set of Express route handlers mounted under `/api/students/me/` that serve authenticated student data
- **Parent_API**: The set of Express route handlers mounted under `/api/parents/me/` that serve authenticated parent data
- **Auth_Middleware**: The existing JWT authentication middleware that extracts `userId` and `role` from the Bearer token and attaches them to the request
- **RBAC_Middleware**: The existing role-based access control middleware that restricts route access to specified roles
- **Authorization_Service**: The existing service-layer authorization module that verifies data ownership (student self-access, parent-ward linkage)
- **Enrollment**: A document linking a Student to a Course with status and grade fields
- **Mark**: A document representing an assessment score tied to an Enrollment
- **Attendance**: A document recording presence status for a specific Enrollment on a specific date
- **ParentStudentRelation**: A document linking a Parent to a Student with an `isActive` flag, stored in the `parent_student_relations` collection
- **Ward**: A student linked to a parent via a ParentStudentRelation record

## Requirements

### Requirement 1: Student Course Retrieval

**User Story:** As a student, I want to view my enrolled courses, so that I can see what subjects I am currently taking.

#### Acceptance Criteria

1. WHEN an authenticated student requests their courses, THE Student_API SHALL return all Enrollment records for that student with status "active" and populate the associated Course details
2. IF an unauthenticated request is made to the student courses endpoint, THEN THE Auth_Middleware SHALL reject the request with HTTP 401
3. IF a non-student role requests the student courses endpoint, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403
4. WHEN no active enrollments exist for the student, THE Student_API SHALL return an empty array with HTTP 200

### Requirement 2: Student Grades Retrieval

**User Story:** As a student, I want to view my grades and assessment scores, so that I can track my academic performance.

#### Acceptance Criteria

1. WHEN an authenticated student requests their grades, THE Student_API SHALL return all Mark records associated with the student's Enrollment records, grouped by course
2. THE Student_API SHALL populate the related Course name and the assessment title, type, score, maxScore, and percentage for each Mark
3. IF an unauthenticated request is made to the student grades endpoint, THEN THE Auth_Middleware SHALL reject the request with HTTP 401
4. IF a non-student role requests the student grades endpoint, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403
5. WHEN no marks exist for the student, THE Student_API SHALL return an empty array with HTTP 200

### Requirement 3: Student Attendance Retrieval

**User Story:** As a student, I want to view my attendance records, so that I can monitor my attendance across all courses.

#### Acceptance Criteria

1. WHEN an authenticated student requests their attendance, THE Student_API SHALL return all Attendance records associated with the student's Enrollment records
2. THE Student_API SHALL populate the related Course name and include the date, status, and notes for each Attendance record
3. WHEN a date range query parameter is provided, THE Student_API SHALL filter attendance records to only include dates within the specified range
4. IF an unauthenticated request is made to the student attendance endpoint, THEN THE Auth_Middleware SHALL reject the request with HTTP 401
5. IF a non-student role requests the student attendance endpoint, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403
6. WHEN no attendance records exist for the student, THE Student_API SHALL return an empty array with HTTP 200

### Requirement 4: Parent Children Retrieval

**User Story:** As a parent, I want to view my linked children, so that I can see which students I have access to monitor.

#### Acceptance Criteria

1. WHEN an authenticated parent requests their children, THE Parent_API SHALL return all Student records linked via active ParentStudentRelation documents for that parent
2. THE Parent_API SHALL return each child's firstName, lastName, studentId, grade, and active status
3. IF an unauthenticated request is made to the parent children endpoint, THEN THE Auth_Middleware SHALL reject the request with HTTP 401
4. IF a non-parent role requests the parent children endpoint, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403
5. WHEN no active ParentStudentRelation records exist for the parent, THE Parent_API SHALL return an empty array with HTTP 200

### Requirement 5: Parent Child Grades Retrieval

**User Story:** As a parent, I want to view my child's grades, so that I can monitor their academic progress.

#### Acceptance Criteria

1. WHEN an authenticated parent requests grades for a specific child, THE Parent_API SHALL return all Mark records associated with that child's Enrollment records, grouped by course
2. WHEN an authenticated parent requests grades for a child, THE Authorization_Service SHALL verify that an active ParentStudentRelation exists between the parent and the specified child
3. IF no active ParentStudentRelation exists between the parent and the specified child, THEN THE Authorization_Service SHALL reject the request with HTTP 403
4. IF the specified child ID does not correspond to a valid Student document, THEN THE Parent_API SHALL return HTTP 404
5. IF an unauthenticated request is made to the parent child grades endpoint, THEN THE Auth_Middleware SHALL reject the request with HTTP 401
6. IF a non-parent role requests the parent child grades endpoint, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403

### Requirement 6: Parent Child Attendance Retrieval

**User Story:** As a parent, I want to view my child's attendance records, so that I can ensure they are attending classes regularly.

#### Acceptance Criteria

1. WHEN an authenticated parent requests attendance for a specific child, THE Parent_API SHALL return all Attendance records associated with that child's Enrollment records
2. WHEN an authenticated parent requests attendance for a child, THE Authorization_Service SHALL verify that an active ParentStudentRelation exists between the parent and the specified child
3. IF no active ParentStudentRelation exists between the parent and the specified child, THEN THE Authorization_Service SHALL reject the request with HTTP 403
4. IF the specified child ID does not correspond to a valid Student document, THEN THE Parent_API SHALL return HTTP 404
5. WHEN a date range query parameter is provided, THE Parent_API SHALL filter attendance records to only include dates within the specified range
6. IF an unauthenticated request is made to the parent child attendance endpoint, THEN THE Auth_Middleware SHALL reject the request with HTTP 401
7. IF a non-parent role requests the parent child attendance endpoint, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403

### Requirement 7: Parent Child Courses Retrieval

**User Story:** As a parent, I want to view my child's enrolled courses, so that I can understand their current academic schedule.

#### Acceptance Criteria

1. WHEN an authenticated parent requests courses for a specific child, THE Parent_API SHALL return all Enrollment records for that child with status "active" and populate the associated Course details
2. WHEN an authenticated parent requests courses for a child, THE Authorization_Service SHALL verify that an active ParentStudentRelation exists between the parent and the specified child
3. IF no active ParentStudentRelation exists between the parent and the specified child, THEN THE Authorization_Service SHALL reject the request with HTTP 403
4. IF the specified child ID does not correspond to a valid Student document, THEN THE Parent_API SHALL return HTTP 404
5. IF an unauthenticated request is made to the parent child courses endpoint, THEN THE Auth_Middleware SHALL reject the request with HTTP 401
6. IF a non-parent role requests the parent child courses endpoint, THEN THE RBAC_Middleware SHALL reject the request with HTTP 403

### Requirement 8: Response Format Consistency

**User Story:** As a frontend developer, I want consistent API response structures, so that I can build reliable data-fetching logic in the dashboards.

#### Acceptance Criteria

1. THE Student_API SHALL wrap all successful responses in an object with `success: true` and a `data` field containing the result
2. THE Parent_API SHALL wrap all successful responses in an object with `success: true` and a `data` field containing the result
3. WHEN an error occurs, THE Student_API SHALL return a JSON response with `success: false` and a descriptive `message` field
4. WHEN an error occurs, THE Parent_API SHALL return a JSON response with `success: false` and a descriptive `message` field
5. THE Student_API SHALL use the existing global error handler for unexpected errors
6. THE Parent_API SHALL use the existing global error handler for unexpected errors
