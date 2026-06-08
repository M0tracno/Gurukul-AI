# Requirements: Auth Routes & Dark Cinematic Dashboards

## Requirement 1: GET /api/auth/me endpoint
### User Story
As a logged-in user, I want my session to be verified on page load so my dashboard loads with fresh user data.

### Acceptance Criteria
- 1.1 GET /api/auth/me requires a valid JWT Bearer token in the Authorization header
- 1.2 Returns 200 with `{ user: { id, email, firstName, lastName, role } }` when token is valid
- 1.3 Returns 401 when token is missing, expired, or malformed
- 1.4 Looks up the user from the correct model (Student, Faculty, Parent) based on the token's role claim

## Requirement 2: Student and Faculty registration endpoints
### User Story
As a new user, I want to register an account so I can access the platform.

### Acceptance Criteria
- 2.1 POST /api/auth/register/student creates a new student with email, password, firstName, lastName, studentId, grade
- 2.2 POST /api/auth/register/faculty creates a new faculty with email, password, firstName, lastName, employeeId, department
- 2.3 Returns 201 with `{ success: true, message, user: { id, email, firstName, lastName, role } }` on success
- 2.4 Returns 400 if email already exists or required fields are missing
- 2.5 Passwords are hashed via the model's pre-save hook (bcrypt cost 12)

## Requirement 3: Parent OTP authentication endpoints
### User Story
As a parent, I want to authenticate via OTP sent to my phone number so I can access my ward's data.

### Acceptance Criteria
- 3.1 POST /api/auth/parent/send-otp accepts `{ phoneNumber, studentId }` and returns `{ success: true, otpId, message }`
- 3.2 POST /api/auth/parent/verify-otp accepts `{ phoneNumber, otp, otpId }` and returns `{ token, parent }` on success
- 3.3 Returns 404 if no parent is found with the given phone number linked to the student
- 3.4 Returns 400 for invalid or expired OTP
- 3.5 POST /api/auth/parent/login accepts `{ email, password, role: 'parent' }` and works like the standard login

## Requirement 4: Dark cinematic dashboard theme
### User Story
As a user, I want all dashboard pages to match the dark cinematic login theme so the UI feels cohesive.

### Acceptance Criteria
- 4.1 All 4 dashboard pages (Admin, Faculty, Student, Parent) use the dark theme background (#0a0a0f base)
- 4.2 Remove all hardcoded light-theme colors (white backgrounds, light gradients like #f5f7fa, #c3cfe2)
- 4.3 Use theme-aware colors via `useTheme()` or MUI's `theme.palette` instead of inline hex values
- 4.4 Cards use glassmorphism style: semi-transparent dark backgrounds with backdrop-filter blur and subtle borders
- 4.5 Accent colors use the purple/blue/cyan/green neon palette from the existing design tokens
- 4.6 Text colors use theme.palette.text.primary/secondary (white with opacity) instead of dark text

## Requirement 5: Push changes to remote
### User Story
As a developer, I want the changes pushed to the main branch so they're deployed.

### Acceptance Criteria
- 5.1 All changes are committed with a descriptive message
- 5.2 Push to origin/main with --no-verify flag to skip pre-commit hooks
