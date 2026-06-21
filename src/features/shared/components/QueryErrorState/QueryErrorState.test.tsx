/**
 * Tests for QueryErrorState component.
 *
 * Validates:
 * - Displays error message
 * - Renders retry button
 * - Calls onRetry callback when retry button is clicked
 *
 * Validates: Requirements 5.7
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryErrorState } from './QueryErrorState';

describe('QueryErrorState', () => {
  it('renders default error message and retry button', () => {
    const onRetry = vi.fn();
    render(<QueryErrorState onRetry={onRetry} />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(
      screen.getByText('Something went wrong while loading data. Please try again.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders custom title and message', () => {
    const onRetry = vi.fn();
    render(
      <QueryErrorState
        title="Connection Error"
        message="Unable to reach the server."
        onRetry={onRetry}
      />
    );

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to reach the server.')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<QueryErrorState onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders custom action when provided', () => {
    const onRetry = vi.fn();
    render(<QueryErrorState onRetry={onRetry} action={<button>Custom Action</button>} />);

    expect(screen.getByText('Custom Action')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });
});
