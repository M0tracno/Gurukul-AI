/**
 * Property-Based Test: Input Sanitization Idempotence (Property 26)
 *
 * Feature: gurukul-ai-modernization, Property 26: Input Sanitization Idempotence
 *
 * For any string input, applying the sanitization function twice SHALL produce
 * the same result as applying it once (idempotent), and the output SHALL contain
 * no raw HTML tags or executable script content.
 *
 * **Validates: Requirements 9.4, 12.1**
 */

import * as fc from 'fast-check';
import { sanitizeInput } from '../../src/middleware/sanitize.js';

/**
 * Checks if a string contains any raw HTML tags (opening or self-closing).
 * HTML comments are also considered raw HTML.
 */
function containsRawHtmlTags(str: string): boolean {
  // Match opening/closing/self-closing tags like <div>, </p>, <br/>, <img />
  return /<[a-zA-Z/!][^>]*>/.test(str);
}

/**
 * Checks if a string contains executable script content.
 * Looks for script tags, javascript: protocol, event handlers, etc.
 */
function containsScriptContent(str: string): boolean {
  // Check for <script> tags (should be stripped by sanitizer)
  if (/<script\b/i.test(str)) return true;

  // Check for javascript: protocol (case-insensitive, optional whitespace)
  if (/javascript\s*:/i.test(str)) return true;

  return false;
}

// Generator for arbitrary strings including plain text
const plainTextArb = fc.string({ minLength: 0, maxLength: 200 });

// Generator for strings with HTML content
const htmlStringArb = fc.oneof(
  // Simple tags
  fc.constantFrom(
    '<div>hello</div>',
    '<p class="test">content</p>',
    '<img src="x.png" />',
    '<a href="http://example.com">link</a>',
    '<br/>',
    '<span style="color:red">styled</span>',
    '<!-- comment -->'
  ),
  // Generated HTML-like strings
  fc.tuple(
    fc.constantFrom('<div>', '<span>', '<p>', '<h1>', '<table>', '<input>', '<img', '<a href="x">'),
    fc.string({ minLength: 0, maxLength: 50 }),
    fc.constantFrom('</div>', '</span>', '</p>', '</h1>', '</table>', '>', '/>')
  ).map(([open, content, close]) => `${open}${content}${close}`)
);

// Generator for strings with script content
const scriptStringArb = fc.oneof(
  fc.constantFrom(
    '<script>alert("xss")</script>',
    '<SCRIPT>document.cookie</SCRIPT>',
    '<script type="text/javascript">var x=1;</script>',
    '<script src="evil.js"></script>',
    'javascript:alert(1)',
    'JAVASCRIPT:void(0)',
    'java script:alert(1)',
    '<style>body{display:none}</style>'
  ),
  // Generated script variations
  fc.string({ minLength: 1, maxLength: 50 }).map(s => `<script>${s}</script>`),
  fc.string({ minLength: 1, maxLength: 30 }).map(s => `javascript:${s}`)
);

// Generator for strings with HTML entities (tests double-encoding prevention)
const entityStringArb = fc.oneof(
  fc.constantFrom(
    '&amp;', '&lt;', '&gt;', '&quot;', '&#x27;', '&#39;',
    '&amp;lt;', '&amp;amp;',
    'Tom &amp; Jerry',
    '5 &lt; 10 &amp;&amp; 10 &gt; 5',
    'She said &quot;hello&quot;',
    'It&#x27;s fine'
  ),
  // Mix of entities and normal text
  fc.tuple(
    fc.string({ minLength: 0, maxLength: 30 }),
    fc.constantFrom('&amp;', '&lt;', '&gt;', '&quot;', '&#x27;'),
    fc.string({ minLength: 0, maxLength: 30 })
  ).map(([before, entity, after]) => `${before}${entity}${after}`)
);

// Generator for strings with unicode characters
const unicodeStringArb = fc.oneof(
  // fast-check's string() already generates unicode by default
  fc.string({ minLength: 0, maxLength: 100 }),
  fc.constantFrom(
    '你好世界',
    'مرحبا',
    '🎓📚✅❌',
    'Ñoño señor',
    'Ünïcödë tëxt',
    '\u200B\u200C\u200D\uFEFF', // Zero-width chars
    '⚡️🔥💻🎉',
    'Ω≈ç√∫≤≥÷',
    '田中太郎',
    'Привет мир'
  )
);

// Combined generator that mixes all categories
const mixedInputArb = fc.oneof(
  plainTextArb,
  htmlStringArb,
  scriptStringArb,
  entityStringArb,
  unicodeStringArb,
  // Mixed: combine HTML/script with normal text
  fc.tuple(plainTextArb, htmlStringArb, plainTextArb)
    .map(([before, html, after]) => `${before}${html}${after}`),
  fc.tuple(plainTextArb, scriptStringArb, plainTextArb)
    .map(([before, script, after]) => `${before}${script}${after}`)
);

describe('Property 26: Input Sanitization Idempotence', () => {
  /**
   * Property: sanitize(sanitize(x)) === sanitize(x) for any string input.
   * This ensures the sanitization function is idempotent — applying it multiple
   * times produces the same result as applying it once.
   */
  it('sanitizeInput() should be idempotent: sanitize(sanitize(x)) === sanitize(x)', () => {
    fc.assert(
      fc.property(mixedInputArb, (input) => {
        const once = sanitizeInput(input);
        const twice = sanitizeInput(once);

        expect(twice).toBe(once);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The output of sanitizeInput() should never contain raw HTML tags.
   * All tags must be stripped during sanitization.
   */
  it('sanitizeInput() output should contain no raw HTML tags', () => {
    fc.assert(
      fc.property(mixedInputArb, (input) => {
        const sanitized = sanitizeInput(input);

        expect(containsRawHtmlTags(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The output of sanitizeInput() should never contain executable
   * script content (script tags or javascript: protocol).
   */
  it('sanitizeInput() output should contain no executable script content', () => {
    fc.assert(
      fc.property(mixedInputArb, (input) => {
        const sanitized = sanitizeInput(input);

        expect(containsScriptContent(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Idempotence specifically for HTML entity strings.
   * Ensures no double-encoding of already-encoded entities.
   */
  it('sanitizeInput() should be idempotent for strings with HTML entities', () => {
    fc.assert(
      fc.property(entityStringArb, (input) => {
        const once = sanitizeInput(input);
        const twice = sanitizeInput(once);

        expect(twice).toBe(once);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Idempotence for unicode strings.
   * Unicode characters should pass through unchanged after sanitization,
   * and re-sanitizing should not modify the result.
   */
  it('sanitizeInput() should be idempotent for unicode strings', () => {
    fc.assert(
      fc.property(unicodeStringArb, (input) => {
        const once = sanitizeInput(input);
        const twice = sanitizeInput(once);

        expect(twice).toBe(once);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Idempotence specifically for script injection attempts.
   * The output after sanitization should remain stable on re-sanitization.
   */
  it('sanitizeInput() should be idempotent for script injection strings', () => {
    fc.assert(
      fc.property(scriptStringArb, (input) => {
        const once = sanitizeInput(input);
        const twice = sanitizeInput(once);

        expect(twice).toBe(once);
      }),
      { numRuns: 100 }
    );
  });
});
