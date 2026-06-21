import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getMongooseOptions, connectDB } from './database.js';

describe('database config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getMongooseOptions', () => {
    it('should return default pool sizes when env vars are not set', () => {
      delete process.env.MONGO_MIN_POOL;
      delete process.env.MONGO_MAX_POOL;

      const options = getMongooseOptions();

      expect(options.minPoolSize).toBe(2);
      expect(options.maxPoolSize).toBe(10);
    });

    it('should use env var values when set', () => {
      process.env.MONGO_MIN_POOL = '4';
      process.env.MONGO_MAX_POOL = '20';

      const options = getMongooseOptions();

      expect(options.minPoolSize).toBe(4);
      expect(options.maxPoolSize).toBe(20);
    });

    it('should cap maxPoolSize at 50', () => {
      process.env.MONGO_MAX_POOL = '100';

      const options = getMongooseOptions();

      expect(options.maxPoolSize).toBe(50);
    });

    it('should enforce minimum pool size of 2', () => {
      process.env.MONGO_MIN_POOL = '1';

      const options = getMongooseOptions();

      expect(options.minPoolSize).toBe(2);
    });

    it('should handle non-numeric env var values gracefully', () => {
      process.env.MONGO_MIN_POOL = 'abc';
      process.env.MONGO_MAX_POOL = 'xyz';

      const options = getMongooseOptions();

      expect(options.minPoolSize).toBe(2);
      expect(options.maxPoolSize).toBe(10);
    });

    it('should set serverSelectionTimeoutMS to 30000', () => {
      const options = getMongooseOptions();
      expect(options.serverSelectionTimeoutMS).toBe(30000);
    });

    it('should set socketTimeoutMS to 30000', () => {
      const options = getMongooseOptions();
      expect(options.socketTimeoutMS).toBe(30000);
    });

    it('should ensure maxPoolSize is at least minPoolSize', () => {
      process.env.MONGO_MIN_POOL = '15';
      process.env.MONGO_MAX_POOL = '5';

      const options = getMongooseOptions();

      // minPoolSize should be 15, maxPoolSize should be at least 15
      expect(options.minPoolSize).toBe(15);
      expect(options.maxPoolSize).toBeGreaterThanOrEqual(options.minPoolSize!);
    });
  });

  describe('connectDB', () => {
    it('should throw if MONGO_URI is not set', async () => {
      delete process.env.MONGO_URI;

      await expect(connectDB()).rejects.toThrow(
        'MONGO_URI environment variable is not defined',
      );
    });
  });
});
