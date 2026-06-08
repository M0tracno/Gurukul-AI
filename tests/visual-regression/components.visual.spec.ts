import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for Component Library
 *
 * Tests all shared UI components (DataTable, FormFields, Buttons, Skeletons)
 * using Playwright screenshot comparison with a maximum allowable pixel diff
 * threshold of 0.1% (maxDiffPixelRatio: 0.001) before failing.
 *
 * Validates: Requirements 9.5
 */

test.describe('Component Library Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for all components to render
    await page.waitForSelector('#section-datatable');
    // Disable animations via CSS for deterministic screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
        .MuiSkeleton-root {
          animation: none !important;
        }
      `,
    });
    // Allow MUI components to finish rendering
    await page.waitForTimeout(500);
  });

  // ---------------------------------------------------------------------------
  // DataTable Component
  // ---------------------------------------------------------------------------

  test.describe('DataTable', () => {
    test('default state with data renders consistently', async ({ page }) => {
      const element = page.locator('#datatable-default');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('datatable-default.png');
    });

    test('empty state renders consistently', async ({ page }) => {
      const element = page.locator('#datatable-empty');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('datatable-empty.png');
    });

    test('loading state renders consistently', async ({ page }) => {
      const element = page.locator('#datatable-loading');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('datatable-loading.png');
    });
  });

  // ---------------------------------------------------------------------------
  // Buttons Component
  // ---------------------------------------------------------------------------

  test.describe('Buttons', () => {
    test('button variants render consistently', async ({ page }) => {
      const element = page.locator('#buttons-variants');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('buttons-variants.png');
    });

    test('button sizes render consistently', async ({ page }) => {
      const element = page.locator('#buttons-sizes');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('buttons-sizes.png');
    });

    test('button states (disabled, loading) render consistently', async ({ page }) => {
      const element = page.locator('#buttons-states');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('buttons-states.png');
    });

    test('icon buttons render consistently', async ({ page }) => {
      const element = page.locator('#buttons-icon');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('buttons-icon.png');
    });
  });

  // ---------------------------------------------------------------------------
  // FormFields Component
  // ---------------------------------------------------------------------------

  test.describe('FormFields', () => {
    test('text fields render consistently', async ({ page }) => {
      const element = page.locator('#formfields-textfield');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('formfields-textfield.png');
    });

    test('select fields render consistently', async ({ page }) => {
      const element = page.locator('#formfields-select');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('formfields-select.png');
    });
  });

  // ---------------------------------------------------------------------------
  // Skeleton Loaders Component
  // ---------------------------------------------------------------------------

  test.describe('Skeletons', () => {
    test('dashboard skeleton renders consistently', async ({ page }) => {
      const element = page.locator('#skeleton-dashboard');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('skeleton-dashboard.png');
    });

    test('table skeleton renders consistently', async ({ page }) => {
      const element = page.locator('#skeleton-table');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('skeleton-table.png');
    });

    test('form skeleton renders consistently', async ({ page }) => {
      const element = page.locator('#skeleton-form');
      await expect(element).toBeVisible();
      await expect(element).toHaveScreenshot('skeleton-form.png');
    });
  });

  // ---------------------------------------------------------------------------
  // Full Page Regression
  // ---------------------------------------------------------------------------

  test.describe('Full Page', () => {
    test('complete component showcase page renders consistently', async ({ page }) => {
      await expect(page).toHaveScreenshot('full-component-showcase.png', {
        fullPage: true,
      });
    });
  });
});
