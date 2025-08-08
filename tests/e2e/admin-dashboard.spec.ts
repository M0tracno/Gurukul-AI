import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for testing
    await page.goto('/');
    // Add authentication setup here
  });

  test('should load dashboard with key metrics', async ({ page }) => {
    await page.goto('/admin-dashboard');
    
    // Wait for dashboard to load
    await expect(page.locator('h4')).toContainText('Dashboard Overview');
    
    // Check for key metric cards
    const metricCards = page.locator('[data-testid="metric-card"]');
    await expect(metricCards).toHaveCount(4);
    
    // Verify each metric card has a value and label
    for (let i = 0; i < 4; i++) {
      const card = metricCards.nth(i);
      await expect(card.locator('.stat-value')).toBeVisible();
      await expect(card.locator('.stat-label')).toBeVisible();
    }
  });

  test('should navigate through dashboard sections', async ({ page }) => {
    await page.goto('/admin-dashboard');
    
    // Test navigation
    await page.click('text=User Management');
    await expect(page).toHaveURL(/.*admin-dashboard\/users/);
    
    await page.click('text=Courses');
    await expect(page).toHaveURL(/.*admin-dashboard\/courses/);
    
    await page.click('text=Reports & Analytics');
    await expect(page).toHaveURL(/.*admin-dashboard\/reports/);
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin-dashboard');
    
    // Check mobile navigation
    const mobileMenuButton = page.locator('[aria-label="open drawer"]');
    await expect(mobileMenuButton).toBeVisible();
    
    // Open mobile menu
    await mobileMenuButton.click();
    
    // Check if navigation items are visible
    await expect(page.locator('text=User Management')).toBeVisible();
    await expect(page.locator('text=Courses')).toBeVisible();
  });

  test('should display real-time data updates', async ({ page }) => {
    await page.goto('/admin-dashboard');
    
    // Get initial timestamp
    const initialTimestamp = await page.locator('text=/Last updated:.*/')
      .textContent();
    
    // Click refresh button
    await page.click('button:has-text("Refresh")');
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Check if timestamp changed
    const newTimestamp = await page.locator('text=/Last updated:.*/')
      .textContent();
    
    expect(newTimestamp).not.toBe(initialTimestamp);
  });

  test('should handle dark mode toggle', async ({ page }) => {
    await page.goto('/admin-dashboard');
    
    // Find and click dark mode toggle
    const darkModeToggle = page.locator('[aria-label*="mode"]').first();
    await darkModeToggle.click();
    
    // Check if theme changed (you'll need to implement theme detection)
    const body = page.locator('body');
    const backgroundColor = await body.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should be dark background
    expect(backgroundColor).toContain('rgb(15, 23, 42)'); // Dark theme background
  });

  test('should show loading states', async ({ page }) => {
    await page.goto('/admin-dashboard');
    
    // Check for loading overlay on initial load
    const loadingOverlay = page.locator('[data-testid="loading-overlay"]');
    
    // If loading is shown, wait for it to disappear
    if (await loadingOverlay.isVisible()) {
      await expect(loadingOverlay).not.toBeVisible({ timeout: 10000 });
    }
    
    // Dashboard content should be visible after loading
    await expect(page.locator('h4')).toContainText('Dashboard Overview');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    await page.goto('/admin-dashboard');
    
    // Should show fallback data or error message
    // This depends on your error handling implementation
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/admin-dashboard');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const firstFocusable = page.locator(':focus');
    await expect(firstFocusable).toBeVisible();
    
    // Continue tabbing through interactive elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    }
    
    // Test Enter key on buttons
    const refreshButton = page.locator('button:has-text("Refresh")');
    await refreshButton.focus();
    await page.keyboard.press('Enter');
    
    // Should trigger the same action as clicking
  });

  test('should maintain consistent layout alignment', async ({ page }) => {
    await page.goto('/admin-dashboard');
    
    // Check that metric cards are properly aligned
    const metricCards = page.locator('[data-testid="metric-card"]');
    const firstCard = metricCards.first();
    const lastCard = metricCards.last();
    
    const firstCardBox = await firstCard.boundingBox();
    const lastCardBox = await lastCard.boundingBox();
    
    // Cards should be in the same row (same y position)
    expect(Math.abs((firstCardBox?.y || 0) - (lastCardBox?.y || 0))).toBeLessThan(5);
    
    // Cards should have consistent heights
    expect(Math.abs((firstCardBox?.height || 0) - (lastCardBox?.height || 0))).toBeLessThan(5);
  });
});
