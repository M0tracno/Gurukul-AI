import { useEffect, useState, useCallback } from 'react';

import { constructor } from '@mui/material';
// filepath: c:\Users\AYUSHMAN NANDA\OneDrive\Desktop\GDC\src\utils\bundleAnalyzer.js
// Bundle analysis and optimization utilities

/**
 * Bundle Analyzer for Performance Optimization
 * Analyzes bundle size, lazy loading opportunities, and optimization recommendations
 */
export class BundleAnalyzer {
  constructor() {
    this.analysis = {
      totalSize: 0,
      chunkSizes: {},
      lazyComponents: [],
      duplicatedDependencies: [],
      unusedDependencies: [],
      optimizationOpportunities: [],
    };
    this.resourceMap = new Map();
    this.performanceEntries = [];
  }

  // Initialize bundle analysis
  async initialize() {
    console.log('🔍 Starting bundle analysis...');

    await this.analyzeNetworkResources();
    await this.analyzeScriptTags();
    await this.analyzeLazyLoading();
    await this.analyzeCodeSplitting();
    await this.generateOptimizationReport();

    console.log('✅ Bundle analysis completed');
    return this.getAnalysisReport();
  }

  // Analyze network resources using Performance API
  async analyzeNetworkResources() {
    if (typeof performance === 'undefined') return;

    try {
      const entries = performance.getEntriesByType('resource');

      entries.forEach(entry => {
        if (entry.name.includes('.js') || entry.name.includes('.css')) {
          const size = entry.transferSize || entry.encodedBodySize || 0;
          const parsed = new URL(entry.name);
          const filename = parsed.pathname.split('/').pop();

          this.resourceMap.set(filename, {
            name: filename,
            url: entry.name,
            size: size,
            loadTime: entry.duration,
            type: filename.endsWith('.js') ? 'javascript' : 'css',
            isMainBundle: filename.includes('main') || filename.includes('bundle'),
            isVendor: filename.includes('vendor') || filename.includes('chunk'),
            isLazy: entry.name.includes('chunk') && !entry.name.includes('main'),
          });

          this.analysis.totalSize += size;
        }
      });

      this.performanceEntries = entries;
    } catch (error) {
      console.warn('Could not analyze network resources:', error);
    }
  }

  // Analyze script tags in the document
  async analyzeScriptTags() {
    const scripts = document.querySelectorAll('script[src]');

    scripts.forEach(script => {
      const src = script.src;
      const filename = src.split('/').pop();

      if (!this.resourceMap.has(filename)) {
        // Estimate size for scripts not captured by Performance API
        this.resourceMap.set(filename, {
          name: filename,
          url: src,
          size: this.estimateScriptSize(script),
          loadTime: 0,
          type: 'javascript',
          isMainBundle: filename.includes('main') || filename.includes('bundle'),
          isVendor: filename.includes('vendor'),
          isLazy: false,
          isDeferred: script.defer,
          isAsync: script.async,
        });
      }
    });
  }

  // Estimate script size based on various factors
  estimateScriptSize(script) {
    const src = script.src;
    let estimatedSize = 0;

    // Basic estimation based on filename patterns
    if (src.includes('vendor') || src.includes('chunk')) {
      estimatedSize = 200 * 1024; // 200KB for vendor chunks
    } else if (src.includes('main') || src.includes('bundle')) {
      estimatedSize = 100 * 1024; // 100KB for main bundle
    } else {
      estimatedSize = 50 * 1024; // 50KB for other scripts
    }

    return estimatedSize;
  }
  // Analyze lazy loading implementation
  async analyzeLazyLoading() {
    // Check for React.lazy components
    // const lazyRegex = /React\.lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\)/g;
    // const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

    // This is a simplified analysis - in a real implementation,
    // you'd analyze the actual source code or build output
    const potentialLazyComponents = [
      'AdminDashboard',
      'SystemMonitor',
      'EnhancedAnalytics',
      'UserManagement',
      'CourseManagement',
      'ReportsSection',
    ];

    potentialLazyComponents.forEach(component => {
      this.analysis.lazyComponents.push({
        name: component,
        isLazy: this.checkIfComponentIsLazy(component),
        estimatedSize: 30 * 1024, // 30KB estimate
        priority: this.getComponentPriority(component),
      });
    });
  }

