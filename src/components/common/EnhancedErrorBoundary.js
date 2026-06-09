import React from 'react';
import env from '../../config/env';
import { useTheme } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  BugReport,
  ContentCopy,
  ErrorOutline,
  ExpandLess,
  ExpandMore,
  Home,
  Refresh,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import { constructor, toString } from '@mui/material';
// Enhanced Error Boundary System for Phase 1
const ErrorContainer = styled(Box)(({ theme }) => ({
  minHeight: '400px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #1a1d3a 0%, #0a0e27 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
}));

const ErrorCard = styled(Card)(({ theme }) => ({
  maxWidth: 600,
  width: '100%',
  background: theme.custom?.glassmorphism?.background || 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  border: `1px solid ${theme.palette.error.main}20`,
}));

class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = async (error, errorInfo) => {
    const errorData = {
      id: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.props.userId || 'anonymous',
      buildVersion: env.VERSION || 'unknown',
    };

    try {
      // Send to error reporting service
      if (env.ERROR_REPORTING_ENDPOINT) {
        await fetch(env.ERROR_REPORTING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorData),
        });
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('🚨 Error Boundary Caught an Error');
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Error Data:', errorData);
        console.groupEnd();
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleToggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  handleCopyError = async () => {
    const errorText = `
Error ID: ${this.state.errorId}
Error: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      // Show success feedback (could be enhanced with a toast)
      console.log('Error details copied to clipboard');
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };
  getErrorCategory = error => {
    if (!error) return 'Unknown';
    if (error.message?.includes('ChunkLoadError')) return 'Network';
    if (error.message?.includes('Loading chunk')) return 'Loading';
    if (error.stack?.includes('firebase')) return 'Firebase';
    if (error.stack?.includes('api')) return 'API';
    return 'Application';
  };

  getErrorSeverity = error => {
    if (!error) return 'error';
    if (error.message?.includes('ChunkLoadError')) return 'warning';
    if (error.message?.includes('Network')) return 'warning';
    return 'error';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId, showDetails, retryCount } = this.state;
      const errorCategory = this.getErrorCategory(error);
      const errorSeverity = this.getErrorSeverity(error);

      return (
        <ErrorContainer>
          <ErrorCard>
            <CardContent>
              <Stack spacing={3}>
                {/* Error Header */}
                <Box display="flex" alignItems="center" gap={2}>
                  <ErrorOutline color="error" sx={{ fontSize: 40 }} />
                  <Box flex={1}>
                    <Typography variant="h5" color="error" gutterBottom>
                      Oops! Something went wrong
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      We've encountered an unexpected error. Don't worry, we're working to fix it.
                    </Typography>
                  </Box>
                </Box>

                {/* Error Metadata */}
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip
                    label={errorCategory}
                    size="small"
                    color={errorSeverity}
                    variant="outlined"
                  />
                  <Chip label={`Error ID: ${errorId}`} size="small" variant="outlined" />
                  {retryCount > 0 && (
                    <Chip
                      label={`Retry #${retryCount}`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </Box>

                {/* User-friendly error message */}
                <Alert severity={errorSeverity} variant="outlined">
                  <Typography variant="body2">{this.getUserFriendlyMessage(error)}</Typography>
                </Alert>

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} justifyContent="center">
                  <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={this.handleRetry}
                    color="primary"
                  >
                    Try Again
                  </Button>
                  <Button variant="outlined" startIcon={<Home />} onClick={this.handleGoHome}>
                    Go Home
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopy />}
                    onClick={this.handleCopyError}
                    size="small"
                  >
                    Copy Error
                  </Button>
                </Stack>

                <Divider />

                {/* Technical Details Toggle */}
                <Box>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<BugReport />}
                    endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                    onClick={this.handleToggleDetails}
                    color="text.secondary"
                  >
                    Technical Details
                  </Button>

                  <Collapse in={showDetails}>
                    <Box mt={2} p={2} bgcolor="background.paper" borderRadius={1}>
                      <Typography variant="subtitle2" gutterBottom>
                        Error Message:
                      </Typography>
                      <Typography
                        variant="body2"
                        color="error"
                        sx={{
                          fontFamily: 'monospace',
                          bgcolor: 'grey.100',
                          p: 1,
                          borderRadius: 1,
                          mb: 2,
                          wordBreak: 'break-word',
                        }}
                      >
                        {error?.message}
                      </Typography>

                      <Typography variant="subtitle2" gutterBottom>
                        Stack Trace:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          bgcolor: 'grey.100',
                          p: 1,
                          borderRadius: 1,
                          maxHeight: 200,
                          overflow: 'auto',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {error?.stack}
                      </Typography>

                      {errorInfo?.componentStack && (
                        <>
                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                            Component Stack:
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              bgcolor: 'grey.100',
                              p: 1,
                              borderRadius: 1,
                              maxHeight: 150,
                              overflow: 'auto',
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {errorInfo.componentStack}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Collapse>
                </Box>

                {/* Help Text */}
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  If this problem persists, please contact support with the Error ID above.
                </Typography>
              </Stack>
            </CardContent>
          </ErrorCard>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }

  getUserFriendlyMessage(error) {
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'There was a problem loading the application. This might be due to a network issue or a recent update. Please try refreshing the page.';
    }

    if (error.message.includes('firebase')) {
      return 'There was a problem connecting to our services. Please check your internet connection and try again.';
    }

    if (error.message.includes('api') || error.message.includes('fetch')) {
      return "We're having trouble communicating with our servers. Please try again in a moment.";
    }

    return 'An unexpected error occurred. Our team has been notified and is working to fix this issue.';
  }
}

// React Error Boundary Hook
export const useErrorHandler = () => {
  const theme = useTheme();
  const handleError = React.useCallback((error, errorInfo) => {
    // This can be used to manually trigger error boundaries
    // or send errors to monitoring services
    console.error('Manual error handling:', { error, errorInfo });

    // You could dispatch this to a global error state
    // or send it directly to your error reporting service
  }, []);

  return handleError;
};

// HOC for wrapping components with error boundary
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  return function WrappedWithErrorBoundary(props) {
    return (
      <EnhancedErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </EnhancedErrorBoundary>
    );
  };
};

export default EnhancedErrorBoundary;
