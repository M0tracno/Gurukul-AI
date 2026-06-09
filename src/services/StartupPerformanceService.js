import React from 'react';

import { constructor } from '@mui/material';
/**
 * Startup Performance Optimization Service
 * Monitors and optimizes application startup performance
 */

class StartupPerformanceService {
  constructor() {
    this.startTime = performance.now();
    this.milestones = new Map();
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  // Record a milestone during startup
  recordMilestone(name, description = '') {
    if (!this.isEnabled) return;

    const timestamp = performance.now();
    const elapsed = timestamp - this.startTime;

    this.milestones.set(name, {
      timestamp,
      elapsed,
      description,
    });

    console.log(
      `🚀 Startup Milestone: ${name} (${elapsed.toFixed(2)}ms)${description ? ` - ${description}` : ''}`
    );
  }

  // Record component mount time
  recordComponentMount(componentName, mountTime) {
    if (!this.isEnabled) return;

    const milestone = `component_${componentName}`;
    this.recordMilestone(milestone, `Component mounted in ${mountTime.toFixed(2)}ms`);
  }

  // Record service initialization time
  recordServiceInit(serviceName, initTime) {
    if (!this.isEnabled) return;

    const milestone = `service_${serviceName}`;
    this.recordMilestone(milestone, `Service initialized in ${initTime.toFixed(2)}ms`);
  }

  // Record bundle load time
  recordBundleLoad(bundleName, loadTime) {
    if (!this.isEnabled) return;

    const milestone = `bundle_${bundleName}`;
    this.recordMilestone(milestone, `Bundle loaded in ${loadTime.toFixed(2)}ms`);
  }

  // Get startup summary
  getStartupSummary() {
    if (!this.isEnabled) return null;

    const totalTime = performance.now() - this.startTime;
    const milestoneArray = Array.from(this.milestones.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));

    return {
      totalStartupTime: totalTime,
      milestones: milestoneArray,
      performance: this.analyzePerformance(milestoneArray, totalTime),
    };
  }

  // Analyze performance and provide recommendations
  analyzePerformance(milestones, totalTime) {
    const recommendations = [];

    // Check for slow components
    const componentMilestones = milestones.filter(m => m.name.startsWith('component_'));
    const slowComponents = componentMilestones.filter(m => m.elapsed > 100);

    if (slowComponents.length > 0) {
      recommendations.push({
        type: 'slow_components',
        message: `Slow components detected: ${slowComponents.map(c => c.name.replace('component_', '')).join(', ')}`,
        suggestion: 'Consider lazy loading or optimizing these components',
      });
    } // Check for slow services - with higher threshold in development mode
    const serviceMilestones = milestones.filter(m => m.name.startsWith('service_'));
    // Higher threshold in development mode, lower in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const serviceThreshold = isDevelopment ? 500 : 200;
    const slowServices = serviceMilestones.filter(m => m.elapsed > serviceThreshold);

    if (slowServices.length > 0) {
      recommendations.push({
        type: 'slow_services',
        message: `Slow services detected: ${slowServices.map(s => s.name.replace('service_', '')).join(', ')}`,
        suggestion: isDevelopment
          ? 'This is normal in development mode. For production, consider lazy initialization.'
          : 'Consider lazy initialization or mock services for production.',
      });
    }

    // Check overall startup time
    if (totalTime > 3000) {
      recommendations.push({
        type: 'slow_startup',
        message: `Total startup time: ${totalTime.toFixed(2)}ms`,
        suggestion: 'Consider enabling mock services or optimizing webpack configuration',
      });
    }

    return {
      score: this.calculatePerformanceScore(totalTime),
      recommendations,
    };
  }

  // Calculate performance score (0-100)
  calculatePerformanceScore(totalTime) {
    if (totalTime < 1000) return 100;
    if (totalTime < 2000) return 90;
    if (totalTime < 3000) return 80;
    if (totalTime < 5000) return 70;
    if (totalTime < 8000) return 60;
    return 50;
  }

  // Print detailed startup report
  printStartupReport() {
    if (!this.isEnabled) return;

    const summary = this.getStartupSummary();
    if (!summary) return;

    console.group('🚀 Startup Performance Report');
    console.log(`Total Startup Time: ${summary.totalStartupTime.toFixed(2)}ms`);
    console.log(`Performance Score: ${summary.performance.score}/100`);

    if (summary.milestones.length > 0) {
      console.group('Milestones:');
      summary.milestones.forEach(milestone => {
        console.log(`  ${milestone.name}: ${milestone.elapsed.toFixed(2)}ms`);
      });
      console.groupEnd();
    }

    if (summary.performance.recommendations.length > 0) {
      console.group('Recommendations:');
      summary.performance.recommendations.forEach(rec => {
        console.warn(`  ${rec.message}`);
        console.log(`    💡 ${rec.suggestion}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  // Monitor web vitals during startup
  monitorWebVitals() {
    if (!this.isEnabled) return;

    // First Contentful Paint
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMilestone('fcp', `First Contentful Paint: ${entry.startTime.toFixed(2)}ms`);
        }
      }
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        this.recordMilestone('lcp', `Largest Contentful Paint: ${entry.startTime.toFixed(2)}ms`);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        this.recordMilestone(
          'fid',
          `First Input Delay: ${entry.processingStart - entry.startTime}ms`
        );
      }
    }).observe({ entryTypes: ['first-input'] });
  }

  // React component timing HOC
  createTimingHOC(componentName) {
    return WrappedComponent => {
      return props => {
        const startTime = performance.now();

        // eslint-disable-next-line react-hooks/exhaustive-deps
        React.useEffect(() => {
          const mountTime = performance.now() - startTime;
          this.recordComponentMount(componentName, mountTime);
        }, []);

        return React.createElement(WrappedComponent, props);
      };
    };
  }

  // Service timing wrapper
  createServiceTimer(serviceName) {
    return {
      start: () => {
        const startTime = performance.now();
        return () => {
          const initTime = performance.now() - startTime;
          this.recordServiceInit(serviceName, initTime);
        };
      },
    };
  }
}

// Create singleton instance
const startupPerformanceService = new StartupPerformanceService();

// Auto-start monitoring when service is imported
if (typeof window !== 'undefined') {
  startupPerformanceService.recordMilestone(
    'service_imported',
    'Startup performance service imported'
  );
  startupPerformanceService.monitorWebVitals();

  // Print report when app is ready
  window.addEventListener('load', () => {
    setTimeout(() => {
      startupPerformanceService.recordMilestone('window_loaded', 'Window load event fired');
      startupPerformanceService.printStartupReport();
    }, 100);
  });
}

export default startupPerformanceService;
