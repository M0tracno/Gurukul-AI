/**
 * Accessibility Helper Utilities
 *
 * Covers WCAG 2.1 Level AA requirements for the Gurukul AI Portal:
 *  - Focus-visible styles (Requirement 9.2)
 *  - ARIA roles and labels (Requirement 9.3)
 *  - Alt-text conventions for informational images (Requirement 9.4)
 *  - Contrast-checked token pairs from design tokens (Requirement 9.1)
 *
 * All contrast ratios are computed against the WCAG relative-luminance formula.
 * A pair is included in CONTRAST_CHECKED_TOKEN_PAIRS only when its ratio ≥ 4.5:1
 * (WCAG AA for normal text / UI components).
 */

import React from 'react';

// ---------------------------------------------------------------------------
// 1. FOCUS-VISIBLE STYLES  (Requirement 9.2)
// ---------------------------------------------------------------------------

/**
 * CSS-in-JS style objects for WCAG 2.1 AA focus indicators.
 * Use these with MUI's `sx` prop or emotion's `css` helper.
 *
 * Rules:
 *  - 2 px solid outline so focus is visible on any background.
 *  - 2 px offset so the outline doesn't overlap the component border.
 *  - Applied only on :focus-visible to avoid showing on mouse click.
 */
export const focusVisibleStyles = {
  /** Light-theme focus ring — violet #667eea on white/light backgrounds */
  light: {
    '&:focus-visible': {
      outline: '2px solid #667eea',
      outlineOffset: '2px',
      borderRadius: 'inherit',
    },
    // Fallback for browsers that don't support :focus-visible
    '&:focus:not(:focus-visible)': {
      outline: 'none',
    },
  },

  /** Dark-theme focus ring — lavender #a78bfa on dark backgrounds */
  dark: {
    '&:focus-visible': {
      outline: '2px solid #a78bfa',
      outlineOffset: '2px',
      borderRadius: 'inherit',
    },
    '&:focus:not(:focus-visible)': {
      outline: 'none',
    },
  },

  /**
   * High-contrast focus ring for interactive controls that need extra
   * prominence (e.g. skip links, primary action buttons).
   * 3 px outline + 1 px white inner gap ensures visibility on any background.
   */
  highContrast: {
    '&:focus-visible': {
      outline: '3px solid #667eea',
      outlineOffset: '3px',
      boxShadow: '0 0 0 1px #ffffff',
      borderRadius: 'inherit',
    },
    '&:focus:not(:focus-visible)': {
      outline: 'none',
    },
  },
};

/**
 * Returns a focus-visible style object appropriate for the current theme mode.
 *
 * @param {'light'|'dark'|'highContrast'} [mode='light']
 * @returns {object} CSS-in-JS style object
 */
export function getFocusVisibleStyle(mode = 'light') {
  return focusVisibleStyles[mode] ?? focusVisibleStyles.light;
}

/**
 * Inline CSS string that can be injected via a `<style>` tag or
 * MUI's `GlobalStyles` to establish baseline focus-visible behaviour for the
 * entire document.
 */
