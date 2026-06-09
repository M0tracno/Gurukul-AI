/**
 * SelectField — Accessible select dropdown.
 *
 * WCAG 2.1 AA compliant:
 * - Keyboard navigable (arrow keys, Enter, Escape)
 * - Visible focus indicators
 * - ARIA labels and roles
 * - High contrast text
 * - Micro-animation within 200ms
 * - Responsive layout
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

import { forwardRef } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  type SelectProps as MuiSelectProps,
  useTheme,
} from '@mui/material';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<MuiSelectProps, 'children'> {
  /** Options to display in the dropdown */
  options: SelectOption[];
  /** Helper text below the select */
  helperText?: string;
  /** Whether the field has an error */
  error?: boolean;
  /** Unique ID — required for accessibility */
  id: string;
  /** The field label */
  fieldLabel: string;
}

export const SelectField = forwardRef<HTMLDivElement, SelectFieldProps>(function SelectField(
  { options, helperText, error, id, fieldLabel, fullWidth = true, sx, ...props },
  ref
) {
  const theme = useTheme();
  const labelId = `${id}-label`;
  const helperId = helperText ? `${id}-helper-text` : undefined;

  return (
    <FormControl ref={ref} fullWidth={fullWidth} error={error} sx={sx}>
      <InputLabel
        id={labelId}
        sx={{
          color: theme.palette.text.secondary,
          '&.Mui-focused': {
            color: theme.palette.primary.main,
          },
          '&.Mui-error': {
            color: theme.palette.error.main,
          },
        }}
      >
        {fieldLabel}
      </InputLabel>
      <Select
        labelId={labelId}
        id={id}
        label={fieldLabel}
        aria-describedby={helperId}
        aria-invalid={!!error}
        sx={{
          // Micro-animation for state transitions
          transition: 'border-color 150ms ease-in-out, box-shadow 150ms ease-in-out',
          '& .MuiOutlinedInput-notchedOutline': {
            transition: 'border-color 150ms ease-in-out, box-shadow 150ms ease-in-out',
          },
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
        }}
        {...props}
      >
        {options.map(option => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            sx={{
              // Focus styling within dropdown
              '&:focus-visible': {
                outline: `3px solid ${theme.palette.primary.main}`,
                outlineOffset: '-3px',
                borderRadius: '4px',
              },
              // Hover animation within 200ms
              transition: 'background-color 150ms ease-in-out',
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText id={helperId}>{helperText}</FormHelperText>}
    </FormControl>
  );
});
