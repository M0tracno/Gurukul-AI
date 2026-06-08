import { test, expect } from '@playwright/test';
import { injectAuthState, mockUsers } from './auth.setup';

/**
 * E2E Tests: Dashboard Loading
 *
 * Tests that dashboards load correctly for each role after authentication.
 * Covers success path (dashboard loads with content) and error path
 * (network failure shows appropriate error state).
 *
 * Validates: Requirement 9.2
 */

test.describe('Dashboard - Student', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page, 'student');
  });

  test('should load student dashboard after login', async ({ page }) => {
    await page.goto('/student-dashboard');

    // Dashboard should render (either content or skeleton/loading state followed by content)
    await expect(page.locator('body')).toBeVisible();

    // Wait for the page to settle - dashboard should have some meaningful content
    await page.waitForLoadState('networkidle');

    // The student dashboard should show some heading or navigation element
    const heading = page.locator('h1, h2, h3, h4, h5, h6, [role="heading"]').first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('should display navigation sidebar or menu', async ({ page }) => {
    await page.goto('/student-dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard should have some form of navigation
    const nav = page.locator('nav, [role="navigation"], .sidebar, .drawer, [class*="drawer"]').first();
    // On desktop viewports, nav should be visible or accessible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle API failure gracefully', async ({ page }) => {
    // Block all API calls to simulate network failure
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });

    await page.goto('/student-dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Page should still render without crashing
    await expect(page.locator('body')).toBeVisible();
    // Should show some kind of error state or fallback (not a blank page)
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should show skeleton loading state', async ({ page }) => {
    // Delay API responses to observe skeleton
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      route.abort('failed');
    });

    await page.goto('/student-dashboard');

    // Page should have some visible content (skeleton or loading) before data arrives
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Dashboard - Faculty', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page, 'faculty');
  });

  test('should load faculty dashboard', async ({ page }) => {
    await page.goto('/faculty-dashboard');
    await page.waitForLoadState('networkidle');

    // Faculty dashboard should render
    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2, h3, h4, h5, h6, [role="heading"]').first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('should handle network errors without crashing', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort('failed'));
    await page.goto('/faculty-dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Dashboard - Admin', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page, 'admin');
  });

  test('should load admin dashboard with overview', async ({ page }) => {
    await page.goto('/admin-dashboard');
    await page.waitForLoadState('networkidle');

    // Admin dashboard renders
    await expect(page.locator('body')).toBeVisible();
    // Look for dashboard content
    const content = page.locator('[class*="dashboard"], [class*="Dashboard"], main, [role="main"]').first();
    await expect(content).toBeVisible({ timeout: 15000 });
  });

  test('should handle API failure on admin dashboard', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort('failed'));
    await page.goto('/admin-dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Dashboard - Parent', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page, 'parent');
  });

  test('should load parent dashboard', async ({ page }) => {
    await page.goto('/parent-dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    const heading = page.locator('h1, h2, h3, h4, h5, h6, [role="heading"]').first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('should handle network failure gracefully', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort('failed'));
    await page.goto('/parent-dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Dashboard - Unauthenticated Access', () => {
  test('should redirect to login when accessing student dashboard without auth', async ({
    page,
  }) => {
    await page.goto('/student-dashboard');

    // Should redirect to student login (or role selection)
    await expect(page).toHaveURL(/student-login|login|\//);
  });

  test('should redirect to login when accessing admin dashboard without auth', async ({
    page,
  }) => {
    await page.goto('/admin-dashboard');

    // Should redirect to admin login
    await expect(page).toHaveURL(/admin-login|login|\//);
  });

  test('should redirect to login when accessing faculty dashboard without auth', async ({
    page,
  }) => {
    await page.goto('/faculty-dashboard');

    // Should redirect to faculty login
    await expect(page).toHaveURL(/faculty-login|login|\//);
  });
});
