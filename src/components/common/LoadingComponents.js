import React from 'react';
import { keyframes } from '@emotion/react';
import {  styled } from '@mui/material/styles';
import { 
  Box, 
  CircularProgress, 
  Skeleton, 
  Fade, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  LinearProgress, 
  Grow 
} from '@mui/material';

// Enhanced Loading Components for Phase 1
// Pulse animation
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

// Shimmer animation
const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

// Wave animation
const wave = keyframes`
  0%, 60%, 100% {
    transform: initial;
  }
  30% {
    transform: translateY(-15px);
  }
`;

// Styled components
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  padding: theme.spacing(3),
}));

const PulsingCircularProgress = styled(CircularProgress)(({ theme }) => ({
  animation: `${pulse} 2s ease-in-out infinite`,
  color: theme.palette.primary.main,
}));

const ShimmerSkeleton = styled(Skeleton)(({ theme }) => ({
  background: `linear-gradient(90deg, 
    ${theme.palette.mode === 'dark' ? '#374151' : '#f1f5f9'} 0px, 
    ${theme.palette.mode === 'dark' ? '#4b5563' : '#e2e8f0'} 40px, 
    ${theme.palette.mode === 'dark' ? '#374151' : '#f1f5f9'} 80px
  )`,
  backgroundSize: '200px',
  animation: `${shimmer} 1.5s linear infinite`,
}));

const WaveDot = styled(Box)(({ theme, delay = 0 }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  animation: `${wave} 1.4s ease-in-out infinite`,
  animationDelay: `${delay}s`,
  margin: '0 2px',
}));

// Loading Spinner Component
export const LoadingSpinner = ({ 
  size = 40, 
  message = 'Loading...', 
  showMessage = true,
  variant = 'circular'
}) => {
  return (
    <LoadingContainer>
      <Fade in timeout={300}>
        <Box display="flex" flexDirection="column" alignItems="center">
          {variant === 'circular' ? (
            <PulsingCircularProgress size={size} thickness={4} />
          ) : (
            <Box display="flex" alignItems="center">
              <WaveDot delay={0} />
              <WaveDot delay={0.2} />
              <WaveDot delay={0.4} />
            </Box>
          )}
          {showMessage && (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ mt: 2, opacity: 0.8 }}
            >
              {message}
            </Typography>
          )}
        </Box>
      </Fade>
    </LoadingContainer>
  );
};

// Page Loading Component
export const PageLoading = ({ message = 'Loading page...' }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
      }}
    >
      <Card
        sx={{
          p: 4,
          minWidth: 300,
          textAlign: 'center',
          background: (theme) => theme.custom?.glassmorphism?.background || 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <LoadingSpinner message={message} />
      </Card>
    </Box>
  );
};

// Dashboard Skeleton
export const DashboardSkeleton = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header Skeleton */}
      <Box sx={{ mb: 4 }}>
        <ShimmerSkeleton variant="text" width="40%" height={40} sx={{ mb: 1 }} />
        <ShimmerSkeleton variant="text" width="60%" height={24} />
      </Box>

      {/* Stats Cards Skeleton */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[1, 2, 3, 4].map((item) => (
          <Grid size={{xs:12,sm:6,md:3}} key={item}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box flex={1}>
                    <ShimmerSkeleton variant="text" width="70%" height={20} />
                    <ShimmerSkeleton variant="text" width="50%" height={32} sx={{ mt: 1 }} />
                  </Box>
                  <ShimmerSkeleton variant="circular" width={48} height={48} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Chart Skeleton */}
      <Grid container spacing={3}>
        <Grid size={{xs:12,md:8}}>
          <Card>
            <CardContent>
              <ShimmerSkeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
              <ShimmerSkeleton variant="rectangular" width="100%" height={300} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{xs:12,md:4}}>
          <Card>
            <CardContent>
              <ShimmerSkeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
              {[1, 2, 3, 4, 5].map((item) => (
                <Box key={item} display="flex" alignItems="center" sx={{ mb: 2 }}>
                  <ShimmerSkeleton variant="circular" width={32} height={32} sx={{ mr: 2 }} />
                  <Box flex={1}>
                    <ShimmerSkeleton variant="text" width="80%" height={20} />
                    <ShimmerSkeleton variant="text" width="60%" height={16} />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Table Skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <Card>
      <CardContent>
        {/* Table Header */}
        <Box display="flex" sx={{ mb: 2 }}>
          {Array.from({ length: columns }, (_, index) => (
            <Box key={index} flex={1} sx={{ mr: index < columns - 1 ? 2 : 0 }}>
              <ShimmerSkeleton variant="text" width="80%" height={24} />
            </Box>
          ))}
        </Box>

        {/* Table Rows */}
        {Array.from({ length: rows }, (_, rowIndex) => (
          <Box key={rowIndex} display="flex" sx={{ mb: 1.5 }}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <Box key={colIndex} flex={1} sx={{ mr: colIndex < columns - 1 ? 2 : 0 }}>
                <ShimmerSkeleton 
                  variant="text" 
                  width={`${60 + Math.random() * 30}%`} 
                  height={20} 
                />
              </Box>
            ))}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

// Form Skeleton
export const FormSkeleton = ({ fields = 4 }) => {
  return (
    <Card>
      <CardContent>
        <ShimmerSkeleton variant="text" width="40%" height={32} sx={{ mb: 3 }} />
        
        {Array.from({ length: fields }, (_, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <ShimmerSkeleton variant="text" width="25%" height={20} sx={{ mb: 1 }} />
            <ShimmerSkeleton variant="rectangular" width="100%" height={56} />
          </Box>
        ))}

        <Box display="flex" justifyContent="flex-end" gap={2} sx={{ mt: 4 }}>
          <ShimmerSkeleton variant="rectangular" width={100} height={36} />
          <ShimmerSkeleton variant="rectangular" width={100} height={36} />
        </Box>
      </CardContent>
    </Card>
  );
};

// Progressive Loading Component
export const ProgressiveLoader = ({ 
  steps, 
  currentStep, 
  message = 'Loading...', 
  showProgress = true 
}) => {
  const progress = (currentStep / steps) * 100;

  return (
    <LoadingContainer>
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        {showProgress && (
          <Box sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {message}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                }
              }} 
            />
          </Box>
        )}
        
        <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
          <Box display="flex" alignItems="center">
            <WaveDot delay={0} />
            <WaveDot delay={0.2} />
            <WaveDot delay={0.4} />
          </Box>
        </Box>
      </Box>
    </LoadingContainer>
  );
};

// Lazy Loading Wrapper
export const LazyLoadWrapper = ({ 
  children, 
  fallback = <LoadingSpinner />, 
  delay = 200 
}) => {
  return (
    <React.Suspense fallback={
      <Grow in timeout={delay}>
        <div>{fallback}</div>
      </Grow>
    }>
      {children}
    </React.Suspense>
  );
};

const LoadingComponents = {
  LoadingSpinner,
  PageLoading,
  DashboardSkeleton,
  TableSkeleton,
  FormSkeleton,
  ProgressiveLoader,
  LazyLoadWrapper,
};

export default LoadingComponents;
