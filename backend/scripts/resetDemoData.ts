#!/usr/bin/env tsx
/**
 * Environment-guarded demo-data reset (Requirements 10.2, 10.3, 10.4, 10.5, 10.7).
 *
 * This script is intended to be executed directly via node/tsx and is NEVER
 * imported by the running application. Importing it has no side effects beyond
 * exposing the pure/HTTP-agnostic helpers below; `main()` only runs when the
 * file is invoked as the process entry script (see the guard at the bottom).
 *
 * Usage:
 *   npx tsx scripts/resetDemoData.ts --confirm --env development [--actor <id>]
 *
 * Guards (the operation aborts WITHOUT mutating any data unless ALL hold):
 *   1. `--confirm` flag is present                                     (Req 10.2)
 *   2. `--env <name>` is present AND matches the resolved environment  (Req 10.2)
 *   3. if the resolved environment is `production`, `ALLOW_PROD_RESET=true` set (Req 10.3)
 *
 * On success it runs `deleteMany({ isDemo: true })` across the demo-marked
 * collections ONLY, leaving real records (isDemo absent/false) untouched
 * (Req 10.4). The operation is idempotent: re-running yields the same final
 * data state (Req 10.5). A `data_reset` AuditLog entry is written recording the
 * actor, resolved environment, and per-collection affected counts (Req 10.7).
 *
 * The core logic is exported (`evaluateGuards`, `performReset`) so property
 * tests can drive it against an in-memory MongoDB WITHOUT spawning a process.
 *
 * @see design.md "Environment-guarded data reset + onboarding" (Requirement 10)
 */

import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import { pathToFileURL } from 'url';

import { connectDB } from '../src/config/database.js';
import AuditLog from '../src/models/AuditLog.js';
import Student from '../src/models/Student.js';
import Faculty from '../src/models/Faculty.js';
import Parent from '../src/models/Parent.js';
import ParentStudentRelation from '../src/models/ParentStudentRelation.js';
import { redactSecrets } from '../src/utils/auditContext.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal structural shape required from a Mongoose model so tests can inject
 * real models bound to an in-memory MongoDB.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DeletableModel = Pick<Model<any>, 'deleteMany'>;

/** A demo-marked collection that the reset targets. */
export interface DemoCollection {
  /** Logical name used in count reporting / the audit entry. */
  name: string;
  /** Model exposing `deleteMany`. */
  model: DeletableModel;
}

/** Parsed CLI options that drive the guard evaluation and reset. */
export interface ResetOptions {
  /** Whether the `--confirm` flag was supplied. */
  confirm: boolean;
  /** The value passed to `--env <name>` (the named target environment). */
  env?: string;
  /** Whether the production override (`ALLOW_PROD_RESET=true`) is set. */
  allowProdReset: boolean;
  /** Actor identifier recorded in the audit entry (defaults to a CLI marker). */
  actor: string;
}

/** Outcome of evaluating the environment guards. */
export interface GuardDecision {
  /** True iff every guard passed and the reset may proceed. */
  allowed: boolean;
  /** Human-readable explanation (reason for abort, or confirmation). */
  reason: string;
}

/** Structured audit payload for a reset run. */
export interface ResetAuditEntry {
  actor: string;
  environment: string;
  counts: Record<string, number>;
  totalDeleted: number;
}

/** Injectable dependencies so `performReset` is testable in isolation. */
export interface ResetDeps {
  /** Collections to clear of demo records. */
  collections: DemoCollection[];
  /** Resolve the current environment name (defaults to NODE_ENV). */
  resolveEnv: () => string;
  /** Persist the audit entry for a successful run. */
  writeAudit: (entry: ResetAuditEntry) => Promise<void>;
  /** Optional logger for human-facing output. */
  logger?: (message: string) => void;
}

