// Enhanced Error Monitoring and Logging Service
class ErrorMonitoringService {
  constructor() {
    this.errors = [];
    this.maxErrors = 100; // Keep last 100 errors
    this.setupGlobalErrorHandling();
  }

  setupGlobalErrorHandling() {
    // Enhanced window error handler
    window.addEventListener('error', event => {
      this.logError({
        type: 'JavaScript Error',
        message: event.error?.message || event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });

    // Enhanced unhandled promise rejection handler
    window.addEventListener('unhandledrejection', event => {
      this.logError({
        type: 'Unhandled Promise Rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });

    // React error boundary integration
    window.addEventListener('react-error', event => {
      this.logError({
        type: 'React Error',
        message: event.detail?.error?.message,
        stack: event.detail?.error?.stack,
        componentStack: event.detail?.errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      });
    });
  }

  logError(errorInfo) {
    // Add to local error collection
    this.errors.unshift(errorInfo);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    // Enhanced console logging with more context
    console.group(`🚨 ${errorInfo.type} - ${new Date(errorInfo.timestamp).toLocaleTimeString()}`);
    console.error('Message:', errorInfo.message);
    if (errorInfo.stack) {
      console.error('Stack:', errorInfo.stack);
    }
    if (errorInfo.componentStack) {
      console.error('Component Stack:', errorInfo.componentStack);
    }
    console.error('Context:', {
      url: errorInfo.url,
      timestamp: errorInfo.timestamp,
      userAgent: errorInfo.userAgent,
    });
    console.groupEnd();

    // In production, you would send this to your error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToService(errorInfo);
    }
  }

  sendErrorToService(errorInfo) {
    // Example: Send to error tracking service (Sentry, LogRocket, etc.)
    try {
      // Uncomment and configure your error tracking service
      /*
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorInfo)
      }).catch(err => console.error('Failed to send error to service:', err));
      */
    } catch (err) {
      console.error('Error logging service failed:', err);
    }
  }

  getRecentErrors() {
    return this.errors.slice(0, 10); // Return last 10 errors
  }

  clearErrors() {
    this.errors = [];
  }

  // Performance monitoring
  measurePerformance(name, fn) {
    const start = performance.now();
    try {
      const result = fn();
      const end = performance.now();
      console.log(`⚡ Performance: ${name} took ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      this.logError({
        type: 'Performance Error',
        message: `Error in ${name}: ${error.message}`,
        stack: error.stack,
        duration: end - start,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Async performance monitoring
  async measureAsyncPerformance(name, asyncFn) {
    const start = performance.now();
    try {
      const result = await asyncFn();
      const end = performance.now();
      console.log(`⚡ Async Performance: ${name} took ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      this.logError({
        type: 'Async Performance Error',
        message: `Error in ${name}: ${error.message}`,
        stack: error.stack,
        duration: end - start,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Analytics event tracking
  captureEvent(eventName, eventData) {
    try {
      const event = {
        id: Date.now(),
        name: eventName,
        data: eventData,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        source: 'error_monitoring',
      };

      console.log(`📊 Analytics Event: ${eventName}`, eventData);

      // In production, send to analytics service
      if (process.env.NODE_ENV === 'production') {
        this.sendEventToService(event);
      }

      return event;
    } catch (error) {
      console.error('Error capturing analytics event:', error);
    }
  }

  // Track event (alias for captureEvent)
  trackEvent(eventName, eventData) {
    return this.captureEvent(eventName, eventData);
  }

  // Capture error for tracking
  captureError(error, context = {}) {
    const errorInfo = {
      type: 'Captured Error',
      message: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context,
    };

    this.logError(errorInfo);
    return errorInfo;
  }

  // Send event to analytics service
  sendEventToService(event) {
    // TODO: Implement analytics service integration
    console.log('📈 Event sent to analytics service:', event);
  }
}

// Create global instance
const errorMonitoring = new ErrorMonitoringService();

// Add initialize method for compatibility with other security helpers
errorMonitoring.initialize = function () {
  // This method is called by dashboard components
  // The constructor already sets up error handling,
  // but we can do additional initialization here if needed
  console.log('Error monitoring initialized');
  return true;
};

export default errorMonitoring;
export { errorMonitoring };
