/**
 * DataTable — Design-system data table.
 *
 * A pure-presentation, token-driven data table for admin views. Supports:
 *   - Column sort (ascending / descending) via `sort` / `onSortChange`
 *   - Filter predicate via `filters` / `onFilterChange`
 *   - Pagination via `page` / `pageSize` / `total` / `onPageChange`
 *   - Single row selection and drill-down callback via `onRowSelect`
 *
 * The component is intentionally presentation-only: it renders whatever rows
 * and total count are passed in. Data fetching, server-side sorting/filtering,
 * and client-side sorting/filtering are the responsibility of the consumer.
 *
 * Every visual value (colors, spacing, typography, radius, elevation) is
 * derived from shared design tokens — no one-off styles.
 *
 * Requirements: 10.1 (column sort), 10.2 (filter), 10.3 (pagination), 10.4 (drill-down).
 * Requirements: 7.2 (use component, not one-off), 7.3 (tokens), 7.4 (single SaaS style).
 */

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import FilterListIcon from '@mui/icons-material/FilterList';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { borderRadius } from '../tokens/borderRadius';
import { colors } from '../tokens/colors';
import { elevation } from '../tokens/elevation';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Sort direction. */
export type SortDirection = 'asc' | 'desc';

/** Current sort state: which column and which direction. */
export interface SortState {
  columnKey: string;
  direction: SortDirection;
}

/** A single active filter. */
export interface FilterState {
  columnKey: string;
  value: string;
}

/** Column descriptor. */
export interface DataTableColumn<TRow extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique identifier for the column. Used as key for sort/filter. */
  key: string;
  /** Header label rendered in the column header cell. */
  header: string;
  /**
   * Custom cell renderer. Receives the raw row object and returns a React node.
   * If omitted, `String(row[key])` is used.
   */
  render?: (row: TRow) => React.ReactNode;
  /** Whether the column is sortable. Defaults to false. */
  sortable?: boolean;
  /** Whether the column can be filtered. Defaults to false. */
  filterable?: boolean;
  /** Horizontal alignment for cells in this column. Defaults to "left". */
  align?: 'left' | 'center' | 'right';
  /** Optional min-width in pixels. */
  minWidth?: number;
}

