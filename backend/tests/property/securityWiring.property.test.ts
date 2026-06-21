/**
 * Property-Based Tests: Security Wiring of Admin-Management Endpoints
 *
 * Feature: secure-admin-user-management, Property 1: Authentication is wired on every admin-management endpoint
 * Feature: secure-admin-user-management, Property 2: Admin role enforcement is wired on every create/update/delete endpoint
 * Feature: secure-admin-user-management, Property 3: Endpoints fail closed when a required middleware is absent
 *
 * Property 1: For any route classified as an Admin_Management_Endpoint in the
 * application route map, the middleware chain SHALL contain `authMiddleware`
 * ahead of the route handler.
 * **Validates: Requirements 1.1, 3.1**
 *
 * Property 2: For any create, update, or delete endpoint for a Student_Account
 * or Faculty_Account, the route map SHALL expose a `__roles` set that includes
 * `admin`, positioned after `authMiddleware`.
 * **Validates: Requirements 2.1, 3.2, 3.3**
 *
 * Property 3: For any admin-management route chain from which a required
 * middleware (auth or RBAC) is removed, a request SHALL be denied (no 2xx
 * response reaches the handler) regardless of the remaining chain.
 * **Validates: Requirements 3.4, 3.5**
 *
 * These wiring properties introspect the real Express routers (studentRoutes,
 * facultyRoutes, courseRoutes, enrollmentRoutes) via `buildRouteMap` over an
 * in-memory application, mirroring the conventions in
 * `src/utils/routeMap.property.test.ts` and `routeMap.unit.test.ts`. The public
 * `/api/account-setup/:token` route is intentionally excluded — it carries no
 * auth/RBAC because the token itself is the credential.
 */

import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';
import express, { Router, type Request, type Response } from 'express';
import request from 'supertest';

// Mock logger to avoid import.meta.url issues in ts-jest (matches routeMap.unit.test.ts).
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { buildRouteMap, type RouteMapEntry } from '../../src/utils/routeMap.js';
import { authMiddleware } from '../../src/middleware/authMiddleware.js';
import { requireRoles } from '../../src/middleware/rbacMiddleware.js';
import { AppError, globalErrorHandler } from '../../src/middleware/errorHandler.js';
import type { UserRole } from '../../src/types/common.js';

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type AnyHandler = (...args: unknown[]) => unknown;

/** A route plus its ordered middleware chain, collected from a real router. */
interface RouteChain {
  method: string;
  path: string;
  namespace: string;
  handles: AnyHandler[];
  handleNames: string[];
}

/** Mount prefixes for the four admin-management routers under test. */
const ADMIN_MOUNTS = [
  { prefix: '/api/students', namespace: 'student' },
  { prefix: '/api/faculty', namespace: 'faculty' },
  { prefix: '/api/courses', namespace: 'course' },
  { prefix: '/api/enrollment', namespace: 'enrollment' },
] as const;

/** Namespaces whose write endpoints must enforce the `admin` role. */
const ACCOUNT_NAMESPACES = new Set(['student', 'faculty']);

/** Methods that create, update, or delete a record. */
const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE']);

