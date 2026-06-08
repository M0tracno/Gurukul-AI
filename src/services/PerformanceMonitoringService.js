import env from '../config/env';

/**
 * Native Web Vitals measurement — replaces the web-vitals package.
 * Uses PerformanceObserver API directly (supported in all modern browsers).
 */
const observe = (type, callback) => {
  try {
    if (!('PerformanceObserver' in window)) return;
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback({ name: type, value: entry.startTime || entry.value || entry.duration, delta: 0, id: `v-${type}-${Date.now()}`, entries: [entry] });
      }
    });
    po.observe({ type, buffered: true });
  } catch { /* Observer not supported for this type */ }
};

const getCLS = (cb) => observe('layout-shift', (m) => cb({ ...m, name: 'CLS' }));
const getFID = (cb) => observe('first-input', (m) => cb({ ...m, name: 'FID', value: m.entries[0]?.processingStart - m.entries[0]?.startTime }));
const getFCP = (cb) => observe('paint', (m) => { if (m.entries[0]?.name === 'first-contentful-paint') cb({ ...m, name: 'FCP', value: m.entries[0].startTime }); });
const getLCP = (cb) => observe('largest-contentful-paint', (m) => cb({ ...m, name: 'LCP' }));
const getTTFB = (cb) => {
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) cb({ name: 'TTFB', value: nav.responseStart, delta: 0, id: `v-TTFB-${Date.now()}`, entries: [nav] });
  } catch { /* navigation timing not available */ }
};

// Performance Monitoring Service for Phase 1

