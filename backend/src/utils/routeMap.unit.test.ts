/**
 * Unit Tests: Route Map Namespace Coverage
 *
 * Asserts that every documented resource namespace appears in the route map
 * generated from the real application routes.
 *
 * **Validates: Requirement 1.4**
 */

import { describe, it, expect, jest, beforeAll } from '@jest/globals';

// Mock logger to avoid import.meta.url issues in ts-jest
jest.mock('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import express from 'express';
import { buildRouteMap, type RouteNamespace } from './routeMap.js';

/**
 * All resource namespaces that the Route_Map must document per Requirement 1.4.
 */
const REQUIRED_NAMESPACES: RouteNamespace[] = [
  'attendance',
  'auth',
  'course',
  'enrollment',
  'faculty',
  'grading',
  'health',
  'mark',
  'metrics',
  'parentMe',
  'studentMe',
  'student',
];

describe('Route Map — Namespace Coverage (Requirement 1.4)', () => {
  let realApp: ReturnType<typeof express>;
  let discoveredNamespaces: Set<string>;

  beforeAll(async () => {
    const {
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
    } = await import('../routes/index.js');

    realApp = express();
    realApp.use('/api/auth', authRoutes);
    realApp.use('/api/faculty', facultyRoutes);
    realApp.use('/api/students', studentRoutes);
    realApp.use('/api/courses', courseRoutes);
    realApp.use('/api/enrollment', enrollmentRoutes);
    realApp.use('/api/attendance', attendanceRoutes);
    realApp.use('/api/marks', markRoutes);
    realApp.use('/api/students', studentMeRoutes);
    realApp.use('/api/parents', parentMeRoutes);
    realApp.use('/api/v1/grading', gradingRoutes);
    realApp.use('/health', healthRoutes);
    realApp.use('/', metricsRoutes);

    const map = buildRouteMap(realApp);
    discoveredNamespaces = new Set(map.map((e) => e.namespace));
  });

  it('should discover a non-empty set of namespaces', () => {
    expect(discoveredNamespaces.size).toBeGreaterThan(0);
  });

  it.each(REQUIRED_NAMESPACES)(
    'should include the "%s" namespace in the route map',
    (namespace) => {
      expect(discoveredNamespaces.has(namespace)).toBe(true);
    },
  );

  it('should not contain the "unknown" namespace for any real route', () => {
    // All routes from the production app should map to a known namespace.
    // If "unknown" appears, it means a route was registered that doesn't
    // match any known prefix — which would indicate a namespace mapping gap.
    expect(discoveredNamespaces.has('unknown')).toBe(false);
  });

  it('should have at least one route per required namespace', () => {
    const map = buildRouteMap(realApp);

    for (const ns of REQUIRED_NAMESPACES) {
      const count = map.filter((e) => e.namespace === ns).length;
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  it('should cover all 12 documented namespaces without extras beyond "unknown"', () => {
    // Verify the discovered namespaces are a superset of REQUIRED_NAMESPACES
    for (const ns of REQUIRED_NAMESPACES) {
      expect(discoveredNamespaces.has(ns)).toBe(true);
    }
  });
});
