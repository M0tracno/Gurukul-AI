import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Vite config for the visual regression test harness.
 * Serves the ComponentShowcase page in isolation for Playwright screenshots.
 */
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, '../../src/test/visual-regression'),
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
    },
  },
  server: {
    port: 4174,
    strictPort: true,
  },
  build: {
    outDir: resolve(__dirname, '../../dist-visual-test'),
    emptyOutDir: true,
  },
});
