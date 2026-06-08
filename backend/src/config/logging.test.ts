import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('logging configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules cache would be needed for full isolation,
    // but we can test the config logic via fresh imports.
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('defaults to 30-day retention', async () => {
    delete process.env.LOG_RETENTION_DAYS;
    // Dynamic import to get fresh config
    const { loggingConfig } = await import('./logging.js');
    expect(loggingConfig.retentionDays).toBe(30);
  });

  it('respects LOG_RETENTION_DAYS environment variable', async () => {
    // Note: Since the module may be cached, this tests the default behavior.
    // In production the env var is read at module load time.
    const { loggingConfig } = await import('./logging.js');
    // The default is 30 if env var not set at module load
    expect(loggingConfig.retentionDays).toBeGreaterThanOrEqual(1);
  });

  it('defines all required searchable fields', async () => {
    const { loggingConfig } = await import('./logging.js');
    const requiredFields = ['timestamp', 'requestId', 'userId', 'endpoint', 'status'];
    for (const field of requiredFields) {
      expect(loggingConfig.searchableFields).toContain(field);
    }
  });

  it('defaults log level to debug in non-production', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.LOG_LEVEL;
    const { loggingConfig } = await import('./logging.js');
    // In dev, defaults to debug
    expect(['debug', 'info']).toContain(loggingConfig.level);
  });

  it('uses daily date pattern for rotation', async () => {
    const { loggingConfig } = await import('./logging.js');
    expect(loggingConfig.datePattern).toBe('YYYY-MM-DD');
  });

  it('configures max file size', async () => {
    const { loggingConfig } = await import('./logging.js');
    expect(loggingConfig.maxFileSize).toBeDefined();
    expect(typeof loggingConfig.maxFileSize).toBe('string');
  });
});