  // Check if a component is lazy loaded
  checkIfComponentIsLazy(componentName) {
    // Check if component is loaded as a separate chunk
    const hasLazyChunk = Array.from(this.resourceMap.values()).some(
      resource =>
        resource.isLazy && resource.name.toLowerCase().includes(componentName.toLowerCase())
    );

    return hasLazyChunk;
  }

  // Get component loading priority
  getComponentPriority(componentName) {
    const highPriorityComponents = ['AdminDashboard'];
    const mediumPriorityComponents = ['SystemMonitor', 'EnhancedAnalytics'];

    if (highPriorityComponents.includes(componentName)) return 'high';
    if (mediumPriorityComponents.includes(componentName)) return 'medium';
    return 'low';
  }

  // Analyze code splitting opportunities
  async analyzeCodeSplitting() {
    const resources = Array.from(this.resourceMap.values());
    const jsResources = resources.filter(r => r.type === 'javascript');

    // Check for large bundles that could be split
    const largeBundles = jsResources.filter(r => r.size > 250 * 1024); // > 250KB

    largeBundles.forEach(bundle => {
      this.analysis.optimizationOpportunities.push({
        type: 'code_splitting',
        severity: 'medium',
        resource: bundle.name,
        currentSize: bundle.size,
        recommendation: 'Consider splitting this large bundle into smaller chunks',
        potentialSavings: Math.floor(bundle.size * 0.3), // 30% potential savings
      });
    });

    // Check for vendor vs app code separation
    const hasVendorBundle = jsResources.some(r => r.isVendor);
    const mainBundles = jsResources.filter(r => r.isMainBundle);

    if (!hasVendorBundle && mainBundles.length > 0) {
      this.analysis.optimizationOpportunities.push({
        type: 'vendor_splitting',
        severity: 'medium',
        recommendation: 'Separate vendor dependencies into a separate bundle for better caching',
        potentialSavings: Math.floor(this.analysis.totalSize * 0.2), // 20% potential savings
      });
    }
  }

  // Generate comprehensive optimization report
  async generateOptimizationReport() {
    const resources = Array.from(this.resourceMap.values());
    const jsResources = resources.filter(r => r.type === 'javascript');
    const cssResources = resources.filter(r => r.type === 'css');

    // Bundle size analysis
    const bundleSizeAnalysis = {
      total: this.analysis.totalSize,
      javascript: jsResources.reduce((sum, r) => sum + r.size, 0),
      css: cssResources.reduce((sum, r) => sum + r.size, 0),
      largest: Math.max(...resources.map(r => r.size)),
      average: this.analysis.totalSize / resources.length,
    };

    // Performance impact analysis
    const performanceImpact = this.analyzePerformanceImpact();

    // Optimization recommendations
    const recommendations = this.generateRecommendations(bundleSizeAnalysis);

    this.analysis.bundleSizeAnalysis = bundleSizeAnalysis;
    this.analysis.performanceImpact = performanceImpact;
    this.analysis.recommendations = recommendations;
  }

  // Analyze performance impact of current bundle strategy
  analyzePerformanceImpact() {
    const impact = {
      loadTime: 0,
      parseTime: 0,
      cacheEfficiency: 0,
      networkRequests: this.resourceMap.size,
    };

    // Calculate total load time
    this.performanceEntries.forEach(entry => {
      if (entry.name.includes('.js') || entry.name.includes('.css')) {
        impact.loadTime += entry.duration;

        // Estimate parse time (rough approximation)
        if (entry.name.includes('.js')) {
          const size = entry.transferSize || entry.encodedBodySize || 0;
          impact.parseTime += size / 1000; // 1ms per KB (rough estimate)
        }
      }
    });

    // Calculate cache efficiency
    const cachedResources = this.performanceEntries.filter(
      entry => entry.transferSize === 0 && entry.decodedBodySize > 0
    );
    impact.cacheEfficiency = (cachedResources.length / this.performanceEntries.length) * 100;

    return impact;
  }