/** Result returned from {@link performReset}. */
export interface ResetResult {
  /** True when guards failed and NO mutation was performed. */
  aborted: boolean;
  /** Reason for the outcome (abort cause or success confirmation). */
  reason: string;
  /** The environment the guards were evaluated against. */
  resolvedEnv: string;
  /** Per-collection count of deleted demo records. */
  counts: Record<string, number>;
  /** Total demo records removed across all collections. */
  totalDeleted: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** The environment name treated as production for the override guard. */
export const PRODUCTION_ENV = 'production';

/**
 * Sentinel actor id used for the audit entry's required ObjectId actor field
 * when the reset is run from the CLI ("system") rather than by a real user.
 */
const SYSTEM_ACTOR_ID = new mongoose.Types.ObjectId('000000000000000000000000');

/** Default CLI actor marker recorded in the audit metadata. */
const DEFAULT_ACTOR = 'system:cli';

// ─── Pure guard evaluation (Req 10.2, 10.3) ───────────────────────────────────

/**
 * Evaluate the environment guards. Returns `{ allowed: false }` with a reason
 * unless EVERY guard passes. This function performs no I/O and mutates nothing,
 * so the caller can rely on it to decide whether any deletion may occur.
 *
 * Guards (Req 10.2, 10.3):
 *   - `--confirm` must be present.
 *   - `--env <name>` must be present and equal the resolved environment.
 *   - when the resolved environment is `production`, `ALLOW_PROD_RESET=true`
 *     must also be set.
 */
export function evaluateGuards(
  options: ResetOptions,
  resolvedEnv: string
): GuardDecision {
  if (!options.confirm) {
    return {
      allowed: false,
      reason: 'Aborted: the --confirm flag is required; no data was modified.',
    };
  }

  if (!options.env) {
    return {
      allowed: false,
      reason: 'Aborted: --env <name> must be provided; no data was modified.',
    };
  }

  if (options.env !== resolvedEnv) {
    return {
      allowed: false,
      reason:
        `Aborted: --env "${options.env}" does not match the resolved ` +
        `environment "${resolvedEnv}"; no data was modified.`,
    };
  }

  if (resolvedEnv === PRODUCTION_ENV && !options.allowProdReset) {
    return {
      allowed: false,
      reason:
        'Aborted: resetting production requires ALLOW_PROD_RESET=true; ' +
        'no data was modified.',
    };
  }

  return {
    allowed: true,
    reason: `Guards satisfied for environment "${resolvedEnv}".`,
  };
}

// ─── Reset execution (Req 10.4, 10.5, 10.7) ────────────────────────────────────

/**
 * Perform the guarded demo-data reset.
 *
 * Evaluates the guards first; if any guard fails the function returns an
 * `aborted` result and performs NO deletion or audit write (Req 10.2, 10.3).
 *
 * When allowed, it deletes only documents marked `isDemo: true` from each demo
 * collection, leaving real records untouched (Req 10.4). Because the filter is
 * `{ isDemo: true }`, re-running produces the same final state — subsequent
 * runs simply delete zero additional records (Req 10.5). Finally it writes a
 * `data_reset` audit entry carrying the actor, environment, and per-collection
 * counts (Req 10.7).
 */
export async function performReset(
  options: ResetOptions,
  deps: ResetDeps
): Promise<ResetResult> {
  const resolvedEnv = deps.resolveEnv();
  const decision = evaluateGuards(options, resolvedEnv);
  const log = deps.logger ?? (() => {});

  if (!decision.allowed) {
    log(decision.reason);
    // No mutation whatsoever on an aborted run.
    return {
      aborted: true,
      reason: decision.reason,
      resolvedEnv,
      counts: {},
      totalDeleted: 0,
    };
  }

  const counts: Record<string, number> = {};
  let totalDeleted = 0;

  for (const { name, model } of deps.collections) {
    const result = await model.deleteMany({ isDemo: true });
    const deleted = result?.deletedCount ?? 0;
    counts[name] = deleted;
    totalDeleted += deleted;
    log(`  • ${name}: removed ${deleted} demo record(s)`);
  }

  await deps.writeAudit({
    actor: options.actor,
    environment: resolvedEnv,
    counts,
    totalDeleted,
  });

  log(
    `Reset complete for environment "${resolvedEnv}": ` +
      `${totalDeleted} demo record(s) removed.`
  );

  return {
    aborted: false,
    reason: decision.reason,
    resolvedEnv,
    counts,
    totalDeleted,
  };
}

// ─── CLI parsing & default wiring ──────────────────────────────────────────────

/**
 * Parse `process.argv`-style arguments into {@link ResetOptions}.
 *
 * Recognizes `--confirm`, `--env <name>` / `--env=<name>`, and
 * `--actor <id>` / `--actor=<id>`. The production override is read from the
 * `ALLOW_PROD_RESET` environment variable so it cannot be supplied accidentally
 * on the command line.
 */
export function parseArgs(argv: string[]): ResetOptions {
  // Drop the leading `node`/`tsx` and script path entries.
  const args = argv.slice(2);

  let confirm = false;
  let env: string | undefined;
  let actor = DEFAULT_ACTOR;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--confirm') {
      confirm = true;
    } else if (arg === '--env') {
      env = args[i + 1];
      i += 1;
    } else if (arg.startsWith('--env=')) {
      env = arg.slice('--env='.length);
    } else if (arg === '--actor') {
      actor = args[i + 1] ?? actor;
      i += 1;
    } else if (arg.startsWith('--actor=')) {
      actor = arg.slice('--actor='.length);
    }
  }

  return {
    confirm,
    env,
    actor,
    allowProdReset: process.env.ALLOW_PROD_RESET === 'true',
  };
}

