import React, { forwardRef } from 'react';
import { Card, CardProps, styled } from '@mui/material';
import { motion } from 'framer-motion';
import { glassmorphism, shadows } from '../styles/designTokens';

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

const MotionCard = motion(Card);

const StyledFrostedCard = styled(MotionCard, {
  shouldForwardProp: prop =>
    !['glassLevel', 'neonGlow', 'neonColor', 'animate', 'reduceMotion'].includes(prop as string),
})<FrostedCardProps>(({ theme, glassLevel = 'medium', neonGlow = false, neonColor = 'cyan' }) => {
  const glassEffect = glassmorphism[glassLevel];
  
  return {
    position: 'relative',
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius * 2,
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
        boxShadow: `${theme.shadows[8]}, ${shadows.neon[neonColor]}`,
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
      (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

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

    const cardProps = {
      ref,
      glassLevel,
      neonGlow,
      neonColor,
      elevation,
      variants: animate && !prefersReducedMotion ? animationVariants : undefined,
      initial: animate && !prefersReducedMotion ? 'hidden' : undefined,
      animate: animate && !prefersReducedMotion ? 'visible' : undefined,
      whileHover: 
        !prefersReducedMotion
          ? {
              y: -4,
              transition: { duration: 0.2 },
            }
          : undefined,
      ...props,
    };

    return (
      <StyledFrostedCard {...cardProps}>
        {children}
      </StyledFrostedCard>
    );
  }
);

FrostedCard.displayName = 'FrostedCard';

export default FrostedCard;
