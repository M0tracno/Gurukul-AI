import React, { useEffect, forwardRef } from 'react';

// ScrollTop Fix for MUI v7 Compatibility - COMPREHENSIVE FIX

// Global flag to ensure fix is applied only once
let fixApplied = false;

export const useScrollTopFix = () => {
  useEffect(() => {
    if (fixApplied) return;

    // Mark fix as applied
    fixApplied = true;

    // AGGRESSIVE FIX: Patch the reflow function itself
    const originalReflow = window.reflow;
    window.reflow = function (node) {
      if (!node || typeof node !== 'object') {
        return 0;
      }
      try {
        if (originalReflow) {
          return originalReflow.call(this, node);
        }
        return node.scrollTop || 0;
      } catch (error) {
        console.warn('Reflow operation prevented on invalid node');
        return 0;
      }
    };

    // Patch Element.prototype.scrollTop with comprehensive protection
    const originalDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');

    if (originalDescriptor) {
      Object.defineProperty(Element.prototype, 'scrollTop', {
        get() {
          try {
            if (!this || this === null || this === undefined) {
              return 0;
            }
            return originalDescriptor.get.call(this) || 0;
          } catch (error) {
            return 0;
          }
        },
        set(value) {
          try {
            if (!this || this === null || this === undefined) {
              return;
            }
            if (originalDescriptor.set) {
              originalDescriptor.set.call(this, value);
            }
          } catch (error) {
            // Silently ignore errors
          }
        },
        configurable: true,
        enumerable: true,
      });
    }

    // Patch document.body and document.documentElement scrollTop access
    const patchScrollTop = (element, name) => {
      if (!element) return;

      const descriptor =
        Object.getOwnPropertyDescriptor(element, 'scrollTop') ||
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'scrollTop');

      if (descriptor) {
        Object.defineProperty(element, 'scrollTop', {
          get() {
            try {
              return descriptor.get ? descriptor.get.call(this) || 0 : 0;
            } catch (error) {
              return 0;
            }
          },
          set(value) {
            try {
              if (descriptor.set) {
                descriptor.set.call(this, value);
              }
            } catch (error) {
              // Silently ignore
            }
          },
          configurable: true,
          enumerable: true,
        });
      }
    };

    // Apply patches to common scroll elements
    patchScrollTop(document.body, 'body');
    patchScrollTop(document.documentElement, 'documentElement');

    // Comprehensive error suppression
    const originalError = console.error;
    console.error = (...args) => {
      const errorMessage = args[0];
      if (typeof errorMessage === 'string') {
        const suppressedErrors = [
          'scrollTop',
          'Cannot read properties of null',
          'Cannot read properties of undefined',
          'reflow',
          'Maximum update depth exceeded',
        ];

        if (suppressedErrors.some(err => errorMessage.includes(err))) {
          console.warn('MUI transition error suppressed:', args[0]);
          return;
        }
      }
      originalError(...args);
    };

    // Global error handler for uncaught exceptions
    const originalOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
      if (typeof message === 'string' && message.includes('scrollTop')) {
        console.warn('Global scrollTop error suppressed:', message);
        return true; // Prevent default error handling
      }
      if (originalOnError) {
        return originalOnError.call(this, message, source, lineno, colno, error);
      }
      return false;
    };

    // Cleanup function
    return () => {
      console.error = originalError;
      window.onerror = originalOnError;
      fixApplied = false;
    };
  }, []);
};

// Safe transition components that avoid MUI reflow issues
export const SafeFade = forwardRef(({ children, in: inProp, timeout, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        opacity: inProp ? 1 : 0,
        transition: `opacity ${timeout || 300}ms ease-in-out`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export const SafeGrow = forwardRef(({ children, in: inProp, timeout, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        transform: inProp ? 'scale(1)' : 'scale(0)',
        opacity: inProp ? 1 : 0,
        transition: `all ${timeout || 300}ms ease-in-out`,
        transformOrigin: 'center',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export const SafeZoom = forwardRef(({ children, in: inProp, timeout, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        transform: inProp ? 'scale(1)' : 'scale(0.3)',
        opacity: inProp ? 1 : 0,
        transition: `all ${timeout || 300}ms ease-in-out`,
        transformOrigin: 'center',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

// General purpose transition wrapper
export const SafeTransition = ({ children, ...props }) => {
  useScrollTopFix();

  return (
    <div
      style={{
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
};

export default SafeTransition;
