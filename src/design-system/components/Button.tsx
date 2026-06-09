/**
 * Button — Design-system button.
 *
 * A single, token-driven button used across the Portal. Built on MUI's Button
 * but every visual value (radius, spacing, typography, elevation, color) is
 * derived from shared design tokens — no one-off styles.
 *
 * SaaS-dashboard style: compact, low-radius, subtle elevation on hover,
 * fast micro-interaction feedback.
 *
 * Requirements: 7.1 (reusable button), 7.2 (use component not one-off),
 * 7.3 (derive from tokens), 7.4 (single SaaS-dashboard style).
 */

import {
  Button as MuiButton,
  type ButtonProps as MuiButtonProps,
  CircularProgress,
} from '@mui/material';
import { forwardRef } from 'react';

import { borderRadius } from '../tokens/borderRadius';
import { elevation } from '../tokens/elevation';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

export interface ButtonProps extends MuiButtonProps {
  /** Loading state — shows a spinner and blocks interaction. */
  loading?: boolean;
}

/** Size → token-derived padding (px). */
const sizePadding: Record<NonNullable<MuiButtonProps['size']>, { x: number; y: number }> = {
  small: { x: spacing.sm, y: spacing.xs },
  medium: { x: spacing.md, y: spacing.sm },
  large: { x: spacing.lg, y: spacing.sm + spacing.xs },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { loading = false, children, disabled, size = 'medium', sx, ...props },
  ref,
) {
  const isDisabled = disabled || loading;
  const pad = sizePadding[size];

  return (
    <MuiButton
      ref={ref}
      size={size}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      disableElevation
      sx={{
        // Typography from tokens
        fontFamily: typography.fontFamily.body,
        fontSize: typography.body2.fontSize,
        fontWeight: 600,
        textTransform: 'none',
        letterSpacing: '0.01em',
        // Spacing from tokens
        px: `${pad.x}px`,
        py: `${pad.y}px`,
        gap: `${spacing.sm}px`,
        // Shape from tokens
        borderRadius: `${borderRadius.sm}px`,
        // Minimum touch target (WCAG 2.5.5)
        minHeight: '40px',
        // Micro-interaction feedback
        transition: 'transform 150ms ease-in-out, box-shadow 150ms ease-in-out',
        '&:hover:not(:disabled)': {
          boxShadow: elevation.low,
        },
        '&:active:not(:disabled)': {
          transform: 'scale(0.98)',
        },
        '&:focus-visible': {
          outline: '3px solid currentColor',
          outlineOffset: '2px',
        },
        ...sx,
      }}
      {...props}
    >
      {loading ? (
        <CircularProgress size={16} color="inherit" aria-hidden="true" />
      ) : null}
      {children}
    </MuiButton>
  );
});
