/**
 * Route-map security verification suite (Task 14.1).
 *
 * Fail-closed verification that every admin-management endpoint for students,
 * faculty, courses, and enrollments is wired with BOTH:
 *   1. `authMiddleware` in its middleware chain (Requirements 3.1, 3.4, 3.5), and
 *   2. RBAC role enforcement that includes the `admin` role on every
 *      create/update/delete (POST/PUT/DELETE) student/faculty endpoint
 *      (Requirements 3.2, 3.3).
 *
 * The suite enumerates the real route stack via `buildRouteMap(app)` over an
 * in-memory Express app that mounts the production routers at their real mount
 * paths. It FAILS if any admin-management route is missing either middleware,
 * surfacing the placeholder security gap before deploy.
 *
 * The public account-setup route (`POST /api/account-setup/:token`) is
 * intentionally NOT mounted here and is excluded from these assertions — the
 * token itself is the credential, so it carries neither auth nor RBAC.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import { describe, it, expect, beforeAll, jest } from '@jest/globals';

// Mock logger to avoid import.meta.url issues under ts-jest ESM.
jest.mock('../../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import express, { type Express, type Router } from 'express';
import { buildRouteMap, type RouteMapEntry, type RouteNamespace } from '../../utils/routeMap.js';

// Dynamic imports after the logger mock is registered.
const { default: studentRoutes } = await import('../studentRoutes.js');
const { default: facultyRoutes } = await import('../facultyRoutes.js');
const { default: courseRoutes } = await import('../courseRoutes.js');
const { default: enrollmentRoutes } = await import('../enrollmentRoutes.js');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Namespaces whose endpoints are Admin_Management_Endpoints. */
const ADMIN_MANAGEMENT_NAMESPACES: RouteNamespace[] = [
  'student',
  'faculty',
  'course',
  'enrollment',
];

/** Namespaces whose write endpoints must enforce the `admin` role. */
const ADMIN_WRITE_NAMESPACES: RouteNamespace[] = ['student', 'faculty'];

/** Methods that constitute create/update/delete operations. */
const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a path the same way `buildRouteMap` does: ensure a leading slash,
 * collapse duplicate slashes, and drop any trailing slash (except root).
 */
