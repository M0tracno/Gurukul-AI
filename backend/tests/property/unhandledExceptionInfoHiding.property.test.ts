/**
 * Property-Based Test: Unhandled Exception Information Hiding (Property 2)
 *
 * Feature: gurukul-ai-modernization, Property 2: Unhandled Exception Information Hiding
 *
 * For any unhandled exception thrown during request processing (generated as random
 * error messages containing stack traces, file paths, database identifiers, or
 * environment variable values), the HTTP response SHALL have status 500 with a static
 * message, and SHALL NOT contain any stack trace, file path, database identifier, or
 * environment variable value.
 *
 * **Validates: Requirements 2.4**
 */

import { jest, describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import type { Request, Response, NextFunction } from 'express';

// Mock logger to avoid import.meta.url issues in ts-jest
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { globalErrorHandler } from '../../src/middleware/errorHandler.js';

/**
 * Creates a mock Express Request object.
 */
function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    path: '/api/v1/test',
    method: 'GET',
    ...overrides,
  } as unknown as Request;
}

/**
 * Creates a mock Express Response object that captures the response body and status.
 */
function createMockResponse(): Response & { _status: number; _body: unknown } {
  const res = {
    _status: 0,
    _body: null as unknown,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._body = body;
      return res;
    },
  } as unknown as Response & { _status: number; _body: unknown };
  return res;
}

const mockNext: NextFunction = () => {};

// --- Generators for sensitive content ---

/**
 * Generator for realistic stack traces containing file paths and line numbers.
 */
const stackTraceArb = fc.tuple(
  fc.constantFrom(
    'Error', 'TypeError', 'RangeError', 'ReferenceError',
    'SyntaxError', 'MongoError', 'MongooseError', 'ValidationError',
  ),
  fc.string({ minLength: 1, maxLength: 80 }),
  fc.array(
    fc.tuple(
      fc.constantFrom(
        '/app/src/services/studentService.ts',
        'C:\\Users\\dev\\project\\backend\\src\\controllers\\authController.ts',
        '/home/runner/work/gurukul-ai/backend/src/middleware/auth.ts',
        '/var/app/node_modules/mongoose/lib/query.js',
        'D:\\PROJECT FILES\\GDC\\backend\\src\\repositories\\baseRepository.ts',
      ),
      fc.nat({ max: 500 }),
      fc.nat({ max: 200 }),
    ),
    { minLength: 1, maxLength: 10 },
  ),
).map(([errorType, msg, frames]) => {
  const stackFrames = frames
    .map(([file, line, col]) => `    at Object.<anonymous> (${file}:${line}:${col})`)
    .join('\n');
  const err = new Error(`${msg}`);
  err.name = errorType;
  err.stack = `${errorType}: ${msg}\n${stackFrames}`;
  return err;
});

/**
 * Generator for errors containing file paths in the message.
 */
const filePathErrorArb = fc.tuple(
  fc.constantFrom(
    '/app/src/config/database.ts',
    '/home/user/project/backend/src/server.ts',
    'C:\\Users\\dev\\project\\backend\\src\\config\\mongodb.ts',
    'D:\\PROJECT FILES\\GDC\\backend\\config\\config.js',
    '/var/app/current/node_modules/express/lib/router/route.js',
    '../src/middleware/errorHandler.ts',
    './config/firebaseAdmin.js',
  ),
  fc.string({ minLength: 1, maxLength: 40 }),
).map(([filePath, suffix]) => {
  const err = new Error(`Cannot find module '${filePath}': ${suffix}`);
  err.stack = `Error: Cannot find module '${filePath}'\n    at require (${filePath}:1:1)`;
  return err;
});

/**
 * Generator for errors containing database identifiers (MongoDB ObjectIds, collection names).
 */
const dbIdentifierErrorArb = fc.tuple(
  fc.constantFrom(
    'MongoDB', 'Mongoose', 'MongoError', 'MongoServerError',
  ),
  fc.array(fc.constantFrom(...'0123456789abcdef'.split('')), { minLength: 24, maxLength: 24 }).map(arr => arr.join('')),
  fc.constantFrom(
    'students', 'faculty', 'courses', 'enrollments',
    'attendance', 'marks', 'messages', 'refreshtokens', 'auditlogs',
  ),
  fc.string({ minLength: 1, maxLength: 30 }),
).map(([errorType, objectId, collection, detail]) => {
  const err = new Error(
    `${errorType}: E11000 duplicate key error collection: gurukul.${collection} index: _id_ dup key: { _id: ObjectId('${objectId}') } ${detail}`,
  );
  err.name = errorType;
  err.stack = `${errorType}: E11000 duplicate key error\n    at Connection.<anonymous> (/app/node_modules/mongoose/lib/connection.js:42:11)`;
  return err;
});

/**
 * Generator for errors containing environment variable values.
 */
const envVarErrorArb = fc.tuple(
  fc.constantFrom(
    'MONGO_URI=mongodb+srv://admin:secret@cluster0.mongodb.net/gurukul',
    'JWT_SECRET=super_secret_jwt_key_2024',
    'REDIS_URL=redis://:password123@redis-host:6379',
    'SMTP_PASSWORD=my_email_password',
    'FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvgIBAD...',
    'API_KEY=AIzaSyD-random-api-key-string',
    'DATABASE_URL=mongodb://root:rootpass@localhost:27017/gurukul',
    'SESSION_SECRET=keyboard_cat_session_secret_123',
  ),
  fc.string({ minLength: 0, maxLength: 20 }),
).map(([envContent, prefix]) => {
  const err = new Error(`Configuration error: ${prefix} ${envContent}`);
  err.stack = `Error: Configuration error: ${prefix} ${envContent}\n    at loadConfig (/app/src/config/index.ts:15:5)`;
  return err;
});

