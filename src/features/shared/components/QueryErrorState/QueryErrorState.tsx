/**
 * QueryErrorState — Inline error UI displayed when a React Query request
 * fails after all retry attempts (3 retries by default).
 *
 * Provides:
 * - User-facing error message describing the failure
 * - Manual retry button to re-trigger the failed query
 *
 * Validates: Requirements 5.7
 */

import { type ReactNode } from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export interface QueryErrorStateProps {
  /** Error message to display. Falls back to a generic message if not provided. */
  message?: string;
  /** Callback invoked when the user clicks the retry button */
  onRetry: () => void;
  /** Optional title for the error alert */
  title?: string;
  /** Optional custom action element to render alongside/instead of the default retry button */
  action?: ReactNode;
}

/**
 * Renders an inline error state within the requesting component
 * when a query fails after exhausting all retries.
 */
export function QueryErrorState({
  message = 'Something went wrong while loading data. Please try again.',
  onRetry,
  title = 'Failed to load',
  action,
}: QueryErrorStateProps) {
  return (
    <Box sx={{ p: 2 }}>
      <Alert
        severity="error"
        action={
          action ?? (
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
              aria-label="Retry loading data"
            >
              Retry
            </Button>
          )
        }
      >
        <AlertTitle>{title}</AlertTitle>
        {message}
      </Alert>
    </Box>
  );
}
