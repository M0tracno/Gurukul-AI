import React from 'react';

import { toString } from '@mui/material';
// Accessibility Helper Utilities



export const accessibilityHelpers = {
  // Generate unique IDs for form elements
  generateId: (prefix = 'element') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // ARIA label generator for common patterns
  generateAriaLabel: (type, context) => {
    const labels = {
      navigation: `${context} navigation`,
      button: `${context} button`,
      input: `${context} input field`,
      select: `${context} dropdown menu`,
      tab: `${context} tab`,
      dialog: `${context} dialog`,
      menu: `${context} menu`,
      list: `${context} list`,
      item: `${context} item`,
      link: `${context} link`,
      image: `${context} image`,
      heading: `${context} heading`,
      form: `${context} form`,
      table: `${context} data table`,
      checkbox: `${context} checkbox`,
      radio: `${context} radio button`,
      slider: `${context} slider`,
      progress: `${context} progress indicator`,
      status: `${context} status`,
      alert: `${context} alert message`,
      tooltip: `${context} tooltip`,
      breadcrumb: `${context} breadcrumb navigation`
    };
    return labels[type] || `${context} ${type}`;
  },

  // Common ARIA attributes for different component types
  getAriaAttributes: (componentType, props = {}) => {
    const baseAttributes = {
      button: {
        role: 'button',
        'aria-pressed': props.pressed || undefined,
        'aria-expanded': props.expanded || undefined,
        'aria-haspopup': props.hasPopup || undefined,
        'aria-controls': props.controls || undefined
      },
      input: {
        'aria-required': props.required || false,
        'aria-invalid': props.invalid || false,
        'aria-describedby': props.describedBy || undefined,
        'aria-labelledby': props.labelledBy || undefined
      },
      navigation: {
        role: 'navigation',
        'aria-label': props.label || 'Navigation'
      },
      menu: {
        role: 'menu',
        'aria-orientation': props.orientation || 'vertical',
        'aria-activedescendant': props.activeDescendant || undefined
      },
      menuitem: {
        role: 'menuitem',
        'aria-selected': props.selected || undefined,
        'aria-expanded': props.expanded || undefined
      },
      tab: {
        role: 'tab',
        'aria-selected': props.selected || false,
        'aria-controls': props.controls || undefined,
        'aria-expanded': props.expanded || undefined
      },
      tabpanel: {
        role: 'tabpanel',
        'aria-labelledby': props.labelledBy || undefined,
        'aria-hidden': props.hidden || false
      },
      dialog: {
        role: 'dialog',
        'aria-modal': props.modal !== false,
        'aria-labelledby': props.labelledBy || undefined,
        'aria-describedby': props.describedBy || undefined
      },
      alert: {
        role: 'alert',
        'aria-live': 'assertive',
        'aria-atomic': 'true'
      },
      status: {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      },
      progressbar: {
        role: 'progressbar',
        'aria-valuemin': props.min || 0,
        'aria-valuemax': props.max || 100,
        'aria-valuenow': props.value || undefined,
        'aria-valuetext': props.valueText || undefined
      },
      slider: {
        role: 'slider',
        'aria-valuemin': props.min || 0,
        'aria-valuemax': props.max || 100,
        'aria-valuenow': props.value || undefined,
        'aria-orientation': props.orientation || 'horizontal'
      },
      table: {
        role: 'table',
        'aria-label': props.label || 'Data table',
        'aria-describedby': props.describedBy || undefined
      },
      grid: {
        role: 'grid',
        'aria-label': props.label || 'Data grid',
        'aria-multiselectable': props.multiSelectable || false
      },
      listbox: {
        role: 'listbox',
        'aria-multiselectable': props.multiSelectable || false,
        'aria-orientation': props.orientation || 'vertical',
        'aria-activedescendant': props.activeDescendant || undefined
      },
      option: {
        role: 'option',
        'aria-selected': props.selected || false,
        'aria-disabled': props.disabled || false
      }
    };

    return baseAttributes[componentType] || {};
  },

  // Keyboard navigation helpers
  handleKeyNavigation: (event, items, currentIndex, onSelect) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(currentIndex + 1, items.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onSelect && items[currentIndex]) {
          onSelect(items[currentIndex], currentIndex);
        }
        return currentIndex;
      case 'Escape':
        event.preventDefault();
        return 'escape';
      default:
        return currentIndex;
    }

    return newIndex;
  },

  // Focus management
  trapFocus: (containerElement) => {
    const focusableElements = containerElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    return (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };
  },

  // Screen reader announcements
  announceToScreenReader: (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  // Color contrast checking (simplified)
  checkColorContrast: (foreground, background) => {
    // This is a simplified version - in production, use a proper color contrast library
    const getLuminance = (color) => {
      // Convert hex to RGB and calculate luminance
      const rgb = color.match(/\w\w/g).map(x => parseInt(x, 16) / 255);
      return rgb.reduce((acc, val, i) => {
        const gamma = val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        return acc + gamma * [0.2126, 0.7152, 0.0722][i];
      }, 0);
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    
    return {
      ratio,
      wcagAA: ratio >= 4.5,
      wcagAAA: ratio >= 7
    };
  }
};

// CSS classes for screen reader only content
export const srOnlyStyles = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  .sr-only-focusable:active,
  .sr-only-focusable:focus {
    position: static;
    width: auto;
    height: auto;
    margin: 0;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }
`;

// React hook for accessibility
export const useAccessibility = (componentType, initialProps = {}) => {
  const [ariaProps, setAriaProps] = React.useState(() => 
    accessibilityHelpers.getAriaAttributes(componentType, initialProps)
  );

  const updateAriaProps = (newProps) => {
    setAriaProps(accessibilityHelpers.getAriaAttributes(componentType, { ...initialProps, ...newProps }));
  };

  const announceToScreenReader = (message, priority = 'polite') => {
    accessibilityHelpers.announceToScreenReader(message, priority);
  };

  const generateAriaProps = (type, context, additionalProps = {}) => {
    return {
      'aria-label': accessibilityHelpers.generateAriaLabel(type, context),
      ...accessibilityHelpers.getAriaAttributes(type, additionalProps)
    };
  };

  return {
    ariaProps,
    updateAriaProps,
    announceToScreenReader,
    generateAriaProps
  };
};

export default accessibilityHelpers;
