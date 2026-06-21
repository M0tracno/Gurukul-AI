/**
 * ResponsiveContainer — Responsive layout wrapper.
 *
 * Ensures content is properly contained across viewports from 320px to 2560px
 * with 4 breakpoints (xs: 320, sm: 600, md: 900, lg: 1200, xl: 1536+).
 * Prevents horizontal overflow on all viewport sizes.
 *
 * Validates: Requirements 6.5
 */

import { type ReactNode } from 'react';
import { Container, type ContainerProps, useTheme } from '@mui/material';

export interface ResponsiveContainerProps extends Omit<ContainerProps, 'maxWidth'> {
  /** Maximum width — defaults to 'lg' for comfortable reading */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  /** Whether to disable gutters */
  disableGutters?: boolean;
  children: ReactNode;
}

export function ResponsiveContainer({
  maxWidth = 'lg',
  disableGutters = false,
  children,
  sx,
  ...props
}: ResponsiveContainerProps) {
  const theme = useTheme();

  return (
    <Container
      maxWidth={maxWidth}
      disableGutters={disableGutters}
      sx={{
        // Ensure no horizontal overflow
        overflowX: 'hidden',
        width: '100%',
        // Responsive padding using breakpoints
        px: {
          xs: theme.spacing(2), // 8px at 320px+
          sm: theme.spacing(3), // 12px at 600px+
          md: theme.spacing(4), // 16px at 900px+
          lg: theme.spacing(6), // 24px at 1200px+
          xl: theme.spacing(8), // 32px at 1536px+
        },
        py: {
          xs: theme.spacing(2),
          sm: theme.spacing(3),
          md: theme.spacing(4),
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Container>
  );
}
