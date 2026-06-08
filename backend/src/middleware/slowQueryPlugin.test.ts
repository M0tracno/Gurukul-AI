import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import mongoose, { Schema, Model, Document } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { slowQueryPlugin } from './slowQueryPlugin.js';

interface ITestDoc extends Document {
  name: string;
  value: number;
}

describe('slowQueryPlugin', () => {
  let mongoServer: MongoMemoryServer;
  let TestModel: Model<ITestDoc>;
  let warnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const testSchema = new Schema<ITestDoc>({
      name: { type: String, required: true },
      value: { type: Number, required: true },
    });

    // Apply plugin with a very low threshold so we can test the logging
    testSchema.plugin(slowQueryPlugin, { thresholdMs: 0 });

    TestModel = mongoose.model<ITestDoc>('SlowQueryTest', testSchema);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up collection BEFORE setting up the spy to avoid
    // catching the deleteMany in the spy
    await TestModel.deleteMany({});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('logs a warning for queries exceeding the threshold', async () => {
    await TestModel.create({ name: 'test', value: 42 });
    // Clear spy from the create operation
    warnSpy.mockClear();

    await TestModel.find({ name: 'test' }).exec();

    // Find the log call for 'find' operation
    const findCalls = warnSpy.mock.calls.filter((call) => {
      const parsed = JSON.parse(call[0] as string);
      return parsed.operation === 'find';
    });

    expect(findCalls.length).toBeGreaterThanOrEqual(1);
    const parsed = JSON.parse(findCalls[0][0] as string);

    expect(parsed.level).toBe('warn');
    expect(parsed.message).toBe('Slow query detected');
    expect(parsed.operation).toBe('find');
    expect(parsed.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(parsed).toHaveProperty('collection');
    expect(parsed).toHaveProperty('filter');
  });

  it('logs the correct filter in the warning', async () => {
    await TestModel.create({ name: 'alpha', value: 1 });
    warnSpy.mockClear();

    await TestModel.findOne({ name: 'alpha' }).exec();

    const findCalls = warnSpy.mock.calls.filter((call) => {
      const parsed = JSON.parse(call[0] as string);
      return parsed.operation === 'findOne';
    });

    expect(findCalls.length).toBeGreaterThanOrEqual(1);
    const parsed = JSON.parse(findCalls[0][0] as string);
    expect(parsed.filter).toContain('alpha');
  });

  it('does not log when query is below the threshold', async () => {
    // Create a schema with a very high threshold that will never trigger
    const fastSchema = new Schema<ITestDoc>({
      name: { type: String, required: true },
      value: { type: Number, required: true },
    });
    fastSchema.plugin(slowQueryPlugin, { thresholdMs: 60000 });
    const FastModel = mongoose.model<ITestDoc>('FastQueryTest', fastSchema);

    await FastModel.create({ name: 'fast', value: 99 });
    // Clear spy to isolate the find call
    warnSpy.mockClear();

    await FastModel.find({ name: 'fast' }).exec();

    // With a 60-second threshold, no log should be emitted for find
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs for updateOne operations', async () => {
    await TestModel.create({ name: 'update-test', value: 10 });
    warnSpy.mockClear();

    await TestModel.updateOne({ name: 'update-test' }, { value: 20 });

    const updateCalls = warnSpy.mock.calls.filter((call) => {
      const parsed = JSON.parse(call[0] as string);
      return parsed.operation === 'updateOne';
    });

    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const parsed = JSON.parse(updateCalls[0][0] as string);
    expect(parsed.operation).toBe('updateOne');
  });

  it('logs for deleteOne operations', async () => {
    await TestModel.create({ name: 'delete-test', value: 5 });
    warnSpy.mockClear();

    await TestModel.deleteOne({ name: 'delete-test' });

    const deleteCalls = warnSpy.mock.calls.filter((call) => {
      const parsed = JSON.parse(call[0] as string);
      return parsed.operation === 'deleteOne';
    });

    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
    const parsed = JSON.parse(deleteCalls[0][0] as string);
    expect(parsed.operation).toBe('deleteOne');
  });

  it('defaults to 500ms threshold when no options provided', async () => {
    const defaultSchema = new Schema<ITestDoc>({
      name: { type: String, required: true },
      value: { type: Number, required: true },
    });
    defaultSchema.plugin(slowQueryPlugin);
    const DefaultModel = mongoose.model<ITestDoc>('DefaultThresholdTest', defaultSchema);

    await DefaultModel.create({ name: 'default', value: 0 });
    warnSpy.mockClear();

    await DefaultModel.find({}).exec();

    // With 500ms default, a simple in-memory query should NOT be logged
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('includes thresholdMs in the log output', async () => {
    await TestModel.create({ name: 'threshold-check', value: 7 });
    warnSpy.mockClear();

    await TestModel.find({}).exec();

    const findCalls = warnSpy.mock.calls.filter((call) => {
      const parsed = JSON.parse(call[0] as string);
      return parsed.operation === 'find';
    });

    expect(findCalls.length).toBeGreaterThanOrEqual(1);
    const parsed = JSON.parse(findCalls[0][0] as string);
    expect(parsed.thresholdMs).toBe(0);
  });
});
