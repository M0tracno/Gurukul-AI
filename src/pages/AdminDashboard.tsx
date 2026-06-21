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
  ListItemButton,
  CircularProgress,
  Stack,
} from '@mui/material';
import { motion } from 'framer-motion';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import env from '../config/env';
import { GradingOverridePanel, SystemMetricsPanel } from '../features/admin';
import CinematicStatCard from '../components/dashboard/CinematicStatCard';
import { accents, ink, surfaces, easing, fonts } from '../theme/cinematic';

const ACCENT = accents.crimson;

const SectionLoader: React.FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
    <CircularProgress sx={{ color: ACCENT.main }} />
  </Box>
);

// Lazy-loaded admin feature components backed by live API data
const UserManagementNew = React.lazy(() => import('../components/admin/UserManagementNew'));
const CourseManagementNew = React.lazy(() => import('../components/admin/CourseManagementNew'));
const CourseAllocationNew = React.lazy(() => import('../components/admin/CourseAllocationNew'));
const DataManagementNew = React.lazy(() => import('../components/admin/DataManagementNew'));
const ReportsAnalyticsNew = React.lazy(() => import('../components/admin/ReportsAnalyticsNew'));
const SystemSettingsNew = React.lazy(() => import('../components/admin/SystemSettingsNew'));

interface DashboardStats {
  students: number;
  quizzes: number;
  activeUsers: number;
  parentAccounts: number;
}

interface ActivityItem {
  id: string;
  title: string;
  user: string;
  time: string;
  icon: React.ReactNode;
}

const AdminDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    students: 0,
    quizzes: 0,
    activeUsers: 0,
    parentAccounts: 0,
  });

  const [recentActivity] = useState<ActivityItem[]>([
    { id: '1', title: 'New student registered', user: 'Admissions', time: '10:28 AM', icon: <PersonAdd sx={{ fontSize: 18 }} /> },
    { id: '2', title: 'Course details updated', user: 'Faculty office', time: '10:25 AM', icon: <SchoolIcon sx={{ fontSize: 18 }} /> },
    { id: '3', title: 'Assessment created', user: 'Exam cell', time: '10:22 AM', icon: <Quiz sx={{ fontSize: 18 }} /> },
    { id: '4', title: 'Parent account activated', user: 'Front desk', time: '10:18 AM', icon: <Group sx={{ fontSize: 18 }} /> },
  ]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setStats({ students: 0, activeUsers: 0, quizzes: 0, parentAccounts: 0 });
        return;
      }
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const apiUrl = env?.API_URL || 'http://localhost:5000';

      const [studentsRes, facultyRes, coursesRes] = await Promise.allSettled([
        fetch(`${apiUrl}/api/students?page=1&limit=1`, { headers }).then(r => r.json()),
        fetch(`${apiUrl}/api/faculty?page=1&limit=1`, { headers }).then(r => r.json()),
        fetch(`${apiUrl}/api/courses?page=1&limit=1`, { headers }).then(r => r.json()),
      ]);

      const extractTotal = (result: PromiseSettledResult<unknown>): number => {
        if (result.status !== 'fulfilled') return 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = result.value as any;
        return (
          data?.data?.pagination?.total ??
          data?.pagination?.total ??
          data?.total ??
          data?.data?.total ??
          0
        );
      };

      setStats({
        students: extractTotal(studentsRes),
        activeUsers: extractTotal(facultyRes),
        quizzes: extractTotal(coursesRes),
        parentAccounts: 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({ students: 0, activeUsers: 0, quizzes: 0, parentAccounts: 0 });
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleNavClick = (key: string) => {
    if (key === 'logout') handleLogout();
    else setCurrentView(key);
  };

  const navigationItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, key: 'dashboard' },
    { text: 'User Management', icon: <PeopleIcon />, key: 'users' },
    { text: 'Course Management', icon: <SchoolIcon />, key: 'courses' },
    { text: 'Course Allocation', icon: <AssignmentIcon />, key: 'allocation' },
    { text: 'Data Management', icon: <StorageIcon />, key: 'data' },
    { text: 'Reports & Analytics', icon: <ReportsIcon />, key: 'reports' },
    { text: 'System Settings', icon: <SettingsIcon />, key: 'settings' },
    { text: 'Logout', icon: <LogoutIcon />, key: 'logout' },
  ];

  const Sidebar = () => (
    <Box
      sx={{
        width: 280,
        height: '100vh',
        background: `linear-gradient(180deg, ${surfaces.paper} 0%, ${surfaces.base} 100%)`,
        borderRight: `1px solid ${surfaces.border}`,
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 3, py: 2.75, borderBottom: `1px solid ${surfaces.border}` }}>
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.15rem', color: ink.primary, letterSpacing: '-0.02em' }}>
          Gurukul AI
        </Typography>
        <Typography variant="overline" sx={{ color: ACCENT.light }}>
          Admin Console
        </Typography>
      </Box>

      {/* Profile */}
      <Box sx={{ p: 3, borderBottom: `1px solid ${surfaces.border}` }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              width: 48,
              height: 48,
              fontWeight: 700,
              color: ACCENT.light,
              background: ACCENT.soft,
              border: `1px solid rgba(${ACCENT.rgb}, 0.3)`,
            }}
          >
            A
          </Avatar>
          <Box>
            <Typography sx={{ color: ink.primary, fontWeight: 600, fontSize: '0.98rem' }}>Administrator</Typography>
            <Typography sx={{ color: ink.tertiary, fontSize: '0.82rem' }}>System administrator</Typography>
          </Box>
        </Stack>
      </Box>

      <List sx={{ p: 2 }}>
        {navigationItems.map((item, index) => {
          const active = currentView === item.key;
          return (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ListItemButton
                onClick={() => handleNavClick(item.key)}
                sx={{
                  mb: 0.5,
                  borderRadius: '10px',
                  position: 'relative',
                  color: active ? ink.primary : ink.secondary,
                  background: active ? ACCENT.soft : 'transparent',
                  transition: `all 0.35s ${easing.premium}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 8,
                    bottom: 8,
                    width: 3,
                    borderRadius: 3,
                    background: active ? ACCENT.main : 'transparent',
                  },
                  '&:hover': { background: active ? ACCENT.soft : 'rgba(255,255,255,0.04)', color: ink.primary },
                }}
              >
                <ListItemIcon sx={{ color: active ? ACCENT.light : ink.tertiary, minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{ '& .MuiListItemText-primary': { fontWeight: active ? 600 : 500, fontSize: '0.9rem' } }}
                />
              </ListItemButton>
            </motion.div>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: surfaces.base,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          inset: 0,
          background: `radial-gradient(60% 50% at 80% 0%, rgba(${ACCENT.rgb}, 0.12) 0%, transparent 60%),
                       radial-gradient(50% 40% at 0% 100%, rgba(120,140,180,0.08) 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}
    >
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(8, 9, 12, 0.72)',
          backdropFilter: 'blur(18px) saturate(140%)',
          borderBottom: `1px solid ${surfaces.border}`,
          boxShadow: 'none',
          backgroundImage: 'none',
        }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' }, color: ACCENT.light }}>
            <MenuIcon />
          </IconButton>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.1rem', color: ink.primary, letterSpacing: '-0.02em' }}>
              Admin
            </Typography>
            <Box sx={{ px: 1, py: 0.25, borderRadius: '999px', background: ACCENT.soft, border: `1px solid rgba(${ACCENT.rgb},0.3)` }}>
              <Typography sx={{ color: ACCENT.light, fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em' }}>
                CONSOLE
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton sx={{ color: ink.secondary }}>
              <Badge badgeContent={4} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <IconButton sx={{ color: ink.secondary }} onClick={fetchStats} aria-label="refresh">
              <RefreshIcon />
            </IconButton>
            <Avatar sx={{ width: 32, height: 32, fontSize: '0.9rem', color: ACCENT.light, background: ACCENT.soft, border: `1px solid rgba(${ACCENT.rgb},0.3)` }}>
              A
            </Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        sx={{ '& .MuiDrawer-paper': { border: 'none', background: 'transparent' } }}
      >
        <Sidebar />
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, ml: { md: '280px' }, mt: '64px', position: 'relative', zIndex: 1 }}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {currentView === 'dashboard' && (
            <>
              <Box sx={{ mb: 4 }}>
                <Typography variant="overline" sx={{ color: ACCENT.light }}>
                  Overview
                </Typography>
                <Typography variant="h3" sx={{ color: ink.primary, mt: 0.5, mb: 1 }}>
                  Here's where things stand.
                </Typography>
                <Typography sx={{ color: ink.secondary }}>
                  Live institutional metrics and recent activity across the platform.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                  gap: 3,
                  mb: 4,
                }}
              >
                <CinematicStatCard label="Students" value={stats.students} hint="enrolled" icon={<PeopleIcon sx={{ fontSize: 20 }} />} accent={ACCENT} delay={0} />
                <CinematicStatCard label="Courses" value={stats.quizzes} hint="active" icon={<Quiz sx={{ fontSize: 20 }} />} accent={ACCENT} delay={0.06} />
                <CinematicStatCard label="Faculty" value={stats.activeUsers} hint="on staff" icon={<TrendingUp sx={{ fontSize: 20 }} />} accent={ACCENT} delay={0.12} />
                <CinematicStatCard label="Parent accounts" value={stats.parentAccounts} hint="registered" icon={<Group sx={{ fontSize: 20 }} />} accent={ACCENT} delay={0.18} />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: '16px',
                    background: `linear-gradient(180deg, ${surfaces.paper} 0%, ${surfaces.base} 150%)`,
                    border: `1px solid ${surfaces.border}`,
                  }}
                >
                  <Typography variant="h6" sx={{ color: ink.primary, mb: 2.5 }}>
                    Recent activity
                  </Typography>
                  <Stack spacing={1.25}>
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                      >
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          sx={{
                            p: 1.75,
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.02)',
                            border: `1px solid ${surfaces.border}`,
                            transition: `all 0.3s ${easing.premium}`,
                            '&:hover': { background: 'rgba(255,255,255,0.04)', transform: 'translateX(3px)' },
                          }}
                        >
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '10px',
                              display: 'grid',
                              placeItems: 'center',
                              color: ACCENT.light,
                              background: ACCENT.soft,
                              border: `1px solid rgba(${ACCENT.rgb},0.2)`,
                            }}
                          >
                            {activity.icon}
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" sx={{ color: ink.primary, fontWeight: 500 }}>
                              {activity.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: ink.tertiary }}>
                              {activity.user} • {activity.time}
                            </Typography>
                          </Box>
                        </Stack>
                      </motion.div>
                    ))}
                  </Stack>
                </Box>

                <SystemMetricsPanel autoRefreshMs={30000} />
              </Box>

              <GradingOverridePanel />
            </>
          )}

          {currentView !== 'dashboard' && (
            <Suspense fallback={<SectionLoader />}>
              {currentView === 'users' && <UserManagementNew />}
              {currentView === 'courses' && <CourseManagementNew />}
              {currentView === 'allocation' && <CourseAllocationNew />}
              {currentView === 'data' && <DataManagementNew />}
              {currentView === 'reports' && <ReportsAnalyticsNew />}
              {currentView === 'settings' && <SystemSettingsNew />}
            </Suspense>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
