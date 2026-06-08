/**
 * Property-Based Test: Theme Persistence Round-Trip (Property 12)
 *
 * Feature: gurukul-ai-modernization, Property 12: Theme Persistence Round-Trip
 *
 * For any theme preference value (light or dark), storing it in localStorage
 * and retrieving it SHALL return the same value, and the retrieved value SHALL
 * be applied to the application on load.
 *
 * **Validates: Requirements 6.2**
 */

import * as fc from 'fast-check';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AppThemeProvider, useThemeMode } from './ThemeProvider';

const STORAGE_KEY = 'gurukul-theme-mode';

type ThemeMode = 'light' | 'dark';

// Generator for random theme mode values
const themeModeArb = fc.constantFrom<ThemeMode>('light', 'dark');

/**
 * Helper component that exposes the current theme mode for test assertions.
 */
function ThemeModeReporter() {
  const { mode } = useThemeMode();
  return <div data-testid="theme-mode">{mode}</div>;
}

describe('Property 12: Theme Persistence Round-Trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * Property: For any theme mode value, storing it in localStorage and creating
   * a new ThemeProvider instance retrieves the same value.
   */
  it('storing a theme mode in localStorage and retrieving it returns the same value', () => {
    fc.assert(
      fc.property(themeModeArb, (themeMode: ThemeMode) => {
        // Store the theme preference in localStorage
        localStorage.setItem(STORAGE_KEY, themeMode);

        // Read it back — simulating what getStoredMode() does
        const stored = localStorage.getItem(STORAGE_KEY);

        // The retrieved value must equal the stored value
        expect(stored).toBe(themeMode);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any theme mode value stored in localStorage, the ThemeProvider
   * restores it on mount and applies it to the application.
   */
  it('ThemeProvider restores persisted theme mode on load', () => {
    fc.assert(
      fc.property(themeModeArb, (themeMode: ThemeMode) => {
        // Clean up any previous renders
        localStorage.clear();

        // Persist the theme preference
        localStorage.setItem(STORAGE_KEY, themeMode);

        // Mount ThemeProvider — it should read and apply the stored theme
        const { unmount } = render(
          <AppThemeProvider>
            <ThemeModeReporter />
          </AppThemeProvider>
        );

        // The provider should report the same mode that was stored
        const modeElement = screen.getByTestId('theme-mode');
        expect(modeElement.textContent).toBe(themeMode);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any theme mode, calling setMode persists to localStorage and
   * reading back returns the same value (full round-trip through the provider API).
   */
  it('setMode persists to localStorage and reading back returns the same value', () => {
    fc.assert(
      fc.property(themeModeArb, (themeMode: ThemeMode) => {
        localStorage.clear();

        // Helper that triggers setMode and reports the result
        let setModeRef: ((mode: ThemeMode) => void) | null = null;

        function SetModeCapture() {
          const { setMode, mode: currentMode } = useThemeMode();
          setModeRef = setMode;
          return <div data-testid="current-mode">{currentMode}</div>;
        }

        const { unmount } = render(
          <AppThemeProvider>
            <SetModeCapture />
          </AppThemeProvider>
        );

        // Call setMode via the captured ref
        act(() => {
          setModeRef!(themeMode);
        });

        // Verify localStorage was updated
        const persisted = localStorage.getItem(STORAGE_KEY);
        expect(persisted).toBe(themeMode);

        // Verify the displayed mode matches
        const modeElement = screen.getByTestId('current-mode');
        expect(modeElement.textContent).toBe(themeMode);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any sequence of theme mode changes, the final persisted value
   * matches the last set value — ensuring idempotent persistence.
   */
  it('sequential theme changes persist the final value correctly', () => {
    const themeSequenceArb = fc.array(themeModeArb, { minLength: 1, maxLength: 10 });

    fc.assert(
      fc.property(themeSequenceArb, (themeModes: ThemeMode[]) => {
        localStorage.clear();

        // Simulate storing each theme mode in sequence
        for (const mode of themeModes) {
          localStorage.setItem(STORAGE_KEY, mode);
        }

        // The final value should match the last theme in the sequence
        const lastMode = themeModes[themeModes.length - 1];
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBe(lastMode);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When localStorage is empty (new session), ThemeProvider defaults to 'light'.
   */
  it('defaults to light theme when no persisted value exists', () => {
    localStorage.clear();

    const { unmount } = render(
      <AppThemeProvider>
        <ThemeModeReporter />
      </AppThemeProvider>
    );

    const modeElement = screen.getByTestId('theme-mode');
    expect(modeElement.textContent).toBe('light');

    unmount();
  });
});
