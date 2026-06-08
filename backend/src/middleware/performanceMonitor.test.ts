import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MetricsCollector, normalizePath, performanceMonitorMiddleware, PerformanceAlert } from './performanceMonitor.js';
import { Request, Response } from 'express';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({
      alertThresholdMs: 2000,
      notificationChannel: 'log',
      alertingEnabled: true,
    });
  });

  test('records request metrics for an endpoint', () => {
    collector.record('GET', '/api/v1/students', 150, 200);

    const metrics = collector.getEndpointMetrics('GET', '/api/v1/students');
    expect(metrics).toBeDefined();
    expect(metrics!.requestCount).toBe(1);
    expect(metrics!.totalResponseTime).toBe(150);
    expect(metrics!.maxResponseTime).toBe(150);
    expect(metrics!.minResponseTime).toBe(150);
    expect(metrics!.slowResponseCount).toBe(0);
  });

  test('aggregates multiple requests for same endpoint', () => {
    collector.record('GET', '/api/v1/students', 100, 200);
    collector.record('GET', '/api/v1/students', 200, 200);
    collector.record('GET', '/api/v1/students', 300, 200);

    const metrics = collector.getEndpointMetrics('GET', '/api/v1/students');
    expect(metrics!.requestCount).toBe(3);
    expect(metrics!.totalResponseTime).toBe(600);
    expect(metrics!.maxResponseTime).toBe(300);
    expect(metrics!.minResponseTime).toBe(100);
  });

  test('tracks slow responses exceeding threshold', () => {
    collector.record('POST', '/api/v1/grading/batch', 2500, 200);
    collector.record('POST', '/api/v1/grading/batch', 100, 200);
    collector.record('POST', '/api/v1/grading/batch', 3000, 200);

    const metrics = collector.getEndpointMetrics('POST', '/api/v1/grading/batch');
    expect(metrics!.slowResponseCount).toBe(2);
  });

  test('emits alert when response time exceeds threshold', () => {
    const alerts: PerformanceAlert[] = [];
    collector.onAlert((alert) => alerts.push(alert));

    collector.record('GET', '/api/v1/students', 2500, 200, 'corr-123');

    expect(alerts).toHaveLength(1);
    expect(alerts[0].endpoint).toBe('/api/v1/students');
    expect(alerts[0].method).toBe('GET');
    expect(alerts[0].responseTimeMs).toBe(2500);
    expect(alerts[0].thresholdMs).toBe(2000);
    expect(alerts[0].correlationId).toBe('corr-123');
  });

  test('does not emit alert when response time is within threshold', () => {
    const alerts: PerformanceAlert[] = [];
    collector.onAlert((alert) => alerts.push(alert));

    collector.record('GET', '/api/v1/students', 1500, 200);

    expect(alerts).toHaveLength(0);
  });

  test('does not emit alert when alerting is disabled', () => {
    const disabledCollector = new MetricsCollector({
      alertThresholdMs: 2000,
      notificationChannel: 'log',
      alertingEnabled: false,
    });

    const alerts: PerformanceAlert[] = [];
    disabledCollector.onAlert((alert) => alerts.push(alert));

    disabledCollector.record('GET', '/api/v1/students', 5000, 200);

    expect(alerts).toHaveLength(0);
  });

  test('tracks total requests across all endpoints', () => {
    collector.record('GET', '/api/v1/students', 100, 200);
    collector.record('POST', '/api/v1/courses', 200, 201);
    collector.record('GET', '/api/v1/marks', 150, 200);

    expect(collector.getTotalRequests()).toBe(3);
  });

  test('tracks total errors (5xx responses)', () => {
    collector.record('GET', '/api/v1/students', 100, 200);
    collector.record('GET', '/api/v1/students', 100, 500);
    collector.record('POST', '/api/v1/courses', 200, 503);
    collector.record('GET', '/api/v1/marks', 150, 404);

    expect(collector.getTotalErrors()).toBe(2);
  });

  test('produces valid Prometheus exposition format', () => {
    collector.record('GET', '/api/v1/students', 150, 200);
    collector.record('POST', '/api/v1/courses', 2500, 201);

    const output = collector.toPrometheusFormat();

    // Check required Prometheus format elements
    expect(output).toContain('# HELP http_requests_total');
    expect(output).toContain('# TYPE http_requests_total counter');
    expect(output).toContain('http_requests_total 2');

    expect(output).toContain('# HELP http_request_duration_ms');
    expect(output).toContain('# TYPE http_request_duration_ms histogram');
    expect(output).toContain('http_request_duration_ms_bucket{method="GET",endpoint="/api/v1/students",le="250"} 1');
    expect(output).toContain('http_request_duration_ms_sum{method="GET",endpoint="/api/v1/students"} 150');
    expect(output).toContain('http_request_duration_ms_count{method="GET",endpoint="/api/v1/students"} 1');

    expect(output).toContain('# HELP http_alert_threshold_ms');
    expect(output).toContain('http_alert_threshold_ms 2000');

    // Slow responses
    expect(output).toContain('http_slow_responses_total{method="POST",endpoint="/api/v1/courses"} 1');
  });

  test('histogram buckets are cumulative', () => {
    collector.record('GET', '/api/v1/test', 50, 200);
    collector.record('GET', '/api/v1/test', 150, 200);
    collector.record('GET', '/api/v1/test', 600, 200);

    const output = collector.toPrometheusFormat();
    // 50ms falls in <=50 bucket, 150ms in <=250, 600ms in <=1000
    // Cumulative: le=50: 1, le=100: 1, le=250: 2, le=500: 2, le=1000: 3
    expect(output).toContain('http_request_duration_ms_bucket{method="GET",endpoint="/api/v1/test",le="50"} 1');
    expect(output).toContain('http_request_duration_ms_bucket{method="GET",endpoint="/api/v1/test",le="100"} 1');
    expect(output).toContain('http_request_duration_ms_bucket{method="GET",endpoint="/api/v1/test",le="250"} 2');
    expect(output).toContain('http_request_duration_ms_bucket{method="GET",endpoint="/api/v1/test",le="500"} 2');
    expect(output).toContain('http_request_duration_ms_bucket{method="GET",endpoint="/api/v1/test",le="1000"} 3');
    expect(output).toContain('http_request_duration_ms_bucket{method="GET",endpoint="/api/v1/test",le="+Inf"} 3');
  });

  test('reset clears all metrics', () => {
    collector.record('GET', '/api/v1/students', 100, 200);
    collector.reset();

    expect(collector.getTotalRequests()).toBe(0);
    expect(collector.getTotalErrors()).toBe(0);
    expect(collector.getAllMetrics().size).toBe(0);
  });

  test('getConfig returns current configuration', () => {
    const config = collector.getConfig();
    expect(config.alertThresholdMs).toBe(2000);
    expect(config.notificationChannel).toBe('log');
    expect(config.alertingEnabled).toBe(true);
  });
});

