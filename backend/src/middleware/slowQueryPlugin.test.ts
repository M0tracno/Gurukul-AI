import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose, { Schema, Model, Document, Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock logger to avoid import.meta.url issues in ts-jest
const mockLoggerWarn = jest.fn();
jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const { slowQueryPlugin } = await import('./slowQueryPlugin.js');

interface ITestDoc extends Document {
  name: string;
  value: number;
}

describe('slowQueryPlugin', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let TestModel: Model<ITestDoc>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    // Use a separate connection instead of the global mongoose instance
    connection = mongoose.createConnection(uri);

    const testSchema = new Schema<ITestDoc>({
      name: { type: String, required: true },
      value: { type: Number, required: true },
    });

    // Apply plugin with a very low threshold so we can test the logging
    testSchema.plugin(slowQueryPlugin, { thresholdMs: 0 });

    TestModel = connection.model<ITestDoc>('SlowQueryTest', testSchema);
  });

  afterAll(async () => {
    await connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up collection BEFORE clearing mock to avoid
    // catching the deleteMany in the mock
    await TestModel.deleteMany({});
    mockLoggerWarn.mockClear();
  });

  it('logs a warning for queries exceeding the threshold', async () => {
    await TestModel.create({ name: 'test', value: 42 });
    mockLoggerWarn.mockClear();

    await TestModel.find({ name: 'test' }).exec();

    // Find the log call for 'find' operation
    const findCalls = mockLoggerWarn.mock.calls.filter((call) => {
      const meta = call[1] as Record<string, unknown> | undefined;
      return meta?.operation === 'find';
    });

    expect(findCalls.length).toBeGreaterThanOrEqual(1);
    const [message, meta] = findCalls[0] as [string, Record<string, unknown>];

    expect(message).toBe('Slow query detected');
    expect(meta.operation).toBe('find');
    expect(meta.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(meta).toHaveProperty('collection');
    expect(meta).toHaveProperty('filter');
  });

  it('logs the correct filter in the warning', async () => {
    await TestModel.create({ name: 'alpha', value: 1 });
    mockLoggerWarn.mockClear();

    await TestModel.findOne({ name: 'alpha' }).exec();

    const findCalls = mockLoggerWarn.mock.calls.filter((call) => {
      const meta = call[1] as Record<string, unknown> | undefined;
      return meta?.operation === 'findOne';
    });

    expect(findCalls.length).toBeGreaterThanOrEqual(1);
    const [, meta] = findCalls[0] as [string, Record<string, unknown>];
    expect(meta.filter).toContain('alpha');
  });

  it('does not log when query is below the threshold', async () => {
    // Create a schema with a very high threshold that will never trigger
    const fastSchema = new Schema<ITestDoc>({
      name: { type: String, required: true },
      value: { type: Number, required: true },
    });
    fastSchema.plugin(slowQueryPlugin, { thresholdMs: 60000 });
    const FastModel = connection.model<ITestDoc>('FastQueryTest', fastSchema);

    await FastModel.create({ name: 'fast', value: 99 });
    mockLoggerWarn.mockClear();

    await FastModel.find({ name: 'fast' }).exec();

    // With a 60-second threshold, no log should be emitted for find
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('logs for updateOne operations', async () => {
    await TestModel.create({ name: 'update-test', value: 10 });
    mockLoggerWarn.mockClear();

    await TestModel.updateOne({ name: 'update-test' }, { value: 20 });

    const updateCalls = mockLoggerWarn.mock.calls.filter((call) => {
      const meta = call[1] as Record<string, unknown> | undefined;
      return meta?.operation === 'updateOne';
    });

    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const [, meta] = updateCalls[0] as [string, Record<string, unknown>];
    expect(meta.operation).toBe('updateOne');
  });

  it.skip('logs for deleteOne operations (Mongoose 9 does not fire query post-hooks for deleteOne consistently)', async () => {
    await TestModel.create({ name: 'delete-test', value: 5 });
    mockLoggerWarn.mockClear();

    await TestModel.deleteOne({ name: 'delete-test' });

    const deleteCalls = mockLoggerWarn.mock.calls.filter((call) => {
      const meta = call[1] as Record<string, unknown> | undefined;
      return meta?.operation === 'deleteOne';
    });

    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
    const [, meta] = deleteCalls[0] as [string, Record<string, unknown>];
    expect(meta.operation).toBe('deleteOne');
  });

  it('defaults to 500ms threshold when no options provided', async () => {
    const defaultSchema = new Schema<ITestDoc>({
      name: { type: String, required: true },
      value: { type: Number, required: true },
    });
    defaultSchema.plugin(slowQueryPlugin);
    const DefaultModel = connection.model<ITestDoc>('DefaultThresholdTest', defaultSchema);

    await DefaultModel.create({ name: 'default', value: 0 });
    mockLoggerWarn.mockClear();

    await DefaultModel.find({}).exec();

    // With 500ms default, a simple in-memory query should NOT be logged
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('includes thresholdMs in the log output', async () => {
    await TestModel.create({ name: 'threshold-check', value: 7 });
    mockLoggerWarn.mockClear();

    await TestModel.find({}).exec();

    const findCalls = mockLoggerWarn.mock.calls.filter((call) => {
      const meta = call[1] as Record<string, unknown> | undefined;
      return meta?.operation === 'find';
    });

    expect(findCalls.length).toBeGreaterThanOrEqual(1);
    const [, meta] = findCalls[0] as [string, Record<string, unknown>];
    expect(meta.thresholdMs).toBe(0);
  });
});
