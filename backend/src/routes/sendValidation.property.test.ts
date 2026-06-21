/**
 * Property-Based Test: Send validation accepts valid input and rejects invalid input.
 *
 * Feature: communication-feedback-and-admin-apis, Property 7: Send validation accepts valid input and rejects invalid input
 *
 * Property 7: For any send input that has an empty subject or content, a content
 * longer than 2000 characters, a subject longer than 200 characters, or a missing
 * required recipient or student identifier, validation fails with 400; for any
 * input violating none of these rules, validation does not reject it.
 *
 * The test exercises `sendMessageBodySchema` directly via `safeParse` — the schema
 * is the unit the Validation_Middleware applies, and a parse failure is exactly what
 * produces the HTTP 400 failure Envelope at the route boundary (Req 3.2). The schema
 * trims `subject`/`content`, so "empty" includes whitespace-only strings.
 *
 * **Validates: Requirements 3.2**
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';

import { sendMessageBodySchema } from './messageRoutes.js';

// ---------------------------------------------------------------------------
// Constants mirroring the schema rules under test (Req 3.2)
// ---------------------------------------------------------------------------

const SUBJECT_MAX = 200;
const CONTENT_MAX = 2000;
const RECIPIENT_MODELS = ['Parent', 'Faculty'] as const;

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

// A bounded, non-empty (after trim) string within [min, max] visible chars.
const nonEmptyBounded = (max: number) =>
  fc.string({ minLength: 1, maxLength: max }).map((s) => `x${s}`.slice(0, max));

// A valid send-message body: every field satisfies the schema rules.
const validBodyArb = fc.record({
  subject: nonEmptyBounded(SUBJECT_MAX),
  content: nonEmptyBounded(CONTENT_MAX),
  recipientId: fc.string({ minLength: 1, maxLength: 30 }),
  recipientModel: fc.constantFrom(...RECIPIENT_MODELS),
  studentId: fc.string({ minLength: 1, maxLength: 30 }),
});

// An "empty" string from the schema's perspective: empty or whitespace-only,
// since the schema applies `.trim()` before the min(1) check.
const emptyAfterTrimArb = fc.constantFrom('', ' ', '   ', '\t', '\n', '  \t \n');

// ---------------------------------------------------------------------------
// Property 7
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 7: Send validation accepts valid input and rejects invalid input
describe('Property 7: Send validation accepts valid input and rejects invalid input', () => {
  it('accepts any input that violates none of the send rules', () => {
    fc.assert(
      fc.property(validBodyArb, (body) => {
        const result = sendMessageBodySchema.safeParse(body);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects an empty (or whitespace-only) subject', () => {
    fc.assert(
      fc.property(validBodyArb, emptyAfterTrimArb, (body, subject) => {
        const result = sendMessageBodySchema.safeParse({ ...body, subject });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects an empty (or whitespace-only) content', () => {
    fc.assert(
      fc.property(validBodyArb, emptyAfterTrimArb, (body, content) => {
        const result = sendMessageBodySchema.safeParse({ ...body, content });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects a subject longer than 200 characters', () => {
    fc.assert(
      fc.property(
        validBodyArb,
        fc.integer({ min: SUBJECT_MAX + 1, max: SUBJECT_MAX + 500 }),
        (body, len) => {
          const subject = 'a'.repeat(len);
          const result = sendMessageBodySchema.safeParse({ ...body, subject });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects content longer than 2000 characters', () => {
    fc.assert(
      fc.property(
        validBodyArb,
        fc.integer({ min: CONTENT_MAX + 1, max: CONTENT_MAX + 1000 }),
        (body, len) => {
          const content = 'a'.repeat(len);
          const result = sendMessageBodySchema.safeParse({ ...body, content });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects a missing required recipient identifier', () => {
    fc.assert(
      fc.property(validBodyArb, (body) => {
        const { recipientId: _omit, ...rest } = body;
        const result = sendMessageBodySchema.safeParse(rest);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects a missing required recipient model', () => {
    fc.assert(
      fc.property(validBodyArb, (body) => {
        const { recipientModel: _omit, ...rest } = body;
        const result = sendMessageBodySchema.safeParse(rest);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects a missing required student identifier', () => {
    fc.assert(
      fc.property(validBodyArb, (body) => {
        const { studentId: _omit, ...rest } = body;
        const result = sendMessageBodySchema.safeParse(rest);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
