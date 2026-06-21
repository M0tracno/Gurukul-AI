/**
 * Greeting — Personalized time-of-day greeting shown on every dashboard.
 *
 * Composes a time-of-day phrase (selected from the browser's local hour) with
 * the user's first name. The phrase/name contract is shared with the backend
 * via `features/shared/utils/greeting` so behavior stays consistent.
 *
 * Sourcing `firstName`:
 *  - The preferred source is the authenticated user from `useAuth()`, which is
 *    hydrated from the auth token / `GET /api/v1/auth/me`. The auth context
 *    currently exposes a full `name`, so the first whitespace-delimited token
 *    is used as the first name.
 *  - Callers that already have an authoritative `firstName` (e.g. a dashboard
 *    that loaded `auth/me`) can pass it explicitly via the `firstName` prop,
 *    which takes precedence over the context-derived value.
 *  - When no name is available, the greeting renders the phrase alone with no
 *    placeholder token (Req 1.6).
 *
 * Validates: Requirements 1.1
 */

import { Typography } from '@mui/material';

import { useAuth } from '../../../../providers/AuthProvider';
import { computeGreeting } from '../../utils/greeting';

export interface GreetingProps {
  /**
   * First name to greet. When omitted, it is derived from the authenticated
   * user's name in `useAuth()`.
   */
  firstName?: string | null;
  /**
   * Local wall-clock hour (0–23). Defaults to the browser's current hour.
   * Exposed mainly for testing/deterministic rendering.
   */
  localHour?: number;
  /** MUI Typography variant for the rendered greeting. */
  variant?: 'h4' | 'h5' | 'h6' | 'subtitle1';
}

/**
 * Extract a first name from a full name string. Returns undefined when the
 * input is empty/whitespace so the greeting falls back to the phrase alone.
 */
function firstNameFromFullName(fullName?: string | null): string | undefined {
  const trimmed = fullName?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.split(/\s+/)[0];
}

/**
 * Renders the personalized greeting for the current user.
 */
export function Greeting({ firstName, localHour, variant = 'h5' }: GreetingProps) {
  const { user } = useAuth();

  const resolvedFirstName = firstName !== undefined ? firstName : firstNameFromFullName(user?.name);
  const hour = localHour ?? new Date().getHours();

  return (
    <Typography variant={variant} component="h1">
      {computeGreeting(hour, resolvedFirstName)}
    </Typography>
  );
}
