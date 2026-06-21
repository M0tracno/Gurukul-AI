/**
 * IconButton — Accessible icon-only button.
 *
 * WCAG 2.1 AA compliant:
 * - Requires aria-label (enforced via required prop)
 * - Visible focus indicator
 * - Minimum 44x44px touch target
 * - Micro-animation feedback within 200ms
 * - Keyboard navigable
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

import { forwardRef } from 'react';
import {
  IconButton as MuiIconButton,
  type IconButtonProps as MuiIconButtonProps,
  Tooltip,
  useTheme,
} from '@mui/material';

export interface IconButtonProps extends Omit<MuiIconButtonProps, 'aria-label'> {
  /** Required accessible label — describes the button's action */
  'aria-label': string;
  /** Optional tooltip text (defaults to aria-label) */
  tooltip?: string;
  /** Loading state */
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { 'aria-label': ariaLabel, tooltip, loading = false, disabled, children, sx, ...props },
  ref
) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const tooltipText = tooltip ?? ariaLabel;

  const button = (
    <MuiIconButton
      ref={ref}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      disabled={isDisabled}
      sx={{
        // Minimum touch target 44x44 (WCAG 2.5.5)
        minWidth: '44px',
        minHeight: '44px',
        // Micro-animation (< 200ms)
        transition: 'transform 150ms ease-in-out, background-color 150ms ease-in-out',
        '&:active:not(:disabled)': {
          transform: 'scale(0.9)',
        },
        // Visible focus indicator
        '&:focus-visible': {
          outline: `3px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
          borderRadius: '50%',
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </MuiIconButton>
  );

  // Wrap in tooltip for additional context
  if (tooltipText && !isDisabled) {
    return (
      <Tooltip title={tooltipText} arrow>
        {button}
      </Tooltip>
    );
  }

  return button;
});
