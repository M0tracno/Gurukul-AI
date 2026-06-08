import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock ioredis for Redis health check — must be before the module import
jest.unstable_mockModule('ioredis', () => {
  const mockConnect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const mockPing = jest.fn<() => Promise<string>>().mockResolvedValue('PONG');
  const mockDisconnect = jest.fn();

  const MockRedis = jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    ping: mockPing,
    disconnect: mockDisconnect,
  }));

  return { Redis: MockRedis, default: MockRedis };
});

// Import the module after mocks are set up
const {
  checkDatabase,
  checkRedis,
  checkExternalApi,
  determineOverallStatus,
} = await import('./healthRoutes.js');

type HealthCheckResponse = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: { status: 'connected' | 'degraded' | 'disconnected'; responseTimeMs?: number; error?: string };
    cache: { status: 'connected' | 'degraded' | 'disconnected'; responseTimeMs?: number; error?: string };
    externalApi: { status: 'connected' | 'degraded' | 'disconnected'; responseTimeMs?: number; error?: string };
  };
};

// Mock global fetch for external API checks
const mockFetch = jest.fn<typeof fetch>();
global.fetch = mockFetch as unknown as typeof fetch;

describe('Health Check Endpoint', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('checkDatabase', () => {
    it('should return "connected" when MongoDB is connected and responsive', async () => {
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      Object.defineProperty(mongoose.connection, 'db', {
        value: { admin: () => ({ ping: () => Promise.resolve({ ok: 1 }) }) },
        configurable: true,
      });

      const result = await checkDatabase();
      expect(result.status).toBe('connected');
      expect(result.responseTimeMs).toBeDefined();
      expect(result.responseTimeMs!).toBeLessThan(5000);
    });

    it('should return "disconnected" when readyState is 0', async () => {
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

      const result = await checkDatabase();
      expect(result.status).toBe('disconnected');
    });

    it('should return "disconnected" when readyState is 3 (disconnecting)', async () => {
      Object.defineProperty(mongoose.connection, 'readyState', { value: 3, configurable: true });

      const result = await checkDatabase();
      expect(result.status).toBe('disconnected');
    });

    it('should return "degraded" when readyState is 2 (connecting)', async () => {
      Object.defineProperty(mongoose.connection, 'readyState', { value: 2, configurable: true });

      const result = await checkDatabase();
      expect(result.status).toBe('degraded');
    });

    it('should return "disconnected" when ping fails', async () => {
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      Object.defineProperty(mongoose.connection, 'db', {
        value: { admin: () => ({ ping: () => Promise.reject(new Error('Connection refused')) }) },
        configurable: true,
      });

      const result = await checkDatabase();
      expect(result.status).toBe('disconnected');
      expect(result.error).toContain('Connection refused');
    });
  });

  describe('checkRedis', () => {
    it('should return "connected" when Redis responds with PONG', async () => {
      const result = await checkRedis();
      expect(result.status).toBe('connected');
      expect(result.responseTimeMs).toBeDefined();
    });
  });

  describe('checkExternalApi', () => {
    beforeEach(() => {
      mockFetch.mockReset();
    });

    it('should return "connected" when external API responds with 2xx', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response);

      const result = await checkExternalApi();
      expect(result.status).toBe('connected');
      expect(result.responseTimeMs).toBeDefined();
    });

    it('should return "connected" when external API responds with 4xx (reachable)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 } as Response);

      const result = await checkExternalApi();
      expect(result.status).toBe('connected');
    });

    it('should return "degraded" when external API responds with 5xx', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 } as Response);

      const result = await checkExternalApi();
      expect(result.status).toBe('degraded');
    });

    it('should return "disconnected" when fetch throws a network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await checkExternalApi();
      expect(result.status).toBe('disconnected');
      expect(result.error).toContain('Network error');
    });

    it('should return "disconnected" when fetch is aborted (timeout)', async () => {
      mockFetch.mockRejectedValue(new Error('The operation was aborted'));

      const result = await checkExternalApi();
      expect(result.status).toBe('disconnected');
    });
  });

  describe('determineOverallStatus', () => {
    it('should return "healthy" when all services are connected', () => {
      const services: HealthCheckResponse['services'] = {
        database: { status: 'connected', responseTimeMs: 10 },
        cache: { status: 'connected', responseTimeMs: 5 },
        externalApi: { status: 'connected', responseTimeMs: 100 },
      };

      expect(determineOverallStatus(services)).toBe('healthy');
    });

    it('should return "unhealthy" when database is disconnected', () => {
      const services: HealthCheckResponse['services'] = {
        database: { status: 'disconnected', responseTimeMs: 5000 },
        cache: { status: 'connected', responseTimeMs: 5 },
        externalApi: { status: 'connected', responseTimeMs: 100 },
      };

      expect(determineOverallStatus(services)).toBe('unhealthy');
    });

    it('should return "degraded" when non-database service is disconnected', () => {
      const services: HealthCheckResponse['services'] = {
        database: { status: 'connected', responseTimeMs: 10 },
        cache: { status: 'disconnected', responseTimeMs: 5000 },
        externalApi: { status: 'connected', responseTimeMs: 100 },
      };

      expect(determineOverallStatus(services)).toBe('degraded');
    });

    it('should return "degraded" when any service is degraded', () => {
      const services: HealthCheckResponse['services'] = {
        database: { status: 'connected', responseTimeMs: 10 },
        cache: { status: 'degraded', responseTimeMs: 2500 },
        externalApi: { status: 'connected', responseTimeMs: 100 },
      };

      expect(determineOverallStatus(services)).toBe('degraded');
    });

    it('should return "degraded" when external API is disconnected but DB is connected', () => {
      const services: HealthCheckResponse['services'] = {
        database: { status: 'connected', responseTimeMs: 10 },
        cache: { status: 'connected', responseTimeMs: 5 },
        externalApi: { status: 'disconnected', responseTimeMs: 5000 },
      };

      expect(determineOverallStatus(services)).toBe('degraded');
    });
  });
});
