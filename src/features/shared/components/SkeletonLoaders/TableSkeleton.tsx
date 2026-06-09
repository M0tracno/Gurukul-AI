/**
 * TableSkeleton — Skeleton loading state for data table views.
 *
 * Mirrors a typical table layout with header row, body rows,
 * and pagination controls at the bottom.
 * Uses MUI Skeleton for theme-aware pulsing animations.
 *
 * Requirements: 6.6
 */

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';

interface TableSkeletonProps {
  /** Number of columns to render. Default: 5 */
  columns?: number;
  /** Number of body rows to render. Default: 8 */
  rows?: number;
}

export function TableSkeleton({ columns = 5, rows = 8 }: TableSkeletonProps) {
  return (
    <Box role="status" aria-label="Loading table data..." aria-busy="true" sx={{ p: 3 }}>
      {/* Page title and toolbar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Skeleton variant="text" width={200} height={36} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rounded" width={120} height={36} />
          <Skeleton variant="rounded" width={100} height={36} />
        </Box>
      </Box>

      {/* Search / filter bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Skeleton variant="rounded" width={280} height={40} />
        <Skeleton variant="rounded" width={140} height={40} />
      </Box>

      {/* Table */}
      <Paper
        elevation={0}
        sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
      >
        {/* Header row */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 2,
            px: 2,
            py: 1.5,
            bgcolor: 'action.hover',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} variant="text" width="70%" height={20} />
          ))}
        </Box>

        {/* Body rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <Box
            key={rowIdx}
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: 2,
              px: 2,
              py: 1.5,
              borderBottom: rowIdx < rows - 1 ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                variant="text"
                width={colIdx === 0 ? '80%' : '60%'}
                height={20}
              />
            ))}
          </Box>
        ))}
      </Paper>

      {/* Pagination */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 2,
        }}
      >
        <Skeleton variant="text" width={140} height={20} />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} variant="rounded" width={32} height={32} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