export interface DataTableProps<TRow extends Record<string, unknown> = Record<string, unknown>> {
  /** Column definitions. */
  columns: DataTableColumn<TRow>[];
  /** Current page of rows to display. */
  rows: TRow[];
  /**
   * Unique key for each row. If not provided, the row index is used.
   * Should be a key path into TRow (e.g. "_id" or "id").
   */
  rowKey?: keyof TRow;
  /** Current sort state. If undefined the table is unsorted. */
  sort?: SortState;
  /** Called when the user clicks a sortable column header. */
  onSortChange?: (sort: SortState) => void;
  /** Active filters (one per filterable column). */
  filters?: FilterState[];
  /** Called when the user changes a column filter input. */
  onFilterChange?: (filters: FilterState[]) => void;
  /** Current 1-based page number. */
  page?: number;
  /** Number of rows per page. */
  pageSize?: number;
  /** Total number of rows across all pages (used to compute page count). */
  total?: number;
  /** Called with the new 1-based page number when the user navigates pages. */
  onPageChange?: (page: number) => void;
  /**
   * Called when a row is clicked (drill-down). Receives the full row object.
   * Requirement 10.4.
   */
  onRowSelect?: (row: TRow) => void;
  /** Optional accessible label for the table. */
  'aria-label'?: string;
  /** Show a message when there are no rows. Defaults to "No data available". */
  emptyMessage?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getFilterValue(filters: FilterState[] | undefined, columnKey: string): string {
  return filters?.find((f) => f.columnKey === columnKey)?.value ?? '';
}

// ---------------------------------------------------------------------------
// Sub-component: SortIcon
// ---------------------------------------------------------------------------

interface SortIconProps {
  columnKey: string;
  sort?: SortState;
}

function SortIcon({ columnKey, sort }: SortIconProps) {
  if (!sort || sort.columnKey !== columnKey) {
    return (
      <UnfoldMoreIcon
        fontSize="small"
        aria-hidden="true"
        sx={{ opacity: 0.4, verticalAlign: 'middle' }}
      />
    );
  }
  return sort.direction === 'asc' ? (
    <ArrowUpwardIcon
      fontSize="small"
      aria-hidden="true"
      sx={{ verticalAlign: 'middle', color: 'primary.main' }}
    />
  ) : (
    <ArrowDownwardIcon
      fontSize="small"
      aria-hidden="true"
      sx={{ verticalAlign: 'middle', color: 'primary.main' }}
    />
  );
}

// ---------------------------------------------------------------------------
// DataTable component
// ---------------------------------------------------------------------------

export function DataTable<TRow extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  filters,
  onFilterChange,
  page = 1,
  pageSize = 10,
  total,
  onPageChange,
  onRowSelect,
  'aria-label': ariaLabel = 'Data table',
  emptyMessage = 'No data available',
}: DataTableProps<TRow>) {
  // ---- derived values -----------------------------------------------------
  const totalRows = total ?? rows.length;
  const pageCount = pageSize > 0 ? Math.ceil(totalRows / pageSize) : 1;
  const hasFilterableColumns = columns.some((c) => c.filterable);
  const activeFilterCount = (filters ?? []).filter((f) => f.value.trim() !== '').length;

  // ---- event handlers -----------------------------------------------------
  function handleSortClick(columnKey: string) {
    if (!onSortChange) return;
    if (sort?.columnKey === columnKey) {
      onSortChange({ columnKey, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ columnKey, direction: 'asc' });
    }
  }

  function handleFilterChange(columnKey: string, value: string) {
    if (!onFilterChange) return;
    const existing = filters ?? [];
    const others = existing.filter((f) => f.columnKey !== columnKey);
    onFilterChange(value ? [...others, { columnKey, value }] : others);
  }

  function handlePageChange(_: React.ChangeEvent<unknown>, newPage: number) {
    onPageChange?.(newPage);
  }

  // ---- render -------------------------------------------------------------
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${spacing.md}px`,
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Filter bar (only shown when at least one column is filterable)      */}
      {/* ------------------------------------------------------------------ */}
      {hasFilterableColumns && (
        <Stack direction="row" flexWrap="wrap" gap={`${spacing.sm}px`} alignItems="center">
          <FilterListIcon
            fontSize="small"
            aria-hidden="true"
            sx={{ color: colors.neutral[500], flexShrink: 0 }}
          />
          {columns
            .filter((c) => c.filterable)
            .map((col) => (
              <TextField
                key={col.key}
                size="small"
                label={`Filter ${col.header}`}
                value={getFilterValue(filters, col.key)}
                onChange={(e) => handleFilterChange(col.key, e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <FilterListIcon fontSize="small" aria-hidden="true" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  minWidth: 180,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: `${borderRadius.sm}px`,
                    fontSize: typography.body2.fontSize,
                    fontFamily: typography.fontFamily.body,
                  },
                }}
                inputProps={{
                  'aria-label': `Filter by ${col.header}`,
                }}
              />
            ))}
          {activeFilterCount > 0 && (
            <Chip
              label={`${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
              size="small"
              onDelete={() => onFilterChange?.([])}
              deleteIcon={<span aria-hidden="true">×</span>}
              aria-label={`Clear all filters (${activeFilterCount} active)`}
              sx={{
                fontSize: typography.caption.fontSize,
                borderRadius: `${borderRadius.sm}px`,
              }}
            />
          )}
        </Stack>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Table                                                               */}
      {/* ------------------------------------------------------------------ */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: `${borderRadius.lg}px`,
          boxShadow: elevation.low,
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table aria-label={ariaLabel} size="small">
            {/* ---- Column headers ---------------------------------------- */}
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: colors.neutral[50],
                  '& th': {
                    fontFamily: typography.fontFamily.heading,
                    fontSize: typography.body2.fontSize,
                    fontWeight: 600,
                    color: colors.neutral[700],
                    py: `${spacing.md}px`,
                    px: `${spacing.md}px`,
                    borderBottom: `2px solid ${colors.neutral[200]}`,
                    whiteSpace: 'nowrap',
                  },
                }}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    align={col.align ?? 'left'}
                    style={{ minWidth: col.minWidth }}
                    aria-sort={
                      sort?.columnKey === col.key
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : col.sortable
                          ? 'none'
                          : undefined
                    }
                  >
                    {col.sortable ? (
                      <Tooltip
                        title={
                          sort?.columnKey === col.key
                            ? `Sort ${sort.direction === 'asc' ? 'descending' : 'ascending'}`
                            : 'Sort ascending'
                        }
                        placement="top"
                      >
                        <Box
                          component="button"
                          onClick={() => handleSortClick(col.key)}
                          aria-label={`Sort by ${col.header}`}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: `${spacing.xs}px`,
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            fontWeight: 'inherit',
                            color: 'inherit',
                            '&:focus-visible': {
                              outline: `2px solid ${colors.primary[500]}`,
                              outlineOffset: '2px',
                              borderRadius: `${borderRadius.xs}px`,
                            },
                          }}
                        >
                          {col.header}
                          <SortIcon columnKey={col.key} sort={sort} />
                        </Box>
                      </Tooltip>
                    ) : (
                      col.header
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            {/* ---- Body rows --------------------------------------------- */}
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    align="center"
                    sx={{
                      py: `${spacing.xxl}px`,
                      color: colors.neutral[500],
                      fontSize: typography.body2.fontSize,
                      fontFamily: typography.fontFamily.body,
                    }}
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, rowIndex) => {
                  const key = rowKey ? String(row[rowKey]) : String(rowIndex);
                  const isClickable = Boolean(onRowSelect);
                  return (
                    <TableRow
                      key={key}
                      hover={isClickable}
                      onClick={isClickable ? () => onRowSelect!(row) : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      role={isClickable ? 'button' : undefined}
                      onKeyDown={
                        isClickable
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onRowSelect!(row);
                              }
                            }
                          : undefined
                      }
                      aria-label={isClickable ? `View details for row ${rowIndex + 1}` : undefined}
                      sx={{
                        cursor: isClickable ? 'pointer' : 'default',
                        transition: 'background-color 150ms ease-in-out',
                        '& td': {
                          fontFamily: typography.fontFamily.body,
                          fontSize: typography.body2.fontSize,
                          color: colors.neutral[800],
                          py: `${spacing.sm + spacing.xs}px`,
                          px: `${spacing.md}px`,
                          borderBottom: `1px solid ${colors.neutral[100]}`,
                        },
                        '&:last-child td': {
                          borderBottom: 'none',
                        },
                        '&:focus-visible': {
                          outline: `2px solid ${colors.primary[500]}`,
                          outlineOffset: '-2px',
                        },
                      }}
                    >
                      {columns.map((col) => (
                        <TableCell key={col.key} align={col.align ?? 'left'}>
                          {col.render ? col.render(row) : String(row[col.key] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ---- Pagination footer ----------------------------------------- */}
        {pageCount > 1 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: `${spacing.lg}px`,
              py: `${spacing.md}px`,
              borderTop: `1px solid ${colors.neutral[100]}`,
              backgroundColor: colors.neutral[50],
            }}
          >
            <Typography
              sx={{
                fontSize: typography.caption.fontSize,
                color: colors.neutral[600],
                fontFamily: typography.fontFamily.body,
              }}
            >
              {`${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalRows)} of ${totalRows}`}
            </Typography>
            <Pagination
              count={pageCount}
              page={page}
              onChange={handlePageChange}
              size="small"
              shape="rounded"
              aria-label="Table pagination"
              sx={{
                '& .MuiPaginationItem-root': {
                  fontFamily: typography.fontFamily.body,
                  fontSize: typography.caption.fontSize,
                  borderRadius: `${borderRadius.sm}px`,
                },
              }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
