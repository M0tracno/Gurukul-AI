import { Router, Request, Response } from 'express';
import { metricsCollector } from '../middleware/performanceMonitor.js';
import { success } from '../utils/envelope.js';

const router = Router();

/**
 * GET /metrics
 *
 * Exposes Prometheus-compatible metrics endpoint.
 * Returns metrics in Prometheus exposition format (text/plain).
 *
 * This endpoint is intended for scraping by Prometheus or compatible
 * monitoring systems.
 *
 * @see Requirements 11.3
 */
router.get('/metrics', (_req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metricsCollector.toPrometheusFormat());
});

/**
 * GET /metrics/json
 *
 * Exposes metrics in JSON format for easier programmatic consumption.
 * Useful for admin dashboards and custom alerting integrations.
 */
router.get('/metrics/json', (_req: Request, res: Response) => {
  const allMetrics = metricsCollector.getAllMetrics();
  const config = metricsCollector.getConfig();

  const endpoints: Record<string, {
    requestCount: number;
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    slowResponseCount: number;
  }> = {};

  for (const [key, metrics] of allMetrics.entries()) {
    endpoints[key] = {
      requestCount: metrics.requestCount,
      avgResponseTime: metrics.requestCount > 0
        ? Math.round(metrics.totalResponseTime / metrics.requestCount)
        : 0,
      maxResponseTime: metrics.maxResponseTime,
      minResponseTime: metrics.minResponseTime === Infinity ? 0 : metrics.minResponseTime,
      slowResponseCount: metrics.slowResponseCount,
    };
  }

  res.json(success({
    totalRequests: metricsCollector.getTotalRequests(),
    totalErrors: metricsCollector.getTotalErrors(),
    alertThresholdMs: config.alertThresholdMs,
    notificationChannel: config.notificationChannel,
    alertingEnabled: config.alertingEnabled,
    endpoints,
  }));
});

export default router;
