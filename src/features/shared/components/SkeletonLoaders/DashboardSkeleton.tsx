/**
 * DashboardSkeleton — Skeleton loading state for dashboard views.
 *
 * Mirrors the typical dashboard layout: stat cards at the top,
 * followed by chart placeholders and a summary section.
 * Uses MUI Skeleton for theme-aware pulsing animations.
 *
 * Requirements: 6.6
 */

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';

/** Number of stat cards to display in the skeleton */
const STAT_CARD_COUNT = 4;

export function DashboardSkeleton() {
  return (
    <Box role="status" aria-label="Loading dashboard..." aria-busy="true" sx={{ p: 3 }}>
      {/* Page title */}
      <Skeleton variant="text" width={240} height={40} sx={{ mb: 3 }} />

      {/* Stat cards row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Array.from({ length: STAT_CARD_COUNT }).map((_, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Skeleton variant="text" width="50%" height={20} />
              <Skeleton variant="text" width="30%" height={36} sx={{ my: 1 }} />
              <Skeleton variant="text" width="70%" height={16} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Chart area */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Skeleton variant="text" width={160} height={24} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 1 }} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
            <Skeleton variant="circular" width={160} height={160} sx={{ mx: 'auto', mb: 2 }} />
            <Skeleton variant="text" width="80%" sx={{ mx: 'auto' }} />
            <Skeleton variant="text" width="60%" sx={{ mx: 'auto' }} />
          </Paper>
        </Grid>
      </Grid>

      {/* Recent activity section */}
      <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Skeleton variant="text" width={180} height={24} sx={{ mb: 2 }} />
        {Array.from({ length: 3 }).map((_, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              py: 1.5,
              borderBottom: idx < 2 ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="text" width="40%" height={16} />
            </Box>
            <Skeleton variant="text" width={60} height={20} />
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
