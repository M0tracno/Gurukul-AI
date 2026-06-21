/**
 * CheckboxField — Accessible checkbox input.
 *
 * WCAG 2.1 AA compliant:
 * - Keyboard navigable (Space to toggle)
 * - Visible focus indicator (3px outline)
 * - ARIA attributes for checked state
 * - High contrast (4.5:1+)
 * - Micro-animation feedback within 200ms
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

import { forwardRef } from 'react';
import {
  FormControlLabel,
  Checkbox,
  type CheckboxProps as MuiCheckboxProps,
  FormHelperText,
  FormControl,
  useTheme,
} from '@mui/material';

export interface CheckboxFieldProps extends Omit<MuiCheckboxProps, 'id'> {
  /** The label text for the checkbox */
  label: string;
  /** Unique ID for accessibility */
  id: string;
  /** Helper text below the checkbox */
  helperText?: string;
  /** Whether the field has an error */
  error?: boolean;
}

export const CheckboxField = forwardRef<HTMLButtonElement, CheckboxFieldProps>(
  function CheckboxField({ label, id, helperText, error, sx, ...props }, ref) {
    const theme = useTheme();
    const helperId = helperText ? `${id}-helper-text` : undefined;

    return (
      <FormControl error={error}>
        <FormControlLabel
          label={label}
          htmlFor={id}
          sx={{
            '& .MuiTypography-root': {
              // Ensure 4.5:1 contrast
              color: theme.palette.text.primary,
            },
          }}
          control={
            <Checkbox
              ref={ref}
              id={id}
              inputProps={{
                'aria-describedby': helperId,
                'aria-invalid': error || undefined,
              }}
              sx={{
                // Micro-animation for check state transition
                transition: 'transform 150ms ease-in-out',
                '&:active': {
                  transform: 'scale(0.9)',
                },
                // Visible focus indicator
                '&.Mui-focusVisible': {
                  outline: `3px solid ${theme.palette.primary.main}`,
                  outlineOffset: '2px',
                  borderRadius: '4px',
                },
                // Color for checked state
                '&.Mui-checked': {
                  color: theme.palette.primary.main,
                },
                // Error state
                ...(error && {
                  color: theme.palette.error.main,
                  '&.Mui-checked': {
                    color: theme.palette.error.main,
                  },
                }),
                ...sx,
              }}
              {...props}
            />
          }
        />
        {helperText && (
          <FormHelperText id={helperId} sx={{ ml: '32px' }}>
            {helperText}
          </FormHelperText>
        )}
      </FormControl>
    );
  }
);
