/**
 * Modal — Design-system dialog.
 *
 * Token-driven modal/dialog with an accessible title, optional close button,
 * and a standard actions row. Radius, spacing, elevation, and typography are
 * derived from shared tokens.
 *
 * Requirements: 7.1 (modals), 7.2, 7.3 (tokens), 7.4 (single style).
 */

import CloseIcon from '@mui/icons-material/Close';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  type DialogProps as MuiDialogProps,
  IconButton,
  Typography,
} from '@mui/material';
import { forwardRef } from 'react';

import { borderRadius } from '../tokens/borderRadius';
import { elevation } from '../tokens/elevation';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

export interface ModalProps extends Omit<MuiDialogProps, 'title'> {
  /** Heading shown in the dialog title bar. */
  title?: React.ReactNode;
  /** Called when the user requests to close (backdrop, escape, or close button). */
  onClose?: () => void;
  /** Show the top-right close button. Default: true. */
  showCloseButton?: boolean;
  /** Footer actions (e.g. cancel/confirm buttons). */
  actions?: React.ReactNode;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(function Modal(
  { title, onClose, showCloseButton = true, actions, children, sx, ...props },
  ref
) {
  return (
    <Dialog
      ref={ref}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: `${borderRadius.xl}px`,
            boxShadow: elevation.overlay,
          },
        },
      }}
      sx={sx}
      {...props}
    >
      {title && (
        <DialogTitle
          component="div"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: `${spacing.md}px`,
            px: `${spacing.lg}px`,
            py: `${spacing.md}px`,
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.h3.fontSize,
              fontWeight: typography.h3.fontWeight,
              lineHeight: typography.h3.lineHeight,
            }}
          >
            {title}
          </Typography>
          {showCloseButton && onClose && (
            <IconButton aria-label="Close dialog" onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>
      )}
      <DialogContent sx={{ px: `${spacing.lg}px`, py: `${spacing.md}px` }}>
        {children}
      </DialogContent>
      {actions && (
        <DialogActions
          sx={{ px: `${spacing.lg}px`, py: `${spacing.md}px`, gap: `${spacing.sm}px` }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
});
