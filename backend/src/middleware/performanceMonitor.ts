import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Performance monitoring configuration.
 */
export interface PerformanceMonitorConfig {
  /** Response time threshold in ms before triggering alert (default: 2000) */
  alertThresholdMs: number;
  /** Admin notification channel (e.g., 'email', 'slack', 'webhook') */
  notificationChannel: string;
  /** Whether alerting is enabled */
  alertingEnabled: boolean;
}

/**
 * Per-endpoint metrics aggregation.
 */
export interface EndpointMetrics {
  /** Total number of requests */
  requestCount: number;
  /** Total response time in ms (for computing averages) */
  totalResponseTime: number;
  /** Maximum response time observed */
  maxResponseTime: number;
  /** Minimum response time observed */
  minResponseTime: number;
  /** Number of responses exceeding the alert threshold */
  slowResponseCount: number;
  /** Histogram buckets for response time distribution */
  histogram: Map<number, number>;
}

/** Prometheus histogram bucket boundaries (in ms) */
const HISTOGRAM_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, Infinity];

/**
 * Alert callback type for notifying admins.
 */
export type AlertCallback = (alert: PerformanceAlert) => void;

/**
 * Performance alert structure.
 */
export interface PerformanceAlert {
  endpoint: string;
  method: string;
  responseTimeMs: number;
  thresholdMs: number;
  timestamp: string;
  correlationId?: string;
}

/**
 * MetricsCollector stores and exposes per-endpoint performance metrics.
 * Designed as a singleton to be shared across the application.
 */
export class MetricsCollector {
  private metrics: Map<string, EndpointMetrics> = new Map();
  private config: PerformanceMonitorConfig;
  private alertCallbacks: AlertCallback[] = [];
  private totalRequests = 0;
  private totalErrors = 0;

  constructor(config?: Partial<PerformanceMonitorConfig>) {
    this.config = {
      alertThresholdMs: config?.alertThresholdMs ?? parseInt(process.env.PERF_ALERT_THRESHOLD_MS || '2000', 10),
      notificationChannel: config?.notificationChannel ?? (process.env.ADMIN_NOTIFICATION_CHANNEL || 'log'),
      alertingEnabled: config?.alertingEnabled ?? process.env.PERF_ALERTING_ENABLED !== 'false',
    };
  }

  /**
   * Register an alert callback for when response time exceeds threshold.
   */
  onAlert(callback: AlertCallback): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Record a request's response time for an endpoint.
   */
  record(method: string, endpoint: string, responseTimeMs: number, statusCode: number, correlationId?: string): void {
    const key = `${method} ${endpoint}`;
    this.totalRequests++;

    if (statusCode >= 500) {
      this.totalErrors++;
    }

    let endpointMetrics = this.metrics.get(key);
    if (!endpointMetrics) {
      endpointMetrics = {
        requestCount: 0,
        totalResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        slowResponseCount: 0,
        histogram: new Map(HISTOGRAM_BUCKETS.map((b) => [b, 0])),
      };
      this.metrics.set(key, endpointMetrics);
    }

    endpointMetrics.requestCount++;
    endpointMetrics.totalResponseTime += responseTimeMs;
    endpointMetrics.maxResponseTime = Math.max(endpointMetrics.maxResponseTime, responseTimeMs);
    endpointMetrics.minResponseTime = Math.min(endpointMetrics.minResponseTime, responseTimeMs);

    // Update histogram
    for (const bucket of HISTOGRAM_BUCKETS) {
      if (responseTimeMs <= bucket) {
        endpointMetrics.histogram.set(bucket, (endpointMetrics.histogram.get(bucket) || 0) + 1);
        break;
      }
    }

    // Check if response time exceeds alert threshold
    if (responseTimeMs > this.config.alertThresholdMs) {
      endpointMetrics.slowResponseCount++;
      this.emitAlert(method, endpoint, responseTimeMs, correlationId);
    }
  }

