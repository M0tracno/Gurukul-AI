/**
 * System Metrics Panel Component
 *
 * Renders live system metrics fetched from the /metrics/json endpoint.
 * Displays total requests, errors, per-endpoint response times, and alerting config.
 *
 * Requirement 11.1: Display system metrics sourced from the metrics Endpoints
 * rather than static placeholder values.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  Timer as TimerIcon,
  CloudQueue as CloudIcon,
} from '@mui/icons-material';
import { FrostedCard } from '@/components/common/FrostedCard';
import { colors } from '@/styles/designTokens';
import {
  fetchSystemMetrics,
  ApiClientError,
  type SystemMetrics,
  type EndpointMetrics,
} from '../services/adminApiService';

/**
 * Small metric display card used within the panel.
 */
const MetricBadge: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      p: 1.5,
      borderRadius: 1.5,
      background: `${color}10`,
      border: `1px solid ${color}30`,
    }}
  >
    <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
    <Box>
      <Typography variant="caption" sx={{ color: colors.neutral[400], display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

/**
 * Endpoint row showing per-route metrics.
 */
const EndpointRow: React.FC<{ path: string; metrics: EndpointMetrics }> = ({ path, metrics }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      py: 1,
      px: 1.5,
      borderRadius: 1,
      '&:hover': { background: `${colors.neutral[700]}30` },
    }}
  >
    <Typography
      variant="caption"
      sx={{ color: colors.neutral[300], fontFamily: 'monospace', flex: 1 }}
    >
      {path}
    </Typography>
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Chip
        label={`${metrics.requestCount} reqs`}
        size="small"
        sx={{ fontSize: '0.65rem', color: colors.neutral[300], background: `${colors.neutral[700]}60` }}
      />
      <Typography variant="caption" sx={{ color: colors.neon.cyan, minWidth: 60, textAlign: 'right' }}>
        {metrics.avgResponseTime}ms avg
      </Typography>
      {metrics.slowResponseCount > 0 && (
        <Chip
          label={`${metrics.slowResponseCount} slow`}
          size="small"
          sx={{ fontSize: '0.65rem', color: colors.neon.orange, background: `${colors.neon.orange}15` }}
        />
      )}
    </Box>
  </Box>
);

export interface SystemMetricsPanelProps {
  /** Auto-refresh interval in milliseconds (default: 30000). Set 0 to disable. */
  autoRefreshMs?: number;
}

/**
 * SystemMetricsPanel — Fetches and displays live system metrics.
 */
export const SystemMetricsPanel: React.FC<SystemMetricsPanelProps> = ({
  autoRefreshMs = 30000,
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchSystemMetrics();
      setMetrics(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load system metrics.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();

    if (autoRefreshMs > 0) {
      const interval = setInterval(loadMetrics, autoRefreshMs);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [loadMetrics, autoRefreshMs]);

  const handleRefresh = () => {
    setLoading(true);
    loadMetrics();
  };

  if (loading && !metrics) {
    return (
      <FrostedCard glassLevel="medium" neonGlow neonColor="cyan" animate>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress sx={{ color: colors.neon.cyan }} />
        </Box>
      </FrostedCard>
    );
  }

  return (
    <FrostedCard glassLevel="medium" neonGlow neonColor="cyan" animate>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
          System Metrics
        </Typography>
        <Tooltip title="Refresh metrics">
          <IconButton onClick={handleRefresh} size="small" sx={{ color: colors.neon.cyan }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {metrics && (
        <>
          {/* Summary badges */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
              gap: 1.5,
              mb: 3,
            }}
          >
            <MetricBadge
              label="Total Requests"
              value={metrics.totalRequests.toLocaleString()}
              icon={<SpeedIcon fontSize="small" />}
              color={colors.neon.cyan}
            />
            <MetricBadge
              label="Total Errors"
              value={metrics.totalErrors.toLocaleString()}
              icon={<ErrorIcon fontSize="small" />}
              color={metrics.totalErrors > 0 ? colors.semantic.error : colors.semantic.success}
            />
            <MetricBadge
              label="Alert Threshold"
              value={`${metrics.alertThresholdMs}ms`}
              icon={<TimerIcon fontSize="small" />}
              color={colors.neon.blue}
            />
            <MetricBadge
              label="Alerting"
              value={metrics.alertingEnabled ? 'Enabled' : 'Disabled'}
              icon={<CloudIcon fontSize="small" />}
              color={metrics.alertingEnabled ? colors.semantic.success : colors.neutral[500]}
            />
          </Box>

          {/* Endpoint breakdown */}
          {Object.keys(metrics.endpoints).length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ color: colors.neutral[400], mb: 1, fontWeight: 500 }}
              >
                Endpoint Performance
              </Typography>
              <Box
                sx={{
                  maxHeight: 240,
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': {
                    background: colors.neutral[600],
                    borderRadius: 2,
                  },
                }}
              >
                {Object.entries(metrics.endpoints).map(([path, endpointMetrics]) => (
                  <EndpointRow key={path} path={path} metrics={endpointMetrics} />
                ))}
              </Box>
            </Box>
          )}

          {Object.keys(metrics.endpoints).length === 0 && (
            <Typography variant="body2" sx={{ color: colors.neutral[500], textAlign: 'center', py: 2 }}>
              No endpoint metrics recorded yet.
            </Typography>
          )}
        </>
      )}
    </FrostedCard>
  );
};

export default SystemMetricsPanel;
