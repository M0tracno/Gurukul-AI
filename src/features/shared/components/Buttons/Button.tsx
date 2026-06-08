/**
 * Button — Accessible interactive button with micro-animations.
 *
 * WCAG 2.1 AA compliant:
 * - Keyboard navigable (Enter/Space to activate)
 * - Visible focus indicator (3px outline with offset)
 * - 4.5:1 contrast ratio for text (3:1 for large text/UI)
 * - Micro-animation feedback within 200ms (scale + ripple)
 * - ARIA labels for icon-only buttons
 * - Loading state with aria-busy
 * - Responsive sizing
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

import { forwardRef } from 'react';
import {
  Button as MuiButton,
  type ButtonProps as MuiButtonProps,
  CircularProgress,
  useTheme,
} from '@mui/material';

export interface ButtonProps extends MuiButtonProps {
  /** Loading state — shows spinner and disables interaction */
  loading?: boolean;
  /** Accessible label (required for icon-only buttons) */
  'aria-label'?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ loading = false, children, disabled, sx, ...props }, ref) {
    const theme = useTheme();
    const isDisabled = disabled || loading;

    return (
      <MuiButton
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        sx={{
          // Base transitions for micro-animation feedback (< 200ms)
          transition: 'transform 150ms ease-in-out, box-shadow 150ms ease-in-out, background-color 150ms ease-in-out',
          // Press animation
          '&:active:not(:disabled)': {
            transform: 'scale(0.97)',
          },
          // Visible focus indicator for keyboard navigation
          '&:focus-visible': {
            outline: `3px solid ${theme.palette.primary.main}`,
            outlineOffset: '2px',
            borderRadius: '4px',
          },
          // Hover elevation
          '&:hover:not(:disabled)': {
            boxShadow: theme.shadows[2],
          },
          // Ensure minimum touch target size (44x44 per WCAG)
          minHeight: '44px',
          minWidth: '44px',
          // Responsive padding
          px: { xs: 2, sm: 3 },
          py: { xs: 1, sm: 1.5 },
          ...sx,
        }}
        {...props}
      >
        {loading ? (
          <CircularProgress
            size={20}
            color="inherit"
            aria-hidden="true"
            sx={{ mr: children ? 1 : 0 }}
          />
        ) : null}
        {children}
      </MuiButton>
    );
  },
);
