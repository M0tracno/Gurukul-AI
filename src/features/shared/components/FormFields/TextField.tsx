/**
 * TextField — Accessible text input field.
 *
 * WCAG 2.1 AA compliant:
 * - Visible focus indicators (3px outline)
 * - ARIA labels and descriptions for screen readers
 * - Error states with aria-invalid and aria-describedby
 * - Keyboard navigable
 * - 4.5:1 contrast ratio for text
 * - Micro-animation feedback within 200ms
 * - Responsive layout
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

import { forwardRef } from 'react';
import {
  TextField as MuiTextField,
  type TextFieldProps as MuiTextFieldProps,
  useTheme,
} from '@mui/material';

export interface TextFieldProps extends Omit<MuiTextFieldProps, 'variant'> {
  /** Variant style — defaults to outlined for better accessibility */
  variant?: 'outlined' | 'filled' | 'standard';
}

export const TextField = forwardRef<HTMLDivElement, TextFieldProps>(function TextField(
  { variant = 'outlined', sx, ...props },
  ref
) {
  const theme = useTheme();

  return (
    <MuiTextField
      ref={ref}
      variant={variant}
      fullWidth
      aria-invalid={!!props.error}
      aria-describedby={props.helperText && props.id ? `${props.id}-helper-text` : undefined}
      sx={{
        // Micro-animation for state transitions
        '& .MuiOutlinedInput-root': {
          transition: 'border-color 150ms ease-in-out, box-shadow 150ms ease-in-out',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          // Visible focus indicator
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '2px',
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 3px ${theme.palette.primary.main}33`,
          },
          // Error state
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.error.main,
          },
          '&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline': {
            boxShadow: `0 0 0 3px ${theme.palette.error.main}33`,
          },
        },
        // Ensure label contrast
        '& .MuiInputLabel-root': {
          color: theme.palette.text.secondary,
          '&.Mui-focused': {
            color: theme.palette.primary.main,
          },
          '&.Mui-error': {
            color: theme.palette.error.main,
          },
        },
        // Helper text contrast
        '& .MuiFormHelperText-root': {
          color: theme.palette.text.secondary,
          '&.Mui-error': {
            color: theme.palette.error.main,
          },
        },
        ...sx,
      }}
      {...props}
    />
  );
});
