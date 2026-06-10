/**
 * Tests for EmptyState component.
 *
 * Validates:
 * - Renders the given title/message copy.
 * - Exposes role="status" for assistive technology.
 * - Renders an optional action when provided.
 * - Keeps consistent structure/markup via a snapshot.
 * - Produces the same structure/copy contract across every role dashboard
 *   (student, faculty, parent, admin) when fed role-flavored copy.
 *
 * Validates: Requirements 9.2, 9.4
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the provided title and message copy', () => {
    render(<EmptyState title="No courses yet" message="You are not enrolled in any courses." />);

    expect(screen.getByText('No courses yet')).toBeInTheDocument();
    expect(screen.getByText('You are not enrolled in any courses.')).toBeInTheDocument();
  });

  it('renders friendly default copy when no props are provided (Req 9.2)', () => {
    render(<EmptyState />);

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        "There's no data to show right now. New items will appear here once they're available."
      )
    ).toBeInTheDocument();
  });

  it('exposes role="status" so the empty state is announced', () => {
    render(<EmptyState title="No data" message="Nothing to show." />);

    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent('No data');
    expect(status).toHaveTextContent('Nothing to show.');
  });

  it('renders an optional action when provided', () => {
    render(
      <EmptyState
        title="No assignments"
        message="Create one to get started."
        action={<button>Create assignment</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Create assignment' })).toBeInTheDocument();
  });

  it('does not render an action region when none is supplied', () => {
    render(<EmptyState title="No data" message="Nothing here." />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('matches the snapshot for consistent styling/markup', () => {
    const { asFragment } = render(
      <EmptyState title="No records" message="Records will appear here once available." />
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('consistent structure and copy across role dashboards (Req 9.4)', () => {
    const roleVariants = [
      {
        role: 'student',
        title: 'No courses yet',
        message: "You're not enrolled in any courses right now.",
      },
      {
        role: 'faculty',
        title: 'No classes assigned',
        message: 'Classes you teach will appear here once assigned.',
      },
      {
        role: 'parent',
        title: 'No children linked',
        message: "Linked children's progress will appear here.",
      },
      {
        role: 'admin',
        title: 'No pending approvals',
        message: 'Approval requests will appear here as they arrive.',
      },
    ] as const;

    it.each(roleVariants)(
      'renders consistent structure and copy for the $role dashboard',
      ({ title, message }) => {
        const { unmount } = render(<EmptyState title={title} message={message} />);

        // Same accessible container contract for every role.
        const status = screen.getByRole('status');
        expect(status).toBeInTheDocument();

        // Role-flavored copy is surfaced verbatim.
        expect(screen.getByText(title)).toBeInTheDocument();
        expect(screen.getByText(message)).toBeInTheDocument();

        // The title is rendered as the headline paragraph and the message as
        // supporting text — the shared two-line structure across roles.
        expect(status).toHaveTextContent(title);
        expect(status).toHaveTextContent(message);

        unmount();
      }
    );
  });
});
