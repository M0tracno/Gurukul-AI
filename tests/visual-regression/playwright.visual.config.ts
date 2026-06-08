import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Playwright configuration for visual regression tests.
 *
 * Runs component-level screenshot comparison tests against the shared
 * UI component library (DataTable, FormFields, Buttons, Skeletons).
 *
 * Uses a dedicated Vite dev server that renders the ComponentShowcase
 * page in isolation for deterministic screenshot capture.
 *
 * Validates: Requirements 9.5
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: '../../test-results/visual-regression-report' }]],

  use: {
    baseURL: 'http://localhost:4174',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  expect: {
    toHaveScreenshot: {
      // 0.1% maximum allowable pixel diff threshold before failing
      maxDiffPixelRatio: 0.001,
      // Disable animations for consistent snapshots
      animations: 'disabled',
    },
  },

  projects: [
    {
      name: 'visual-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer: {
    command: `npx vite --config "${resolve(__dirname, 'vite.visual.config.ts')}" --port 4174`,
    port: 4174,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    cwd: resolve(__dirname, '../../'),
  },

  /* Snapshot storage */
  snapshotDir: './snapshots',
  outputDir: '../../test-results/visual-regression',
});