class PerformanceMonitoringService {  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isEnabled = env.ENABLE_PERFORMANCE_MONITORING;
    this.reportingEndpoint = env.PERFORMANCE_ENDPOINT;
    this.initialized = false;
  }
  
  initialize() {
    if (this.initialized) return;
    
    if (this.isEnabled) {
      this.initializeMonitoring();
    }
    this.initialized = true;
  }

  initializeMonitoring() {
    // Monitor Core Web Vitals
    this.initializeCoreWebVitals();
    
    // Monitor Resource Loading
    this.initializeResourceMonitoring();
    
    // Monitor React Performance
    this.initializeReactPerformanceMonitoring();
    
    // Monitor Memory Usage
    this.initializeMemoryMonitoring();
    
    // Monitor Network Performance
    this.initializeNetworkMonitoring();

    console.log('Performance monitoring initialized');
  }

  initializeCoreWebVitals() {
    // Cumulative Layout Shift
    getCLS((metric) => {
      this.recordMetric('CLS', metric);
    });

    // First Input Delay
    getFID((metric) => {
      this.recordMetric('FID', metric);
    });

    // First Contentful Paint
    getFCP((metric) => {
      this.recordMetric('FCP', metric);
    });

    // Largest Contentful Paint
    getLCP((metric) => {
      this.recordMetric('LCP', metric);
    });

    // Time to First Byte
    getTTFB((metric) => {
      this.recordMetric('TTFB', metric);
    });
  }

  initializeResourceMonitoring() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordResourceMetric(entry);
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    }
  }

  initializeReactPerformanceMonitoring() {
    // React 18 Profiler integration
    if (typeof window !== 'undefined' && window.React && window.React.Profiler) {
      this.reactProfilerEnabled = true;
    }
  }

  initializeMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.recordMetric('memory', {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });
      }, 30000); // Check every 30 seconds
    }
  }

  initializeNetworkMonitoring() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      this.recordMetric('network', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
        timestamp: Date.now()
      });

      connection.addEventListener('change', () => {
        this.recordMetric('network', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
          timestamp: Date.now()
        });
      });
    }
  }

  recordMetric(name, metric) {
    const timestamp = Date.now();
    const metricData = {
      name,
      value: metric.value || metric,
      timestamp,
      id: metric.id || `${name}_${timestamp}`,
      delta: metric.delta,
      entries: metric.entries
    };

    this.metrics.set(metricData.id, metricData);
    
    // Report immediately for critical metrics
    if (this.isCriticalMetric(name, metric)) {
      this.reportMetric(metricData);
    }

    // Trigger performance alerts if needed
    this.checkPerformanceThresholds(name, metric);
  }

  recordResourceMetric(entry) {
    const resourceData = {
      name: entry.name,
      type: entry.initiatorType,
      size: entry.transferSize,
      duration: entry.duration,
      startTime: entry.startTime,
      responseEnd: entry.responseEnd,
      timestamp: Date.now()
    };

    // Check for slow loading resources
    if (entry.duration > 1000) { // Slow if > 1 second
      this.recordMetric('slow_resource', resourceData);
    }

    // Check for large resources
    if (entry.transferSize > 500000) { // Large if > 500KB
      this.recordMetric('large_resource', resourceData);
    }
  }

  isCriticalMetric(name, metric) {
    const criticalThresholds = {
      'CLS': 0.25,    // Poor CLS
      'FID': 300,     // Poor FID (ms)
      'LCP': 4000,    // Poor LCP (ms)
      'FCP': 3000,    // Poor FCP (ms)
      'TTFB': 1800    // Poor TTFB (ms)
    };

    return criticalThresholds[name] && metric.value > criticalThresholds[name];
  }

  checkPerformanceThresholds(name, metric) {
    const thresholds = {
      'CLS': { good: 0.1, poor: 0.25 },
      'FID': { good: 100, poor: 300 },
      'LCP': { good: 2500, poor: 4000 },
      'FCP': { good: 1800, poor: 3000 },
      'TTFB': { good: 800, poor: 1800 }
    };

    const threshold = thresholds[name];
    if (threshold && metric.value) {
      let rating;
      if (metric.value <= threshold.good) {
        rating = 'good';
      } else if (metric.value <= threshold.poor) {
        rating = 'needs-improvement';
      } else {
        rating = 'poor';
      }

      // Trigger alerts for poor performance
      if (rating === 'poor') {
        this.triggerPerformanceAlert(name, metric.value, rating);
      }
    }
  }

  triggerPerformanceAlert(metricName, value, rating) {
    const alert = {
      type: 'performance_degradation',
      metric: metricName,
      value,
      rating,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.warn(`Performance Alert: ${metricName} is ${rating} (${value})`);
    
    // Send to monitoring service
    if (this.reportingEndpoint) {
      this.reportAlert(alert);
    }

    // Trigger custom event for application to handle
    window.dispatchEvent(new CustomEvent('performanceAlert', { detail: alert }));
  }

  async reportMetric(metric) {
    if (!this.reportingEndpoint) return;

    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance_metric',
          ...metric,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to report performance metric:', error);
    }
  }

  async reportAlert(alert) {
    if (!this.reportingEndpoint) return;

    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      console.error('Failed to report performance alert:', error);
    }
  }

  // React Profiler callback
  onRenderProfiler(id, phase, actualDuration, baseDuration, startTime, commitTime) {
    if (!this.reactProfilerEnabled) return;

    const profileData = {
      componentId: id,
      phase, // 'mount' or 'update'
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      timestamp: Date.now()
    };

    // Record slow renders
    if (actualDuration > 16) { // Slower than 60fps
      this.recordMetric('slow_render', profileData);
    }
  }

  getPerformanceMetrics() {
    return Array.from(this.metrics.values());
  }

  getMetricsByType(type) {
    return Array.from(this.metrics.values()).filter(metric => metric.name === type);
  }

  getPerformanceSummary() {
    const metrics = this.getPerformanceMetrics();
    const coreWebVitals = ['CLS', 'FID', 'LCP', 'FCP', 'TTFB'];
    
    const summary = {
      totalMetrics: metrics.length,
      coreWebVitals: {},
      resourceMetrics: {
        slowResources: this.getMetricsByType('slow_resource').length,
        largeResources: this.getMetricsByType('large_resource').length
      },
      performanceScore: this.calculatePerformanceScore()
    };

    // Get latest values for core web vitals
    coreWebVitals.forEach(vital => {
      const vitalMetrics = this.getMetricsByType(vital);
      if (vitalMetrics.length > 0) {
        const latest = vitalMetrics[vitalMetrics.length - 1];
        summary.coreWebVitals[vital] = {
          value: latest.value,
          rating: this.getRating(vital, latest.value),
          timestamp: latest.timestamp
        };
      }
    });

    return summary;
  }

  getRating(metricName, value) {
    const thresholds = {
      'CLS': { good: 0.1, poor: 0.25 },
      'FID': { good: 100, poor: 300 },
      'LCP': { good: 2500, poor: 4000 },
      'FCP': { good: 1800, poor: 3000 },
      'TTFB': { good: 800, poor: 1800 }
    };

    const threshold = thresholds[metricName];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  calculatePerformanceScore() {
    const coreWebVitals = ['CLS', 'FID', 'LCP', 'FCP', 'TTFB'];
    const scores = [];

    coreWebVitals.forEach(vital => {
      const metrics = this.getMetricsByType(vital);
      if (metrics.length > 0) {
        const latest = metrics[metrics.length - 1];
        const rating = this.getRating(vital, latest.value);
        
        let score = 0;
        if (rating === 'good') score = 100;
        else if (rating === 'needs-improvement') score = 50;
        else score = 0;
        
        scores.push(score);
      }
    });

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// Create singleton instance
const performanceMonitoringService = new PerformanceMonitoringService();

export default performanceMonitoringService;
