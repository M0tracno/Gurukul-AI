/**
 * Property 5: Schema Validation Consistency
 *
 * For any document submitted to a soft-deletable collection that violates a Mongoose
 * schema validation rule, the write operation SHALL be rejected with an error identifying
 * the invalid field and the violated constraint.
 *
 * Feature: gurukul-ai-modernization, Property 5: Schema Validation Consistency
 *
 * **Validates: Requirements 3.6**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import Student from '../../src/models/Student.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Student.deleteMany({});
});

/**
 * Helper: generates a valid student document base that passes all validations.
 */
function validStudentData(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'John',
    lastName: 'Doe',
    email: `student_${Date.now()}_${Math.random().toString(36).slice(2)}@school.edu`,
    password: 'securePass123',
    studentId: `STU-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    grade: '10th',
    ...overrides,
  };
}

/**
 * Arbitrary that generates invalid email strings — strings that do NOT match
 * the email regex /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
 */
const invalidEmailArb = fc.oneof(
  // No @ symbol at all
  fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('@')),
  // @ but nothing after it
  fc.string({ minLength: 1, maxLength: 10 }).map((s) => `${s.replace(/@/g, 'a')}@`),
  // @ but domain with no TLD (no dot in domain part)
  fc.tuple(
    fc.string({ minLength: 1, maxLength: 8 }).map((s) => s.replace(/[^a-z0-9]/g, 'x') || 'user'),
    fc.string({ minLength: 1, maxLength: 8 }).map((s) => s.replace(/[^a-z0-9]/g, 'x') || 'domain')
  ).map(([local, domain]) => `${local}@${domain}`),
  // Multiple consecutive dots in domain
  fc.string({ minLength: 1, maxLength: 5 }).map((s) => `${s.replace(/[^a-z]/g, 'a') || 'user'}@domain..com`),
  // Empty string
  fc.constant('')
);

/**
 * Arbitrary that generates short passwords (length 1 to 5)
 */
const shortPasswordArb = fc.string({ minLength: 1, maxLength: 5 });

describe('Property 5: Schema Validation Consistency', () => {
  describe('Missing required fields', () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'studentId', 'grade'] as const;

    it('should reject documents missing any single required field with a ValidationError identifying that field', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...requiredFields),
          async (fieldToOmit) => {
            const data = validStudentData();
            delete (data as Record<string, unknown>)[fieldToOmit];

            const doc = new Student(data);
            let error: mongoose.Error.ValidationError | null = null;

            try {
              await doc.validate();
            } catch (err) {
              error = err as mongoose.Error.ValidationError;
            }

            // Must throw a ValidationError
            expect(error).not.toBeNull();
            expect(error).toBeInstanceOf(mongoose.Error.ValidationError);

            // Error must identify the specific field that failed
            expect(error!.errors).toHaveProperty(fieldToOmit);

            // Error must include a message explaining the constraint violation
            const fieldError = error!.errors[fieldToOmit];
            expect(fieldError.message).toBeDefined();
            expect(fieldError.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Invalid email format', () => {
    it('should reject documents with emails that do not match the email regex', async () => {
      await fc.assert(
        fc.asyncProperty(
          invalidEmailArb,
          async (badEmail) => {
            const data = validStudentData({ email: badEmail });
            const doc = new Student(data);
            let error: mongoose.Error.ValidationError | null = null;

            try {
              await doc.validate();
            } catch (err) {
              error = err as mongoose.Error.ValidationError;
            }

            // Must throw a ValidationError
            expect(error).not.toBeNull();
            expect(error).toBeInstanceOf(mongoose.Error.ValidationError);

            // Error must identify the email field
            expect(error!.errors).toHaveProperty('email');

            // Error message must explain the constraint
            const emailError = error!.errors['email'];
            expect(emailError.message).toBeDefined();
            expect(emailError.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Password too short', () => {
    it('should reject documents with passwords shorter than 6 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          shortPasswordArb,
          async (shortPass) => {
            const data = validStudentData({ password: shortPass });
            const doc = new Student(data);
            let error: mongoose.Error.ValidationError | null = null;

            try {
              await doc.validate();
            } catch (err) {
              error = err as mongoose.Error.ValidationError;
            }

            // Must throw a ValidationError
            expect(error).not.toBeNull();
            expect(error).toBeInstanceOf(mongoose.Error.ValidationError);

            // Error must identify the password field
            expect(error!.errors).toHaveProperty('password');

            // Error message must reference the minimum length constraint
            const passError = error!.errors['password'];
            expect(passError.message).toBeDefined();
            expect(passError.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
