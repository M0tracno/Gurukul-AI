/**
 * Tests for Greeting component.
 *
 * Validates:
 * - Renders the time-of-day phrase for each boundary hour combined with the
 *   first name, exactly matching computeGreeting(hour, name).
 * - Renders the phrase alone (no "undefined"/"null") when no name is available,
 *   whether the name is omitted from the auth context or passed as null.
 * - Renders as a single <h1> heading for consistent dashboard structure.
 *
 * The component is wrapped in AuthProvider because <Greeting> calls useAuth(),
 * which throws outside a provider. Tests pass `firstName` via prop to stay
 * isolated from any real auth/token state.
 *
 * Validates: Requirements 9.2, 9.4
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { AuthProvider } from '../../../../providers/AuthProvider';
import { computeGreeting } from '../../utils/greeting';

import { Greeting } from './Greeting';

function renderGreeting(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe('Greeting', () => {
  beforeEach(() => {
    // Ensure no stored session leaks a user name into the greeting.
    localStorage.clear();
  });

  describe('time-of-day phrase boundaries with a first name', () => {
    const cases = [
      { hour: 8, expectedPhrase: 'Good morning' },
      { hour: 13, expectedPhrase: 'Good afternoon' },
      { hour: 20, expectedPhrase: 'Good evening' },
      { hour: 2, expectedPhrase: 'Good evening' },
    ] as const;

    it.each(cases)('renders "$expectedPhrase, Asha" at hour $hour', ({ hour, expectedPhrase }) => {
      const name = 'Asha';
      renderGreeting(<Greeting localHour={hour} firstName={name} />);

      const expected = computeGreeting(hour, name);
      expect(expected).toBe(`${expectedPhrase}, ${name}`);
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  it('renders the phrase alone when firstName is null (no placeholder token)', () => {
    renderGreeting(<Greeting localHour={8} firstName={null} />);

    const expected = computeGreeting(8, null);
    expect(expected).toBe('Good morning');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Good morning');
    expect(heading.textContent).not.toMatch(/undefined|null/i);
    expect(heading.textContent).not.toContain(',');
  });

  it('renders the phrase alone when no name is available from auth context', () => {
    // No firstName prop and no stored session => user is null => phrase only.
    renderGreeting(<Greeting localHour={13} />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Good afternoon');
    expect(heading.textContent).toBe('Good afternoon');
    expect(heading.textContent).not.toMatch(/undefined|null/i);
  });

  it('renders the phrase alone when firstName is blank/whitespace', () => {
    renderGreeting(<Greeting localHour={20} firstName="   " />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Good evening');
    expect(heading.textContent).not.toMatch(/undefined|null/i);
  });

  it('renders as a single level-1 heading for consistent dashboard structure', () => {
    renderGreeting(<Greeting localHour={8} firstName="Asha" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good morning, Asha');
  });
});
