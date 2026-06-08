import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Performance optimization hooks and utilities

// Hook for debouncing values to improve performance
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for throttling function calls
export const useThrottle = (callback, delay) => {
  const throttleRef = useRef(false);

  return useCallback((...args) => {
    if (!throttleRef.current) {
      callback(...args);
      throttleRef.current = true;
      setTimeout(() => {
        throttleRef.current = false;
      }, delay);
    }
  }, [callback, delay]);
};

// Virtual scrolling hook for large lists
export const useVirtualScrolling = (items, containerHeight = 400, itemHeight = 50) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = useMemo(() => 
    items.slice(visibleStart, visibleEnd).map((item, index) => ({
      ...item,
      index: visibleStart + index,
    })),
    [items, visibleStart, visibleEnd]
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  const handleScroll = useThrottle((e) => {
    setScrollTop(e.target.scrollTop);
  }, 16); // ~60fps

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
};

// Performance metrics tracking
export const usePerformanceMetrics = (componentName) => {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    renderTime: 0,
    memoryUsage: 0,
    lastRender: null,
  });

  const renderStartTime = useRef(Date.now());

  useEffect(() => {
    const renderEndTime = Date.now();
    const renderDuration = renderEndTime - renderStartTime.current;

    setMetrics(prev => ({
      renderCount: prev.renderCount + 1,
      renderTime: renderDuration,
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 0,
      lastRender: renderEndTime,
    }));

    // Log performance data in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔍 Performance: ${componentName}`);
      console.log(`Render #${metrics.renderCount + 1}: ${renderDuration}ms`);
      if (performance.memory) {
        console.log(`Memory: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      }
      console.groupEnd();
    }

    renderStartTime.current = Date.now();
  });

  return metrics;
};

// Bundle size and loading performance
export const useBundlePerformance = () => {
  const [bundleMetrics, setBundleMetrics] = useState({
    loadTime: 0,
    bundleSize: 0,
    compressionRatio: 0,
    cacheHit: false,
  });

  useEffect(() => {
    // Measure bundle load performance
    const measureBundlePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      
      const jsResources = resources.filter(resource => 
        resource.name.includes('.js') || resource.name.includes('.chunk')
      );

      const totalLoadTime = navigation.loadEventEnd - navigation.fetchStart;
      const totalTransferSize = jsResources.reduce((acc, resource) => 
        acc + (resource.transferSize || 0), 0
      );
      const totalDecodedSize = jsResources.reduce((acc, resource) => 
        acc + (resource.decodedBodySize || 0), 0
      );

      setBundleMetrics({
        loadTime: totalLoadTime,
        bundleSize: totalTransferSize,
        compressionRatio: totalDecodedSize > 0 ? totalTransferSize / totalDecodedSize : 0,
        cacheHit: jsResources.some(resource => resource.transferSize === 0),
      });
    };

    // Wait for page load to complete
    if (document.readyState === 'complete') {
      measureBundlePerformance();
    } else {
      window.addEventListener('load', measureBundlePerformance);
      return () => window.removeEventListener('load', measureBundlePerformance);
    }
  }, []);

  return bundleMetrics;
};

// Memory leak detection
export const useMemoryLeakDetector = (componentName) => {
  const intervalRef = useRef(null);
  const [memoryTrend, setMemoryTrend] = useState([]);

  useEffect(() => {
    if (!performance.memory) return;

    const checkMemory = () => {
      const currentMemory = performance.memory.usedJSHeapSize;
      const timestamp = Date.now();
      
      setMemoryTrend(prev => {
        const newTrend = [...prev, { timestamp, memory: currentMemory }];
        // Keep only last 50 measurements
        return newTrend.slice(-50);
      });
    };

    intervalRef.current = setInterval(checkMemory, 5000); // Check every 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [componentName]);

  // Detect potential memory leaks
  const isLeaking = useMemo(() => {
    if (memoryTrend.length < 10) return false;
    
    const recent = memoryTrend.slice(-10);
    const avgGrowth = recent.reduce((acc, curr, index) => {
      if (index === 0) return 0;
      return acc + (curr.memory - recent[index - 1].memory);
    }, 0) / (recent.length - 1);

    return avgGrowth > 1024 * 1024; // Alert if growing by more than 1MB on average
  }, [memoryTrend]);

  return { memoryTrend, isLeaking };
};

// Network performance optimization
export const useNetworkOptimization = () => {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: '4g',
    downlink: 10,
    saveData: false,
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        setNetworkInfo({
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          saveData: connection.saveData || false,
        });
      }
    };

    updateNetworkInfo();
    
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      connection.addEventListener('change', updateNetworkInfo);
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  // Optimize based on network conditions
  const shouldOptimizeForLowBandwidth = useMemo(() => {
    return networkInfo.saveData || 
           networkInfo.effectiveType === 'slow-2g' || 
           networkInfo.effectiveType === '2g' ||
           networkInfo.downlink < 1;
  }, [networkInfo]);

  return {
    networkInfo,
    shouldOptimizeForLowBandwidth,
    getOptimizedImageSize: (originalWidth) => {
      if (shouldOptimizeForLowBandwidth) {
        return Math.min(originalWidth, 640);
      }
      return originalWidth;
    },
    getOptimizedChunkSize: (originalSize) => {
      if (shouldOptimizeForLowBandwidth) {
        return Math.min(originalSize, 20); // Smaller chunks for slow connections
      }
      return originalSize;
    },
  };
};

// Component render optimization
export const useMemoizedCallback = (callback, deps) => {
  return useCallback(callback, deps);
};

export const useMemoizedValue = (computeValue, deps) => {
  return useMemo(computeValue, deps);
};

// Bundle splitting utility
export const getBundleChunks = () => {
  const chunks = {
    admin: () => import(/* webpackChunkName: "admin" */ '../pages/AdminDashboard'),
    student: () => import(/* webpackChunkName: "student" */ '../pages/StudentDashboard'),
    faculty: () => import(/* webpackChunkName: "faculty" */ '../pages/FacultyDashboard'),
    analytics: () => import(/* webpackChunkName: "analytics" */ '../components/analytics/EnhancedAnalytics'),
    settings: () => import(/* webpackChunkName: "settings" */ '../components/settings/SettingsPanel'),
  };

  return chunks;
};

const PerformanceHooks = {
  useDebounce,
  useThrottle,
  useVirtualScrolling,
  usePerformanceMetrics,
  useBundlePerformance,
  useMemoryLeakDetector,
  useNetworkOptimization,
  useMemoizedCallback,
  useMemoizedValue,
  getBundleChunks,
};

export default PerformanceHooks;