/** Resolve the current environment name (NODE_ENV, defaulting to development). */
export function resolveEnvironment(): string {
  return process.env.NODE_ENV ?? 'development';
}

/** The demo-marked collections targeted by the default reset. */
export function defaultDemoCollections(): DemoCollection[] {
  return [
    { name: 'students', model: Student },
    { name: 'faculties', model: Faculty },
    { name: 'parents', model: Parent },
    { name: 'parent_student_relations', model: ParentStudentRelation },
  ];
}

/**
 * Default audit writer: persists a `data_reset` AuditLog entry. All metadata is
 * routed through {@link redactSecrets} so no secret value can leak (Req 8.4).
 */
export async function defaultWriteAudit(entry: ResetAuditEntry): Promise<void> {
  await AuditLog.create({
    timestamp: new Date(),
    actor: {
      userId: SYSTEM_ACTOR_ID,
      role: 'system',
      ip: 'cli',
    },
    action: 'data_reset',
    target: {
      resource: 'demo_data',
      resourceId: entry.environment,
    },
    correlationId: `data-reset-${Date.now()}`,
    metadata: redactSecrets({
      actor: entry.actor,
      environment: entry.environment,
      counts: entry.counts,
      totalDeleted: entry.totalDeleted,
    }),
  });
}

/**
 * CLI entry point. Connects to MongoDB, runs the guarded reset with the default
 * dependencies, and disconnects. Only invoked when this file is the process
 * entry script — never on import.
 */
export async function main(argv: string[] = process.argv): Promise<void> {
  const options = parseArgs(argv);

  await connectDB();
  try {
    const result = await performReset(options, {
      collections: defaultDemoCollections(),
      resolveEnv: resolveEnvironment,
      writeAudit: defaultWriteAudit,
      // eslint-disable-next-line no-console
      logger: (message: string) => console.log(message),
    });

    if (result.aborted) {
      // Guard failure is a non-zero exit so CI/automation can detect the abort.
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
}

// Only auto-run when invoked directly (e.g. `tsx scripts/resetDemoData.ts`),
// never when imported by a test or the application.
const invokedDirectly =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(`[resetDemoData] failed: ${message}`);
    process.exitCode = 1;
  });
}
