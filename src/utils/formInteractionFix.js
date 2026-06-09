import { useEffect } from 'react';

/**
 * Form Interaction Fix Utility
 *
 * This utility fixes common form interaction issues including:
 * - Button click problems
 * - Input field focus issues
 * - Form submission problems
 * - Event propagation issues
 */

// Hook to ensure proper form interactions
export const useFormInteractionFix = () => {
  useEffect(() => {
    // Remove any potential CSS that might block interactions
    const style = document.createElement('style');
    style.textContent = `
      /* Ensure all form elements are interactive */
      .MuiTextField-root,
      .MuiButton-root,
      .MuiFormControl-root,
      .MuiInputBase-root,
      .MuiOutlinedInput-root {
        pointer-events: auto !important;
        user-select: auto !important;
        -webkit-user-select: auto !important;
        touch-action: manipulation !important;
      }
      
      /* Fix for potential overlay issues */
      .MuiPaper-root {
        position: relative !important;
        z-index: 1 !important;
      }
      
      /* Ensure inputs are focusable */
      input, textarea, button, select {
        pointer-events: auto !important;
        -webkit-appearance: none !important;
        appearance: none !important;
      }
      
      /* Fix for iOS safari touch issues */
      * {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
      }
      
      /* Ensure click events work on buttons */
      button, .MuiButton-root {
        cursor: pointer !important;
        touch-action: manipulation !important;
      }
      
      /* Fix for form container issues */
      form {
        position: relative !important;
        z-index: 2 !important;
      }
    `;

    document.head.appendChild(style);

    // Force repaint to apply styles
    document.body.style.display = 'none';
    setTimeout(() => {
      document.body.style.display = '';
    }, 0);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
};

// Function to fix specific form elements
export const fixFormElement = element => {
  if (!element) return;

  // Remove any blocking styles
  element.style.pointerEvents = 'auto';
  element.style.userSelect = 'auto';
  element.style.webkitUserSelect = 'auto';
  element.style.touchAction = 'manipulation';

  // Ensure the element is focusable
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    element.tabIndex = 0;
  }

  // For buttons, ensure they're clickable
  if (element.tagName === 'BUTTON' || element.role === 'button') {
    element.style.cursor = 'pointer';
    element.tabIndex = 0;
  }
};

// Debug function to test form interactions
export const debugFormInteractions = () => {
  console.log('=== Form Interaction Debug ===');

  // Test all inputs
  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach((input, index) => {
    console.log(`Input ${index}:`, {
      type: input.type,
      name: input.name,
      disabled: input.disabled,
      readonly: input.readOnly,
      pointerEvents: getComputedStyle(input).pointerEvents,
      display: getComputedStyle(input).display,
      visibility: getComputedStyle(input).visibility,
    });
  });

  // Test all buttons
  const buttons = document.querySelectorAll('button, [role="button"]');
  buttons.forEach((button, index) => {
    console.log(`Button ${index}:`, {
      text: button.textContent?.trim(),
      disabled: button.disabled,
      pointerEvents: getComputedStyle(button).pointerEvents,
      cursor: getComputedStyle(button).cursor,
      zIndex: getComputedStyle(button).zIndex,
    });
  });

  // Test form containers
  const forms = document.querySelectorAll('form');
  forms.forEach((form, index) => {
    console.log(`Form ${index}:`, {
      action: form.action,
      method: form.method,
      display: getComputedStyle(form).display,
      position: getComputedStyle(form).position,
      zIndex: getComputedStyle(form).zIndex,
    });
  });
};

// Force fix for all form elements on page
export const forceFixAllFormElements = () => {
  setTimeout(() => {
    // Fix all inputs
    document.querySelectorAll('input, textarea, select').forEach(fixFormElement);

    // Fix all buttons
    document.querySelectorAll('button, [role="button"]').forEach(fixFormElement);

    // Fix all form containers
    document.querySelectorAll('form').forEach(form => {
      form.style.position = 'relative';
      form.style.zIndex = '2';
    });

    console.log('All form elements fixed for interactions');
  }, 100);
};
