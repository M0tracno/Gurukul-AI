/**
 * SwitchField — Accessible toggle switch.
 *
 * WCAG 2.1 AA compliant:
 * - Keyboard navigable (Space/Enter to toggle)
 * - Visible focus indicator
 * - ARIA role="switch" with aria-checked
 * - High contrast (4.5:1+)
 * - Micro-animation within 200ms
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

import { forwardRef } from 'react';
import {
  FormControlLabel,
  Switch,
  type SwitchProps as MuiSwitchProps,
  FormHelperText,
  FormControl,
  useTheme,
} from '@mui/material';

export interface SwitchFieldProps
  extends Omit<MuiSwitchProps, 'id'> {
  /** Label text */
  label: string;
  /** Unique ID for accessibility */
  id: string;
  /** Helper text */
  helperText?: string;
  /** Error state */
  error?: boolean;
}

export const SwitchField = forwardRef<HTMLButtonElement, SwitchFieldProps>(
  function SwitchField(
    { label, id, helperText, error, sx, ...props },
    ref,
  ) {
    const theme = useTheme();
    const helperId = helperText ? `${id}-helper-text` : undefined;

    return (
      <FormControl error={error}>
        <FormControlLabel
          label={label}
          htmlFor={id}
          sx={{
            '& .MuiTypography-root': {
              color: theme.palette.text.primary,
            },
          }}
          control={
            <Switch
              ref={ref}
              id={id}
              inputProps={{
                'aria-describedby': helperId,
                role: 'switch',
              }}
              sx={{
                // Micro-animation for the thumb sliding
                '& .MuiSwitch-thumb': {
                  transition: 'transform 150ms ease-in-out, background-color 150ms ease-in-out',
                },
                '& .MuiSwitch-track': {
                  transition: 'background-color 150ms ease-in-out',
                },
                // Visible focus indicator
                '& .MuiSwitch-switchBase.Mui-focusVisible + .MuiSwitch-track': {
                  outline: `3px solid ${theme.palette.primary.main}`,
                  outlineOffset: '2px',
                  borderRadius: '20px',
                },
                // Checked color
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: theme.palette.primary.main,
                  '& + .MuiSwitch-track': {
                    backgroundColor: theme.palette.primary.main,
                  },
                },
                ...sx,
              }}
              {...props}
            />
          }
        />
        {helperText && (
          <FormHelperText id={helperId} sx={{ ml: '48px' }}>
            {helperText}
          </FormHelperText>
        )}
      </FormControl>
    );
  },
);
