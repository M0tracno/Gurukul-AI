import mongoose, { Schema, Document, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BaseRepository, QueryOptions } from './baseRepository.js';

// Test document interface
interface ITestDoc extends Document {
  name: string;
  email: string;
  age: number;
  deletedAt?: Date | null;
  createdAt: Date;
}

// Test schema
const TestSchema = new Schema<ITestDoc>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  age: { type: Number, required: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

let mongoServer: MongoMemoryServer;
let TestModel: Model<ITestDoc>;
let repository: BaseRepository<ITestDoc>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  TestModel = mongoose.model<ITestDoc>('TestDoc', TestSchema);
  repository = new BaseRepository<ITestDoc>(TestModel);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await TestModel.deleteMany({});
});

describe('BaseRepository', () => {
  describe('create', () => {
    it('should create a new document', async () => {
      const data = { name: 'Alice', email: 'alice@test.com', age: 25 };
      const result = await repository.create(data);

      expect(result.name).toBe('Alice');
      expect(result.email).toBe('alice@test.com');
      expect(result.age).toBe(25);
      expect(result._id).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find a document by ID', async () => {
      const doc = await TestModel.create({ name: 'Bob', email: 'bob@test.com', age: 30 });

      const result = await repository.findById(doc._id.toString());

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Bob');
    });

    it('should return null for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await repository.findById(fakeId);

      expect(result).toBeNull();
    });

    it('should exclude soft-deleted records by default', async () => {
      const doc = await TestModel.create({
        name: 'Deleted',
        email: 'deleted@test.com',
        age: 40,
        deletedAt: new Date(),
      });

      const result = await repository.findById(doc._id.toString());

      expect(result).toBeNull();
    });

    it('should include soft-deleted records when includeDeleted is true', async () => {
      const doc = await TestModel.create({
        name: 'Deleted',
        email: 'deleted@test.com',
        age: 40,
        deletedAt: new Date(),
      });

      const result = await repository.findById(doc._id.toString(), { includeDeleted: true });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Deleted');
    });
  });

  describe('findByIdIncludingDeleted', () => {
    it('should find soft-deleted records', async () => {
      const doc = await TestModel.create({
        name: 'SoftDeleted',
        email: 'soft@test.com',
        age: 35,
        deletedAt: new Date(),
      });

      const result = await repository.findByIdIncludingDeleted(doc._id.toString());

      expect(result).not.toBeNull();
      expect(result!.name).toBe('SoftDeleted');
    });

    it('should find non-deleted records too', async () => {
      const doc = await TestModel.create({ name: 'Active', email: 'active@test.com', age: 28 });

      const result = await repository.findByIdIncludingDeleted(doc._id.toString());

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Active');
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      await TestModel.create([
        { name: 'Alice', email: 'alice@test.com', age: 25 },
        { name: 'Bob', email: 'bob@test.com', age: 30 },
        { name: 'Charlie', email: 'charlie@test.com', age: 35 },
        { name: 'Deleted', email: 'del@test.com', age: 40, deletedAt: new Date() },
      ]);
    });

    it('should exclude soft-deleted records by default', async () => {
      const results = await repository.findMany({});

      expect(results).toHaveLength(3);
      expect(results.map(r => r.name)).not.toContain('Deleted');
    });

    it('should include soft-deleted records when includeDeleted is true', async () => {
      const results = await repository.findMany({}, { includeDeleted: true });

      expect(results).toHaveLength(4);
    });

    it('should apply pagination', async () => {
      const results = await repository.findMany({}, { page: 1, limit: 2 });

      expect(results).toHaveLength(2);
    });

    it('should apply second page pagination', async () => {
      const page1 = await repository.findMany({}, { page: 1, limit: 2, sortBy: 'name', sortOrder: 'asc' });
      const page2 = await repository.findMany({}, { page: 2, limit: 2, sortBy: 'name', sortOrder: 'asc' });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
      // Page 1 and page 2 should not overlap
      const page1Names = page1.map(r => r.name);
      const page2Names = page2.map(r => r.name);
      expect(page1Names).not.toEqual(expect.arrayContaining(page2Names));
    });

    it('should apply sorting ascending', async () => {
      const results = await repository.findMany({}, { sortBy: 'age', sortOrder: 'asc' });

      expect(results[0].age).toBe(25);
      expect(results[2].age).toBe(35);
    });

    it('should apply sorting descending', async () => {
      const results = await repository.findMany({}, { sortBy: 'age', sortOrder: 'desc' });

      expect(results[0].age).toBe(35);
      expect(results[2].age).toBe(25);
    });

    it('should apply filter criteria', async () => {
      const results = await repository.findMany({ age: { $gte: 30 } } as any);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.age >= 30)).toBe(true);
    });

    it('should apply limit without page', async () => {
      const results = await repository.findMany({}, { limit: 1 });

      expect(results).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update a document and return the updated version', async () => {
      const doc = await TestModel.create({ name: 'Original', email: 'orig@test.com', age: 20 });

      const result = await repository.update(doc._id.toString(), { name: 'Updated' } as Partial<ITestDoc>);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated');
    });

    it('should not update soft-deleted records', async () => {
      const doc = await TestModel.create({
        name: 'Deleted',
        email: 'del@test.com',
        age: 45,
        deletedAt: new Date(),
      });

      const result = await repository.update(doc._id.toString(), { name: 'Revived' } as Partial<ITestDoc>);

      expect(result).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await repository.update(fakeId, { name: 'Nope' } as Partial<ITestDoc>);

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt field to current date', async () => {
      const doc = await TestModel.create({ name: 'ToDelete', email: 'td@test.com', age: 50 });

      await repository.softDelete(doc._id.toString());

      const found = await TestModel.findById(doc._id);
      expect(found!.deletedAt).not.toBeNull();
      expect(found!.deletedAt).toBeInstanceOf(Date);
    });

    it('should make the record invisible to standard findById', async () => {
      const doc = await TestModel.create({ name: 'ToDelete', email: 'td@test.com', age: 50 });

      await repository.softDelete(doc._id.toString());

      const result = await repository.findById(doc._id.toString());
      expect(result).toBeNull();
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await TestModel.create([
        { name: 'A', email: 'a@test.com', age: 20 },
        { name: 'B', email: 'b@test.com', age: 25 },
        { name: 'C', email: 'c@test.com', age: 30, deletedAt: new Date() },
      ]);
    });

    it('should count records excluding soft-deleted by default', async () => {
      const count = await repository.count({});

      expect(count).toBe(2);
    });

    it('should count all records when includeDeleted is true', async () => {
      const count = await repository.count({}, { includeDeleted: true });

      expect(count).toBe(3);
    });

    it('should count with filter', async () => {
      const count = await repository.count({ age: { $gte: 25 } } as any);

      expect(count).toBe(1); // Only age=25, age=30 is deleted
    });
  });
});
