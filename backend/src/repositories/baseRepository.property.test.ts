/**
 * Property-Based Test: Soft-Delete Exclusion (Property 4)
 *
 * Feature: gurukul-ai-modernization, Property 4: Soft-Delete Exclusion
 *
 * For any set of documents where some have `deletedAt` set (non-null Date) and
 * others have `deletedAt` as null:
 * - findMany({}) without includeDeleted should NEVER return documents where deletedAt is non-null
 * - findMany({}, { includeDeleted: true }) should return ALL documents including soft-deleted ones
 * - findById(id) should return null for soft-deleted records
 * - count({}) should not count soft-deleted records
 *
 * **Validates: Requirements 3.5**
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import { BaseRepository } from './baseRepository.js';

// Test document interface
interface ITestDoc extends Document {
  name: string;
  email: string;
  age: number;
  deletedAt?: Date | null;
}

// Test schema for property tests
const PropertyTestSchema = new Schema<ITestDoc>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  age: { type: Number, required: true },
  deletedAt: { type: Date, default: null },
});

let mongoServer: MongoMemoryServer;
let TestModel: Model<ITestDoc>;
let repository: BaseRepository<ITestDoc>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  TestModel = mongoose.model<ITestDoc>('PropertyTestDoc', PropertyTestSchema);
  repository = new BaseRepository<ITestDoc>(TestModel);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await TestModel.deleteMany({});
});

// Generator for a single document record with isDeleted flag
const documentArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  email: fc.emailAddress(),
  age: fc.integer({ min: 1, max: 100 }),
  isDeleted: fc.boolean(),
});

// Generator for an array of documents (at least 1, up to 20)
const documentsArb = fc.array(documentArb, { minLength: 1, maxLength: 20 });

describe('Property 4: Soft-Delete Exclusion', () => {
  /**
   * Property: findMany({}) without includeDeleted should NEVER return documents
   * where deletedAt is non-null.
   */
  it('findMany({}) should never return soft-deleted documents', async () => {
    await fc.assert(
      fc.asyncProperty(documentsArb, async (docs) => {
        // Clean up from previous iteration
        await TestModel.deleteMany({});

        // Insert documents - set deletedAt based on isDeleted flag
        const insertedDocs = await Promise.all(
          docs.map(async (doc) => {
            const data: Record<string, unknown> = {
              name: doc.name,
              email: doc.email,
              age: doc.age,
              deletedAt: doc.isDeleted ? new Date(Date.now() - Math.random() * 86400000) : null,
            };
            return TestModel.create(data);
          })
        );

        // Query without includeDeleted
        const results = await repository.findMany({});

        // Property: No result should have a non-null deletedAt
        for (const result of results) {
          expect(result.deletedAt === null || result.deletedAt === undefined).toBe(true);
        }

        // Additional check: results should contain only the non-deleted documents
        const expectedActiveCount = docs.filter(d => !d.isDeleted).length;
        expect(results.length).toBe(expectedActiveCount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: findMany({}, { includeDeleted: true }) should return ALL documents
   * including soft-deleted ones.
   */
  it('findMany({}, { includeDeleted: true }) should return all documents', async () => {
    await fc.assert(
      fc.asyncProperty(documentsArb, async (docs) => {
        // Clean up from previous iteration
        await TestModel.deleteMany({});

        // Insert documents
        await Promise.all(
          docs.map(async (doc) => {
            const data: Record<string, unknown> = {
              name: doc.name,
              email: doc.email,
              age: doc.age,
              deletedAt: doc.isDeleted ? new Date(Date.now() - Math.random() * 86400000) : null,
            };
            return TestModel.create(data);
          })
        );

        // Query with includeDeleted
        const results = await repository.findMany({}, { includeDeleted: true });

        // Property: Should return ALL documents regardless of deletion status
        expect(results.length).toBe(docs.length);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: findById(id) should return null for soft-deleted records.
   */
  it('findById should return null for soft-deleted records', async () => {
    await fc.assert(
      fc.asyncProperty(documentsArb, async (docs) => {
        // Clean up from previous iteration
        await TestModel.deleteMany({});

        // Insert documents
        const insertedDocs = await Promise.all(
          docs.map(async (doc) => {
            const data: Record<string, unknown> = {
              name: doc.name,
              email: doc.email,
              age: doc.age,
              deletedAt: doc.isDeleted ? new Date(Date.now() - Math.random() * 86400000) : null,
            };
            return TestModel.create(data);
          })
        );

        // For each inserted document, verify findById behavior
        for (let i = 0; i < insertedDocs.length; i++) {
          const docId = insertedDocs[i]._id.toString();
          const result = await repository.findById(docId);

          if (docs[i].isDeleted) {
            // Soft-deleted records should NOT be found
            expect(result).toBeNull();
          } else {
            // Active records SHOULD be found
            expect(result).not.toBeNull();
            expect(result!._id.toString()).toBe(docId);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: count({}) should not count soft-deleted records.
   */
  it('count({}) should not count soft-deleted records', async () => {
    await fc.assert(
      fc.asyncProperty(documentsArb, async (docs) => {
        // Clean up from previous iteration
        await TestModel.deleteMany({});

        // Insert documents
        await Promise.all(
          docs.map(async (doc) => {
            const data: Record<string, unknown> = {
              name: doc.name,
              email: doc.email,
              age: doc.age,
              deletedAt: doc.isDeleted ? new Date(Date.now() - Math.random() * 86400000) : null,
            };
            return TestModel.create(data);
          })
        );

        // Count without includeDeleted
        const count = await repository.count({});

        // Property: Count should equal number of non-deleted documents
        const expectedActiveCount = docs.filter(d => !d.isDeleted).length;
        expect(count).toBe(expectedActiveCount);

        // Count with includeDeleted should return total
        const totalCount = await repository.count({}, { includeDeleted: true });
        expect(totalCount).toBe(docs.length);
      }),
      { numRuns: 100 }
    );
  });
});