export const globalFocusVisibleCSS = `
  /* WCAG 2.1 AA — visible focus indicator for keyboard navigation */
  *:focus-visible {
    outline: 2px solid #667eea;
    outline-offset: 2px;
  }
  *:focus:not(:focus-visible) {
    outline: none;
  }

  /* Skip-to-content link — revealed on focus, hidden otherwise */
  .skip-link {
    position: absolute;
    top: -100%;
    left: 0;
    z-index: 9999;
    padding: 8px 16px;
    background: #667eea;
    color: #ffffff;
    font-weight: 600;
    text-decoration: none;
    border-radius: 0 0 4px 4px;
    transition: top 0.2s;
  }
  .skip-link:focus-visible {
    top: 0;
    outline: 2px solid #ffffff;
    outline-offset: 2px;
  }

  /* Screen-reader-only helper */
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

// ---------------------------------------------------------------------------
// 2. CONTRAST-CHECKED TOKEN PAIRS  (Requirement 9.1 — WCAG AA ≥ 4.5:1)
// ---------------------------------------------------------------------------

/**
 * Relative luminance of a hex color per WCAG 2.1 §1.4.3.
 * Accepts 6-digit hex strings with or without leading '#'.
 *
 * @param {string} hex  e.g. '#667eea' or '667eea'
 * @returns {number} luminance in [0, 1]
 */
export function getRelativeLuminance(hex) {
  const clean = hex.replace(/^#/, '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const linearize = (c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG contrast ratio between two hex colors.
 * Returns a value in [1, 21]; higher is more contrast.
 *
 * @param {string} color1
 * @param {string} color2
 * @returns {number}
 */
export function getContrastRatio(color1, color2) {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Evaluate whether a foreground/background pair meets WCAG thresholds.
 *
 * @param {string} foreground  hex color
 * @param {string} background  hex color
 * @returns {{ ratio: number, wcagAA: boolean, wcagAAA: boolean, wcagAALarge: boolean }}
 */
export function checkContrastCompliance(foreground, background) {
  const ratio = getContrastRatio(foreground, background);
  return {
    ratio: Math.round(ratio * 100) / 100,
    /** Normal text / UI components: ≥ 4.5:1 */
    wcagAA: ratio >= 4.5,
    /** Large text (≥18pt regular or ≥14pt bold): ≥ 3:1 */
    wcagAALarge: ratio >= 3.0,
    /** Enhanced: ≥ 7:1 */
    wcagAAA: ratio >= 7.0,
  };
}

/**
 * Pre-verified contrast pairs drawn from the project's design tokens and
 * `createEnhancedTheme.js` palette.  Every pair listed here has been
 * confirmed to meet WCAG AA (ratio ≥ 4.5:1) at time of writing.
 *
 * Structure:
 *   { name, foreground, background, ratio, usage }
 *
 * These are the canonical safe pairs to use for text on surfaces in the
 * Gurukul AI Portal.
 */
export const CONTRAST_CHECKED_TOKEN_PAIRS = [
  // --- Light theme: text on backgrounds ---
  {
    name: 'text-primary-on-white',
    foreground: '#2d3748', // lightPalette.text.primary
    background: '#ffffff',
    ratio: 11.99,
    wcagAA: true,
    usage: 'Primary body text on white/paper surface (light theme)',
  },
  {
    name: 'text-secondary-on-white',
    foreground: '#4a5568', // lightPalette.text.secondary
    background: '#ffffff',
    ratio: 7.53,
    wcagAA: true,
    usage: 'Secondary / caption text on white surface (light theme)',
  },
  {
    name: 'text-primary-on-light-bg',
    foreground: '#2d3748',
    background: '#f8fafc', // lightPalette.background.default
    ratio: 11.47,
    wcagAA: true,
    usage: 'Primary text on default light background',
  },
  {
    name: 'dark-text-on-warning',
    foreground: '#1a1a1a',
    background: '#f9ca24', // lightPalette.warning.main
    ratio: 11.19,
    wcagAA: true,
    usage: 'Dark text on warning background (warning banners)',
  },

  // --- Light theme: white text on colored backgrounds ---
  // NOTE: #667eea (primary.main) only achieves 3.66:1 — NOT included.
  // Use primary.dark (#3b4ddd) or darker for white text on primary.
  {
    name: 'white-on-primary-dark',
    foreground: '#ffffff',
    background: '#3b4ddd', // lightPalette.primary.dark
    ratio: 6.38,
    wcagAA: true,
    usage: 'White label on dark primary (contained button, badge)',
  },
  {
    name: 'white-on-primary-darker',
    foreground: '#ffffff',
    background: '#4a5fc0', // darker primary for AA compliance on buttons
    ratio: 5.69,
    wcagAA: true,
    usage: 'White text on accessible primary shade (light theme interactive controls)',
  },

  // success: #059669 is 3.77:1 — not included. Use #007a45 or darker.
  {
    name: 'white-on-success-accessible',
    foreground: '#ffffff',
    background: '#007a45', // darker than success.dark for AA compliance
    ratio: 5.43,
    wcagAA: true,
    usage: 'White text on accessible success color (success badges, alerts)',
  },
  {
    name: 'white-on-success-800',
    foreground: '#ffffff',
    background: '#008047', // colors.success[800]
    ratio: 5.03,
    wcagAA: true,
    usage: 'White on success-800 (success status, confirmation states)',
  },

  // error: #ee5a52 is only 3.38:1 — not included. Use #d93b30 or darker.
  {
    name: 'white-on-error-accessible',
    foreground: '#ffffff',
    background: '#d93b30', // accessible error shade
    ratio: 4.55,
    wcagAA: true,
    usage: 'White text on accessible error color (error states, destructive actions)',
  },
  {
    name: 'white-on-error-700',
    foreground: '#ffffff',
    background: '#ad2519', // colors.error[700]
    ratio: 6.87,
    wcagAA: true,
    usage: 'White on error-700 (destructive button, error icon)',
  },

  // --- Dark theme: text on dark backgrounds ---
  {
    name: 'white-on-dark-bg',
    foreground: '#f3f3f3', // ~rgba(255,255,255,0.95) approximation
    background: '#0a0a0f', // darkPalette.background.default
    ratio: 18.19,
    wcagAA: true,
    usage: 'Near-white primary text on darkest background (dark theme)',
  },
  {
    name: 'white-secondary-on-dark-paper',
    foreground: '#999999', // ~rgba(255,255,255,0.60) approximation
    background: '#111118', // darkPalette.background.paper
    ratio: 6.60,
    wcagAA: true,
    usage: 'Muted secondary text on dark paper (dark theme)',
  },
  {
    name: 'lavender-on-dark-paper',
    foreground: '#a78bfa', // darkPalette.primary.main
    background: '#111118',
    ratio: 6.91,
    wcagAA: true,
    usage: 'Primary violet text/link on dark paper (dark theme)',
  },
  {
    name: 'white-on-primary-dark-theme',
    foreground: '#ffffff',
    background: '#7c3aed', // darkPalette.primary.dark
    ratio: 5.70,
    wcagAA: true,
    usage: 'White text on dark-theme primary dark (contained button)',
  },

  // --- Design-token palette pairs (colors.ts) ---
  {
    name: 'white-on-secondary-700',
    foreground: '#ffffff',
    background: '#00796b', // colors.secondary[700]
    ratio: 5.32,
    wcagAA: true,
    usage: 'White on teal-700 (secondary action states)',
  },
  {
    name: 'white-on-secondary-800',
    foreground: '#ffffff',
    background: '#00695c', // colors.secondary[800]
    ratio: 6.61,
    wcagAA: true,
    usage: 'White on teal-800 (secondary pressed state)',
  },
  // NOTE: colors.primary[700] (#e65100 saffron dark) is only 3.79:1 — not included.
  // Use colors.primary[800] or [900] for white text on saffron backgrounds.
  {
    name: 'white-on-primary-token-800',
    foreground: '#ffffff',
    background: '#bf360c', // colors.primary[800] (saffron)
    ratio: 5.60,
    wcagAA: true,
    usage: 'White on saffron-800 (primary token — accessible dark variant)',
  },
  {
    name: 'white-on-primary-token-900',
    foreground: '#ffffff',
    background: '#8d1e00', // colors.primary[900] (saffron deepest)
    ratio: 9.06,
    wcagAA: true,
    usage: 'White on saffron-900 (primary token — highest contrast variant)',
  },
  {
    name: 'neutral-900-on-neutral-0',
    foreground: '#1e1c18', // colors.neutral[900]
    background: '#ffffff', // colors.neutral[0]
    ratio: 17.01,
    wcagAA: true,
    usage: 'Dark charcoal body text on white (highest contrast body text)',
  },
  {
    name: 'neutral-800-on-neutral-50',
    foreground: '#33302b', // colors.neutral[800]
    background: '#fafaf8', // colors.neutral[50]
    ratio: 12.57,
    wcagAA: true,
    usage: 'Near-black on warm-white page background',
  },
  {
    name: 'neutral-900-on-neutral-100',
    foreground: '#1e1c18', // colors.neutral[900]
    background: '#f5f4f2', // colors.neutral[100]
    ratio: 15.48,
    wcagAA: true,
    usage: 'Body text on subtle off-white card/surface background',
  },
  // NOTE: colors.success[700] (#009956) is only 3.69:1 — not included for normal text.
  // Use success-800 (#008047) or success-accessible (#007a45) for white text.
];

/**
 * Look up a pre-verified token pair by name.
 *
 * @param {string} name
 * @returns {object|undefined}
 */
export function getTokenPair(name) {
  return CONTRAST_CHECKED_TOKEN_PAIRS.find((p) => p.name === name);
}

/**
 * Return all pre-verified pairs that include at least one of the supplied
 * hex colors (either as foreground or background).
 *
 * @param {string} hex
 * @returns {object[]}
 */
export function getPairsForColor(hex) {
  const normalized = hex.toLowerCase();
  return CONTRAST_CHECKED_TOKEN_PAIRS.filter(
    (p) =>
      p.foreground.toLowerCase() === normalized ||
      p.background.toLowerCase() === normalized
  );
}

// ---------------------------------------------------------------------------
// 3. ARIA ROLES AND LABELS  (Requirement 9.3)
// ---------------------------------------------------------------------------

/**
 * Canonical ARIA role identifiers for Portal component types.
 * Reference: https://www.w3.org/TR/wai-aria-1.2/#role_definitions
 */
export const ARIA_ROLES = Object.freeze({
  // Document structure
  MAIN: 'main',
  NAVIGATION: 'navigation',
  COMPLEMENTARY: 'complementary',
  BANNER: 'banner',
  CONTENT_INFO: 'contentinfo',
  REGION: 'region',
  ARTICLE: 'article',
  SECTION: 'region',   // <section> with a label becomes a landmark region

  // Interactive
  BUTTON: 'button',
  LINK: 'link',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SWITCH: 'switch',
  SLIDER: 'slider',
  SPINBUTTON: 'spinbutton',
  TEXTBOX: 'textbox',
  COMBOBOX: 'combobox',
  LISTBOX: 'listbox',
  OPTION: 'option',
  MENU: 'menu',
  MENUBAR: 'menubar',
  MENUITEM: 'menuitem',
  MENUITEMCHECKBOX: 'menuitemcheckbox',
  MENUITEMRADIO: 'menuitemradio',
  TAB: 'tab',
  TABLIST: 'tablist',
  TABPANEL: 'tabpanel',
  SEARCHBOX: 'searchbox',

  // Widgets
  DIALOG: 'dialog',
  ALERTDIALOG: 'alertdialog',
  TOOLTIP: 'tooltip',
  GRID: 'grid',
  GRIDCELL: 'gridcell',
  ROW: 'row',
  ROWGROUP: 'rowgroup',
  ROWHEADER: 'rowheader',
  COLUMNHEADER: 'columnheader',
  TABLE: 'table',
  CELL: 'cell',
  TREE: 'tree',
  TREEITEM: 'treeitem',
  PROGRESSBAR: 'progressbar',

  // Live regions
  ALERT: 'alert',
  LOG: 'log',
  MARQUEE: 'marquee',
  STATUS: 'status',
  TIMER: 'timer',
});

/**
 * Generate a human-readable ARIA label for a component.
 *
 * @param {string} type  One of the component-type keys below
 * @param {string} context  Descriptive context (e.g. "Submit" or "User profile")
 * @returns {string}
 */
export function generateAriaLabel(type, context) {
  const templates = {
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
    breadcrumb: `${context} breadcrumb navigation`,
    search: `${context} search`,
    grid: `${context} data grid`,
    region: `${context} region`,
    expandable: `${context}, press Enter to expand or collapse`,
  };
  return templates[type] ?? `${context} ${type}`;
}

/**
 * Build a complete ARIA attribute object for a given component type.
 * Pass only the props that are relevant; undefined entries are omitted
 * so spread onto JSX elements produces clean HTML.
 *
 * @param {string} componentType
 * @param {object} [props={}]
 * @returns {object}
 */
export function getAriaAttributes(componentType, props = {}) {
  const omitUndefined = (obj) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

  const map = {
    button: omitUndefined({
      role: 'button',
      'aria-pressed': props.pressed,
      'aria-expanded': props.expanded,
      'aria-haspopup': props.hasPopup,
      'aria-controls': props.controls,
      'aria-disabled': props.disabled,
      'aria-label': props.label,
      'aria-describedby': props.describedBy,
    }),

    input: omitUndefined({
      'aria-required': props.required ?? false,
      'aria-invalid': props.invalid ?? false,
      'aria-describedby': props.describedBy,
      'aria-labelledby': props.labelledBy,
      'aria-label': props.label,
      'aria-autocomplete': props.autocomplete,
    }),

    navigation: omitUndefined({
      role: 'navigation',
      'aria-label': props.label ?? 'Navigation',
    }),

    menu: omitUndefined({
      role: 'menu',
      'aria-orientation': props.orientation ?? 'vertical',
      'aria-activedescendant': props.activeDescendant,
      'aria-label': props.label,
    }),

    menuitem: omitUndefined({
      role: 'menuitem',
      'aria-selected': props.selected,
      'aria-expanded': props.expanded,
      'aria-disabled': props.disabled,
    }),

    tab: omitUndefined({
      role: 'tab',
      'aria-selected': props.selected ?? false,
      'aria-controls': props.controls,
      'aria-expanded': props.expanded,
      'aria-disabled': props.disabled,
    }),

    tabpanel: omitUndefined({
      role: 'tabpanel',
      'aria-labelledby': props.labelledBy,
      'aria-hidden': props.hidden ?? false,
    }),

    dialog: omitUndefined({
      role: 'dialog',
      'aria-modal': props.modal !== false,
      'aria-labelledby': props.labelledBy,
      'aria-describedby': props.describedBy,
    }),

    alertdialog: omitUndefined({
      role: 'alertdialog',
      'aria-modal': true,
      'aria-labelledby': props.labelledBy,
      'aria-describedby': props.describedBy,
    }),

    alert: {
      role: 'alert',
      'aria-live': 'assertive',
      'aria-atomic': 'true',
    },

    status: {
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
    },

    progressbar: omitUndefined({
      role: 'progressbar',
      'aria-valuemin': props.min ?? 0,
      'aria-valuemax': props.max ?? 100,
      'aria-valuenow': props.value,
      'aria-valuetext': props.valueText,
      'aria-label': props.label,
    }),

    slider: omitUndefined({
      role: 'slider',
      'aria-valuemin': props.min ?? 0,
      'aria-valuemax': props.max ?? 100,
      'aria-valuenow': props.value,
      'aria-orientation': props.orientation ?? 'horizontal',
      'aria-label': props.label,
    }),

    table: omitUndefined({
      role: 'table',
      'aria-label': props.label ?? 'Data table',
      'aria-describedby': props.describedBy,
      'aria-rowcount': props.rowCount,
      'aria-colcount': props.colCount,
    }),

    grid: omitUndefined({
      role: 'grid',
      'aria-label': props.label ?? 'Data grid',
      'aria-multiselectable': props.multiSelectable ?? false,
      'aria-rowcount': props.rowCount,
      'aria-colcount': props.colCount,
    }),

    listbox: omitUndefined({
      role: 'listbox',
      'aria-multiselectable': props.multiSelectable ?? false,
      'aria-orientation': props.orientation ?? 'vertical',
      'aria-activedescendant': props.activeDescendant,
      'aria-label': props.label,
    }),

    option: omitUndefined({
      role: 'option',
      'aria-selected': props.selected ?? false,
      'aria-disabled': props.disabled ?? false,
    }),

    combobox: omitUndefined({
      role: 'combobox',
      'aria-expanded': props.expanded ?? false,
      'aria-haspopup': props.hasPopup ?? 'listbox',
      'aria-controls': props.controls,
      'aria-activedescendant': props.activeDescendant,
      'aria-autocomplete': props.autocomplete ?? 'list',
      'aria-label': props.label,
      'aria-required': props.required ?? false,
      'aria-invalid': props.invalid ?? false,
    }),

    checkbox: omitUndefined({
      role: 'checkbox',
      'aria-checked': props.checked ?? false,
      'aria-disabled': props.disabled,
      'aria-label': props.label,
      'aria-describedby': props.describedBy,
    }),

    switch: omitUndefined({
      role: 'switch',
      'aria-checked': props.checked ?? false,
      'aria-disabled': props.disabled,
      'aria-label': props.label,
    }),

    region: omitUndefined({
      role: 'region',
      'aria-label': props.label,
      'aria-labelledby': props.labelledBy,
    }),

    search: omitUndefined({
      role: 'search',
      'aria-label': props.label ?? 'Search',
    }),
  };

  return map[componentType] ?? {};
}

// ---------------------------------------------------------------------------
// 4. ALT-TEXT CONVENTIONS  (Requirement 9.4)
// ---------------------------------------------------------------------------

/**
 * Descriptive alt-text conventions for informational images in the Portal.
 *
 * Usage rules:
 *  - Informational images (convey content/data) → use descriptive alt text
 *  - Decorative images (no meaning beyond aesthetics) → use alt=""
 *  - Functional images (icons inside interactive controls) → describe the action
 *  - Complex images (charts, diagrams) → provide a long description alongside
 */
export const ALT_TEXT_CONVENTIONS = Object.freeze({
  /**
   * Returns descriptive alt text for a student/user avatar.
   * If the name is unknown, falls back to a safe generic.
   *
   * @param {string|null} name
   * @returns {string}
   */
  userAvatar: (name) =>
    name ? `Profile photo of ${name}` : 'User profile photo',

  /**
   * Returns alt text for a course thumbnail or cover image.
   *
   * @param {string} courseName
   * @returns {string}
   */
  courseThumbnail: (courseName) =>
    `Thumbnail image for course: ${courseName}`,

  /**
   * Alt text for an icon that triggers an action (functional image).
   * Screen readers will announce the action rather than a visual description.
   *
   * @param {string} action  e.g. 'Delete record', 'Download report'
   * @returns {string}
   */
  actionIcon: (action) => action,

  /**
   * Alt text for a chart or graph (complex image).
   * Always provide a long-description element (aria-describedby) in addition.
   *
   * @param {string} chartType  e.g. 'bar', 'line', 'pie'
   * @param {string} subject    e.g. 'student performance over the last 6 months'
   * @returns {string}
   */
  chart: (chartType, subject) =>
    `${chartType} chart showing ${subject}. See the data table below for full details.`,

  /**
   * Alt text for a status icon/badge (e.g. ✓, ✗, ⚠).
   *
   * @param {'success'|'error'|'warning'|'info'|'pending'} status
   * @param {string} [context]  e.g. 'Submission graded'
   * @returns {string}
   */
  statusIcon: (status, context) => {
    const labels = {
      success: context ? `Success: ${context}` : 'Success',
      error: context ? `Error: ${context}` : 'Error',
      warning: context ? `Warning: ${context}` : 'Warning',
      info: context ? `Information: ${context}` : 'Information',
      pending: context ? `Pending: ${context}` : 'Pending',
    };
    return labels[status] ?? (context ?? status);
  },

  /**
   * Alt text for a school/institution logo.
   *
   * @param {string} institutionName
   * @returns {string}
   */
  institutionLogo: (institutionName) => `${institutionName} logo`,

  /**
   * Decorative image — must use empty alt text so screen readers skip it.
   * Returns an empty string; always set alt="" for decorative images.
   */
  decorative: '',
});

// ---------------------------------------------------------------------------
// 5. KEYBOARD NAVIGATION HELPERS  (Requirement 9.2)
// ---------------------------------------------------------------------------

/**
 * Handle keyboard navigation within a list/menu/grid of items.
 * Implements Arrow keys, Home, End, Enter, Space, Escape.
 *
 * @param {KeyboardEvent} event
 * @param {Array}         items         Array of focusable item references
 * @param {number}        currentIndex  Zero-based index of the currently focused item
 * @param {Function}      [onSelect]    Called with (item, index) on Enter/Space
 * @returns {number|'escape'} New index, or 'escape' if Escape was pressed
 */
export function handleKeyNavigation(event, items, currentIndex, onSelect) {
  let newIndex = currentIndex;

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault();
      newIndex = Math.min(currentIndex + 1, items.length - 1);
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
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
      if (onSelect && items[currentIndex] !== undefined) {
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
}

/**
 * Trap Tab focus within a container element (for modals/dialogs).
 * Returns a keydown event handler that wraps focus between the first and
 * last focusable descendants.
 *
 * @param {HTMLElement} containerElement
 * @returns {(event: KeyboardEvent) => void}
 */
export function trapFocus(containerElement) {
  const FOCUSABLE_SELECTOR =
    'a[href], area[href], input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), button:not([disabled]), iframe, object, embed, ' +
    '[tabindex]:not([tabindex="-1"]), [contenteditable]';

  return (event) => {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      containerElement.querySelectorAll(FOCUSABLE_SELECTOR)
    ).filter((el) => !el.closest('[aria-hidden="true"]'));

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    }
  };
}

// ---------------------------------------------------------------------------
// 6. SCREEN READER UTILITIES  (Requirement 9.3)
// ---------------------------------------------------------------------------

/**
 * Announce a message to screen readers via an ARIA live region.
 * The live region element is created, appended, and cleaned up automatically.
 *
 * @param {string} message
 * @param {'polite'|'assertive'} [priority='polite']
 *   - 'polite'    — announced when the user is idle (default; for non-critical)
 *   - 'assertive' — announced immediately, interrupting (for errors / urgent)
 */
export function announceToScreenReader(message, priority = 'polite') {
  if (typeof document === 'undefined') return; // SSR guard

  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.setAttribute('aria-relevant', 'additions text');
  liveRegion.className = 'sr-only';
  liveRegion.style.cssText =
    'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
    'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';

  document.body.appendChild(liveRegion);

  // Small delay allows screen readers to detect the element before content
  // is inserted (required for some SR / browser combinations).
  setTimeout(() => {
    liveRegion.textContent = message;
    setTimeout(() => {
      if (document.body.contains(liveRegion)) {
        document.body.removeChild(liveRegion);
      }
    }, 1500);
  }, 50);
}

// ---------------------------------------------------------------------------
// 7. REACT HOOK  (convenience wrapper)
// ---------------------------------------------------------------------------

/**
 * React hook that bundles ARIA attribute management and SR announcement
 * for a single component instance.
 *
 * @param {string} componentType  Key accepted by getAriaAttributes()
 * @param {object} [initialProps={}]
 * @returns {{
 *   ariaProps: object,
 *   updateAriaProps: (newProps: object) => void,
 *   announceToScreenReader: (message: string, priority?: string) => void,
 *   generateAriaProps: (type: string, context: string, additionalProps?: object) => object,
 * }}
 */
export function useAccessibility(componentType, initialProps = {}) {
  const [ariaProps, setAriaProps] = React.useState(() =>
    getAriaAttributes(componentType, initialProps)
  );

  const updateAriaProps = React.useCallback(
    (newProps) => {
      setAriaProps(getAriaAttributes(componentType, { ...initialProps, ...newProps }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [componentType]
  );

  const announce = React.useCallback(
    (message, priority = 'polite') => announceToScreenReader(message, priority),
    []
  );

  const buildAriaProps = React.useCallback(
    (type, context, additionalProps = {}) => ({
      'aria-label': generateAriaLabel(type, context),
      ...getAriaAttributes(type, additionalProps),
    }),
    []
  );

  return {
    ariaProps,
    updateAriaProps,
    announceToScreenReader: announce,
    generateAriaProps: buildAriaProps,
  };
}

// ---------------------------------------------------------------------------
// 8. LEGACY COMPAT — unified object export (matches original API)
// ---------------------------------------------------------------------------

/**
 * @deprecated  Import individual named exports instead.
 * Retained for backwards compatibility with existing usages that import
 * `accessibilityHelpers.checkColorContrast(...)` etc.
 */
export const accessibilityHelpers = {
  generateId: (prefix = 'element') =>
    `${prefix}-${Math.random().toString(36).slice(2, 11)}`,

  generateAriaLabel,
  getAriaAttributes,
  handleKeyNavigation,
  trapFocus,
  announceToScreenReader,

  /** @deprecated Use checkContrastCompliance() instead */
  checkColorContrast: (foreground, background) =>
    checkContrastCompliance(foreground, background),
};

export default accessibilityHelpers;
