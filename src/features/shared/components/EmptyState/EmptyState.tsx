/**
 * EmptyState — Shared friendly empty-state primitive.
 *
 * Rendered by any role dashboard (student, faculty, parent, admin) when a
 * scoped data request succeeds but returns no records. It shows a friendly
 * title, an explanatory message, an optional icon, and an optional action so
 * the user is never confronted with a blank area (Req 9.2) and the copy/styling
 * stays consistent across every role (Req 9.4).
 *
 * Validates: Requirements 9.2, 9.4
 */

import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { Box, Typography } from '@mui/material';
import { type ReactNode } from 'react';

export interface EmptyStateProps {
  /** Short headline describing the empty scope. */
  title?: string;
  /** Supporting sentence with a friendly explanation. */
  message?: string;
  /**
   * Optional icon shown above the title. Defaults to an inbox glyph. Pass
   * `null` to render no icon.
   */
  icon?: ReactNode;
  /** Optional call-to-action element (e.g. a button) shown below the message. */
  action?: ReactNode;
}

/**
 * Renders a centered, consistently styled empty-state message.
 *
 * The defaults provide friendly copy suitable for any dashboard; callers can
 * override the title/message for context-specific wording while keeping the
 * shared layout and styling.
 */
export function EmptyState({
  title = 'Nothing here yet',
  message = "There's no data to show right now. New items will appear here once they're available.",
  icon = <InboxOutlinedIcon sx={{ fontSize: 48 }} color="disabled" />,
  action,
}: EmptyStateProps) {
  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1.5,
        py: 6,
        px: 2,
      }}
    >
      {icon ? (
        <Box aria-hidden sx={{ lineHeight: 0 }}>
          {icon}
        </Box>
      ) : null}
      <Typography variant="h6" component="p" color="text.primary">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {message}
      </Typography>
      {action ? <Box sx={{ mt: 1 }}>{action}</Box> : null}
    </Box>
  );
}
