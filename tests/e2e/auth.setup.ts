import { test as setup, expect } from '@playwright/test';

/**
 * Authentication setup for E2E tests.
 *
 * Sets localStorage-based auth state so that subsequent tests
 * can skip login steps when testing authenticated flows.
 *
 * The app uses mock auth in dev/demo mode, so we simulate that
 * by setting the expected localStorage values directly.
 */

// Shared mock user data matching AuthContext mock login responses
export const mockUsers = {
  student: {
    id: 'mock-student-id',
    name: 'Arjun',
    email: 'student@gurukul.test',
    role: 'student',
    permissions: ['view', 'edit'],
    verified: true,
  },
  faculty: {
    id: 'mock-faculty-id',
    name: 'Dronacharya',
    email: 'faculty@gurukul.test',
    role: 'faculty',
    permissions: ['view', 'edit'],
    verified: true,
  },
  parent: {
    id: 'mock-parent-id',
    name: 'Gandhari',
    email: 'parent@gurukul.test',
    role: 'parent',
    permissions: ['view', 'edit'],
    verified: true,
  },
  admin: {
    id: 'mock-admin-id',
    name: 'Krishna Admin',
    email: 'admin@gurukul.test',
    role: 'admin',
    permissions: ['view', 'edit'],
    verified: true,
  },
};

/**
 * Helper: injects auth state into localStorage via page context.
 * Use inside a test to bypass the login form.
 */
export async function injectAuthState(
  page: import('@playwright/test').Page,
  role: keyof typeof mockUsers,
) {
  const user = mockUsers[role];
  const token = `mock-jwt-token-${role}-e2e-${Date.now()}`;

  await page.addInitScript(
    ({ token, userData }) => {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
    },
    { token, userData: user },
  );
}
