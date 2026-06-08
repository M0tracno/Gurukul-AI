# Admin Login Fix Documentation

## Problem Summary
There was an issue with admin users being unable to log in, showing an "invalid email or password" error even with correct credentials.

## Root Causes Identified
1. **Password Verification Issue**: The passwords stored in the database were not being correctly verified during login.
2. **Role Field Issue**: Admin users needed the `role: 'admin'` field explicitly set, in addition to `isAdmin: true`.

## Solution Applied
1. Added the `role` field to the Faculty schema with an enum of ['faculty', 'admin']
2. Updated the pre-save hook to set role='admin' when isAdmin=true
3. Reset admin passwords directly in the database, bypassing problematic hooks
4. Enhanced the login route to better handle admin roles

## Admin Credentials
The following admin accounts are now working:

1. Regular Admin:
   - Email: `admin@gdc.edu`
   - Password: `gdc-admin-2023`
   - Role: `admin`

2. Super Admin:
   - Email: `superadmin@gdc.edu`
   - Password: `gdc-admin-2023`
   - Role: `admin`

## Verification Results
The login functionality for admin accounts has been tested and is now working correctly. Admin users can log in and access the dashboard.

## Fix Scripts Created
1. `fix-admin-accounts.js` - Updates admin accounts with the correct role field
2. `debug-admin-password.js` - Diagnoses password verification issues
3. `reset-admin-password-direct.js` - Resets admin passwords directly in the database

## Important Notes
- The authentication system validates users based on both the `role` field and `isAdmin` property
- The Faculty model schema has been updated to include a proper `role` field
- Do not use the pre-save middleware for password updates as it may cause issues

## Next Steps
- Consider updating your password management approach to avoid issues with custom pre-save hooks
- Add proper validation for admin role in all admin routes and middleware
- Make sure to keep these admin credentials secure
