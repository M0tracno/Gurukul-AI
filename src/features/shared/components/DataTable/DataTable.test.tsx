/**
 * DataTable — Unit Tests
 *
 * Tests for WCAG 2.1 AA compliance:
 * - Keyboard navigation and focus indicators
 * - ARIA labels and roles
 * - Responsive behavior
 * - Sorting and pagination interaction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { lightTheme } from '@/design-system';
import { DataTable, type DataTableColumn } from './DataTable';

interface TestRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

const columns: DataTableColumn<TestRow>[] = [
  { id: 'name', label: 'Name', sortable: true },
  { id: 'email', label: 'Email', sortable: true },
  { id: 'role', label: 'Role', sortable: false },
];

const rows: TestRow[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', role: 'Student' },
  { id: '2', name: 'Bob', email: 'bob@example.com', role: 'Teacher' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com', role: 'Admin' },
];

function renderTable(props?: Partial<React.ComponentProps<typeof DataTable<TestRow>>>) {
  return render(
    <ThemeProvider theme={lightTheme}>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={row => row.id}
        ariaLabel="Test users table"
        {...props}
      />
    </ThemeProvider>
  );
}

beforeEach(() => {
  // Ensure matchMedia is properly mocked for MUI's useMediaQuery
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('DataTable', () => {
  it('renders table with correct aria-label', () => {
    renderTable();
    const table = screen.getByRole('table', { name: 'Test users table' });
    expect(table).toBeInTheDocument();
  });

  it('renders column headers with correct text', () => {
    renderTable();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('renders all rows', () => {
    renderTable();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows empty message when no rows', () => {
    renderTable({ rows: [], emptyMessage: 'No users found' });
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    renderTable({ loading: true });
    expect(screen.getByRole('status', { name: 'Loading table data' })).toBeInTheDocument();
  });

  describe('Sorting', () => {
    it('calls onSortChange when sortable column header is clicked', async () => {
      const user = userEvent.setup();
      const onSortChange = vi.fn();
      renderTable({ onSortChange });

      const nameSort = screen.getByText('Name');
      await user.click(nameSort);

      expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
    });

    it('toggles sort direction on subsequent clicks', async () => {
      const user = userEvent.setup();
      const onSortChange = vi.fn();
      renderTable({ onSortChange });

      const nameSort = screen.getByText('Name');
      await user.click(nameSort);
      expect(onSortChange).toHaveBeenCalledWith('name', 'asc');

      await user.click(nameSort);
      expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
    });

    it('activates sort with keyboard (Enter key)', async () => {
      const user = userEvent.setup();
      const onSortChange = vi.fn();
      renderTable({ onSortChange });

      const nameSort = screen.getByText('Name');
      nameSort.focus();
      await user.keyboard('{Enter}');

      expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
    });
  });

  describe('Row interaction', () => {
    it('makes rows clickable when onRowClick is provided', () => {
      renderTable({ onRowClick: vi.fn() });
      const table = screen.getByRole('table');
      const rowButtons = within(table).getAllByRole('button');
      expect(rowButtons.length).toBeGreaterThan(0);
    });

    it('calls onRowClick when row is clicked', async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      renderTable({ onRowClick });

      const row = screen.getByText('Alice').closest('tr');
      expect(row).toHaveAttribute('tabindex', '0');
      await user.click(row!);

      expect(onRowClick).toHaveBeenCalledWith(rows[0]);
    });

    it('activates row with keyboard (Enter key)', async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      renderTable({ onRowClick });

      const row = screen.getByText('Alice').closest('tr')!;
      row.focus();
      await user.keyboard('{Enter}');

      expect(onRowClick).toHaveBeenCalledWith(rows[0]);
    });
  });

  describe('Pagination', () => {
    it('shows pagination when showPagination is true', () => {
      renderTable({ showPagination: true });
      expect(screen.getByLabelText('Table pagination')).toBeInTheDocument();
    });

    it('hides pagination when showPagination is false', () => {
      renderTable({ showPagination: false });
      expect(screen.queryByLabelText('Table pagination')).not.toBeInTheDocument();
    });

    it('calls onPageChange when page is changed', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      renderTable({
        onPageChange,
        totalCount: 30,
        page: 0,
        rowsPerPage: 10,
      });

      const nextPage = screen.getByLabelText('Go to next page');
      await user.click(nextPage);

      expect(onPageChange).toHaveBeenCalledWith(1);
    });
  });

  describe('Accessibility', () => {
    it('provides aria-describedby when ariaDescription is set', () => {
      renderTable({ ariaDescription: 'Table of all registered users' });
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-describedby', 'table-description');
    });

    it('clickable rows have role="button" and aria-label', () => {
      renderTable({ onRowClick: vi.fn() });
      const tableBody = screen.getByRole('table').querySelector('tbody')!;
      const clickableRows = within(tableBody).getAllByRole('button');
      clickableRows.forEach(row => {
        expect(row).toHaveAttribute('aria-label');
      });
    });

    it('sort labels include screen reader text for sort direction', async () => {
      const user = userEvent.setup();
      renderTable({ onSortChange: vi.fn() });

      await user.click(screen.getByText('Name'));
      expect(screen.getByText('sorted ascending')).toBeInTheDocument();
    });
  });

  describe('Custom rendering', () => {
    it('uses custom render function for cells when provided', () => {
      const customColumns: DataTableColumn<TestRow>[] = [
        {
          id: 'name',
          label: 'Name',
          render: value => <strong data-testid="custom-cell">{String(value)}</strong>,
        },
      ];
      renderTable({ columns: customColumns });
      const customCells = screen.getAllByTestId('custom-cell');
      expect(customCells[0]).toHaveTextContent('Alice');
    });
  });
});
