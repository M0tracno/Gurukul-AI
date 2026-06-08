import { forwardRef } from 'react';
import { Card } from '@mui/material';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { styled, Theme } from '@mui/material/styles';
import type { CardProps } from '@mui/material/Card';
import { glassmorphism, shadows } from '../../styles/designTokens';
// Create a motion component or fallback to regular Card if framer-motion is not available
let MotionCard: React.ComponentType<any>;
try {
  const { motion } = require('framer-motion');
  MotionCard = motion(Card);
} catch {
  MotionCard = Card;
}
interface FrostedCardProps extends Omit<CardProps, 'component'> {
  /**
   * Glass effect intensity
   */
  glassLevel?: 'light' | 'medium' | 'dark';
  /**
   * Whether to show neon glow effect on hover
   */
  neonGlow?: boolean;
  /**
   * Neon color for glow effect
   */
  neonColor?: 'cyan' | 'blue' | 'orange' | 'purple';
  /**
   * Whether to animate on mount
   */
  animate?: boolean;
  /**
   * Whether to reduce motion (accessibility)
   */
  reduceMotion?: boolean;
  /**
   * Custom elevation level (0-10)
   */
  elevation?: number;
}
const StyledFrostedCard = styled(MotionCard, {
  shouldForwardProp: (prop: string) =>
    !['glassLevel', 'neonGlow', 'neonColor', 'animate', 'reduceMotion'].includes(prop),
})<FrostedCardProps>(({
  theme,
  glassLevel = 'medium',
  neonGlow = false,
  neonColor = 'cyan',
}: {
  theme: Theme;
  glassLevel?: 'light' | 'medium' | 'dark';
  neonGlow?: boolean;
  neonColor?: string;
}) => {
  const glassEffect = glassmorphism[glassLevel as keyof typeof glassmorphism];
  return {
    position: 'relative',
    padding: theme.spacing(3),
    borderRadius: (theme.shape.borderRadius as number) * 2,
    background: glassEffect.background,
    backdropFilter: glassEffect.backdropFilter,
    border: glassEffect.border,
    boxShadow: glassEffect.boxShadow,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    // Pseudo-element for additional glass effect
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
      pointerEvents: 'none',
    },
    // Hover effects
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[8],
      ...(neonGlow && {
        boxShadow: `${theme.shadows[8]}, ${shadows.neon[neonColor as keyof typeof shadows.neon]}`,
      }),
    },
    // Focus-visible for accessibility
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
    },
    // Responsive padding
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
    },
    // Reduce motion support
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
      '&:hover': {
        transform: 'none',
      },
    },
  };
});
/**
 * FrostedCard - A reusable glassmorphism card component
 *
 * Features:
 * - Glassmorphism effect with configurable intensity
 * - Optional neon glow on hover
 * - Smooth animations with reduced motion support
 * - Responsive design
 * - Accessibility-compliant focus states
 * - Perfect pixel alignment with design tokens
 */
export const FrostedCard = forwardRef<HTMLDivElement, FrostedCardProps>(
  (
    {
      children,
      glassLevel = 'medium',
      neonGlow = false,
      neonColor = 'cyan',
      animate = true,
      reduceMotion = false,
      elevation = 1,
      ...props
    },
    ref
  ) => {
    // Check for user's motion preferences
    const prefersReducedMotion =
      reduceMotion ||
      (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // Animation variants
    const animationVariants = {
      hidden: {
        opacity: 0,
        y: 20,
        scale: 0.95,
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: prefersReducedMotion ? 0 : 0.3,
          ease: [0.4, 0, 0.2, 1],
        },
      },
    };
    const motionProps: any = {};
    if (animate && !prefersReducedMotion) {
      motionProps.variants = animationVariants;
      motionProps.initial = 'hidden';
      motionProps.animate = 'visible';
    }
    if (!prefersReducedMotion) {
      motionProps.whileHover = {
        y: -4,
        transition: { duration: 0.2 },
      };
    }
    const { style, ...restProps } = props;
    const cardProps = {
      ref,
      glassLevel,
      neonGlow,
      neonColor,
      elevation,
      style: style as any, // Type assertion to handle framer-motion strict typing
      ...restProps,
    };
    return (
      <StyledFrostedCard {...cardProps} {...motionProps}>
        {children}
      </StyledFrostedCard>
    );
  }
);
FrostedCard.displayName = 'FrostedCard';
export default FrostedCard;