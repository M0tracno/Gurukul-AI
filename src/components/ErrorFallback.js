import React from 'react';
import { Box, Button, Container, Paper, Typography } from '@mui/material';

  return (
    <Container maxWidth="md" style={{ marginTop: '3rem' }}>
      <Paper style={{ padding: '2rem', textAlign: 'center' }}>
        <Typography variant="h4" sx={{ color: "error.main" }} gutterBottom>
          Application Error
        </Typography>
        
        <Typography variant="body1" paragraph>
          The application encountered an error while loading. This may be due to:
        </Typography>
        
        <Box textAlign="left" mb={3} bgcolor="#f5f5f5" p={2} borderRadius={4}>
          <Typography component="ul">
            <li>Missing environment variables</li>
            <li>MongoDB connection or authentication issues</li>
            <li>Network connectivity problems</li>
            <li>Session expiration or invalid credentials</li>
          </Typography>
        </Box>
        
        {error && (
          <Box textAlign="left" mb={3} bgcolor="#ffebee" p={2} borderRadius={4} overflow="auto">
            <Typography variant="body2" component="pre" style={{ whiteSpace: 'pre-wrap' }}>
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </Typography>
          </Box>
        )}
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={resetErrorBoundary}
        >
          Try Again
        </Button>
      </Paper>
    </Container>
  );
};

export default ErrorFallback;


