import React, { Suspense, memo } from 'react';

import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
// Performance optimization utility for lazy loading components
// Styled loading container
const LoadingContainer = styled(Box)(({ theme }) => ({
  const theme = useTheme();
  const originalTheme = useTheme();
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '300px',
  gap: theme.spacing(2),
  padding: theme.spacing(4),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
}));

const LoadingSpinner = styled(CircularProgress)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const LoadingText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 500,
}));

// Default loading fallback component
export const DefaultLoadingFallback = memo(({ text = 'Loading...', size = 40 }) => (
  <LoadingContainer>
    <LoadingSpinner size={size} />
    <LoadingText variant="body1">{text}</LoadingText>
  </LoadingContainer>
));

// Enhanced lazy wrapper with error boundary
export const LazyWrapper = memo(({ 
  component: Component, 
  fallback = <DefaultLoadingFallback />,
  errorFallback = null,
  ...props 
}) => {
  const ErrorBoundary = ({ children }) => {
    const [hasError, setHasError] = React.useState(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
      const handleError = () => setHasError(true);
      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, []);

    if (hasError) {
      return errorFallback || (
        <LoadingContainer>
          <Typography color="error" variant="h6">
            Failed to load component
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Please refresh the page or try again later
          </Typography>
        </LoadingContainer>
      );
    }

    return children;
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );
});

// HOC for creating lazy components with preloading
export const createLazyComponent = (importFn, preloadCondition = null) => {
  const LazyComponent = React.lazy(importFn);
  
  // Preload component if condition is met
  if (preloadCondition && typeof preloadCondition === 'function') {
    preloadCondition().then(() => {
    }).catch(() => {
      // Silently fail preloading
    });
  }

  return LazyComponent;
};

// Intersection Observer hook for lazy loading on scroll
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);
  const targetRef = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    if (targetRef.current) {
      observer.observe(targetRef.current);
    }

    return () => {
      if (targetRef.current) {
        observer.unobserve(targetRef.current);
      }
    };
  }, [hasIntersected, options]);

  return { targetRef, isIntersecting, hasIntersected };
};

// Lazy section component that loads content when visible
export const LazySection = memo(({ 
  children, 
  fallback = <DefaultLoadingFallback />,
  once = true,
  ...props 
}) => {
  const { targetRef, hasIntersected } = useIntersectionObserver();
  const shouldRender = once ? hasIntersected : hasIntersected;

  return (
    <div ref={targetRef} {...props}>
      {shouldRender ? children : fallback}
    </div>
  );
});

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  const startTime = React.useRef(Date.now());
  const [renderTime, setRenderTime] = React.useState(null);

  React.useEffect(() => {
    const endTime = Date.now();
    const duration = endTime - startTime.current;
    setRenderTime(duration);

    // Log performance data
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} render time: ${duration}ms`);
    }

    // Send to analytics if available
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: `${componentName}_render`,
        value: duration,
      });
    }
  }, [componentName]);

  return renderTime;
};

// Component bundle size tracker
export const withBundleAnalytics = (WrappedComponent, componentName) => {
  return memo((props) => {
    usePerformanceMonitor(componentName);
    return <WrappedComponent {...props} />;
  });
};

export default LazyWrapper;
