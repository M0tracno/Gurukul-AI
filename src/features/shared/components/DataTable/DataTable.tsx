/**
 * DataTable — Accessible data table component.
 *
 * WCAG 2.1 AA compliant:
 * - Keyboard navigable with visible focus indicators
 * - ARIA labels for all interactive elements
 * - Responsive from 320px to 2560px (3 breakpoints: sm, md, lg)
 * - 4.5:1 contrast ratio for text
 * - Micro-animation feedback within 200ms
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

import { useState, useCallback, useMemo, type KeyboardEvent } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Skeleton,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';

export type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T> {
  /** Unique key for the column, maps to a property on the row data */
  id: keyof T & string;
  /** Display label for the column header */
  label: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Minimum width for the column */
  minWidth?: number;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom cell renderer */
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  /** Accessible description of the column for screen readers */
  ariaLabel?: string;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  /** Column configuration */
  columns: DataTableColumn<T>[];
  /** Row data */
  rows: T[];
  /** Total count for server-side pagination */
  totalCount?: number;
  /** Current page (0-indexed) */
  page?: number;
  /** Rows per page */
  rowsPerPage?: number;
  /** Loading state — shows skeleton */
  loading?: boolean;
  /** Callback when sort changes */
  onSortChange?: (columnId: keyof T & string, direction: SortDirection) => void;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when rows per page changes */
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Unique key extractor for each row */
  getRowId: (row: T) => string | number;
  /** Accessible label for the table */
  ariaLabel: string;
  /** Accessible description */
  ariaDescription?: string;
  /** Whether to show pagination */
  showPagination?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Rows per page options */
  rowsPerPageOptions?: number[];
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  totalCount,
  page = 0,
  rowsPerPage = 10,
  loading = false,
  onSortChange,
  onPageChange,
  onRowsPerPageChange,
  onRowClick,
  getRowId,
  ariaLabel,
  ariaDescription,
  showPagination = true,
  emptyMessage = 'No data available',
  rowsPerPageOptions = [5, 10, 25, 50],
}: DataTableProps<T>) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const [sortColumn, setSortColumn] = useState<(keyof T & string) | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = useCallback(
    (columnId: keyof T & string) => {
      const newDirection = sortColumn === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
      setSortColumn(columnId);
      setSortDirection(newDirection);
      onSortChange?.(columnId, newDirection);
    },
    [sortColumn, sortDirection, onSortChange],
  );

  const handleSortKeyDown = useCallback(
    (event: KeyboardEvent, columnId: keyof T & string) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSort(columnId);
      }
    },
    [handleSort],
  );

  const handleRowClick = useCallback(
    (row: T) => {
      onRowClick?.(row);
    },
    [onRowClick],
  );

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent, row: T) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onRowClick?.(row);
      }
    },
    [onRowClick],
  );

  const effectiveTotal = totalCount ?? rows.length;

  // Responsive column visibility: hide non-essential columns on small screens
  const visibleColumns = useMemo(() => {
    if (isSmall) {
      return columns.slice(0, 2); // Show only first 2 columns on mobile
    }
    if (isMedium) {
      return columns.slice(0, 4); // Show up to 4 on medium
    }
    return columns;
  }, [columns, isSmall, isMedium]);

  if (loading) {
    return (
      <Paper
        sx={{
          width: '100%',
          overflow: 'hidden',
          borderRadius: 2,
        }}
        role="status"
        aria-label="Loading table data"
      >
        <Box sx={{ p: 2 }}>
          {Array.from({ length: rowsPerPage }).map((_, idx) => (
            <Skeleton
              key={idx}
              variant="rectangular"
              height={48}
              sx={{ mb: 1, borderRadius: 1 }}
              animation="wave"
            />
          ))}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: 2,
      }}
    >
      <TableContainer
        sx={{
          maxWidth: '100%',
          overflowX: 'auto',
          // Prevent horizontal overflow at the page level
          '& table': {
            minWidth: isSmall ? 'auto' : 600,
          },
        }}
      >
        <Table
          aria-label={ariaLabel}
          aria-describedby={ariaDescription ? 'table-description' : undefined}
          size={isSmall ? 'small' : 'medium'}
        >
          {ariaDescription && (
            <caption>
              <Box
                component="span"
                id="table-description"
                sx={visuallyHidden}
              >
                {ariaDescription}
              </Box>
            </caption>
          )}
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align ?? 'left'}
                  sx={{
                    minWidth: column.minWidth,
                    fontWeight: 600,
                    backgroundColor: theme.palette.mode === 'dark'
                      ? theme.palette.grey[900]
                      : theme.palette.grey[50],
                    borderBottom: `2px solid ${theme.palette.divider}`,
                    // High contrast for text (4.5:1+)
                    color: theme.palette.text.primary,
                  }}
                  aria-label={column.ariaLabel ?? column.label}
                  sortDirection={sortColumn === column.id ? sortDirection : false}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortColumn === column.id}
                      direction={sortColumn === column.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(column.id)}
                      onKeyDown={(e) => handleSortKeyDown(e, column.id)}
                      sx={{
                        // Visible focus indicator
                        '&:focus-visible': {
                          outline: `3px solid ${theme.palette.primary.main}`,
                          outlineOffset: '2px',
                          borderRadius: '4px',
                        },
                        // Micro-animation within 200ms
                        transition: 'color 150ms ease-in-out',
                      }}
                    >
                      {column.label}
                      {sortColumn === column.id && (
                        <Box component="span" sx={visuallyHidden}>
                          {sortDirection === 'desc' ? 'sorted descending' : 'sorted ascending'}
                        </Box>
                      )}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  align="center"
                  sx={{ py: 6 }}
                >
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    aria-live="polite"
                  >
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  hover
                  onClick={onRowClick ? () => handleRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => handleRowKeyDown(e, row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  aria-label={onRowClick ? `View details for row ${getRowId(row)}` : undefined}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    // Visible focus indicator for keyboard navigation
                    '&:focus-visible': {
                      outline: `3px solid ${theme.palette.primary.main}`,
                      outlineOffset: '-3px',
                      borderRadius: '2px',
                    },
                    // Micro-animation for hover/interaction feedback (< 200ms)
                    transition: 'background-color 150ms ease-in-out',
                    '&:hover': onRowClick
                      ? {
                          backgroundColor: theme.palette.action.hover,
                        }
                      : undefined,
                  }}
                >
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align ?? 'left'}
                    >
                      {column.render
                        ? column.render(row[column.id], row)
                        : String(row[column.id] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {showPagination && rows.length > 0 && (
        <TablePagination
          component="div"
          count={effectiveTotal}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, newPage) => onPageChange?.(newPage)}
          onRowsPerPageChange={(e) =>
            onRowsPerPageChange?.(parseInt(e.target.value, 10))
          }
          rowsPerPageOptions={rowsPerPageOptions}
          aria-label="Table pagination"
          sx={{
            '& .MuiTablePagination-select:focus-visible': {
              outline: `3px solid ${theme.palette.primary.main}`,
              outlineOffset: '2px',
              borderRadius: '4px',
            },
            '& .MuiIconButton-root:focus-visible': {
              outline: `3px solid ${theme.palette.primary.main}`,
              outlineOffset: '2px',
              borderRadius: '50%',
            },
          }}
        />
      )}
    </Paper>
  );
}