function normalisePath(path: string): string {
  let p = path.replace(/\/+/g, '/');
  if (!p.startsWith('/')) p = '/' + p;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

interface RouteMiddleware {
  method: string;
  path: string;
  /** Function names of every handler in the route's middleware chain. */
  middlewareNames: string[];
}

/**
 * Walk a single router's stack directly (without relying on Express 5 mount
 * prefix recovery) to collect, per concrete route, the function names of every
 * middleware in its chain. This is how we detect `authMiddleware` presence —
 * `buildRouteMap` exposes resolved roles but not the raw middleware identity.
 *
 * Mirrors the route-layer shape that `buildRouteMap` itself inspects:
 * `layer.route.stack[*].handle` is the handler function and `.method` the verb.
 */
function collectRouteMiddleware(router: Router, mountPrefix: string): RouteMiddleware[] {
  const out: RouteMiddleware[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stack = (router as any).stack as any[] | undefined;
  if (!stack) return out;

  for (const layer of stack) {
    if (!layer.route) continue; // skip router-level middleware (e.g. rate limiter)

    const relPath =
      typeof layer.route.path === 'string' ? layer.route.path : String(layer.route.path);
    const fullPath = normalisePath(mountPrefix + relPath);

    const routeStack = (layer.route.stack ?? []) as Array<{
      method?: string;
      handle?: { name?: string };
    }>;

    const middlewareNames = routeStack
      .filter((l) => typeof l.handle === 'function')
      .map((l) => l.handle?.name ?? '');

    const methods = [
      ...new Set(
        routeStack
          .filter((l) => typeof l.method === 'string')
          .map((l) => (l.method as string).toUpperCase()),
      ),
    ];

    for (const method of methods) {
      out.push({ method, path: fullPath, middlewareNames });
    }
  }

  return out;
}

/** Build the in-memory app mounting the real admin-management routers. */
function createApp(): Express {
  const app = express();
  app.use('/api/students', studentRoutes);
  app.use('/api/faculty', facultyRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/enrollment', enrollmentRoutes);
  return app;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Admin endpoint security wiring (Requirements 3.1–3.5)', () => {
  let app: Express;
  let routeMap: RouteMapEntry[];
  let adminEndpoints: RouteMapEntry[];
  /** Lookup of "METHOD path" → middleware function names. */
  let authByRoute: Map<string, string[]>;

  beforeAll(() => {
    app = createApp();
    routeMap = buildRouteMap(app);

    adminEndpoints = routeMap.filter((e) =>
      ADMIN_MANAGEMENT_NAMESPACES.includes(e.namespace),
    );

    authByRoute = new Map();
    const collected = [
      ...collectRouteMiddleware(studentRoutes, '/api/students'),
      ...collectRouteMiddleware(facultyRoutes, '/api/faculty'),
      ...collectRouteMiddleware(courseRoutes, '/api/courses'),
      ...collectRouteMiddleware(enrollmentRoutes, '/api/enrollment'),
    ];
    for (const r of collected) {
      authByRoute.set(`${r.method} ${r.path}`, r.middlewareNames);
    }
  });

  it('discovers the admin-management endpoints from the route map', () => {
    // Sanity check: the app actually exposes student/faculty/course/enrollment
    // routes, so the assertions below are non-vacuous.
    expect(adminEndpoints.length).toBeGreaterThan(0);
    for (const ns of ADMIN_MANAGEMENT_NAMESPACES) {
      expect(adminEndpoints.some((e) => e.namespace === ns)).toBe(true);
    }
  });

  it('wires authMiddleware on EVERY admin-management endpoint (fail-closed)', () => {
    const missingAuth: string[] = [];

    for (const entry of adminEndpoints) {
      const key = `${entry.method} ${entry.path}`;
      const middlewareNames = authByRoute.get(key);

      if (!middlewareNames || !middlewareNames.includes('authMiddleware')) {
        missingAuth.push(key);
      }
    }

    // Fail closed: any endpoint missing authMiddleware fails the suite.
    expect(missingAuth).toEqual([]);
  });

  it("enforces the 'admin' role on every create/update/delete student & faculty endpoint", () => {
    const writeEndpoints = adminEndpoints.filter(
      (e) => ADMIN_WRITE_NAMESPACES.includes(e.namespace) && WRITE_METHODS.has(e.method),
    );

    // There must be write endpoints to verify (create/update/delete exist).
    expect(writeEndpoints.length).toBeGreaterThan(0);

    const missingAdminRole: string[] = [];

    for (const entry of writeEndpoints) {
      const roles = entry.requiredRole;
      const roleList = roles == null ? [] : Array.isArray(roles) ? roles : [roles];

      if (!roleList.includes('admin')) {
        missingAdminRole.push(`${entry.method} ${entry.path} → ${JSON.stringify(roles)}`);
      }
    }

    // Fail closed: any write endpoint not requiring `admin` fails the suite.
    expect(missingAdminRole).toEqual([]);
  });

  it('resolves a non-null requiredRole for every admin-management endpoint', () => {
    // A null requiredRole means no RBAC middleware was detected — the route
    // would be reachable by any authenticated user, which is a fail-open gap.
    const missingRbac = adminEndpoints
      .filter((e) => e.requiredRole == null)
      .map((e) => `${e.method} ${e.path}`);

    expect(missingRbac).toEqual([]);
  });

  it('does NOT include the public account-setup route in the verified set', () => {
    // The public POST /api/account-setup/:token is not mounted here; confirm no
    // account-setup endpoint leaked into the admin-management assertions.
    const setupLeak = adminEndpoints.filter((e) => e.path.includes('account-setup'));
    expect(setupLeak).toEqual([]);
  });
});
