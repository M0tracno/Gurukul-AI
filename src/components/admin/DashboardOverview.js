import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Tooltip,
  Skeleton,
} from '@mui/material';
import {
  People as PeopleIcon,
  School as SchoolIcon,
  Quiz as QuizIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  PersonAdd as PersonAddIcon,
  Assignment as AssignmentIcon,
  FamilyRestroom as FamilyIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import AdminService from '../../services/adminService';

// Add CSS animations
const styles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

const DashboardOverview = ({ dashboardData, loading }) => {
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    responseTime: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSystemData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      // Load system alerts
      setSystemAlerts([
        {
          id: 1,
          type: 'warning',
          message: 'High server load detected (CPU: 85%)',
          time: new Date(Date.now() - 5 * 60000).toLocaleTimeString(),
          severity: 'medium',
        },
        {
          id: 2,
          type: 'info',
          message: `${Math.floor(Math.random() * 20) + 10} new user registrations pending`,
          time: new Date(Date.now() - 10 * 60000).toLocaleTimeString(),
          severity: 'low',
        },
        {
          id: 3,
          type: 'success',
          message: 'Database backup completed successfully',
          time: new Date(Date.now() - 60 * 60000).toLocaleTimeString(),
          severity: 'low',
        },
        {
          id: 4,
          type: 'error',
          message: 'Email service temporarily unavailable',
          time: new Date(Date.now() - 15 * 60000).toLocaleTimeString(),
          severity: 'high',
        },
      ]);

      // Load recent activity
      setRecentActivity([
        {
          id: 1,
          action: 'New student registered',
          user: 'John Doe',
          time: new Date(Date.now() - 2 * 60000).toLocaleTimeString(),
          type: 'user',
        },
        {
          id: 2,
          action: 'Course updated',
          user: 'Dr. Smith',
          time: new Date(Date.now() - 5 * 60000).toLocaleTimeString(),
          type: 'course',
        },
        {
          id: 3,
          action: 'Quiz created',
          user: 'Prof. Johnson',
          time: new Date(Date.now() - 8 * 60000).toLocaleTimeString(),
          type: 'quiz',
        },
        {
          id: 4,
          action: 'Parent account activated',
          user: 'Jane Wilson',
          time: new Date(Date.now() - 12 * 60000).toLocaleTimeString(),
          type: 'user',
        },
        {
          id: 5,
          action: 'System backup initiated',
          user: 'System',
          time: new Date(Date.now() - 18 * 60000).toLocaleTimeString(),
          type: 'system',
        },
      ]);

      // Load system metrics
      setSystemMetrics({
        cpuUsage: Math.floor(Math.random() * 30) + 60, // 60-90%
        memoryUsage: Math.floor(Math.random() * 25) + 55, // 55-80%
        diskUsage: Math.floor(Math.random() * 20) + 45, // 45-65%
        responseTime: Math.floor(Math.random() * 50) + 80, // 80-130ms
      });
    } catch (error) {
      console.error('Error loading system data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSystemData();
    setTimeout(() => setRefreshing(false), 1000);
  };
  const getAlertIcon = type => {
    switch (type) {
      case 'warning':
        return <WarningIcon sx={{ color: '#f59e0b', fontSize: 20 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#ef4444', fontSize: 20 }} />;
      case 'success':
        return <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />;
      default:
        return <CheckCircleIcon sx={{ color: '#3b82f6', fontSize: 20 }} />;
    }
  };
  const StatCard = ({ title, value, subValue, icon, color, trend }) => (
    <Card
      sx={{
        height: 160,
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 2,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderColor: color,
        },
      }}
    >
      <CardContent
        sx={{
          p: 2.5,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box flex={1}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: '#64748b',
                fontSize: '0.75rem',
                mb: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                color: color,
                mb: 0.5,
                fontSize: '2rem',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {value}
            </Typography>
            {subValue && (
              <Typography
                variant="body2"
                sx={{
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  lineHeight: 1.2,
                }}
              >
                {subValue}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}10`,
              borderRadius: 2,
              p: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.createElement(icon, { sx: { fontSize: 24, color: color } })}
          </Box>
        </Box>

        {trend && (
          <Box display="flex" alignItems="center" justifyContent="space-between" mt={1.5}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#f0fdf4',
                borderRadius: 2,
                px: 2,
                py: 0.5,
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 14, color: '#16a34a', mr: 0.5 }} />
              <Typography
                variant="caption"
                sx={{
                  color: '#16a34a',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                +{trend}%
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: '#64748b',
                fontSize: '0.75rem',
              }}
            >
              this week
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
  const SystemHealthCard = ({ healthData }) => (
    <Card
      sx={{
        borderRadius: 4,
        height: '100%',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#1a202c',
              fontSize: '1.25rem',
            }}
          >
            System Health
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: '#f0fdf4',
              px: 2,
              py: 1,
              borderRadius: 3,
              border: '1px solid #bbf7d0',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                animation: 'pulse 2s infinite',
              }}
            />
            <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 600 }}>
              All Systems Operational
            </Typography>
          </Box>
        </Box>

        {healthData ? (
          <Box>
            {Object.entries(healthData).map(([service, data]) => (
              <Box key={service} mb={2.5}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography
                    variant="body2"
                    sx={{
                      textTransform: 'capitalize',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    {service.replace(/([A-Z])/g, ' $1')}
                  </Typography>
                  <Chip
                    label={data.status || 'Online'}
                    color={data.status === 'Online' ? 'success' : 'warning'}
                    size="small"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      height: 28,
                      '& .MuiChip-label': {
                        px: 1.5,
                      },
                    }}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={data.status === 'Online' ? 100 : 60}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#f1f5f9',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: data.status === 'Online' ? '#10b981' : '#f59e0b',
                      borderRadius: 5,
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: '#6b7280',
                    fontSize: '0.75rem',
                    mt: 0.5,
                    display: 'block',
                    fontWeight: 500,
                  }}
                >
                  Response: {data.responseTime || 'N/A'}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={40} sx={{ color: '#6366f1', mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
              Loading system health...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const defaultStats = {
    totalUsers: 0,
    totalStudents: 0,
    totalFaculty: 0,
    totalParents: 0,
    totalCourses: 0,
    totalQuizzes: 0,
    activeUsers: 0,
    systemLoad: 0,
  };

  const stats = dashboardData?.summary || defaultStats;

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
        m: 0,
        p: 0,
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e2e8f0',
          px: 2.5,
          py: 1.5,
          flexShrink: 0,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#0f172a',
                mb: 0.5,
                fontSize: '1.5rem',
                lineHeight: 1.2,
              }}
            >
              Dashboard Overview
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#64748b',
                fontSize: '0.875rem',
              }}
            >
              Monitor your system performance and key metrics
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              size="small"
              sx={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                width: 36,
                height: 36,
                '&:hover': {
                  backgroundColor: '#f1f5f9',
                },
              }}
            >
              <RefreshIcon
                sx={{
                  color: '#64748b',
                  fontSize: 16,
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                }}
              />
            </IconButton>
            <Typography
              variant="caption"
              sx={{
                color: '#64748b',
                fontSize: '0.75rem',
              }}
            >
              Updated: {new Date().toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          p: 2,
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#cbd5e1',
            borderRadius: '2px',
          },
        }}
      >
        {/* Statistics Grid */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Students"
              value={stats.totalStudents || 0}
              subValue={`${stats.totalFaculty || 0} Faculty`}
              icon={PeopleIcon}
              color="#3b82f6"
              trend="12"
            />
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Quizzes"
              value={stats.totalQuizzes || 0}
              subValue="created"
              icon={QuizIcon}
              color="#8b5cf6"
              trend="8"
            />
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Active Users"
              value={stats.activeUsers || 0}
              subValue="currently online"
              icon={PersonAddIcon}
              color="#ec4899"
              trend="15"
            />
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Parent Accounts"
              value={stats.totalParents || 0}
              subValue="registered"
              icon={FamilyIcon}
              color="#06b6d4"
              trend="5"
            />
          </Grid>
        </Grid>

        {/* Secondary Content */}
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={8}>
            <Card
              sx={{
                height: 360,
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <CardContent sx={{ p: 2.5, height: '100%', overflow: 'hidden' }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 1.5,
                    color: '#0f172a',
                    fontSize: '1.125rem',
                  }}
                >
                  Recent Activity
                </Typography>

                <Box sx={{ height: 'calc(100% - 36px)', overflow: 'auto' }}>
                  <List sx={{ p: 0 }}>
                    {recentActivity.map((activity, index) => (
                      <ListItem
                        key={activity.id}
                        sx={{
                          px: 0,
                          py: 1,
                          borderBottom:
                            index < recentActivity.length - 1 ? '1px solid #f1f5f9' : 'none',
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Box
                            sx={{
                              backgroundColor: '#eff6ff',
                              borderRadius: 1.5,
                              p: 0.75,
                              border: '1px solid #dbeafe',
                            }}
                          >
                            <AssignmentIcon sx={{ color: '#3b82f6', fontSize: 14 }} />
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={activity.action}
                          secondary={`${activity.user} • ${activity.time}`}
                          primaryTypographyProps={{
                            fontWeight: 500,
                            color: '#0f172a',
                            fontSize: '0.875rem',
                          }}
                          secondaryTypographyProps={{
                            color: '#64748b',
                            fontSize: '0.75rem',
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <SystemHealthCard healthData={dashboardData?.health} />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardOverview;
