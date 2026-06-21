/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.d.ts',
        'src/test/**',
        'src/vite-env.d.ts',
        // Non-executable / declaration-only files: barrels, type modules,
        // Storybook stories, and pure data models contribute 0% executable
        // coverage and only skew the global numbers.
        'src/**/index.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/**/types.ts',
        'src/**/types/**',
        'src/**/models.ts',
      ],
      // NOTE: These thresholds are a regression *baseline* (a ratchet), not a
      // target. They reflect the current measured coverage of a large legacy
      // surface (e.g. AdminDashboard, LandingPage) that is still untested.
      // Raise them over time as coverage improves; never lower them.
      thresholds: {
        branches: 70,
        functions: 48,
        lines: 38,
        statements: 38,
      },
    },
  },
});
