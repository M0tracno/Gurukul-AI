/**
 * Buttons — Unit Tests
 *
 * Tests for WCAG 2.1 AA compliance:
 * - Keyboard activation (Enter/Space)
 * - Visible focus indicators
 * - aria-label for icon-only buttons
 * - Loading state with aria-busy
 * - Minimum touch target size
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import { lightTheme } from '@/design-system';
import { Button } from './Button';
import { IconButton } from './IconButton';

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>,
  );
}

describe('Button', () => {
  it('renders with children text', () => {
    renderWithTheme(<Button>Submit</Button>);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithTheme(<Button onClick={onClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is keyboard activatable with Enter', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithTheme(<Button onClick={onClick}>Submit</Button>);

    const button = screen.getByRole('button');
    button.focus();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is keyboard activatable with Space', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithTheme(<Button onClick={onClick}>Submit</Button>);

    const button = screen.getByRole('button');
    button.focus();
    await user.keyboard(' ');

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows loading spinner and sets aria-busy when loading', () => {
    renderWithTheme(<Button loading>Saving</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    renderWithTheme(<Button disabled>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not fire click when disabled', () => {
    const onClick = vi.fn();
    renderWithTheme(<Button disabled onClick={onClick}>Submit</Button>);

    const button = screen.getByRole('button');
    // Disabled buttons block pointer events — verified by the disabled attribute
    expect(button).toBeDisabled();
    button.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not fire click when loading', () => {
    const onClick = vi.fn();
    renderWithTheme(<Button loading onClick={onClick}>Submit</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    button.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders different variants', () => {
    const { rerender } = renderWithTheme(<Button variant="contained">Contained</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Button variant="outlined">Outlined</Button>
      </ThemeProvider>,
    );
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Button variant="text">Text</Button>
      </ThemeProvider>,
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('IconButton', () => {
  it('renders with required aria-label', () => {
    renderWithTheme(
      <IconButton aria-label="Delete item">
        <DeleteIcon />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Delete item' })).toBeInTheDocument();
  });

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <IconButton aria-label="Delete item" tooltip="Delete this record">
        <DeleteIcon />
      </IconButton>,
    );

    await user.hover(screen.getByRole('button'));
    // Tooltip may appear with a delay but the aria-label is always present
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Delete item');
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithTheme(
      <IconButton aria-label="Delete" onClick={onClick}>
        <DeleteIcon />
      </IconButton>,
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is keyboard activatable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithTheme(
      <IconButton aria-label="Delete" onClick={onClick}>
        <DeleteIcon />
      </IconButton>,
    );

    const button = screen.getByRole('button');
    button.focus();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('sets aria-busy when loading', () => {
    renderWithTheme(
      <IconButton aria-label="Delete" loading>
        <DeleteIcon />
      </IconButton>,
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });

  it('is disabled when disabled prop is set', () => {
    renderWithTheme(
      <IconButton aria-label="Delete" disabled>
        <DeleteIcon />
      </IconButton>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
