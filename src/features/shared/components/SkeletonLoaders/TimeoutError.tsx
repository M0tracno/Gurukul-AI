/**
 * TimeoutError — Error state displayed when a data-fetching view
 * has been loading for longer than the configured timeout (10s).
 *
 * Provides a clear message and a retry action button to let the
 * user re-attempt the request.
 *
 * Requirements: 6.7
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface TimeoutErrorProps {
  /** Callback to retry the failed operation */
  onRetry: () => void;
  /** Optional custom message. Defaults to generic timeout message. */
  message?: string;
}

export function TimeoutError({
  onRetry,
  message = 'The request timed out. The server may be slow or unreachable.',
}: TimeoutErrorProps) {
  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 56, color: 'warning.main', mb: 2 }} aria-hidden="true" />
      <Typography variant="h6" component="h2" gutterBottom>
        Request Timed Out
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
        {message}
      </Typography>
      <Button
        variant="contained"
        startIcon={<RefreshIcon />}
        onClick={onRetry}
        aria-label="Retry loading data"
      >
        Retry
      </Button>
    </Box>
  );
}
