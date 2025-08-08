import React from 'react';
import { Grid, GridProps, styled } from '@mui/material';
import { spacing } from '../../styles/designTokens';

interface ResponsiveGridProps extends Omit<GridProps, 'gap'> {
  /**
   * Spacing between grid items using design tokens
   */
  spacingLevel?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Maximum width constraint
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | undefined;
  /**
   * Whether to center the container
   */
  centered?: boolean;
  /**
   * Responsive behavior
   */
  responsive?: boolean;
}

const StyledGrid = styled(Grid, {
  shouldForwardProp: prop =>
    !['spacingLevel', 'maxWidth', 'centered', 'responsive'].includes(prop as string),
})<ResponsiveGridProps>(({
  theme,
  spacingLevel = 'md',
  maxWidth,
  centered = false,
  responsive = true,
}) => {
  const getSpacing = (level: string) => {
    switch (level) {
      case 'xs':
        return spacing.xs;
      case 'sm':
        return spacing.sm;
      case 'md':
        return spacing.md;
      case 'lg':
        return spacing.lg;
      case 'xl':
        return spacing.xl;
      default:
        return spacing.md;
    }
  };

  return {
    // Apply consistent spacing using design tokens
    '& > .MuiGrid-item': {
      paddingLeft: getSpacing(spacingLevel),
      paddingTop: getSpacing(spacingLevel),
    },

    // Maximum width constraints
    ...(maxWidth && {
      maxWidth:
        maxWidth === 'sm'
          ? '640px'
          : maxWidth === 'md'
            ? '768px'
            : maxWidth === 'lg'
              ? '1024px'
              : maxWidth === 'xl'
                ? '1280px'
                : maxWidth === '2xl'
                  ? '1536px'
                  : '100%',
    }),

    // Centering
    ...(centered && {
      margin: '0 auto',
    }),

    // Responsive behavior
    ...(responsive && {
      padding: getSpacing('md'),
      [theme.breakpoints.down('sm')]: {
        padding: getSpacing('sm'),
        '& > .MuiGrid-item': {
          paddingLeft: getSpacing('sm'),
          paddingTop: getSpacing('sm'),
        },
      },
      [theme.breakpoints.up('lg')]: {
        padding: getSpacing('lg'),
      },
    }),
  };
});

/**
 * ResponsiveGrid - A responsive grid system using design tokens
 *
 * Features:
 * - Consistent spacing using design token system
 * - Responsive breakpoints
 * - Maximum width constraints
 * - Automatic centering option
 * - Perfect alignment with 8px grid system
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  spacingLevel = 'md',
  maxWidth,
  centered = false,
  responsive = true,
  container = false,
  ...props
}) => {
  return (
    <StyledGrid
      container={container}
      spacingLevel={spacingLevel}
      maxWidth={maxWidth}
      centered={centered}
      responsive={responsive}
      {...props}
    >
      {children}
    </StyledGrid>
  );
};

// Grid item component with consistent spacing
interface ResponsiveGridItemProps extends Omit<GridProps, 'item'> {
  /**
   * Responsive breakpoint behavior
   */
  xs?: number | 'auto';
  sm?: number | 'auto';
  md?: number | 'auto';
  lg?: number | 'auto';
  xl?: number | 'auto';
}

export const ResponsiveGridItem: React.FC<ResponsiveGridItemProps> = ({
  children,
  xs = 12,
  sm,
  md,
  lg,
  xl,
  ...props
}) => {
  return (
    <div
      {...(props as any)}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${xs === 'auto' ? 'auto-fit' : xs || 12}, 1fr)`,
        padding: spacing.sm,
        '@media (max-width: 600px)': {
          padding: spacing.xs,
        },
        ...((props as any).style || {}),
      }}
      className={`responsive-grid-item ${(props as any).className || ''}`}
    >
      {children}
    </div>
  );
};

export default ResponsiveGrid;
