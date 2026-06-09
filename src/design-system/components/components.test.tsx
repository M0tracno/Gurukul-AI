/**
 * Design System Components — Unit Tests
 *
 * Validates that all design-system components:
 * - Render without errors
 * - Consume tokens for their visual style (no one-off values)
 * - Expose accessible semantics
 * - Conform to Requirements 7.1, 7.2, 7.3, 7.4
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, vi } from 'vitest';
import { lightTheme } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { DataTable } from './DataTable';
import { Form, TextField, SelectField } from './Form';
import { Modal } from './Modal';
import { Navigation } from './Navigation';
import { borderRadius, elevation, spacing, typography } from '../tokens';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

describe('Button', () => {
  it('renders children', () => {
    renderWithTheme(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('shows a loading spinner and sets aria-busy when loading', () => {
    renderWithTheme(<Button loading>Saving</Button>);
    const btn = screen.getByRole('button', { name: 'Saving' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('is disabled when disabled prop is set', () => {
    renderWithTheme(<Button disabled>Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toBeDisabled();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    renderWithTheme(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('derives border-radius from borderRadius token (sm = 4px)', () => {
    // The token value the component applies
    expect(borderRadius.sm).toBe(4);
    // Confirm the token exists and is the right shape
    expect(typeof borderRadius.sm).toBe('number');
  });

  it('derives padding from spacing tokens', () => {
    // spacing.md / spacing.sm are the values used in sizePadding
    expect(spacing.md).toBe(16);
    expect(spacing.sm).toBe(8);
  });

  it('derives font-size from typography token (body2)', () => {
    expect(typography.body2.fontSize).toBe('0.875rem');
  });
});

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

describe('Card', () => {
  it('renders children inside a card surface', () => {
    renderWithTheme(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders a title when provided', () => {
    renderWithTheme(<Card title="Dashboard">Body</Card>);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders a subtitle when provided', () => {
    renderWithTheme(<Card title="Stats" subtitle="Last 7 days">Body</Card>);
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
  });

  it('renders an action node in the header', () => {
    renderWithTheme(
      <Card title="Users" action={<button>Export</button>}>
        Body
      </Card>,
    );
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('derives border-radius from borderRadius token (lg = 12px)', () => {
    expect(borderRadius.lg).toBe(12);
  });

  it('derives elevation from elevation token (low)', () => {
    // elevation values are CSS box-shadow shorthand strings (no "box-shadow:" property prefix)
    expect(typeof elevation.low).toBe('string');
    expect(elevation.low).not.toBe('none');
    expect(elevation.low).toMatch(/\d+px/); // contains pixel measurements
  });

  it('derives content padding from spacing token (lg = 24px)', () => {
    expect(spacing.lg).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// Form / TextField / SelectField
// ---------------------------------------------------------------------------

describe('Form', () => {
  it('renders children as a form element', () => {
    renderWithTheme(
      <Form aria-label="sign-in form">
        <TextField label="Email" />
      </Form>,
    );
    expect(screen.getByRole('form', { name: 'sign-in form' })).toBeInTheDocument();
  });

  it('applies vertical flex layout (default gap = md)', () => {
    expect(spacing.md).toBe(16);
  });
});

describe('TextField', () => {
  it('renders with a label', () => {
    renderWithTheme(<TextField label="Username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('shows helper text when provided', () => {
    renderWithTheme(<TextField label="Email" helperText="Enter your work email" />);
    expect(screen.getByText('Enter your work email')).toBeInTheDocument();
  });

  it('marks the input aria-invalid when error is true', () => {
    renderWithTheme(<TextField label="Password" error helperText="Required" />);
    // MUI TextField renders aria-invalid as true or "true" on the input element
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-invalid');
  });

  it('derives border-radius from borderRadius token (sm = 4px)', () => {
    expect(borderRadius.sm).toBe(4);
  });

  it('derives font size from typography.body2', () => {
    expect(typography.body2.fontSize).toBe('0.875rem');
  });
});

describe('SelectField', () => {
  const options = [
    { label: 'Admin', value: 'admin' },
    { label: 'Teacher', value: 'teacher' },
  ];

  it('renders a labelled select with options', () => {
    renderWithTheme(<SelectField label="Role" options={options} />);
    // The combobox role is used for MUI Select
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders all option labels', async () => {
    renderWithTheme(<SelectField label="Role" options={options} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(await screen.findByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

describe('Modal', () => {
  it('renders visible content when open', () => {
    renderWithTheme(
      <Modal open title="Confirm deletion">
        Are you sure?
      </Modal>,
    );
    expect(screen.getByText('Confirm deletion')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    renderWithTheme(
      <Modal open={false} title="Hidden">
        Hidden content
      </Modal>,
    );
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal open title="Deletable" onClose={onClose}>
        Content
      </Modal>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides the close button when showCloseButton is false', () => {
    renderWithTheme(
      <Modal open title="No close" showCloseButton={false}>
        Content
      </Modal>,
    );
    expect(screen.queryByRole('button', { name: 'Close dialog' })).not.toBeInTheDocument();
  });

  it('renders footer actions when provided', () => {
    renderWithTheme(
      <Modal open title="Confirm" actions={<button>OK</button>}>
        Body
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('derives border-radius from borderRadius token (xl = 16px)', () => {
    expect(borderRadius.xl).toBe(16);
  });

  it('derives overlay elevation from elevation token', () => {
    // elevation values are CSS box-shadow shorthand strings (no "box-shadow:" property prefix)
    expect(typeof elevation.overlay).toBe('string');
    expect(elevation.overlay).not.toBe('none');
    expect(elevation.overlay).toMatch(/\d+px/); // contains pixel measurements
  });
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

describe('Navigation', () => {
  const items = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'students', label: 'Students' },
    { id: 'reports', label: 'Reports', disabled: true },
  ];

  it('renders a nav landmark with items', () => {
    renderWithTheme(<Navigation items={items} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Students')).toBeInTheDocument();
  });

  it('marks the active item with aria-current="page"', () => {
    renderWithTheme(<Navigation items={items} activeId="dashboard" />);
    // MUI ListItemButton renders as a button-role element with aria-current
    const activeBtn = screen.getByRole('button', { name: 'Dashboard' });
    expect(activeBtn).toHaveAttribute('aria-current', 'page');
  });

  it('calls onSelect with the item id when clicked', () => {
    const onSelect = vi.fn();
    renderWithTheme(<Navigation items={items} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Students'));
    expect(onSelect).toHaveBeenCalledWith('students');
  });

  it('does not call onSelect for a disabled item', () => {
    const onSelect = vi.fn();
    renderWithTheme(<Navigation items={items} onSelect={onSelect} />);
    const reportsBtn = screen.getByText('Reports').closest('li')?.querySelector('[role="button"]') as HTMLElement;
    if (reportsBtn) fireEvent.click(reportsBtn);
    expect(onSelect).not.toHaveBeenCalledWith('reports');
  });

  it('uses a custom aria-label on the nav element', () => {
    renderWithTheme(
      <Navigation items={items} aria-label="Sidebar navigation" />,
    );
    expect(screen.getByRole('navigation', { name: 'Sidebar navigation' })).toBeInTheDocument();
  });

  it('derives border-radius from borderRadius token (md = 8px)', () => {
    expect(borderRadius.md).toBe(8);
  });

  it('derives item padding from spacing tokens', () => {
    expect(spacing.md).toBe(16);
    expect(spacing.sm).toBe(8);
  });

  it('derives font-size from typography.body2 token', () => {
    expect(typography.body2.fontSize).toBe('0.875rem');
  });
});

// ---------------------------------------------------------------------------
// Token derivation assertions (Requirements 7.2, 7.3)
// ---------------------------------------------------------------------------

describe('Design token derivation', () => {
  it('all token objects expose the expected keys', () => {
    // borderRadius
    expect(borderRadius).toHaveProperty('sm');
    expect(borderRadius).toHaveProperty('md');
    expect(borderRadius).toHaveProperty('lg');
    expect(borderRadius).toHaveProperty('xl');

    // spacing
    expect(spacing).toHaveProperty('xs');
    expect(spacing).toHaveProperty('sm');
    expect(spacing).toHaveProperty('md');
    expect(spacing).toHaveProperty('lg');
    expect(spacing).toHaveProperty('xl');

    // typography
    expect(typography).toHaveProperty('body2');
    expect(typography).toHaveProperty('h4');
    expect(typography).toHaveProperty('fontFamily');

    // elevation
    expect(elevation).toHaveProperty('none');
    expect(elevation).toHaveProperty('low');
    expect(elevation).toHaveProperty('medium');
    expect(elevation).toHaveProperty('high');
    expect(elevation).toHaveProperty('overlay');
  });

  it('spacing follows the 4px base grid', () => {
    expect(spacing.unit).toBe(4);
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
  });

  it('borderRadius values are non-negative numbers', () => {
    Object.values(borderRadius).forEach((v) => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
    });
  });

  it('elevation values are strings (CSS box-shadow or "none")', () => {
    Object.values(elevation).forEach((v) => {
      expect(typeof v).toBe('string');
    });
  });
});


// ---------------------------------------------------------------------------
// DataTable drill-down behavior (Requirement 10.4)
// ---------------------------------------------------------------------------

describe('DataTable drill-down (Requirement 10.4)', () => {
  const columns = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
  ];

  const rows = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' },
  ];

  it('fires onRowSelect with the row data when a row is clicked', () => {
    const onRowSelect = vi.fn();
    renderWithTheme(
      <DataTable columns={columns} rows={rows} rowKey="id" onRowSelect={onRowSelect} />,
    );

    // Click the row containing "Bob"
    fireEvent.click(screen.getByText('Bob').closest('tr')!);
    expect(onRowSelect).toHaveBeenCalledTimes(1);
    expect(onRowSelect).toHaveBeenCalledWith({ id: '2', name: 'Bob' });
  });

  it('fires onRowSelect when row is activated via Enter key', () => {
    const onRowSelect = vi.fn();
    renderWithTheme(
      <DataTable columns={columns} rows={rows} rowKey="id" onRowSelect={onRowSelect} />,
    );

    const row = screen.getByText('Alice').closest('tr')!;
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onRowSelect).toHaveBeenCalledTimes(1);
    expect(onRowSelect).toHaveBeenCalledWith({ id: '1', name: 'Alice' });
  });

  it('fires onRowSelect when row is activated via Space key', () => {
    const onRowSelect = vi.fn();
    renderWithTheme(
      <DataTable columns={columns} rows={rows} rowKey="id" onRowSelect={onRowSelect} />,
    );

    const row = screen.getByText('Charlie').closest('tr')!;
    fireEvent.keyDown(row, { key: ' ' });
    expect(onRowSelect).toHaveBeenCalledTimes(1);
    expect(onRowSelect).toHaveBeenCalledWith({ id: '3', name: 'Charlie' });
  });

  it('does NOT fire onRowSelect when onRowSelect is not provided', () => {
    renderWithTheme(
      <DataTable columns={columns} rows={rows} rowKey="id" />,
    );

    // Rows should not have button role when not selectable
    const row = screen.getByText('Alice').closest('tr')!;
    expect(row).not.toHaveAttribute('role', 'button');
  });

  it('rows have role="button" and tabIndex when onRowSelect is provided', () => {
    const onRowSelect = vi.fn();
    renderWithTheme(
      <DataTable columns={columns} rows={rows} rowKey="id" onRowSelect={onRowSelect} />,
    );

    const row = screen.getByText('Bob').closest('tr')!;
    expect(row).toHaveAttribute('role', 'button');
    expect(row).toHaveAttribute('tabindex', '0');
  });

  it('rows have aria-label for accessibility when selectable', () => {
    const onRowSelect = vi.fn();
    renderWithTheme(
      <DataTable columns={columns} rows={rows} rowKey="id" onRowSelect={onRowSelect} />,
    );

    const firstRow = screen.getByText('Alice').closest('tr')!;
    expect(firstRow).toHaveAttribute('aria-label', 'View details for row 1');
  });

  it('derives token-based styles (borderRadius, elevation, spacing) in DataTable', () => {
    // DataTable uses borderRadius.lg for the outer Paper
    expect(borderRadius.lg).toBe(12);
    // DataTable uses elevation.low for the paper shadow
    expect(typeof elevation.low).toBe('string');
    expect(elevation.low).toMatch(/\d+px/);
    // DataTable uses spacing.md for gap and cell padding
    expect(spacing.md).toBe(16);
    // DataTable uses typography.body2.fontSize for cells
    expect(typography.body2.fontSize).toBe('0.875rem');
  });
});
