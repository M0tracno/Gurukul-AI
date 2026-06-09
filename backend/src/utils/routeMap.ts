/**
 * Route Map Generator
 *
 * Walks the registered Express router stack to produce a canonical inventory
 * of every endpoint, then cross-references that inventory against the OpenAPI
 * (Swagger) specification to surface missing documentation and duplicate routes.
 *
 * Compatible with Express 5, which uses the `router` npm package internally
 * and exposes the application router via `app.router` (not `app._router`).
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 3.1, 3.2
 */

import type { Express, RequestHandler } from 'express';
import type { UserRole } from '../types/common.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Namespace identifiers that the Portal registers routes under.
 * @see Requirement 1.4
 */
export type RouteNamespace =
  | 'attendance'
  | 'auth'
  | 'course'
  | 'enrollment'
  | 'faculty'
  | 'grading'
  | 'health'
  | 'mark'
  | 'metrics'
  | 'parentMe'
  | 'studentMe'
  | 'student'
  | 'unknown';

/**
 * A single entry in the canonical Route Map.
 *
 * `requestSchemaRef` and `responseSchemaRef` are the OpenAPI `$ref` strings
 * referencing the corresponding component schemas, when available.
 */
export interface RouteMapEntry {
  /** HTTP verb in upper-case, e.g. "GET" */
  method: string;
  /** Normalised path, e.g. "/api/students/:id" */
  path: string;
  /** Logical namespace this route belongs to */
  namespace: RouteNamespace;
  /** Required role(s) inferred from RBAC middleware present on the route */
  requiredRole: UserRole | UserRole[] | null;
  /** OpenAPI request-body schema $ref, when available */
  requestSchemaRef?: string;
  /** OpenAPI response schema $ref, when available */
  responseSchemaRef?: string;
}

// ---------------------------------------------------------------------------
// Express 5 internal layer types
// ---------------------------------------------------------------------------

/**
 * Matcher function as used by the `router` npm package (Express 5 internals).
 * When called with a path string, returns `{ path: <consumed-prefix>, params }` on
 * success or `false` on non-match.
 */
type MatcherFn = (path: string) => { path: string; params: Record<string, string> } | false;

