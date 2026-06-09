/**
 * RadioGroupField — Accessible radio group.
 *
 * WCAG 2.1 AA compliant:
 * - Keyboard navigable (arrow keys within group)
 * - Visible focus indicators
 * - ARIA roles (radiogroup, radio)
 * - High contrast (4.5:1+)
 * - Micro-animation within 200ms
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

import { forwardRef } from 'react';
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
  type RadioGroupProps as MuiRadioGroupProps,
  useTheme,
} from '@mui/material';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupFieldProps extends Omit<MuiRadioGroupProps, 'children'> {
  /** Options for the radio group */
  options: RadioOption[];
  /** Group label */
  fieldLabel: string;
  /** Unique ID for accessibility */
  id: string;
  /** Helper text */
  helperText?: string;
  /** Error state */
  error?: boolean;
  /** Layout direction */
  direction?: 'row' | 'column';
}

export const RadioGroupField = forwardRef<HTMLDivElement, RadioGroupFieldProps>(
  function RadioGroupField(
    { options, fieldLabel, id, helperText, error, direction = 'column', ...props },
    ref
  ) {
    const theme = useTheme();
    const helperId = helperText ? `${id}-helper-text` : undefined;

    return (
      <FormControl ref={ref} error={error} role="group" aria-labelledby={`${id}-label`}>
        <FormLabel
          id={`${id}-label`}
          component="legend"
          sx={{
            color: theme.palette.text.primary,
            '&.Mui-focused': {
              color: theme.palette.primary.main,
            },
            '&.Mui-error': {
              color: theme.palette.error.main,
            },
          }}
        >
          {fieldLabel}
        </FormLabel>
        <RadioGroup
          aria-labelledby={`${id}-label`}
          aria-describedby={helperId}
          row={direction === 'row'}
          {...props}
        >
          {options.map(option => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              label={option.label}
              sx={{
                '& .MuiTypography-root': {
                  color: theme.palette.text.primary,
                },
              }}
              control={
                <Radio
                  sx={{
                    // Micro-animation
                    transition: 'transform 150ms ease-in-out',
                    '&:active': {
                      transform: 'scale(0.9)',
                    },
                    // Visible focus indicator
                    '&.Mui-focusVisible': {
                      outline: `3px solid ${theme.palette.primary.main}`,
                      outlineOffset: '2px',
                      borderRadius: '50%',
                    },
                    '&.Mui-checked': {
                      color: theme.palette.primary.main,
                    },
                    ...(error && {
                      color: theme.palette.error.main,
                      '&.Mui-checked': {
                        color: theme.palette.error.main,
                      },
                    }),
                  }}
                />
              }
            />
          ))}
        </RadioGroup>
        {helperText && <FormHelperText id={helperId}>{helperText}</FormHelperText>}
      </FormControl>
    );
  }
);