  /**
   * Emit an alert when response time exceeds the configured threshold.
   */
  private emitAlert(method: string, endpoint: string, responseTimeMs: number, correlationId?: string): void {
    if (!this.config.alertingEnabled) return;

    const alert: PerformanceAlert = {
      endpoint,
      method,
      responseTimeMs,
      thresholdMs: this.config.alertThresholdMs,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    // Log the alert
    logger.warn('Performance alert: Response time exceeded threshold', {
      ...alert,
      channel: this.config.notificationChannel,
    });

    // Invoke registered callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (err) {
        logger.error('Error in alert callback', { error: String(err) });
      }
    }
  }

  /**
   * Get metrics for a specific endpoint.
   */
  getEndpointMetrics(method: string, endpoint: string): EndpointMetrics | undefined {
    return this.metrics.get(`${method} ${endpoint}`);
  }

  /**
   * Get all collected metrics.
   */
  getAllMetrics(): Map<string, EndpointMetrics> {
    return this.metrics;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): PerformanceMonitorConfig {
    return { ...this.config };
  }

  /**
   * Get total request count.
   */
  getTotalRequests(): number {
    return this.totalRequests;
  }

  /**
   * Get total error count (5xx responses).
   */
  getTotalErrors(): number {
    return this.totalErrors;
  }

  /**
   * Format metrics in Prometheus exposition format.
   * @see https://prometheus.io/docs/instrumenting/exposition_formats/
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];

    // Total requests counter
    lines.push('# HELP http_requests_total Total number of HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    lines.push(`http_requests_total ${this.totalRequests}`);
    lines.push('');

    // Total errors counter
    lines.push('# HELP http_errors_total Total number of HTTP 5xx errors');
    lines.push('# TYPE http_errors_total counter');
    lines.push(`http_errors_total ${this.totalErrors}`);
    lines.push('');

    // Request duration histogram
    lines.push('# HELP http_request_duration_ms HTTP request duration in milliseconds');
    lines.push('# TYPE http_request_duration_ms histogram');

    for (const [key, metrics] of this.metrics.entries()) {
      const [method, ...pathParts] = key.split(' ');
      const path = pathParts.join(' ');
      const labels = `method="${method}",endpoint="${path}"`;

      // Histogram buckets (cumulative)
      let cumulative = 0;
      for (const bucket of HISTOGRAM_BUCKETS) {
        cumulative += metrics.histogram.get(bucket) || 0;
        const bucketLabel = bucket === Infinity ? '+Inf' : String(bucket);
        lines.push(`http_request_duration_ms_bucket{${labels},le="${bucketLabel}"} ${cumulative}`);
      }
      lines.push(`http_request_duration_ms_sum{${labels}} ${metrics.totalResponseTime}`);
      lines.push(`http_request_duration_ms_count{${labels}} ${metrics.requestCount}`);
    }
    lines.push('');

    // Slow responses gauge
    lines.push('# HELP http_slow_responses_total Total number of responses exceeding alert threshold');
    lines.push('# TYPE http_slow_responses_total counter');
    for (const [key, metrics] of this.metrics.entries()) {
      const [method, ...pathParts] = key.split(' ');
      const path = pathParts.join(' ');
      const labels = `method="${method}",endpoint="${path}"`;
      if (metrics.slowResponseCount > 0) {
        lines.push(`http_slow_responses_total{${labels}} ${metrics.slowResponseCount}`);
      }
    }
    lines.push('');

    // Alert threshold info
    lines.push('# HELP http_alert_threshold_ms Configured alert threshold in milliseconds');
    lines.push('# TYPE http_alert_threshold_ms gauge');
    lines.push(`http_alert_threshold_ms ${this.config.alertThresholdMs}`);

    return lines.join('\n');
  }

  /**
   * Reset all metrics (useful for testing).
   */
  reset(): void {
    this.metrics.clear();
    this.totalRequests = 0;
    this.totalErrors = 0;
  }
}

/** Global singleton metrics collector instance */
export const metricsCollector = new MetricsCollector();

/**
 * Express middleware that tracks response times per endpoint
 * and emits alerts when response time exceeds the configured threshold.
 *
 * @param collector - MetricsCollector instance (defaults to global singleton)
 * @returns Express middleware function
 *
 * @see Requirements 11.3
 */
export function performanceMonitorMiddleware(collector: MetricsCollector = metricsCollector) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number(endTime - startTime) / 1_000_000;

      // Normalize the endpoint path to avoid high-cardinality metric explosion
      // Replace path params like /api/v1/students/507f1f77bcf86cd799439011 with /api/v1/students/:id
      const normalizedPath = normalizePath(req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path);

      const correlationId = req.correlationId || (req.headers['x-correlation-id'] as string | undefined);

      collector.record(req.method, normalizedPath, responseTimeMs, res.statusCode, correlationId);
    });

    next();
  };
}

/**
 * Normalize path by replacing MongoDB ObjectID-like segments and numeric IDs
 * with :id placeholder to prevent metric cardinality explosion.
 */
export function normalizePath(path: string): string {
  return path
    // Replace MongoDB ObjectIds (24 hex chars)
    .replace(/\/[a-f0-9]{24}/gi, '/:id')
    // Replace UUID patterns
    .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id');
}