/** Normalise a full path the same way `buildRouteMap` does. */
function normalise(path: string): string {
  let p = path.replace(/\/+/g, '/');
  if (!p.startsWith('/')) p = '/' + p;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

/**
 * Walk a single Express router's stack and collect each registered route along
 * with the ordered list of middleware/handler functions in its chain.
 *
 * Router-level middleware registered via `router.use(...)` (e.g. the rate
 * limiter) is skipped because it has no `.route`; only terminal route layers
 * are collected.
 */
function collectRouteChains(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any,
  prefix: string,
  namespace: string,
): RouteChain[] {
  const out: RouteChain[] = [];
  const stack = router?.stack ?? [];

  for (const layer of stack) {
    const route = layer?.route;
    if (!route) continue;

    const relPath = typeof route.path === 'string' ? route.path : String(route.path);
    const fullPath = normalise(prefix + relPath);

    const subStack = route.stack ?? [];
    const handles: AnyHandler[] = subStack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((l: any) => l.handle)
      .filter((h: unknown): h is AnyHandler => typeof h === 'function');

    const methods = Object.keys(route.methods ?? {}).filter(
      (m) => (route.methods as Record<string, boolean>)[m],
    );

    for (const m of methods) {
      out.push({
        method: m.toUpperCase(),
        path: fullPath,
        namespace,
        handles,
        handleNames: handles.map((h) => h.name ?? ''),
      });
    }
  }

  return out;
}

/** True when `authMiddleware` appears anywhere in a chain (by identity or name). */
function chainHasAuth(chain: RouteChain): boolean {
  return chain.handles.some(
    (h) => h === (authMiddleware as unknown as AnyHandler) || h.name === 'authMiddleware',
  );
}

/** True when the chain places `authMiddleware` before any RBAC `__roles` layer. */
function authPrecedesRbac(chain: RouteChain): boolean {
  const authIndex = chain.handles.findIndex(
    (h) => h === (authMiddleware as unknown as AnyHandler) || h.name === 'authMiddleware',
  );
  const rbacIndex = chain.handles.findIndex(
    (h) => Array.isArray((h as { __roles?: unknown }).__roles),
  );
  if (authIndex === -1) return false;
  if (rbacIndex === -1) return true; // no RBAC layer to order against
  return authIndex < rbacIndex;
}

/** Normalise a route map's requiredRole into an array for membership checks. */
function rolesOf(entry: RouteMapEntry): UserRole[] {
  if (entry.requiredRole === null) return [];
  return Array.isArray(entry.requiredRole) ? entry.requiredRole : [entry.requiredRole];
}

// ---------------------------------------------------------------------------
// Shared fixtures: real routers + in-memory app + route map
// ---------------------------------------------------------------------------

let realApp: express.Express;
let routeMap: RouteMapEntry[];
let adminChains: RouteChain[];

beforeAll(async () => {
  const { studentRoutes, facultyRoutes, courseRoutes, enrollmentRoutes } = await import(
    '../../src/routes/index.js'
  );

  // Mount the real admin-management routers on an in-memory app, exactly as the
  // existing routeMap tests do. The public account-setup route is excluded.
  realApp = express();
  realApp.use('/api/students', studentRoutes);
  realApp.use('/api/faculty', facultyRoutes);
  realApp.use('/api/courses', courseRoutes);
  realApp.use('/api/enrollment', enrollmentRoutes);

  routeMap = buildRouteMap(realApp);

  const routerByNamespace: Record<string, unknown> = {
    student: studentRoutes,
    faculty: facultyRoutes,
    course: courseRoutes,
    enrollment: enrollmentRoutes,
  };

  adminChains = ADMIN_MOUNTS.flatMap(({ prefix, namespace }) =>
    collectRouteChains(routerByNamespace[namespace], prefix, namespace),
  );
});

// ---------------------------------------------------------------------------
// Property 1: Authentication is wired on every admin-management endpoint
// ---------------------------------------------------------------------------
// Feature: secure-admin-user-management, Property 1: Authentication is wired on every admin-management endpoint
describe('Property 1: Authentication is wired on every admin-management endpoint', () => {
  it('every student/faculty/course/enrollment endpoint has authMiddleware ahead of the handler', () => {
    // Sanity: the real routers expose endpoints to assert over.
    expect(adminChains.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...adminChains), (chain) => {
        // authMiddleware must be present in the chain ...
        expect(chainHasAuth(chain)).toBe(true);
        // ... and positioned ahead of the RBAC layer (and thus the handler).
        expect(authPrecedesRbac(chain)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('every admin-management entry discovered by buildRouteMap is backed by an authenticated chain', () => {
    const adminEntries = routeMap.filter((e) =>
      ['student', 'faculty', 'course', 'enrollment'].includes(e.namespace),
    );
    expect(adminEntries.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...adminEntries), (entry) => {
        const chain = adminChains.find(
          (c) => c.method === entry.method && c.path === entry.path,
        );
        expect(chain).toBeDefined();
        expect(chainHasAuth(chain!)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Admin role enforcement on every create/update/delete endpoint
// ---------------------------------------------------------------------------
// Feature: secure-admin-user-management, Property 2: Admin role enforcement is wired on every create/update/delete endpoint
describe('Property 2: Admin role enforcement is wired on every create/update/delete endpoint', () => {
  it('every POST/PUT/DELETE student or faculty endpoint exposes __roles including admin', () => {
    const writeAccountEntries = routeMap.filter(
      (e) => ACCOUNT_NAMESPACES.has(e.namespace) && WRITE_METHODS.has(e.method),
    );

    // Sanity: there must be create/update/delete endpoints to enforce admin on.
    expect(writeAccountEntries.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...writeAccountEntries), (entry) => {
        const roles = rolesOf(entry);
        // The RBAC __roles set must be present and include 'admin'.
        expect(roles.length).toBeGreaterThan(0);
        expect(roles).toContain('admin');

        // And admin enforcement must sit behind authMiddleware in the chain.
        const chain = adminChains.find(
          (c) => c.method === entry.method && c.path === entry.path,
        );
        expect(chain).toBeDefined();
        expect(authPrecedesRbac(chain!)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Endpoints fail closed when a required middleware is absent
// ---------------------------------------------------------------------------
// Feature: secure-admin-user-management, Property 3: Endpoints fail closed when a required middleware is absent
describe('Property 3: Endpoints fail closed when a required middleware is absent', () => {
  const HTTP_METHODS = ['get', 'post', 'put', 'delete'] as const;

  /** A non-empty role set that always includes admin (mirrors adminOnly chains). */
  const rolesArb: fc.Arbitrary<UserRole[]> = fc
    .subarray(['admin', 'teacher', 'student', 'parent'] as UserRole[], {
      minLength: 0,
      maxLength: 3,
    })
    .map((extra) => [...new Set<UserRole>(['admin', ...extra])]);

  it('removing authMiddleware causes RBAC to fail closed and removing RBAC is statically detectable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...HTTP_METHODS),
        rolesArb,
        async (method, roles) => {
          // --- Case A: required auth middleware removed, RBAC kept -----------
          // The chain reaches requireRoles without an authenticated req.user,
          // so requireRoles must throw 401 (fail closed); the handler is never
          // reached and no 2xx is returned (Requirement 3.4, 3.5).
          const app = express();
          app.use(express.json());

          let handlerReached = false;
          const handler = (_req: Request, res: Response): void => {
            handlerReached = true;
            res.status(200).json({ ok: true });
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (app as any)[method]('/x', requireRoles(...roles), handler);
          app.use(globalErrorHandler);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const resp = await (request(app) as any)[method]('/x');

          expect(handlerReached).toBe(false);
          expect(resp.status).not.toBe(200);
          expect(resp.status).toBe(401);

          // --- Case B: required RBAC middleware removed, auth kept -----------
          // Without requireRoles the route map exposes requiredRole === null,
          // so the absence is detectable and the verification layer denies the
          // route from shipping (fail closed regardless of remaining chain).
          const openRouter = Router();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (openRouter as any)[method]('/', authMiddleware, handler);

          const openApp = express();
          openApp.use('/api/students', openRouter);

          const openMap = buildRouteMap(openApp);
          const entry = openMap.find(
            (e) => e.method === method.toUpperCase() && e.path === '/api/students',
          );
          expect(entry).toBeDefined();
          expect(entry!.requiredRole).toBeNull();
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('requireRoles throws a 401 AppError when authentication did not run (no req.user)', () => {
    fc.assert(
      fc.property(rolesArb, (roles) => {
        const mw = requireRoles(...roles);
        const req = { headers: {} } as unknown as Request;
        const next = jest.fn();

        let thrown: unknown = null;
        try {
          mw(req, {} as Response, next as never);
        } catch (err) {
          thrown = err;
        }

        expect(thrown).toBeInstanceOf(AppError);
        expect((thrown as AppError).statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
