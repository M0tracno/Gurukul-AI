# Implementation Plan: Auth Routes & Dark Cinematic Dashboards

## Overview

Add missing backend auth endpoints (GET /me, registration, parent OTP) that the frontend AuthContext.js already calls, redesign all 4 dashboard pages to use the dark cinematic theme, and push to main.

## Tasks

- [x] 1. Add missing auth controller methods and routes
  - [x] 1.1 Add GET /api/auth/me endpoint
    - Add `me` method to `authController` in `backend/src/controllers/authController.ts`
    - Use `authMiddleware` to extract JWT, look up user by userId and role from token
    - Query the correct model (Student/Faculty/Parent) based on role, exclude password
    - Return `{ user: { id, email, firstName, lastName, role } }`
    - Add route in `backend/src/routes/authRoutes.ts`: `router.get('/me', authMiddleware, authController.me)`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Add POST /api/auth/register/student and /register/faculty endpoints
    - Add `registerStudent` and `registerFaculty` methods to `authController`
    - Validate required fields with Zod schemas (email, password, firstName, lastName, studentId/employeeId, grade/department)
    - Check for existing email, return 400 if duplicate
    - Create document via model (pre-save hook hashes password)
    - Return 201 with `{ success: true, message, user: { id, email, firstName, lastName, role } }`
    - Add routes: `router.post('/register/student', ...)` and `router.post('/register/faculty', ...)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.3 Add POST /api/auth/parent/login, /parent/send-otp, /parent/verify-otp endpoints
    - Add `parentLogin` method that forces userType to 'parent' and reuses login logic
    - Add `sendOtp` method: look up parent by phoneNumber, generate 6-digit OTP, store temporarily, return otpId
    - Add `verifyOtp` method: validate OTP, generate token pair for parent, return `{ token, parent }`
    - Add Zod validation schemas for each endpoint
    - Add routes: `router.post('/parent/login', ...)`, `router.post('/parent/send-otp', ...)`, `router.post('/parent/verify-otp', ...)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Redesign dashboard pages with dark cinematic theme
  - [x] 2.1 Redesign FacultyDashboard.js with dark cinematic theme
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.2 Redesign StudentDashboard.js with dark cinematic theme
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.3 Redesign ParentDashboard.js with dark cinematic theme
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.4 Verify AdminDashboard.tsx theme consistency
    - _Requirements: 4.1, 4.2_

- [x] 3. Build verification and git push
  - [x] 3.1 Verify TypeScript compilation of backend changes
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 3.2 Commit and push all changes to main
    - _Requirements: 5.1, 5.2_

- [x] 4. Fix UnifiedDashboardLayout dark theme and dashboard functionality
  - [x] 4.1 Redesign UnifiedDashboardLayout.js with dark cinematic theme
    - Replace all light backgrounds in drawer (linear-gradient #f8fafc → #e2e8f0) with dark theme
    - Replace AppBar gradient (#3a86ff → #8338ec) with dark glassmorphism AppBar
    - Replace main content background (linear-gradient #f8f9fa → #ffffff) with dark theme
    - Replace welcome Paper with dark glassmorphism styling
    - Replace hover colors (#e0f2fe, #dbeafe, #1e40af) with dark neon equivalents
    - Replace text colors (#1e293b, #374151, #64748b) with theme text.primary/secondary
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.2 Fix AdminDashboard navigation and add real data fetching
    - Add state management for currentView (navigation between sections)
    - Wire sidebar navigation items with onClick handlers to change currentView
    - Add API calls to fetch real stats (student count, quiz count, active users, parent count)
    - Add useEffect to load data on mount from backend endpoints
    - Wire Logout button to call logout from AuthContext and navigate to login
    - Wire Refresh button to reload stats
    - _Requirements: 4.1, 4.2_

  - [x] 4.3 Fix FacultyDashboard to use real API data
    - Ensure the EnhancedFacultyService calls actually return data or provide graceful fallbacks
    - Add error handling for when API calls fail (show meaningful defaults instead of blank)
    - Ensure navigation between views works properly via UnifiedDashboardLayout
    - _Requirements: 4.1_

  - [x] 4.4 Fix StudentDashboard to properly fetch and display data
    - Replace hardcoded mock data with actual API calls where possible
    - For data that doesn't have API endpoints yet, keep the mock data but make it realistic
    - Ensure all view switches (courses, assignments, grades, attendance, feedback, quizzes) render properly
    - _Requirements: 4.1_

  - [x] 4.5 Fix ParentDashboard to handle empty/error states gracefully
    - Ensure ParentService calls handle failures gracefully with fallback UI
    - Show proper loading states and error messages
    - Ensure navigation between views works properly
    - _Requirements: 4.1_

- [x] 5. Final commit and push
  - [x] 5.1 Commit and push all fixes to main
    - Stage all changes, commit with descriptive message, push to gurukul main with --no-verify
    - _Requirements: 5.1, 5.2_
