/**
 * Form controls — Design-system inputs.
 *
 * Token-driven form primitives (`TextField`, `SelectField`) plus a `Form`
 * layout wrapper, all styled from shared tokens for a single SaaS-dashboard
 * look. No one-off styling — radius, spacing, and typography come from tokens.
 *
 * Requirements: 7.1 (forms), 7.2, 7.3 (tokens), 7.4 (single style).
 */

import {
  Box,
  type BoxProps,
  MenuItem,
  TextField as MuiTextField,
  type TextFieldProps as MuiTextFieldProps,
} from '@mui/material';
import { forwardRef } from 'react';

import { borderRadius } from '../tokens/borderRadius';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

/** Shared token-derived styling for input roots. */
const inputSx = {
  fontFamily: typography.fontFamily.body,
  '& .MuiOutlinedInput-root': {
    borderRadius: `${borderRadius.sm}px`,
    fontSize: typography.body2.fontSize,
    transition: 'box-shadow 150ms ease-in-out, border-color 150ms ease-in-out',
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: typography.body2.fontSize,
  },
} as const;

export interface TextFieldProps extends Omit<MuiTextFieldProps, 'variant'> {
  variant?: 'outlined' | 'filled' | 'standard';
}

export const TextField = forwardRef<HTMLDivElement, TextFieldProps>(function TextField(
  { variant = 'outlined', sx, ...props },
  ref,
) {
  return (
    <MuiTextField
      ref={ref}
      variant={variant}
      fullWidth
      aria-invalid={props.error || undefined}
      sx={{ ...inputSx, ...sx }}
      {...props}
    />
  );
});

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectFieldProps extends Omit<MuiTextFieldProps, 'variant' | 'select'> {
  /** Options rendered as menu items. */
  options: SelectOption[];
}

export const SelectField = forwardRef<HTMLDivElement, SelectFieldProps>(function SelectField(
  { options, sx, children, ...props },
  ref,
) {
  return (
    <MuiTextField
      ref={ref}
      select
      variant="outlined"
      fullWidth
      aria-invalid={props.error || undefined}
      sx={{ ...inputSx, ...sx }}
      {...props}
    >
      {options.map((opt) => (
        <MenuItem key={String(opt.value)} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
      {children}
    </MuiTextField>
  );
});

export interface FormProps extends BoxProps<'form'> {
  /** Vertical gap between fields, derived from spacing tokens. */
  gap?: keyof typeof spacing;
}

/** Form — a vertically stacked, token-spaced form layout. */
export const Form = forwardRef<HTMLFormElement, FormProps>(function Form(
  { gap = 'md', sx, children, ...props },
  ref,
) {
  return (
    <Box
      ref={ref}
      component="form"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${spacing[gap]}px`,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
});
