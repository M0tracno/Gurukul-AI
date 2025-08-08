import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Box,
  Container,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  Badge,
  Chip,
  ListItemButton,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Storage as StorageIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  TrendingUp,
  Group,
  Quiz,
  PersonAdd,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { FrostedCard } from '../components/common/FrostedCard';
import { colors } from '../styles/designTokens';

// Dashboard Statistics Interface
interface DashboardStats {
  students: number;
  quizzes: number;
  activeUsers: number;
  parentAccounts: number;
  studentsChange: number;
  quizzesChange: number;
  activeUsersChange: number;
  parentAccountsChange: number;
}

// Activity Item Interface
interface ActivityItem {
  id: string;
  type: 'student' | 'course' | 'quiz' | 'parent';
  title: string;
  user: string;
  time: string;
  icon: React.ReactNode;
}

// Main Admin Dashboard Component
const AdminDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats] = useState<DashboardStats>({
    students: 0,
    quizzes: 0,
    activeUsers: 0,
    parentAccounts: 0,
    studentsChange: 12,
    quizzesChange: 8,
    activeUsersChange: 15,
    parentAccountsChange: 5,
  });

  const [recentActivity] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'student',
      title: 'New student registered',
      user: 'John Doe',
      time: '10:28:04 AM',
      icon: <PersonAdd sx={{ color: colors.neon.cyan }} />,
    },
    {
      id: '2',
      type: 'course',
      title: 'Course updated',
      user: 'Dr. Smith',
      time: '10:25:04 AM',
      icon: <SchoolIcon sx={{ color: colors.neon.blue }} />,
    },
    {
      id: '3',
      type: 'quiz',
      title: 'Quiz created',
      user: 'Prof. Johnson',
      time: '10:22:04 AM',
      icon: <Quiz sx={{ color: colors.neon.orange }} />,
    },
    {
      id: '4',
      type: 'parent',
      title: 'Parent account activated',
      user: 'Jane Wilson',
      time: '10:18:04 AM',
      icon: <Group sx={{ color: colors.neon.purple }} />,
    },
  ]);

  const [systemHealth] = useState({
    status: 'All Systems Operational',
    isLoading: false,
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Sidebar Navigation Items
  const navigationItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, active: true },
    { text: 'User Management', icon: <PeopleIcon />, active: false },
    { text: 'Course Management', icon: <SchoolIcon />, active: false },
    { text: 'Course Allocation', icon: <AssignmentIcon />, active: false },
    { text: 'Data Management', icon: <StorageIcon />, active: false },
    { text: 'Reports & Analytics', icon: <ReportsIcon />, active: false },
    { text: 'System Settings', icon: <SettingsIcon />, active: false },
    { text: 'Logout', icon: <LogoutIcon />, active: false },
  ];

  // Futuristic Sidebar Component
  const FuturisticSidebar = () => (
    <Box
      sx={{
        width: 280,
        height: '100vh',
        background: `linear-gradient(135deg, 
          ${colors.neutral[900]}ee 0%, 
          ${colors.neutral[800]}dd 50%, 
          ${colors.neutral[900]}ee 100%)`,
        backdropFilter: 'blur(20px)',
        borderRight: `1px solid ${colors.neutral[700]}40`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(45deg, ${colors.neon.cyan}10 0%, transparent 50%, ${colors.neon.blue}10 100%)`,
          pointerEvents: 'none',
        },
      }}
    >
      {/* User Profile Section */}
      <Box sx={{ p: 3, borderBottom: `1px solid ${colors.neutral[700]}40` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${colors.neon.cyan}, ${colors.neon.blue})`,
              boxShadow: `0 0 20px ${colors.neon.cyan}40`,
            }}
          >
            A
          </Avatar>
          <Box>
            <Typography
              variant="h6"
              sx={{
                color: 'white',
                fontWeight: 600,
                fontSize: '1.1rem',
              }}
            >
              Administrator
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: colors.neutral[400],
                fontSize: '0.85rem',
              }}
            >
              System Administrator
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation Items */}
      <List sx={{ p: 2 }}>
        {navigationItems.map((item, index) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ListItemButton
              sx={{
                mb: 1,
                borderRadius: 2,
                background: item.active
                  ? `linear-gradient(135deg, ${colors.neon.cyan}20, ${colors.neon.blue}20)`
                  : 'transparent',
                border: item.active ? `1px solid ${colors.neon.cyan}40` : '1px solid transparent',
                boxShadow: item.active ? `0 0 20px ${colors.neon.cyan}20` : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: `linear-gradient(135deg, ${colors.neon.cyan}15, ${colors.neon.blue}15)`,
                  border: `1px solid ${colors.neon.cyan}30`,
                  boxShadow: `0 0 15px ${colors.neon.cyan}15`,
                  transform: 'translateX(4px)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: item.active ? colors.neon.cyan : colors.neutral[400],
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{
                  '& .MuiListItemText-primary': {
                    color: item.active ? 'white' : colors.neutral[300],
                    fontWeight: item.active ? 600 : 400,
                    fontSize: '0.9rem',
                  },
                }}
              />
            </ListItemButton>
          </motion.div>
        ))}
      </List>
    </Box>
  );

  // Statistics Card Component
  const StatCard: React.FC<{
    title: string;
    value: number;
    subtitle: string;
    change: number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, subtitle, change, icon, color }) => (
    <FrostedCard
      glassLevel="medium"
      neonGlow
      neonColor="cyan"
      animate
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: `linear-gradient(135deg, ${color}20, ${color}10)`,
          borderRadius: '50%',
          transform: 'translate(30px, -30px)',
        },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}
        >
          <Typography
            variant="overline"
            sx={{
              color: colors.neutral[400],
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: 1,
            }}
          >
            {title}
          </Typography>
          <Box sx={{ color }}>{icon}</Box>
        </Box>

        <Typography
          variant="h3"
          sx={{
            color: 'white',
            fontWeight: 700,
            fontSize: '2.5rem',
            mb: 0.5,
          }}
        >
          {value}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: colors.neutral[400],
            fontSize: '0.85rem',
            mb: 1,
          }}
        >
          {subtitle}
        </Typography>

        <Chip
          label={`+${change}% this week`}
          size="small"
          sx={{
            background: `linear-gradient(135deg, ${colors.semantic.success}20, ${colors.semantic.success}10)`,
            color: colors.semantic.success,
            fontSize: '0.75rem',
            height: 24,
            '& .MuiChip-label': {
              px: 1,
            },
          }}
          icon={<TrendingUp sx={{ fontSize: '0.8rem' }} />}
        />
      </Box>
    </FrostedCard>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: `linear-gradient(135deg, 
          ${colors.neutral[950]} 0%, 
          ${colors.neutral[900]} 50%, 
          ${colors.neutral[950]} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 80%, ${colors.neon.cyan}15 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, ${colors.neon.blue}15 0%, transparent 50%),
                      radial-gradient(circle at 40% 40%, ${colors.neon.purple}10 0%, transparent 50%)`,
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}
    >
      {/* Futuristic App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: `linear-gradient(135deg, 
            ${colors.neutral[900]}95 0%, 
            ${colors.neutral[800]}90 100%)`,
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${colors.neutral[700]}40`,
          boxShadow: `0 4px 20px ${colors.neutral[950]}60`,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              display: { md: 'none' },
              color: colors.neon.cyan,
            }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              background: `linear-gradient(135deg, ${colors.neon.cyan}, ${colors.neon.blue})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              fontSize: '1.4rem',
            }}
          >
            Educational Management System - Admin Dashboard
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton sx={{ color: colors.neutral[300] }}>
              <Badge badgeContent={4} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <IconButton sx={{ color: colors.neutral[300] }}>
              <RefreshIcon />
            </IconButton>

            <Avatar
              sx={{
                width: 32,
                height: 32,
                background: `linear-gradient(135deg, ${colors.neon.cyan}, ${colors.neon.blue})`,
              }}
            >
              A
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        sx={{
          '& .MuiDrawer-paper': {
            border: 'none',
            background: 'transparent',
          },
        }}
      >
        <FuturisticSidebar />
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: { md: '280px' },
          mt: '64px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Dashboard Header */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              sx={{
                color: 'white',
                fontWeight: 700,
                mb: 1,
              }}
            >
              Dashboard Overview
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: colors.neutral[400],
              }}
            >
              Monitor your system performance and key metrics
            </Typography>
          </Box>

          {/* Statistics Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 3,
              mb: 4,
            }}
          >
            <StatCard
              title="STUDENTS"
              value={stats.students}
              subtitle="0 Faculty"
              change={stats.studentsChange}
              icon={<PeopleIcon />}
              color={colors.neon.cyan}
            />
            <StatCard
              title="QUIZZES"
              value={stats.quizzes}
              subtitle="created"
              change={stats.quizzesChange}
              icon={<Quiz />}
              color={colors.neon.blue}
            />
            <StatCard
              title="ACTIVE USERS"
              value={stats.activeUsers}
              subtitle="currently online"
              change={stats.activeUsersChange}
              icon={<TrendingUp />}
              color={colors.neon.orange}
            />
            <StatCard
              title="PARENT ACCOUNTS"
              value={stats.parentAccounts}
              subtitle="registered"
              change={stats.parentAccountsChange}
              icon={<Group />}
              color={colors.neon.purple}
            />
          </Box>

          {/* Content Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3,
            }}
          >
            {/* Recent Activity */}
            <FrostedCard glassLevel="medium" neonGlow neonColor="cyan" animate>
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  mb: 3,
                }}
              >
                Recent Activity
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        borderRadius: 2,
                        background: `${colors.neutral[800]}40`,
                        border: `1px solid ${colors.neutral[700]}30`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: `${colors.neutral[700]}40`,
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <Box>{activity.icon}</Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                          {activity.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.neutral[400] }}>
                          {activity.user} • {activity.time}
                        </Typography>
                      </Box>
                    </Box>
                  </motion.div>
                ))}
              </Box>
            </FrostedCard>

            {/* System Health */}
            <FrostedCard glassLevel="medium" neonGlow neonColor="blue" animate>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: 'white',
                    fontWeight: 600,
                  }}
                >
                  System Health
                </Typography>
                <Chip
                  label={systemHealth.status}
                  sx={{
                    background: `linear-gradient(135deg, ${colors.semantic.success}20, ${colors.semantic.success}10)`,
                    color: colors.semantic.success,
                    fontSize: '0.75rem',
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 200,
                  position: 'relative',
                }}
              >
                {systemHealth.isLoading ? (
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        border: `3px solid ${colors.neon.blue}40`,
                        borderTop: `3px solid ${colors.neon.blue}`,
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        mb: 2,
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' },
                        },
                      }}
                    />
                    <Typography variant="body2" sx={{ color: colors.neutral[400] }}>
                      Loading system health...
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${colors.semantic.success}30, ${colors.semantic.success}10)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        boxShadow: `0 0 30px ${colors.semantic.success}20`,
                      }}
                    >
                      <Typography
                        variant="h4"
                        sx={{ color: colors.semantic.success, fontWeight: 700 }}
                      >
                        ✓
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: 'white', fontWeight: 500 }}>
                      All systems operational
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.neutral[400] }}>
                      Updated: 10:30:04 AM
                    </Typography>
                  </Box>
                )}
              </Box>
            </FrostedCard>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
