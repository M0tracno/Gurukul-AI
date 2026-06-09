// Jest configuration (ESM .mjs so it loads without a TypeScript loader).
// Using .ts here requires ts-node, which is not a project dependency and
// is absent after a clean `npm ci` in CI — see the "ts-node is required"
// failure. A plain ESM config avoids that entirely.

/** @type {import('jest').Config} */
const config = {
  // ESM support for TypeScript
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],

  // Use ts-jest with ESM
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
        diagnostics: false,
      },
    ],
  },

  // Path alias mapping for @src/* and .js → .ts resolution for ESM imports
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/scripts/**/*.test.ts',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 60,
      lines: 65,
      statements: 65,
    },
  },

  // Run tests sequentially to avoid Mongoose singleton collisions
  maxWorkers: 1,

  // Timeout for async tests (increased for sequential execution)
  testTimeout: 15000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
};

export default config;