/** Internal layer shape for both Express 4 and Express 5 */
interface ExpressLayer {
  /** Present on terminal route layers */
  route?: {
    path: string | RegExp;
    stack: Array<{ method?: string; handle?: RequestHandler }>;
  };
  /** The Express 5 `router` name for mount-point layers */
  name?: string;
  /** Express 4: compiled RegExp for the mount path */
  regexp?: RegExp;
  /** Express 5: array of matcher functions for the mount path */
  matchers?: MatcherFn[];
  /** Express 5: fast-path flag for root '/' mounts */
  slash?: boolean;
  /** For mount layers: the sub-router or middleware function */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle?: { stack?: ExpressLayer[] } & ((...args: any[]) => any);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Known RBAC helper function names exported from rbacMiddleware and their
 * corresponding role sets.  This table is used to map a middleware function
 * name back to the roles it enforces without executing the middleware.
 */
const RBAC_FUNCTION_ROLE_MAP: Record<string, UserRole[]> = {
  adminOnly: ['admin'],
  teacherOrAdmin: ['admin', 'teacher'],
  studentOnly: ['student'],
  parentOnly: ['parent'],
  allRoles: ['admin', 'teacher', 'student', 'parent'],
};

/**
 * Probe paths used to extract the mount prefix from an Express 5 layer's
 * `matchers` function.  The matcher function returns a result only when the
 * input path **starts with** the mount prefix, so we try each known prefix in
 * order.  When one matches, `result.path` is the consumed prefix.
 *
 * This list covers every mount point used by the Portal's production routes
 * plus generic single-segment fallbacks.
 */
const MOUNT_PROBE_PATHS = [
  '/api/v1/grading/x',
  '/api/auth/x',
  '/api/faculty/x',
  '/api/students/x',
  '/api/courses/x',
  '/api/enrollment/x',
  '/api/attendance/x',
  '/api/marks/x',
  '/api/parents/x',
  '/health/x',
  '/metrics/x',
  '/x',
];

/**
 * Extract the mount prefix consumed by an Express 5 layer's matchers array.
 *
 * The Express 5 `router` package hides the original path string inside the
 * compiled `path-to-regexp` matcher closure.  To recover it, we probe the
 * matcher with a set of known paths; when one matches the prefix, we extract
 * `result.path` (the consumed portion).
 *
 * Returns `''` when no prefix can be determined (e.g. root `/` mounts or
 * layers that are not mount-point layers).
 */
function extractMountPrefix(layer: ExpressLayer): string {
  // Express 5: layer has matchers array
  if (layer.matchers && layer.matchers.length > 0) {
    if (layer.slash) return ''; // fast path: mounted at '/'

    const m = layer.matchers[0];
    for (const probe of MOUNT_PROBE_PATHS) {
      const result = m(probe);
      if (result) {
        return result.path.replace(/\/$/, '');
      }
    }
    return '';
  }

  // Express 4: layer has a compiled RegExp
  if (layer.regexp) {
    if ((layer.regexp as unknown as { fast_slash?: boolean }).fast_slash) {
      return '';
    }
    const src = layer.regexp.source;
    // Attempt to recover the original path string from the regexp source
    const match = src
      .replace(/\\\//g, '/')
      .replace(/\\\?/g, '')
      .match(/^\^(\/[^$?+*[\]()|\\]*)/);
    if (match?.[1]) {
      return match[1].replace(/\/$/, '');
    }
  }

  return '';
}

/**
 * Derive the required role(s) from the middleware stack of a single route
 * layer.  Inspects (in priority order):
 *  1. The `__roles` property attached by `requireRoles()` in `rbacMiddleware`.
 *  2. Named convenience RBAC helpers (`adminOnly`, `teacherOrAdmin`, …).
 *  3. The closure produced by `requireRoles(...roles)` — its source text
 *     contains the role literals (fallback for older compiled versions).
 *
 * Returns `null` when no RBAC middleware is detected (public route).
 */
function extractRequiredRole(
  middlewareStack: RequestHandler[],
): UserRole | UserRole[] | null {
  for (const fn of middlewareStack) {
    // 1. Direct __roles property (set by the updated requireRoles factory)
    const withRoles = fn as { __roles?: UserRole[] };
    if (Array.isArray(withRoles.__roles) && withRoles.__roles.length > 0) {
      return withRoles.__roles.length === 1
        ? withRoles.__roles[0]
        : withRoles.__roles;
    }

    const name = (fn as { name?: string }).name ?? '';

    // 2. Named convenience helper
    if (name in RBAC_FUNCTION_ROLE_MAP) {
      const roles = RBAC_FUNCTION_ROLE_MAP[name];
      return roles.length === 1 ? roles[0] : roles;
    }

    // 3. Fallback: anonymous closure from requireRoles() — inspect function source
    const src = fn.toString();
    if (src.includes('allowedRoles') || src.includes('requireRoles')) {
      // Extract role literals from the closure source text.
      const matches = [...src.matchAll(/'(admin|teacher|faculty|student|parent)'/g)];
      if (matches.length > 0) {
        const roles = [...new Set(matches.map((m) => m[1] as UserRole))];
        return roles.length === 1 ? roles[0] : roles;
      }
    }
  }

  return null;
}

/**
 * Map a normalised route path to one of the known resource namespaces.
 */
function inferNamespace(path: string): RouteNamespace {
  const p = path.toLowerCase();

  if (p.startsWith('/api/attendance') || p.startsWith('/api/v1/attendance')) return 'attendance';
  if (p.startsWith('/api/auth') || p.startsWith('/api/v1/auth')) return 'auth';
  if (p.startsWith('/api/courses') || p.startsWith('/api/v1/courses')) return 'course';
  if (p.startsWith('/api/enrollment') || p.startsWith('/api/v1/enrollment')) return 'enrollment';
  if (p.startsWith('/api/faculty') || p.startsWith('/api/v1/faculty')) return 'faculty';
  if (p.startsWith('/api/v1/grading') || p.startsWith('/api/grading')) return 'grading';
  if (p.startsWith('/health') || p.startsWith('/api/health')) return 'health';
  if (p.startsWith('/api/marks') || p.startsWith('/api/v1/marks')) return 'mark';
  if (p.startsWith('/metrics') || p.startsWith('/api/metrics')) return 'metrics';
  // parentMe must come before studentMe and student
  if (p.startsWith('/api/parents/me') || p.startsWith('/api/v1/parents/me')) return 'parentMe';
  if (p.startsWith('/api/students/me') || p.startsWith('/api/v1/students/me')) return 'studentMe';
  if (p.startsWith('/api/students') || p.startsWith('/api/v1/students')) return 'student';

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Express router-stack walker
// ---------------------------------------------------------------------------

/** Internal collected route data before enrichment */
interface RawRoute {
  method: string;
  path: string;
  middlewareStack: RequestHandler[];
}

/**
 * Recursively walk an Express router layer tree, collecting all concrete
 * routes.  Each discovered route is appended to `out`.
 *
 * Works with both Express 4 (regexp + `_router`) and Express 5 (matchers +
 * `app.router`).
 *
 * @param prefixSegments - Path segments accumulated so far from parent layers.
 * @param layer - The current Express layer to inspect.
 * @param out - Accumulator for discovered routes.
 */
function walkLayer(
  prefixSegments: string[],
  layer: ExpressLayer,
  out: RawRoute[],
): void {
  if (layer.route) {
    // Terminal route layer — collect method + full path
    const routePath =
      typeof layer.route.path === 'string' ? layer.route.path : String(layer.route.path);

    // Join prefix segments with the route's own relative path
    const prefix = prefixSegments.join('');
    const fullPath = normaliseFullPath(prefix + routePath);

    // Collect unique methods on this route (each method should appear once,
    // even if the route has multiple middleware layers sharing the same method)
    const seenMethods = new Set<string>();
    for (const routeLayer of layer.route.stack) {
      if (routeLayer.method && !seenMethods.has(routeLayer.method.toUpperCase())) {
        seenMethods.add(routeLayer.method.toUpperCase());
        out.push({
          method: routeLayer.method.toUpperCase(),
          path: fullPath,
          middlewareStack: layer.route.stack
            .filter((l) => typeof l.handle === 'function')
            .map((l) => l.handle as RequestHandler),
        });
      }
    }
    return;
  }

  // Router / sub-application layer — recurse with accumulated path segments
  if (layer.handle?.stack) {
    const mountPrefix = extractMountPrefix(layer);
    const childPrefixSegments =
      mountPrefix ? [...prefixSegments, mountPrefix] : prefixSegments;

    for (const child of layer.handle.stack) {
      walkLayer(childPrefixSegments, child, out);
    }
  }
}

/**
 * Normalise a full path by:
 *  1. Ensuring it starts with `/`.
 *  2. Collapsing duplicate slashes.
 *  3. Removing a trailing slash (unless the path is the root `/`).
 */
function normaliseFullPath(path: string): string {
  let p = path.replace(/\/+/g, '/');
  if (!p.startsWith('/')) p = '/' + p;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

// ---------------------------------------------------------------------------
// Schema ref lookup helpers
// ---------------------------------------------------------------------------

/**
 * Derive a simple OpenAPI request-body schema $ref for a route based on its
 * namespace and HTTP method.  Returns `undefined` when no mapping is known.
 *
 * This provides a best-effort lookup against the schemas defined in
 * `config/swagger.ts`.  A full implementation would parse the compiled
 * `swaggerSpec` paths object; here we map the well-known component schemas.
 */
function inferRequestSchemaRef(namespace: RouteNamespace, method: string): string | undefined {
  if (!['POST', 'PUT', 'PATCH'].includes(method)) return undefined;

  const map: Partial<Record<RouteNamespace, string>> = {
    student: '#/components/schemas/Student',
    course: '#/components/schemas/Course',
  };

  return map[namespace];
}

/**
 * Derive a simple OpenAPI response schema $ref for a route based on its
 * namespace and HTTP method.
 */
function inferResponseSchemaRef(namespace: RouteNamespace, method: string): string | undefined {
  if (method === 'DELETE') return undefined;

  const map: Partial<Record<RouteNamespace, string>> = {
    student: '#/components/schemas/Student',
    course: '#/components/schemas/Course',
  };

  return map[namespace];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walk the registered Express router stack and return one {@link RouteMapEntry}
 * per discovered `{method, path}` combination, reconciled against the Swagger
 * component schemas where available.
 *
 * Compatible with both Express 4 (accesses `app._router`) and Express 5
 * (accesses `app.router`).
 *
 * The function does **not** start the server; it merely introspects the
 * in-memory router that was already constructed when `app` was created.
 *
 * @param app - The configured Express application instance.
 * @returns An array of route-map entries in discovery order.
 *
 * @see Requirements 1.1, 1.2, 1.4
 */
export function buildRouteMap(app: Express): RouteMapEntry[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appAny = app as any;

  // Express 5: app.router is a getter that returns the internal router
  // Express 4: app._router is the internal router
  const router = appAny.router ?? appAny._router;

  if (!router?.stack) {
    return [];
  }

  const raw: RawRoute[] = [];

  for (const layer of router.stack as ExpressLayer[]) {
    walkLayer([], layer, raw);
  }

  return raw.map(({ method, path, middlewareStack }) => {
    const namespace = inferNamespace(path);
    const requiredRole = extractRequiredRole(middlewareStack);

    const entry: RouteMapEntry = {
      method,
      path,
      namespace,
      requiredRole,
    };

    const requestRef = inferRequestSchemaRef(namespace, method);
    if (requestRef) entry.requestSchemaRef = requestRef;

    const responseRef = inferResponseSchemaRef(namespace, method);
    if (responseRef) entry.responseSchemaRef = responseRef;

    return entry;
  });
}

/**
 * Group route-map entries that resolve to the **same resource action** —
 * i.e. the same HTTP method and the same normalised path (after collapsing
 * Express parameter placeholders like `:id` to a canonical form).
 *
 * Any group that contains more than one entry is a duplicate and should be
 * resolved by retaining one route and removing the rest (Requirement 3.2).
 *
 * @param entries - The full route map produced by {@link buildRouteMap}.
 * @returns An array of groups; each group has ≥2 entries (duplicates only).
 *
 * @see Requirements 3.1, 3.2
 */
export function findDuplicateRoutes(entries: RouteMapEntry[]): RouteMapEntry[][] {
  /**
   * Normalise a path for duplicate detection by:
   * 1. Collapsing all Express parameter segments (`:foo`) to `:param`.
   * 2. Removing trailing slashes.
   */
  function normalisePath(path: string): string {
    let p = path
      .split('/')
      .map((segment) => (segment.startsWith(':') ? ':param' : segment))
      .join('/');
    // Remove trailing slash for normalisation (but keep root '/')
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  }

  // Build a map keyed by "METHOD normalised-path"
  const groups = new Map<string, RouteMapEntry[]>();

  for (const entry of entries) {
    const key = `${entry.method} ${normalisePath(entry.path)}`;
    const group = groups.get(key);
    if (group) {
      group.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  // Return only groups with more than one entry
  return [...groups.values()].filter((g) => g.length > 1);
}

/**
 * Return route-map entries that are **present in the Express router** but
 * **absent from the Swagger documentation** (the `paths` object of the
 * compiled OpenAPI spec).
 *
 * A route is considered documented if a matching `{method, path}` entry
 * exists in `swaggerPaths` after normalising both path representations:
 *  - Express params (`:id`) are converted to OpenAPI params (`{id}`).
 *  - Leading `/api/v1`, `/api` prefixes are stripped before comparison so
 *    that routes mounted at `/api/students` match a Swagger path of
 *    `/students`.
 *
 * @param entries - The full route map produced by {@link buildRouteMap}.
 * @param swaggerPaths - The `paths` record from the compiled OpenAPI spec
 *   (e.g. `swaggerSpec.paths`).
 * @returns Entries that are not covered by any Swagger path definition.
 *
 * @see Requirements 1.3
 */
export function findMissingDocs(
  entries: RouteMapEntry[],
  swaggerPaths: Record<string, unknown>,
): RouteMapEntry[] {
  /**
   * Convert an Express-style path to an OpenAPI-style path by:
   *  1. Stripping the `/api/v1` or `/api` mount prefix.
   *  2. Replacing `:param` segments with `{param}`.
   */
  function toOpenApiPath(expressPath: string): string {
    let p = expressPath;
    // Strip common mount prefixes
    if (p.startsWith('/api/v1')) p = p.slice('/api/v1'.length);
    else if (p.startsWith('/api')) p = p.slice('/api'.length);

    // Replace :param → {param}
    p = p.replace(/:([^/]+)/g, '{$1}');

    return p || '/';
  }

  // Build a set of "METHOD /openapi-path" keys from the spec
  const documented = new Set<string>();
  for (const [swaggerPath, methods] of Object.entries(swaggerPaths)) {
    if (methods && typeof methods === 'object') {
      for (const verb of Object.keys(methods as Record<string, unknown>)) {
        documented.add(`${verb.toUpperCase()} ${swaggerPath}`);
      }
    }
  }

  return entries.filter((entry) => {
    const openApiPath = toOpenApiPath(entry.path);
    const key = `${entry.method} ${openApiPath}`;
    return !documented.has(key);
  });
}
