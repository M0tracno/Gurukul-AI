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
    - Replace `background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'` with dark theme background
    - Replace `background: 'rgba(255, 255, 255, 0.95)'` card backgrounds with glassmorphism dark style
    - Replace `background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'` header with theme-aware gradient
    - Use `useTheme()` for colors instead of hardcoded hex values
    - Ensure text colors use `theme.palette.text.primary/secondary`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.2 Redesign StudentDashboard.js with dark cinematic theme
    - Remove all inline light-theme colors and white backgrounds
    - Apply dark glassmorphism card styling (semi-transparent dark bg, blur, subtle borders)
    - Use theme palette colors for accents and text
    - Match the dark cinematic style of the login pages (#0a0a0f background, neon accents)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.3 Redesign ParentDashboard.js with dark cinematic theme
    - Remove all inline light-theme colors and white backgrounds
    - Apply dark glassmorphism card styling
    - Use theme palette colors for accents and text
    - Match the dark cinematic style consistently
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.4 Verify AdminDashboard.tsx theme consistency
    - AdminDashboard already uses dark colors/FrostedCard — verify no remaining light-theme artifacts
    - Fix any remaining hardcoded light colors if found
    - Ensure consistent look with the other redesigned dashboards
    - _Requirements: 4.1, 4.2_

- [ ] 3. Build verification and git push
  - [x] 3.1 Verify TypeScript compilation of backend changes
    - Run `npx tsc --noEmit` in backend directory to confirm no type errors
    - Fix any compilation errors
    - _Requirements: 1.1, 2.1, 3.1_

  - [-] 3.2 Commit and push all changes to main
    - Stage all modified/new files with `git add .`
    - Commit with message: "feat: add missing auth routes and redesign dashboards with dark cinematic theme"
    - Push to origin main with `--no-verify` flag
    - _Requirements: 5.1, 5.2_
