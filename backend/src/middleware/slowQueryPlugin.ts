/**
 * Mongoose plugin that monitors and logs slow queries.
 *
 * Any query taking longer than the configured threshold (default 500ms) is
 * logged as a warning with collection name, query filter, and elapsed time.
 *
 * Usage:
 *   import mongoose from 'mongoose';
 *   import { slowQueryPlugin } from './middleware/slowQueryPlugin.js';
 *   mongoose.plugin(slowQueryPlugin);
 *
 * Or per-schema:
 *   schema.plugin(slowQueryPlugin, { thresholdMs: 300 });
 */

import { Schema } from 'mongoose';
import { logger } from '../utils/logger.js';

export interface SlowQueryPluginOptions {
  /** Queries exceeding this duration (ms) are logged. Default: 500. */
  thresholdMs?: number;
}

const DEFAULT_THRESHOLD_MS = 500;

// Symbol used to store the start time on the query object without
// colliding with Mongoose internals or user-defined properties.
const START_TIME = Symbol('slowQueryStart');

/**
 * Mongoose plugin that hooks into query lifecycle to detect slow queries.
 *
 * Hooks into the following query types:
 * - find, findOne, findOneAndUpdate, findOneAndDelete, findOneAndReplace
 * - countDocuments, estimatedDocumentCount
 * - updateOne, updateMany, deleteOne, deleteMany
 * - aggregate
 */
export function slowQueryPlugin(schema: Schema, options?: SlowQueryPluginOptions): void {
  const thresholdMs = options?.thresholdMs ?? DEFAULT_THRESHOLD_MS;

  // Query operations to monitor
  const queryHooks = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace',
    'countDocuments',
    'estimatedDocumentCount',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
  ] as const;

  for (const hook of queryHooks) {
    schema.pre(hook, function (this: Record<string | symbol, unknown>) {
      (this as Record<symbol, unknown>)[START_TIME] = Date.now();
    });

    schema.post(hook, function (this: Record<string | symbol, unknown>) {
      const startTime = (this as Record<symbol, unknown>)[START_TIME] as number | undefined;
      if (startTime === undefined) return;

      const elapsed = Date.now() - startTime;
      if (elapsed > thresholdMs) {
        // Extract collection name and filter from the query object.
        // Mongoose query objects expose mongooseCollection and getFilter().
        const queryObj = this as Record<string, unknown>;
        const collectionName =
          (queryObj.mongooseCollection as { collectionName?: string } | undefined)?.collectionName ??
          (queryObj.model as { collection?: { collectionName?: string } } | undefined)?.collection
            ?.collectionName ??
          'unknown';

        let filter = '{}';
        if (typeof (queryObj as { getFilter?: () => unknown }).getFilter === 'function') {
          try {
            filter = JSON.stringify((queryObj as { getFilter: () => unknown }).getFilter());
          } catch {
            filter = '[unserializable]';
          }
        }

        logger.warn('Slow query detected', {
          collection: collectionName,
          operation: hook,
          filter,
          elapsedMs: elapsed,
          thresholdMs,
        });
      }
    });
  }

}
