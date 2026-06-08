import { Component, ReactNode, ErrorInfo } from 'react';
import { Box, Button, Typography, Card, CardContent } from '@mui/material';
import { Refresh, Warning, Home } from '@mui/icons-material';
import { motion } from 'framer-motion';
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}
interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}
/**
 * Enhanced Error Boundary with futuristic design
 *
 * Features:
 * - Graceful error handling with retry functionality
 * - Error reporting to monitoring services
 * - Accessible error UI with proper ARIA labels
 * - Smooth animations with reduced motion support
 * - Error ID generation for debugging
 */
export class FuturisticErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9),
    };
  }
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env['NODE_ENV'] === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
    this.setState({
      error,
      errorInfo,
    });
    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    // Report to error monitoring service (e.g., Sentry)
    this.reportError(error, errorInfo);
  }
  override componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }
  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, send to error monitoring service
    const errorReport = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      errorId: this.state.errorId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
    // Example: Send to monitoring service
    if (process.env['NODE_ENV'] === 'production') {
      // window.errorReportingService?.captureException(error, {
      //   extra: errorReport,
      // });
      console.error('Error reported:', errorReport);
    }
  };
  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };
  private handleGoHome = () => {
    window.location.href = '/';
  };
  private handleReportIssue = () => {
    const subject = encodeURIComponent(`Error Report - ID: ${this.state.errorId}`);
    const body = encodeURIComponent(
      `Error Details:\n\n` +
        `Error ID: ${this.state.errorId}\n` +
        `Message: ${this.state.error?.message}\n` +
        `URL: ${window.location.href}\n` +
        `Time: ${new Date().toISOString()}\n\n` +
        `Please describe what you were doing when this error occurred:`
    );
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };
  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Check for reduced motion preference
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
        },
      };
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 3,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          }}
          role="alert"
          aria-live="assertive"
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            transition={{
              duration: prefersReducedMotion ? 0 : 0.5,
              ease: 'easeInOut',
            }}
          >
            <Card
              sx={{
                maxWidth: 600,
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              <CardContent sx={{ padding: 4, textAlign: 'center' }}>
                <Box sx={{ marginBottom: 3 }}>
                  <Warning sx={{ fontSize: 64, color: '#ff6b00', marginBottom: 2 }} />
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                      fontWeight: 700,
                      marginBottom: 1,
                      background: 'linear-gradient(135deg, #ff6b00 0%, #ff0066 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Something went wrong
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ marginBottom: 2 }}>
                    We encountered an unexpected error. Our team has been notified and is working on
                    a fix.
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'inline-block',
                    }}
                  >
                    Error ID: {this.state.errorId}
                  </Typography>
                </Box>
                {process.env['NODE_ENV'] === 'development' && this.state.error && (
                  <Box
                    sx={{
                      marginBottom: 3,
                      padding: 2,
                      backgroundColor: 'rgba(255, 0, 0, 0.1)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 0, 0, 0.2)',
                      textAlign: 'left',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ marginBottom: 1 }}>
                      Development Error Details:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {this.state.error.message}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    onClick={this.handleRetry}
                    startIcon={<Refresh />}
                    sx={{
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #00ff88 0%, #0066ff 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #0066ff 0%, #8b5cf6 100%)',
                        boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
                      },
                    }}
                    aria-label="Retry loading the application"
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={this.handleGoHome}
                    startIcon={<Home />}
                    sx={{
                      borderRadius: '12px',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      color: 'white',
                      '&:hover': {
                        borderColor: '#00ff88',
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                      },
                    }}
                    aria-label="Go back to home page"
                  >
                    Go Home
                  </Button>
                  <Button
                    variant="text"
                    onClick={this.handleReportIssue}
                    sx={{
                      borderRadius: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': {
                        color: '#ff6b00',
                        backgroundColor: 'rgba(255, 107, 0, 0.1)',
                      },
                    }}
                    aria-label="Report this issue to support"
                  >
                    Report Issue
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Box>
      );
    }
    return this.props.children;
  }
}
export default FuturisticErrorBoundary;