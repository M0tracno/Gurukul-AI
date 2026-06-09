import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getRedisOptions, redisConfig } from './redis.js';

// Mock ioredis to avoid actual connections during tests
jest.unstable_mockModule('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation((..._args: unknown[]) => ({
    status: 'connecting',
    disconnect: jest.fn(),
  }));
  return { default: MockRedis, Redis: MockRedis };
});

describe('redis config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear Redis env vars for clean test state
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('redisConfig', () => {
    it('should export redis config with default values', () => {
      expect(redisConfig).toBeDefined();
      expect(redisConfig.host).toBe('localhost');
      expect(redisConfig.port).toBe(6379);
      expect(redisConfig.password).toBeUndefined();
    });
  });

  describe('getRedisOptions', () => {
    it('should return default host and port when no env vars are set', () => {
      const { url, options } = getRedisOptions();

      expect(url).toBeUndefined();
      expect(options.host).toBe('localhost');
      expect(options.port).toBe(6379);
      expect(options.password).toBeUndefined();
      expect(options.maxRetriesPerRequest).toBeNull();
      expect(options.enableReadyCheck).toBe(false);
    });

    it('should use REDIS_HOST when set', () => {
      process.env.REDIS_HOST = 'redis.example.com';

      const { url, options } = getRedisOptions();

      expect(url).toBeUndefined();
      expect(options.host).toBe('redis.example.com');
    });

    it('should use REDIS_PORT when set', () => {
      process.env.REDIS_PORT = '6380';

      const { url, options } = getRedisOptions();

      expect(url).toBeUndefined();
      expect(options.port).toBe(6380);
    });

    it('should use REDIS_PASSWORD when set', () => {
      process.env.REDIS_PASSWORD = 'secret123';

      const { url, options } = getRedisOptions();

      expect(url).toBeUndefined();
      expect(options.password).toBe('secret123');
    });

    it('should use REDIS_URL when set and it takes precedence', () => {
      process.env.REDIS_URL = 'redis://user:pass@remote-host:6380/0';
      process.env.REDIS_HOST = 'should-be-ignored';
      process.env.REDIS_PORT = '9999';

      const { url } = getRedisOptions();

      expect(url).toBe('redis://user:pass@remote-host:6380/0');
    });

    it('should always set maxRetriesPerRequest to null (required by BullMQ)', () => {
      const { options } = getRedisOptions();
      expect(options.maxRetriesPerRequest).toBeNull();
    });

    it('should always set enableReadyCheck to false (required by BullMQ)', () => {
      const { options } = getRedisOptions();
      expect(options.enableReadyCheck).toBe(false);
    });

    it('should handle non-numeric REDIS_PORT gracefully', () => {
      process.env.REDIS_PORT = 'not-a-number';

      const { options } = getRedisOptions();

      expect(options.port).toBeNaN();
    });

    it('should treat empty REDIS_PASSWORD as undefined', () => {
      process.env.REDIS_PASSWORD = '';

      const { options } = getRedisOptions();

      expect(options.password).toBeUndefined();
    });
  });

  describe('createRedisConnection', () => {
    it('should create a connection with URL when REDIS_URL is set', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { createRedisConnection } = await import('./redis.js');
      const connection = createRedisConnection();

      // Verify a connection object was returned (mocked via jest.unstable_mockModule)
      expect(connection).toBeDefined();
      expect(connection).toHaveProperty('status');
    });

    it('should create a connection with individual options when REDIS_URL is not set', async () => {
      process.env.REDIS_HOST = 'my-redis';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'pass123';

      const { createRedisConnection } = await import('./redis.js');
      const connection = createRedisConnection();

      // Verify a connection object was returned (mocked via jest.unstable_mockModule)
      expect(connection).toBeDefined();
      expect(connection).toHaveProperty('status');
    });
  });
});
