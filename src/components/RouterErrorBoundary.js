import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';

class RouterErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Router Error Boundary caught an error:', error, errorInfo);

    // Suppress scrollTop errors
    if (error.message && error.message.includes('scrollTop')) {
      this.setState({ hasError: false, error: null });
      return;
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
            <Typography variant="h5" color="error" gutterBottom>
              Oops! Something went wrong
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              There was an unexpected error. Please try refreshing the page.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Refresh />}
              onClick={this.handleReload}
            >
              Reload Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default RouterErrorBoundary;
