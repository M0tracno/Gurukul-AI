import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';

/**
 * MUI v7 Compatibility Layer for makeStyles
 *
 * This file provides a compatibility layer for the makeStyles API
 * which was removed from the core in MUI v5+.
 *
 * It uses the newer styled API under the hood while providing
 * the same interface as makeStyles from v4.
 */

/**
 * A robust makeStyles implementation that's compatible with MUI v7.
 * This implementation provides a hook-based approach similar to the original makeStyles.
 */
const makeStyles = stylesOrCreator => {
  return (props = {}) => {
    // Get the theme using MUI's useTheme hook
    const theme = useTheme();
    const originalTheme = useTheme();
    return useMemo(() => {
      try {
        // Ensure theme is defined and has a spacing function
        if (!theme) {
          console.error('Theme is undefined in makeStyles');
          return {};
        }

        // Ensure theme.spacing is a function
        const enhancedTheme = {
          ...theme,
          spacing:
            typeof theme.spacing === 'function' ? theme.spacing : (factor = 1) => `${8 * factor}px`,
        };

        // Get the style definitions
        let styles;
        if (typeof stylesOrCreator === 'function') {
          styles = stylesOrCreator(enhancedTheme);
        } else {
          styles = stylesOrCreator;
        }

        // Convert styles to CSS-in-JS format and return class names
        const classes = {};
        Object.keys(styles).forEach(ruleName => {
          // For simplicity, we'll create a hash-based class name
          const hash = btoa(ruleName + JSON.stringify(styles[ruleName])).slice(0, 8);
          classes[ruleName] = `makeStyles-${ruleName}-${hash}`;

          // Inject styles into the document head
          if (typeof document !== 'undefined') {
            const styleId = `makeStyles-${hash}`;
            if (!document.getElementById(styleId)) {
              const styleElement = document.createElement('style');
              styleElement.id = styleId;
              styleElement.textContent = `.${classes[ruleName]} { ${convertToCSS(styles[ruleName])} }`;
              document.head.appendChild(styleElement);
            }
          }
        });

        return classes;
      } catch (err) {
        console.error('Error in makeStyles:', err);
        return {};
      }
    }, [theme && theme.palette && theme.palette.mode, JSON.stringify(props)]);
  };
};

// Helper function to convert style object to CSS string
const convertToCSS = styleObj => {
  return Object.entries(styleObj)
    .map(([property, value]) => {
      // Convert camelCase to kebab-case
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssProperty}: ${value};`;
    })
    .join(' ');
};

// Export makeStyles as the default export
export default makeStyles;
