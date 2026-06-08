/**
 * FormSkeleton — Skeleton loading state for form views.
 *
 * Mirrors a typical form layout with labeled fields, grouped
 * sections, and action buttons at the bottom.
 * Uses MUI Skeleton for theme-aware pulsing animations.
 *
 * Requirements: 6.6
 */

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';

interface FormSkeletonProps {
  /** Number of form field groups to render. Default: 3 */
  sections?: number;
  /** Number of fields per section. Default: 3 */
  fieldsPerSection?: number;
}

export function FormSkeleton({ sections = 3, fieldsPerSection = 3 }: FormSkeletonProps) {
  return (
    <Box
      role="status"
      aria-label="Loading form..."
      aria-busy="true"
      sx={{ p: 3, maxWidth: 720 }}
    >
      {/* Form title */}
      <Skeleton variant="text" width={280} height={36} sx={{ mb: 1 }} />
      {/* Subtitle / description */}
      <Skeleton variant="text" width="60%" height={20} sx={{ mb: 4 }} />

      {/* Form sections */}
      {Array.from({ length: sections }).map((_, sectionIdx) => (
        <Paper
          key={sectionIdx}
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          {/* Section heading */}
          <Skeleton variant="text" width={160} height={24} sx={{ mb: 2 }} />

          {/* Form fields */}
          {Array.from({ length: fieldsPerSection }).map((_, fieldIdx) => (
            <Box key={fieldIdx} sx={{ mb: 2.5 }}>
              {/* Label */}
              <Skeleton variant="text" width={100} height={18} sx={{ mb: 0.5 }} />
              {/* Input */}
              <Skeleton variant="rounded" width="100%" height={40} />
            </Box>
          ))}
        </Paper>
      ))}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Skeleton variant="rounded" width={100} height={40} />
        <Skeleton variant="rounded" width={120} height={40} />
      </Box>
    </Box>
  );
}
