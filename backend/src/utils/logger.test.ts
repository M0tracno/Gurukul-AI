import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { logger, winstonLogger } from './logger.js';
import TransportStream from 'winston-transport';

/**
 * Custom in-memory transport to capture Winston log output for assertions.
 */
class MemoryTransport extends TransportStream {
  public entries: Array<Record<string, unknown>> = [];

  log(info: Record<string, unknown>, callback: () => void): void {
    this.entries.push(info);
    callback();
  }
}

describe('logger utility', () => {
  let memTransport: MemoryTransport;

  beforeEach(() => {
    memTransport = new MemoryTransport();
    winstonLogger.add(memTransport);
  });

  afterEach(() => {
    winstonLogger.remove(memTransport);
  });

  it('emits structured JSON for info level', () => {
    logger.info('test message', { userId: '123' });

    expect(memTransport.entries.length).toBeGreaterThanOrEqual(1);
    const entry = memTransport.entries[memTransport.entries.length - 1];
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test message');
    expect(entry.userId).toBe('123');
    expect(entry.timestamp).toBeDefined();
  });

  it('emits structured JSON for warn level', () => {
    logger.warn('warning', { elapsedMs: 600 });

    expect(memTransport.entries.length).toBeGreaterThanOrEqual(1);
    const entry = memTransport.entries[memTransport.entries.length - 1];
    expect(entry.level).toBe('warn');
    expect(entry.message).toBe('warning');
    expect(entry.elapsedMs).toBe(600);
  });

  it('emits structured JSON for error level', () => {
    logger.error('something broke', { stack: 'Error: oops' });

    expect(memTransport.entries.length).toBeGreaterThanOrEqual(1);
    const entry = memTransport.entries[memTransport.entries.length - 1];
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('something broke');
  });

  it('emits structured JSON for debug level', () => {
    logger.debug('debug info');

    expect(memTransport.entries.length).toBeGreaterThanOrEqual(1);
    const entry = memTransport.entries[memTransport.entries.length - 1];
    expect(entry.level).toBe('debug');
    expect(entry.message).toBe('debug info');
  });

  it('includes a timestamp in all log entries', () => {
    logger.info('timestamp check');

    const entry = memTransport.entries[memTransport.entries.length - 1];
    expect(entry.timestamp).toBeDefined();
    // Timestamp should be a valid date string
    expect(new Date(entry.timestamp as string).getTime()).not.toBeNaN();
  });

  it('works without meta argument', () => {
    logger.info('no meta');

    const entry = memTransport.entries[memTransport.entries.length - 1];
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('no meta');
    expect(entry.timestamp).toBeDefined();
  });

  it('promotes correlationId to requestId for searchability', () => {
    logger.info('request log', { correlationId: 'abc-123', endpoint: '/api/v1/test' });

    const entry = memTransport.entries[memTransport.entries.length - 1];
    expect(entry.requestId).toBe('abc-123');
    expect(entry.endpoint).toBe('/api/v1/test');
  });

  it('preserves explicit requestId over correlationId', () => {
    logger.info('request log', { requestId: 'explicit-id', correlationId: 'corr-id' });

    const entry = memTransport.entries[memTransport.entries.length - 1];
    expect(entry.requestId).toBe('explicit-id');
  });

  it('includes service default meta', () => {
    logger.info('service check');

    const entry = memTransport.entries[memTransport.entries.length - 1];
    expect(entry.service).toBe('gurukul-ai-backend');
  });

  it('supports all searchable request context fields', () => {
    logger.info('HTTP Request', {
      requestId: 'req-001',
      userId: 'user-42',
      endpoint: '/api/v1/students',
      status: 200,
      method: 'GET',
      responseTime: 45,
    });

    const entry = memTransport.entries[memTransport.entries.length - 1];
    expect(entry.requestId).toBe('req-001');
    expect(entry.userId).toBe('user-42');
    expect(entry.endpoint).toBe('/api/v1/students');
    expect(entry.status).toBe(200);
    expect(entry.timestamp).toBeDefined();
  });
});
