/**
 * Property-Based Test: Success Envelope Shape (new API endpoints)
 *
 * Feature: communication-feedback-and-admin-apis, Property 23: Every successful response is a well-formed success envelope
 *
 * Property 23: For any successful invocation of a new endpoint, the response
 * body matches `{ success: true, data, meta? }`, and `meta` (when present)
 * carries only pagination fields.
 * **Validates: Requirements 12.2**
 */

import * as fc from 'fast-check';

import { success } from './envelope.js';
import type { EnvelopeMeta } from './envelope.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Any JSON-serializable value is a valid endpoint payload. */
const dataArb = fc.jsonValue();

/**
 * The only fields EnvelopeMeta admits: the pagination trio (page/limit/total)
 * plus the message-thread `conversationExists` flag. No other key may appear.
 */
const META_PAGINATION_KEYS = new Set(['page', 'limit', 'total', 'conversationExists']);

/** Generates optional metadata limited to the pagination field set. */
const metaArb: fc.Arbitrary<EnvelopeMeta | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.record(
    {
      page: fc.nat({ max: 1000 }),
      limit: fc.nat({ max: 100 }),
      total: fc.nat({ max: 1_000_000 }),
      conversationExists: fc.boolean(),
    },
    { requiredKeys: [] },
  ),
);

// ---------------------------------------------------------------------------
// Property 23
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 23: Every successful response is a well-formed success envelope
describe('Property 23: Every successful response is a well-formed success envelope', () => {
  it('success(data, meta?) always yields { success: true, data, meta? } with meta carrying only pagination fields', () => {
    fc.assert(
      fc.property(dataArb, metaArb, (data, meta) => {
        const envelope = success(data, meta);

        // Discriminator is always literally true.
        expect(envelope.success).toBe(true);

        // Data is carried through unchanged.
        expect(envelope.data).toEqual(data);

        // Top-level keys are exactly { success, data } plus optional meta.
        const keys = Object.keys(envelope).sort();
        const allowedTopLevel = new Set(['success', 'data', 'meta']);
        for (const key of keys) {
          expect(allowedTopLevel.has(key)).toBe(true);
        }
        expect(keys).toContain('success');
        expect(keys).toContain('data');

        if (meta === undefined) {
          // No meta supplied -> the key must be absent entirely.
          expect(Object.prototype.hasOwnProperty.call(envelope, 'meta')).toBe(false);
        } else {
          // meta is present and preserved verbatim...
          expect(Object.prototype.hasOwnProperty.call(envelope, 'meta')).toBe(true);
          expect(envelope.meta).toEqual(meta);
          // ...and carries only recognised pagination fields.
          for (const metaKey of Object.keys(envelope.meta!)) {
            expect(META_PAGINATION_KEYS.has(metaKey)).toBe(true);
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
