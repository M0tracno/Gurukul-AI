/**
 * Shared cinematic styling for the auth screens.
 *
 * Centralises the field, button, and alert styling so the four login pages
 * stop repeating ~60 lines of inline sx each (and so they stay perfectly in
 * sync). Each helper is driven by a role accent.
 */

import type { SxProps, Theme } from '@mui/material/styles';
import { accents, ink, surfaces, easing, type Accent, type AccentKey } from '../../theme/cinematic';

export function resolveAccent(accent: AccentKey | Accent): Accent {
  return typeof accent === 'string' ? accents[accent] : accent;
}

/** Cinematic outlined text field, tinted by the role accent. */
export function authFieldSx(accent: AccentKey | Accent): SxProps<Theme> {
  const a = resolveAccent(accent);
  return {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.02)',
      transition: `all 0.3s ${easing.premium}`,
      '& fieldset': { borderColor: surfaces.border },
      '&:hover fieldset': { borderColor: `rgba(${a.rgb}, 0.5)` },
      '&.Mui-focused fieldset': { borderColor: a.main, borderWidth: '1.5px' },
    },
    '& .MuiInputLabel-root': {
      color: ink.tertiary,
      '&.Mui-focused': { color: a.light },
    },
    '& .MuiOutlinedInput-input': { color: ink.primary },
    '& .MuiInputBase-input::placeholder': { color: ink.disabled, opacity: 1 },
  };
}

/** Solid accent submit button — no rainbow gradients. */
export function authButtonSx(accent: AccentKey | Accent): SxProps<Theme> {
  const a = resolveAccent(accent);
  return {
    mt: 1,
    py: 1.4,
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '1rem',
    textTransform: 'none',
    background: a.main,
    color: '#fff',
    boxShadow: `0 12px 30px -14px rgba(${a.rgb}, 0.8)`,
    transition: `all 0.45s ${easing.premium}`,
    '&:hover': {
      background: a.light,
      transform: 'translateY(-1px)',
      boxShadow: `0 16px 36px -14px rgba(${a.rgb}, 0.9)`,
    },
    '&:active': { transform: 'translateY(0)' },
    '&:disabled': {
      background: 'rgba(255, 255, 255, 0.06)',
      color: ink.disabled,
      boxShadow: 'none',
    },
  };
}

/** Error alert styling consistent across auth screens. */
export const authErrorAlertSx: SxProps<Theme> = {
  mb: 3,
  background: 'rgba(229, 72, 77, 0.08)',
  border: '1px solid rgba(229, 72, 77, 0.22)',
  borderRadius: '12px',
  color: ink.primary,
  '& .MuiAlert-icon': { color: '#e5484d' },
};

/** Subtle inline link (forgot password / fallbacks). */
export function authLinkSx(accent: AccentKey | Accent): SxProps<Theme> {
  const a = resolveAccent(accent);
  return {
    color: ink.tertiary,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
    '&:hover': { color: a.light },
  };
}
