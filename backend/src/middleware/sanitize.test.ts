import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { sanitizeInput, sanitizeMiddleware } from './sanitize.js';
import type { Request, Response, NextFunction } from 'express';

describe('sanitizeInput', () => {
  describe('script tag removal', () => {
    it('removes basic script tags and their content', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      expect(sanitizeInput(input)).toBe('Hello  World');
    });

    it('removes script tags with attributes', () => {
      const input = '<script type="text/javascript" src="evil.js"></script>Safe';
      expect(sanitizeInput(input)).toBe('Safe');
    });

    it('removes script tags case-insensitively', () => {
      const input = '<SCRIPT>evil()</SCRIPT>ok';
      expect(sanitizeInput(input)).toBe('ok');
    });

    it('removes multiple script tags', () => {
      const input = '<script>a()</script>text<script>b()</script>';
      expect(sanitizeInput(input)).toBe('text');
    });
  });

  describe('HTML tag stripping', () => {
    it('removes simple HTML tags', () => {
      const input = '<p>Hello</p>';
      expect(sanitizeInput(input)).toBe('Hello');
    });

    it('removes tags with attributes', () => {
      const input = '<div class="danger" onclick="evil()">Content</div>';
      expect(sanitizeInput(input)).toBe('Content');
    });

    it('removes self-closing tags', () => {
      const input = 'Line1<br/>Line2';
      expect(sanitizeInput(input)).toBe('Line1Line2');
    });

    it('removes HTML comments', () => {
      const input = '<!-- secret -->visible';
      expect(sanitizeInput(input)).toBe('visible');
    });

    it('removes style tags and their content', () => {
      const input = '<style>body{display:none}</style>visible';
      expect(sanitizeInput(input)).toBe('visible');
    });

    it('removes nested tags', () => {
      const input = '<div><span><b>text</b></span></div>';
      expect(sanitizeInput(input)).toBe('text');
    });
  });

  describe('HTML entity encoding', () => {
    it('encodes ampersands', () => {
      expect(sanitizeInput('A & B')).toBe('A &amp; B');
    });

    it('encodes less-than when not part of a tag pattern', () => {
      // Note: `< b >` looks like an HTML tag to the regex, so it gets stripped.
      // Standalone < and > without forming tag patterns get encoded.
      expect(sanitizeInput('5 < 10')).toBe('5 &lt; 10');
      expect(sanitizeInput('10 > 5')).toBe('10 &gt; 5');
    });

    it('encodes double quotes', () => {
      expect(sanitizeInput('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('encodes single quotes', () => {
      expect(sanitizeInput("it's")).toBe("it&#x27;s");
    });
  });

  describe('javascript: protocol removal', () => {
    it('removes javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
    });

    it('removes case-insensitive variations', () => {
      expect(sanitizeInput('JAVASCRIPT:evil()')).toBe('evil()');
    });

    it('removes with whitespace before colon', () => {
      expect(sanitizeInput('javascript :evil()')).toBe('evil()');
    });
  });

  describe('idempotence', () => {
    it('applying twice produces the same result as once', () => {
      const inputs = [
        '<script>alert("xss")</script>Hello',
        '<p>Some & "text"</p>',
        'javascript:void(0)',
        'Normal text without any HTML',
        '<div onclick="hack()">click me</div>',
        '&amp; already encoded',
        '<style>.hide{display:none}</style>shown',
      ];

      for (const input of inputs) {
        const once = sanitizeInput(input);
        const twice = sanitizeInput(once);
        expect(twice).toBe(once);
      }
    });

    it('handles already-encoded entities without double-encoding', () => {
      const input = '&amp;';
      const once = sanitizeInput(input);
      const twice = sanitizeInput(once);
      expect(once).toBe(twice);
    });
  });

  describe('normal text passthrough', () => {
    it('leaves plain text unchanged', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
    });

    it('leaves numbers unchanged', () => {
      expect(sanitizeInput('12345')).toBe('12345');
    });

    it('preserves whitespace', () => {
      expect(sanitizeInput('  spaces  and\ttabs\n')).toBe('  spaces  and\ttabs\n');
    });

    it('leaves empty string unchanged', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('leaves unicode text unchanged', () => {
      expect(sanitizeInput('こんにちは 🌍')).toBe('こんにちは 🌍');
    });
  });
});

describe('sanitizeMiddleware', () => {
  function createMockRequest(overrides: Partial<Request> = {}): Request {
    return {
      body: {},
      query: {},
      params: {},
      ...overrides,
    } as unknown as Request;
  }

  const mockRes = {} as Response;
  const mockNext: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sanitizes string values in req.body', () => {
    const req = createMockRequest({
      body: { name: '<script>alert("xss")</script>John', age: 25 },
    });

    sanitizeMiddleware(req, mockRes, mockNext);

    expect(req.body.name).toBe('John');
    expect(req.body.age).toBe(25);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('sanitizes string values in req.query', () => {
    const req = createMockRequest({
      query: { search: '<b>bold</b>' } as unknown as Request['query'],
    });

    sanitizeMiddleware(req, mockRes, mockNext);

    expect(req.query.search).toBe('bold');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('sanitizes string values in req.params', () => {
    const req = createMockRequest({
      params: { id: '<script>x</script>123' } as unknown as Request['params'],
    });

    sanitizeMiddleware(req, mockRes, mockNext);

    expect(req.params.id).toBe('123');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('recursively sanitizes nested objects', () => {
    const req = createMockRequest({
      body: {
        user: {
          name: '<img src=x onerror=alert(1)>Bob',
          address: {
            city: '<script>steal()</script>Mumbai',
          },
        },
      },
    });

    sanitizeMiddleware(req, mockRes, mockNext);

    expect(req.body.user.name).toBe('Bob');
    expect(req.body.user.address.city).toBe('Mumbai');
  });

  it('recursively sanitizes arrays', () => {
    const req = createMockRequest({
      body: {
        tags: ['<b>safe</b>', 'normal', '<script>x</script>ok'],
      },
    });

    sanitizeMiddleware(req, mockRes, mockNext);

    expect(req.body.tags).toEqual(['safe', 'normal', 'ok']);
  });

  it('preserves non-string values', () => {
    const req = createMockRequest({
      body: { count: 42, active: true, data: null },
    });

    sanitizeMiddleware(req, mockRes, mockNext);

    expect(req.body.count).toBe(42);
    expect(req.body.active).toBe(true);
    expect(req.body.data).toBe(null);
  });

  it('calls next() after sanitization', () => {
    const req = createMockRequest();
    sanitizeMiddleware(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