describe('normalizePath', () => {
  test('replaces MongoDB ObjectId segments with :id', () => {
    expect(normalizePath('/api/v1/students/507f1f77bcf86cd799439011')).toBe('/api/v1/students/:id');
  });

  test('replaces UUID segments with :id', () => {
    expect(normalizePath('/api/v1/jobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe('/api/v1/jobs/:id');
  });

  test('replaces numeric ID segments with :id', () => {
    expect(normalizePath('/api/v1/users/12345')).toBe('/api/v1/users/:id');
  });

  test('handles multiple ID segments', () => {
    expect(normalizePath('/api/v1/students/507f1f77bcf86cd799439011/marks/507f1f77bcf86cd799439012')).toBe(
      '/api/v1/students/:id/marks/:id',
    );
  });

  test('does not modify paths without IDs', () => {
    expect(normalizePath('/api/v1/students')).toBe('/api/v1/students');
    expect(normalizePath('/api/v1/health')).toBe('/api/v1/health');
  });
});

describe('performanceMonitorMiddleware', () => {
  test('records metrics on response finish', () => {
    const collector = new MetricsCollector({ alertThresholdMs: 2000, alertingEnabled: true, notificationChannel: 'log' });
    const middleware = performanceMonitorMiddleware(collector);

    const finishListeners: Array<() => void> = [];

    const req = {
      method: 'GET',
      path: '/api/v1/students',
      baseUrl: '',
      route: { path: '/api/v1/students' },
      headers: { 'x-correlation-id': 'test-corr-id' },
      correlationId: 'test-corr-id',
    } as unknown as Request;

    const res = {
      statusCode: 200,
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'finish') {
          finishListeners.push(handler);
        }
      }),
    } as unknown as Response;

    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    // Simulate response finish
    finishListeners[0]();

    expect(collector.getTotalRequests()).toBe(1);
    const metrics = collector.getEndpointMetrics('GET', '/api/v1/students');
    expect(metrics).toBeDefined();
    expect(metrics!.requestCount).toBe(1);
  });
});
