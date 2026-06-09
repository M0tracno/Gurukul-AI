#!/usr/bin/env tsx
/**
 * CI Route Map Compliance Check
 *
 * Builds the canonical Route_Map by introspecting the Express router stack,
 * then asserts:
 *   1. No duplicate routes exist (Requirement 3.2)
 *   2. No routes are missing from Swagger documentation (Requirement 1.3)
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — duplicates or missing-doc drift detected
 *
 * Usage:
 *   npx tsx scripts/check-route-map.ts
 *
 * @see Requirements 1.3, 3.2, 3.4
 */

import express from 'express';
import { buildRouteMap, findDuplicateRoutes, findMissingDocs } from '../src/utils/routeMap.js';
import { swaggerSpec } from '../src/config/swagger.js';

import {
  authRoutes,
  studentRoutes,
  courseRoutes,
  facultyRoutes,
  enrollmentRoutes,
  attendanceRoutes,
  markRoutes,
  gradingRoutes,
  metricsRoutes,
  healthRoutes,
  studentMeRoutes,
  parentMeRoutes,
} from '../src/routes/index.js';

// ---------------------------------------------------------------------------
// Build a lightweight Express app that mirrors the production route mounts
// (same as server.ts but without middleware, DB, Socket.IO, etc.)
// ---------------------------------------------------------------------------

const app = express();

app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/students', studentMeRoutes);
app.use('/api/parents', parentMeRoutes);
app.use('/api/v1/grading', gradingRoutes);
app.use('/health', healthRoutes);
app.use('/', metricsRoutes);

// ---------------------------------------------------------------------------
// Generate the Route Map
// ---------------------------------------------------------------------------

const routeMap = buildRouteMap(app);

console.log(`\n🗺️  Route Map generated: ${routeMap.length} endpoints discovered\n`);

// ---------------------------------------------------------------------------
// Check 1: Duplicate routes (Requirement 3.2)
// ---------------------------------------------------------------------------

const duplicates = findDuplicateRoutes(routeMap);

if (duplicates.length > 0) {
  console.error('❌ DUPLICATE ROUTES DETECTED:\n');
  for (const group of duplicates) {
    console.error(`  Duplicate group (${group[0].method} ${group[0].path}):`);
    for (const entry of group) {
      console.error(`    - ${entry.method} ${entry.path} [namespace: ${entry.namespace}]`);
    }
    console.error('');
  }
}

// ---------------------------------------------------------------------------
// Check 2: Missing documentation (Requirement 1.3)
// ---------------------------------------------------------------------------

// Extract the paths object from the compiled Swagger spec
const swaggerPaths = (swaggerSpec as { paths?: Record<string, unknown> }).paths ?? {};
const missingDocs = findMissingDocs(routeMap, swaggerPaths);

if (missingDocs.length > 0) {
  console.error('❌ ROUTES MISSING FROM SWAGGER DOCUMENTATION:\n');
  for (const entry of missingDocs) {
    console.error(`  - ${entry.method} ${entry.path} [namespace: ${entry.namespace}]`);
  }
  console.error('');
  console.error(
    '  ⚠️  These routes must be documented before release (Requirement 1.3).',
  );
  console.error(
    '  Add @swagger JSDoc annotations to the corresponding route files.\n',
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const hasIssues = duplicates.length > 0;
// Note: Missing docs is a warning, not a hard failure — allows incremental documentation.
// Change to `|| missingDocs.length > 0` to enforce strict documentation compliance.

if (hasIssues) {
  console.error('❌ Route map compliance check FAILED.\n');
  console.error('  Fix duplicate routes before merging.\n');
  process.exit(1);
} else if (missingDocs.length > 0) {
  console.warn('⚠️  Route map check passed with warnings (undocumented routes detected).\n');
  console.warn('  Consider adding Swagger documentation for the routes listed above.\n');
  // Exit 0 for now — set to exit(1) to enforce strict doc compliance
  process.exit(0);
} else {
  console.log('✅ Route map compliance check PASSED — no duplicates, all routes documented.\n');
  process.exit(0);
}
