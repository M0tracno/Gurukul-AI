// Console utilities for managing warnings and errors
export const consoleUtils = {
  // Suppress specific console warnings
  suppressWarnings: () => {
    // Store original console methods
    const originalWarn = console.warn;
    const originalError = console.error;

    console.warn = (...args) => {
      const message = args.join(' ');

      // Suppress known warnings that are not actionable
      const suppressedWarnings = [
        'findDOMNode is deprecated',
        'Download the React DevTools',
        'A listener indicated an asynchronous response by returning true',
      ];

      const shouldSuppress = suppressedWarnings.some(warning => message.includes(warning));

      if (!shouldSuppress) {
        originalWarn.apply(console, args);
      }
    };

    console.error = (...args) => {
      const message = args.join(' ');

      // Suppress known errors that are not critical
      const suppressedErrors = [
        'A listener indicated an asynchronous response by returning true',
        'message channel closed before a response was received',
      ];

      const shouldSuppress = suppressedErrors.some(error => message.includes(error));

      if (!shouldSuppress) {
        originalError.apply(console, args);
      }
    };
  },

  // Restore original console methods
  restoreConsole: () => {
    // This would restore original methods if needed
    // Implementation depends on specific requirements
  },

  // Enhanced logging for development
  devLog: (message, type = 'info', data = null) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${type.toUpperCase()}]`;

      switch (type) {
        case 'error':
          console.error(`${prefix} ${message}`, data || '');
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`, data || '');
          break;
        case 'success':
          console.log(`%c${prefix} ${message}`, 'color: green', data || '');
          break;
        default:
          console.log(`${prefix} ${message}`, data || '');
      }
    }
  },
};

export default consoleUtils;