  // Generate optimization recommendations
  generateRecommendations(bundleAnalysis) {
    const recommendations = [];

    // Bundle size recommendations
    if (bundleAnalysis.total > 1024 * 1024) {
      // > 1MB
      recommendations.push({
        type: 'bundle_size',
        priority: 'high',
        title: 'Large bundle size detected',
        description: `Total bundle size (${this.formatBytes(bundleAnalysis.total)}) exceeds recommended 1MB limit`,
        actions: [
          'Implement code splitting for route-based chunks',
          'Use dynamic imports for non-critical components',
          'Remove unused dependencies',
          'Enable tree shaking',
        ],
        estimatedSavings: Math.floor(bundleAnalysis.total * 0.3),
      });
    }

    // Lazy loading recommendations
    const nonLazyComponents = this.analysis.lazyComponents.filter(
      c => !c.isLazy && c.priority !== 'high'
    );
    if (nonLazyComponents.length > 0) {
      recommendations.push({
        type: 'lazy_loading',
        priority: 'medium',
        title: 'Lazy loading opportunities',
        description: `${nonLazyComponents.length} components could benefit from lazy loading`,
        actions: [
          'Convert large components to React.lazy',
          'Implement route-based code splitting',
          'Use Suspense for loading states',
        ],
        components: nonLazyComponents.map(c => c.name),
        estimatedSavings: nonLazyComponents.reduce((sum, c) => sum + c.estimatedSize, 0),
      });
    }

    // Network optimization recommendations
    if (this.resourceMap.size > 10) {
      recommendations.push({
        type: 'network_optimization',
        priority: 'medium',
        title: 'Too many network requests',
        description: `${this.resourceMap.size} separate resource requests detected`,
        actions: [
          'Bundle smaller chunks together',
          'Use HTTP/2 server push for critical resources',
          'Implement resource preloading',
          'Consider using a CDN',
        ],
        estimatedImprovement: '20-30% faster loading',
      });
    }

    // Caching recommendations
    if (this.analysis.performanceImpact?.cacheEfficiency < 50) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        title: 'Poor cache efficiency',
        description: `Cache hit rate is only ${this.analysis.performanceImpact?.cacheEfficiency?.toFixed(1)}%`,
        actions: [
          'Implement content-based hashing for filenames',
          'Separate vendor and app bundles for better caching',
          'Use service workers for application caching',
          'Configure proper cache headers',
        ],
        estimatedImprovement: 'Up to 50% faster repeat visits',
      });
    }

    return recommendations;
  }

  // Format bytes to human-readable format
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get analysis report
  getAnalysisReport() {
    return {
      summary: {
        totalSize: this.formatBytes(this.analysis.totalSize),
        resourceCount: this.resourceMap.size,
        lazyComponentsCount: this.analysis.lazyComponents.filter(c => c.isLazy).length,
        optimizationOpportunities: this.analysis.optimizationOpportunities.length,
      },
      detailed: this.analysis,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * React Hook for Bundle Analysis
 */
export const useBundleAnalysis = (autoAnalyze = false) => {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const analyzer = new BundleAnalyzer();
      const result = await analyzer.initialize();
      setAnalysis(result);
    } catch (err) {
      setError(err.message);
      console.error('Bundle analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (autoAnalyze) {
      // Run analysis after a delay to ensure resources are loaded
      const timer = setTimeout(runAnalysis, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoAnalyze, runAnalysis]);

  return {
    analysis,
    isAnalyzing,
    error,
    runAnalysis,
  };
};

/**
 * Bundle Size Monitoring Hook
 */
export const useBundleMonitoring = () => {
  const [metrics, setMetrics] = useState({
    initialLoadTime: 0,
    totalBundleSize: 0,
    cacheBehavior: {},
    performanceScore: 0,
  });

  useEffect(() => {
    const monitorBundlePerformance = async () => {
      try {
        // Monitor initial load performance
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        if (navigationEntry) {
          setMetrics(prev => ({
            ...prev,
            initialLoadTime: navigationEntry.loadEventEnd - navigationEntry.loadEventStart,
          }));
        }

        // Monitor resource loading
        const resourceEntries = performance.getEntriesByType('resource');
        const bundleResources = resourceEntries.filter(
          entry => entry.name.includes('.js') || entry.name.includes('.css')
        );

        const totalSize = bundleResources.reduce(
          (sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0),
          0
        );

        setMetrics(prev => ({
          ...prev,
          totalBundleSize: totalSize,
        }));

        // Calculate performance score
        const performanceScore = calculatePerformanceScore({
          loadTime: navigationEntry?.loadEventEnd - navigationEntry?.loadEventStart || 0,
          bundleSize: totalSize,
          resourceCount: bundleResources.length,
        });

        setMetrics(prev => ({
          ...prev,
          performanceScore,
        }));
      } catch (error) {
        console.warn('Bundle monitoring failed:', error);
      }
    };

    // Run monitoring after page load
    if (document.readyState === 'complete') {
      monitorBundlePerformance();
    } else {
      window.addEventListener('load', monitorBundlePerformance);
    }

    return () => {
      window.removeEventListener('load', monitorBundlePerformance);
    };
  }, []);

  return metrics;
};

// Calculate performance score based on various metrics
function calculatePerformanceScore({ loadTime, bundleSize, resourceCount }) {
  let score = 100;

  // Penalize slow load times
  if (loadTime > 3000)
    score -= 30; // > 3s
  else if (loadTime > 2000)
    score -= 20; // > 2s
  else if (loadTime > 1000) score -= 10; // > 1s

  // Penalize large bundle sizes
  if (bundleSize > 2 * 1024 * 1024)
    score -= 25; // > 2MB
  else if (bundleSize > 1024 * 1024)
    score -= 15; // > 1MB
  else if (bundleSize > 512 * 1024) score -= 10; // > 512KB

  // Penalize too many resources
  if (resourceCount > 20) score -= 15;
  else if (resourceCount > 15) score -= 10;
  else if (resourceCount > 10) score -= 5;

  return Math.max(0, score);
}

/**
 * Bundle Optimization Utilities
 */
export const bundleOptimizationUtils = {
  // Check if a module should be lazy loaded
  shouldLazyLoad: (moduleName, priority = 'low') => {
    const highPriorityModules = ['AdminDashboard'];
    const mediumPriorityModules = ['SystemMonitor', 'EnhancedAnalytics'];

    if (highPriorityModules.includes(moduleName)) return false;
    if (mediumPriorityModules.includes(moduleName) && priority === 'high') return false;

    return true;
  },

  // Get bundle splitting recommendations
  getBundleSplittingConfig: () => ({
    cacheGroups: {
      vendor: {
        test: /[\/]node_modules[\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10,
      },
      common: {
        name: 'common',
        minChunks: 2,
        chunks: 'all',
        priority: 5,
        reuseExistingChunk: true,
      },
      admin: {
        test: /src[\/]pages[\/]Admin/,
        name: 'admin',
        chunks: 'all',
        priority: 8,
      },
    },
  }),

  // Generate webpack optimization config
  getWebpackOptimizationConfig: () => ({
    splitChunks: bundleOptimizationUtils.getBundleSplittingConfig(),
    runtimeChunk: 'single',
    usedExports: true,
    sideEffects: false,
  }),
};

export default BundleAnalyzer;
