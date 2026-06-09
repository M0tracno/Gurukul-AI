/**
 * Card — Design-system surface container.
 *
 * Token-driven card for grouping content into a SaaS-dashboard panel.
 * Radius, padding, and elevation are all derived from shared tokens.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4.
 */

import {
  Card as MuiCard,
  CardContent,
  CardHeader,
  type CardProps as MuiCardProps,
  Divider,
  Typography,
} from '@mui/material';
import { forwardRef } from 'react';

import { borderRadius } from '../tokens/borderRadius';
import { elevation } from '../tokens/elevation';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

export interface CardProps extends Omit<MuiCardProps, 'title'> {
  /** Optional heading rendered in the card header. */
  title?: React.ReactNode;
  /** Optional secondary text under the title. */
  subtitle?: React.ReactNode;
  /** Optional action node (e.g. a button) shown in the header. */
  action?: React.ReactNode;
  /** Show a divider between header and content. Default: true when a title is set. */
  divider?: boolean;
  /** Interactive lift on hover (for clickable cards). */
  interactive?: boolean;
  /** Remove the default content padding. */
  disableContentPadding?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    title,
    subtitle,
    action,
    divider,
    interactive = false,
    disableContentPadding = false,
    children,
    sx,
    ...props
  },
  ref
) {
  const showDivider = divider ?? Boolean(title);

  return (
    <MuiCard
      ref={ref}
      elevation={0}
      sx={{
        borderRadius: `${borderRadius.lg}px`,
        boxShadow: elevation.low,
        transition: 'transform 150ms ease-in-out, box-shadow 150ms ease-in-out',
        ...(interactive && {
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: elevation.medium,
          },
        }),
        ...sx,
      }}
      {...props}
    >
      {(title || action) && (
        <CardHeader
          action={action}
          title={
            typeof title === 'string' ? (
              <Typography
                component="h3"
                sx={{
                  fontFamily: typography.fontFamily.heading,
                  fontSize: typography.h4.fontSize,
                  fontWeight: typography.h4.fontWeight,
                  lineHeight: typography.h4.lineHeight,
                }}
              >
                {title}
              </Typography>
            ) : (
              title
            )
          }
          subheader={
            typeof subtitle === 'string' ? (
              <Typography
                sx={{
                  fontSize: typography.body2.fontSize,
                  lineHeight: typography.body2.lineHeight,
                }}
                color="text.secondary"
              >
                {subtitle}
              </Typography>
            ) : (
              subtitle
            )
          }
          sx={{ p: `${spacing.lg}px`, pb: showDivider ? `${spacing.md}px` : `${spacing.sm}px` }}
        />
      )}
      {showDivider && <Divider />}
      <CardContent
        sx={{
          p: disableContentPadding ? 0 : `${spacing.lg}px`,
          '&:last-child': { pb: disableContentPadding ? 0 : `${spacing.lg}px` },
        }}
      >
        {children}
      </CardContent>
    </MuiCard>
  );
});
