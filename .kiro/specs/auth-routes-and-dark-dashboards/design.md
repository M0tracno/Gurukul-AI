# Design: Auth Routes & Dark Cinematic Dashboards

## Overview
Add missing auth endpoints that the frontend AuthContext.js already calls, and redesign all 4 dashboard pages to use the dark cinematic theme consistently with the login pages.

## Component 1: Auth Controller Extensions (backend/src/controllers/authController.ts)

### GET /api/auth/me
- Use existing `authMiddleware` to extract JWT
- Read `userId` and `role` from the authenticated request
- Look up user in appropriate model (Student/Faculty/Parent) based on role
- Return user object without password field

### POST /api/auth/register/student
- Validate required fields: email, password, firstName, lastName, studentId, grade
- Check if email already exists in Student model
- Create student (model pre-save hook handles password hashing)
- Return created user info

### POST /api/auth/register/faculty
- Same pattern as student but for Faculty model
- Required fields: email, password, firstName, lastName, employeeId, department
- Default role to 'faculty'

### POST /api/auth/parent/login
- Reuse existing login logic but force userType to 'parent'

### POST /api/auth/parent/send-otp
- Look up parent by phoneNumber
- Generate a 6-digit OTP, store with TTL (5 min) in-memory or in the parent document
- Return otpId for verification

### POST /api/auth/parent/verify-otp
- Validate OTP against stored value
- If valid, generate JWT token pair for the parent
- Return token and parent data

## Component 2: Auth Routes (backend/src/routes/authRoutes.ts)
- Add Zod schemas for each new endpoint
- Wire routes with appropriate middleware (authMiddleware for /me, validateRequest for others)

## Component 3: Dashboard Theme Redesign

### Strategy
Replace all inline hardcoded light colors with theme-aware values. The MUI theme (`createEnhancedTheme.js`) is already configured for dark mode. The dashboards override it with inline `sx` props using light hex colors.

### Changes per dashboard:
1. **AdminDashboard.tsx** — Already uses `colors` from designTokens and dark-style FrostedCard. Minimal changes needed (it's mostly dark already).
2. **FacultyDashboard.js** — Replace:
   - `background: 'rgba(255, 255, 255, 0.95)'` → glassmorphism dark
   - `background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'` → theme gradient  
   - `background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'` → dark background
   - Remove `styled(Card)` white backgrounds
3. **StudentDashboard.js** — Same pattern: replace light backgrounds, white cards
4. **ParentDashboard.js** — Same pattern

### Color mapping:
| Old (light) | New (dark cinematic) |
|---|---|
| `#f5f7fa`, `#c3cfe2` backgrounds | `theme.palette.background.default` (#0a0a0f) |
| `rgba(255, 255, 255, 0.95)` cards | `rgba(255, 255, 255, 0.03)` with blur |
| `#667eea` accent | `theme.palette.primary.main` (#a78bfa) |
| Dark text `#2d3748` | `theme.palette.text.primary` (white 95%) |
| Card shadows light | Dark shadows with higher opacity |

## Component 4: Git Push
- Stage all modified files
- Commit with message: "feat: add missing auth routes and redesign dashboards with dark cinematic theme"
- Push to main with --no-verify
