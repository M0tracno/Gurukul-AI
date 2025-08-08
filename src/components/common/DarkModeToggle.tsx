import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useEnhancedTheme } from '../../contexts/EnhancedThemeContext';

const MotionIconButton = motion(IconButton);

interface DarkModeToggleProps {
  /**
   * Size of the toggle button
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Whether to show tooltip
   */
  showTooltip?: boolean;
  /**
   * Custom tooltip text
   */
  tooltipText?: string;
  /**
   * Whether to reduce motion (accessibility)
   */
  reduceMotion?: boolean;
}

/**
 * DarkModeToggle - Accessible theme switcher with smooth animations
 *
 * Features:
 * - Smooth icon transitions
 * - Accessibility-compliant
 * - Respects prefers-reduced-motion
 * - Persistent theme preference
 * - System preference detection
 */
export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
  size = 'medium',
  showTooltip = true,
  tooltipText,
  reduceMotion = false,
}) => {
  const { mode, toggleMode } = useEnhancedTheme();
  const theme = useTheme();

  // Check for user's motion preferences
  const prefersReducedMotion =
    reduceMotion ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const isDark = mode === 'dark';
  const defaultTooltipText = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  const iconVariants = {
    light: {
      rotate: 0,
      scale: 1,
    },
    dark: {
      rotate: 180,
      scale: 1,
    },
  };

  const buttonVariants = {
    hover: {
      scale: prefersReducedMotion ? 1 : 1.05,
      transition: {
        duration: 0.2,
      },
    },
    tap: {
      scale: prefersReducedMotion ? 1 : 0.95,
      transition: {
        duration: 0.1,
      },
    },
  };

  const ButtonComponent = (
    <MotionIconButton
      onClick={toggleMode}
      size={size}
      aria-label={tooltipText || defaultTooltipText}
      sx={{
        color: theme.palette.text.primary,
        backgroundColor: 'transparent',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '12px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
          borderColor: theme.palette.primary.main,
          boxShadow: `0 0 20px ${theme.palette.primary.main}20`,
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
        },
      }}
      variants={buttonVariants}
      whileHover="hover"
      whileTap="tap"
    >
      <motion.div
        variants={iconVariants}
        animate={isDark ? 'dark' : 'light'}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.3,
          ease: 'easeInOut',
        }}
        className="toggle-icon"
      >
        {isDark ? <Brightness7 fontSize={size} /> : <Brightness4 fontSize={size} />}
      </motion.div>
    </MotionIconButton>
  );

  if (showTooltip) {
    return (
      <Tooltip title={tooltipText || defaultTooltipText} placement="bottom" arrow>
        <span>{ButtonComponent}</span>
      </Tooltip>
    );
  }

  return ButtonComponent;
};

export default DarkModeToggle;