/**
 * Combined generator for any kind of sensitive exception.
 */
const sensitiveExceptionArb = fc.oneof(
  stackTraceArb,
  filePathErrorArb,
  dbIdentifierErrorArb,
  envVarErrorArb,
);

// --- Patterns used to detect leakage ---

/** Patterns that indicate a stack trace is present in a string */
const STACK_TRACE_PATTERNS = [
  /at\s+\S+\s+\(/,             // "at Function (path:line:col)"
  /at\s+Object\./,             // "at Object.<anonymous>"
  /at\s+Module\./,             // "at Module._compile"
  /at\s+\S+:\d+:\d+/,         // "at /path/to/file.ts:10:5"
  /^\s+at\s+/m,               // indented "at " lines
];

/** Patterns indicating file paths */
const FILE_PATH_PATTERNS = [
  /\/app\/src\//,
  /\/home\/[^/]+\//,
  /[A-Z]:\\[^"'\s]+\.\w+/,    // Windows paths like C:\Users\...
  /\.\.\/src\//,
  /\.\/config\//,
  /node_modules\//,
  /\/var\/app\//,
  /\.(ts|js|tsx|jsx):\d+/,    // file.ts:lineNumber
];

/** Patterns indicating database identifiers */
const DB_IDENTIFIER_PATTERNS = [
  /ObjectId\(['"][0-9a-f]{24}['"]\)/i,
  /E11000\s+duplicate\s+key/i,
  /collection:\s*\w+\.\w+/i,
  /index:\s*_id_/i,
  /dup\s+key/i,
];

/** Patterns indicating environment variable leakage */
const ENV_VAR_PATTERNS = [
  /mongodb(\+srv)?:\/\/[^"'\s]+/i,     // MongoDB URIs
  /redis:\/\/[^"'\s]+/i,                // Redis URIs
  /-----BEGIN\s+(PRIVATE|RSA)\s+KEY/,   // Private keys
  /JWT_SECRET\s*=/i,
  /API_KEY\s*=/i,
  /SMTP_PASSWORD\s*=/i,
  /SESSION_SECRET\s*=/i,
  /DATABASE_URL\s*=/i,
  /FIREBASE_PRIVATE_KEY\s*=/i,
];

/**
 * Checks whether a stringified response body contains any sensitive information.
 */
function containsSensitiveInfo(body: unknown): { leaked: boolean; reason?: string } {
  const serialized = JSON.stringify(body);

  for (const pattern of STACK_TRACE_PATTERNS) {
    if (pattern.test(serialized)) {
      return { leaked: true, reason: `Stack trace pattern found: ${pattern}` };
    }
  }

  for (const pattern of FILE_PATH_PATTERNS) {
    if (pattern.test(serialized)) {
      return { leaked: true, reason: `File path pattern found: ${pattern}` };
    }
  }

  for (const pattern of DB_IDENTIFIER_PATTERNS) {
    if (pattern.test(serialized)) {
      return { leaked: true, reason: `DB identifier pattern found: ${pattern}` };
    }
  }

  for (const pattern of ENV_VAR_PATTERNS) {
    if (pattern.test(serialized)) {
      return { leaked: true, reason: `Env var pattern found: ${pattern}` };
    }
  }

  return { leaked: false };
}

describe('Property 2: Unhandled Exception Information Hiding', () => {
  /**
   * Property: For any unhandled exception containing stack traces, file paths,
   * DB identifiers, or env vars, the 500 response SHALL only show a static
   * error message and SHALL NOT leak sensitive information.
   */
  it('500 responses never contain stack traces, file paths, DB identifiers, or env vars', () => {
    fc.assert(
      fc.property(sensitiveExceptionArb, (error) => {
        const req = createMockRequest();
        const res = createMockResponse();

        globalErrorHandler(error, req, res, mockNext);

        // Must return 500
        expect(res._status).toBe(500);

        // Must have the expected static envelope structure
        const body = res._body as { success: boolean; message: string };
        expect(body.success).toBe(false);
        expect(body.message).toBe('An internal error occurred');

        // Must NOT contain any sensitive information
        const result = containsSensitiveInfo(body);
        expect(result.leaked).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: The 500 response body only contains exactly the 'success' and 'message' fields
   * (no extra fields that could leak data).
   */
  it('500 response body contains only success and message fields', () => {
    fc.assert(
      fc.property(sensitiveExceptionArb, (error) => {
        const req = createMockRequest();
        const res = createMockResponse();

        globalErrorHandler(error, req, res, mockNext);

        const body = res._body as Record<string, unknown>;
        const keys = Object.keys(body);

        // Only 'success' and 'message' allowed — no details, stack, etc.
        expect(keys).toEqual(['success', 'message']);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: The static error message is the same regardless of what exception is thrown.
   * This ensures no dynamic exception content leaks into the response.
   */
  it('response message is always the same static string regardless of exception content', () => {
    fc.assert(
      fc.property(sensitiveExceptionArb, (error) => {
        const req = createMockRequest();
        const res = createMockResponse();

        globalErrorHandler(error, req, res, mockNext);

        const body = res._body as { success: boolean; message: string };

        // The response must always be exactly this — no dynamic content
        expect(body).toEqual({
          success: false,
          message: 'An internal error occurred',
        });
      }),
      { numRuns: 100 },
    );
  });
});
