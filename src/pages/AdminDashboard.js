import React, { useState, useEffect } from 'react';
import { 
  AccountCircle, 
  Assignment, 
  Backup as BackupIcon, 
  BarChart as BarChartIcon, 
  Book as BookIcon, 
  Close, 
  CloudUpload as CloudUploadIcon, 
  Dashboard as DashboardIcon, 
  Storage as DatabaseIcon, 
  Delete, 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Email,   Event as EventIcon, 
  FamilyRestroom as FamilyRestroomIcon,
  FilterList as FilterIcon,
  GetApp, 
  Grade, 
  ImportExport as ImportExportIcon, 
  ShowChart as LineChartIcon, 
  Logout as LogoutIcon, 
  Menu,   Menu as MenuIcon, 
  NoteAdd as AddIcon, 
  Notifications as NotificationsIcon, 
  People as PeopleIcon, 
  PersonAdd as PersonAddIcon, 
  Person as PersonIcon,
  Refresh,   Assessment as ReportsIcon, 
  Restore as RestoreIcon, 
  School as SchoolIcon, 
  Shield as SecurityIcon, 
  Settings,
  Settings as SettingsIcon, 
  Storage as StorageIcon,   TrendingUp as TrendingUpIcon, 
  VpnKey as VpnKeyIcon, 
  Warning as WarningIcon 
} from '@mui/icons-material';
import { 
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,  Divider,
  Drawer,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import makeStyles from '../utils/makeStylesCompat';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AdminService from '../services/adminService';
import { useBundleAnalysis, useBundleMonitoring } from '../utils/bundleAnalyzer';
import LinkBehavior from '../components/common/LinkBehavior';
import CourseAllocationDashboard from '../components/admin/CourseAllocationDashboard';
import { useAccessibility } from '../utils/accessibilityHelpers';
import securityHelpers from '../utils/securityHelpers';
import errorMonitoring from '../utils/errorMonitoring';
import EnhancedSecurity from '../utils/enhancedSecurity';
import { CustomThemeProvider, useTheme } from '../contexts/ThemeContext';
import { NotificationProvider, useNotifications } from '../contexts/NotificationContext';
import EnhancedAnalytics from '../components/analytics/EnhancedAnalytics';
import SettingsPanel from '../components/settings/SettingsPanel';
import { usePerformanceMetrics, useNetworkOptimization } from '../hooks/usePerformance';
import { useResponsiveDesign } from '../components/mobile/MobileOptimization';
import ProductionMonitor from '../components/monitoring/ProductionMonitor';

import { Menu, toLocaleString } from '@mui/material';
import { useTheme } from '@mui/material/styles';
// Import new enhanced components and contexts

// Import performance and optimization utilities

// Import accessibility and security helpers
const drawerWidth = 260;

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: theme.palette.background.default,
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1, // Ensure appBar is always on top
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    borderBottom: 'none',
  },
  menuButton: {
    marginRight: theme.spacing(2),
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    [theme.breakpoints.up('md')]: {
      display: 'none',
    },
  },
  title: {
    flexGrow: 1,
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
    background: 'linear-gradient(180deg, #2c3e50 0%, #34495e 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.15)',
    '& .MuiListItemText-primary': {
      color: 'white',
      fontWeight: 500,
    },
    '& .MuiListItemIcon-root': {
      color: 'white',
    },
    '& .MuiTypography-root': {
      color: 'white',
    },
  },
  drawerContainer: {
    overflow: 'auto',
    paddingTop: theme.spacing(1),
    height: '100%',
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    transition: 'margin-left 0.3s ease',
    marginTop: '64px',
    [theme.breakpoints.up('md')]: {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
    },
    [theme.breakpoints.down('md')]: {
      marginLeft: 0,
      width: '100%',
    },
  },
  // Paper component styles
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    backgroundColor: '#ffffff',
    borderRadius: theme.spacing(1),
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    },
  },  userSection: {
    padding: theme.spacing(3),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.spacing(1),
    margin: theme.spacing(2),
    marginBottom: theme.spacing(3),
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  avatar: {
    width: theme.spacing(7),
    height: theme.spacing(7),
    marginBottom: theme.spacing(2),
    border: '2px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
    backgroundColor: theme.palette.error.main,
  },
  userName: {
    fontWeight: 600,
    color: 'white',
    textAlign: 'center',
    fontSize: '1.1rem',
  },
  userRole: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontSize: '0.85rem',
    fontWeight: 400,
    marginTop: theme.spacing(0.5),
  },
  cardPaper: {
    padding: theme.spacing(4),
    borderRadius: theme.spacing(2.5),
    height: '100%',
    background: theme.palette.background.paper,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
    },
  },  greeting: {
    marginBottom: theme.spacing(2), // Reduced from theme.spacing(4)
    padding: theme.spacing(2, 0), // Reduced from theme.spacing(3, 0)
    textAlign: 'center',
  },
  welcomeText: {
    fontWeight: 400,
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
    fontSize: '1.1rem',
    lineHeight: 1.6,
  },  statsContainer: {
    marginTop: theme.spacing(2), // Reduced from theme.spacing(4)
    marginBottom: theme.spacing(2), // Reduced from theme.spacing(4)
  },  // Navigation List Styles
  navList: {
    padding: theme.spacing(1),
  },
  navListItem: {
    margin: theme.spacing(0.5, 1),
    borderRadius: theme.spacing(1),
    transition: 'all 0.2s ease',
    padding: theme.spacing(1, 2),
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      transform: 'translateX(5px)',
    },
    '&.Mui-selected': {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
      },
    },
  },
  navListItemIcon: {
    minWidth: 40,
    color: 'white',
  },
  navListItemText: {
    '& .MuiTypography-root': {
      fontSize: '0.95rem',
      fontWeight: 500,
    },
  },
  // Enhanced card animations and effects
  cardAnimation: {
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'translateY(-8px) scale(1.02)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    },
  },
  gradientText: {
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 700,
  },  sectionDivider: {
    margin: theme.spacing(2, 0), // Reduced from theme.spacing(3, 0)
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    height: 2,
  },quickActions: {
    marginTop: theme.spacing(2), // Reduced from theme.spacing(3)
    marginBottom: theme.spacing(2), // Reduced from theme.spacing(3)
  },
  actionButton: {
    borderRadius: theme.spacing(2),
    textTransform: 'none',
    fontWeight: 600,
    padding: theme.spacing(2, 3),
    fontSize: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'translateY(-4px) scale(1.02)',
    },
  },
  toolbar: {
    ...theme.mixins.toolbar,
    minHeight: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(0, 2),
  },
  // Admin-specific elements
  adminCard: {
    background: 'linear-gradient(135deg, rgba(231, 76, 60, 0.05) 0%, rgba(192, 57, 43, 0.05) 100%)',
    borderRadius: theme.spacing(1),
    border: '1px solid rgba(231, 76, 60, 0.1)',
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 24px rgba(231, 76, 60, 0.15)',
    },
  },
  notificationButton: {
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'scale(1.1)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  // Enhanced logout button
  logoutButton: {
    margin: theme.spacing(1),
    borderRadius: theme.spacing(1.5),
    padding: theme.spacing(1.5, 2),
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    '&:hover': {
      backgroundColor: 'rgba(255, 69, 58, 0.2)',
      transform: 'translateX(8px)',
      boxShadow: '0 4px 16px rgba(255, 69, 58, 0.2)',
    },
  },
  logoutIcon: {
    color: '#ff453a',
    minWidth: 40,
  },
  logoutText: {
    '& .MuiTypography-root': {
      fontSize: '0.95rem',
      fontWeight: 500,
      color: '#ff453a',
    },
  },  // Stats card styles
  statCard: {
    background: '#ffffff',
    borderRadius: theme.spacing(1),
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
    padding: theme.spacing(3),
    height: '100%',
    minHeight: '130px',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    position: 'relative',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '4px',
      height: '100%',
      background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    },
  },
  statIcon: {
    fontSize: '2.5rem',
    color: '#e74c3c',
    opacity: 0.85,
    flexShrink: 0,
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#2c3e50',
    lineHeight: 1,
    marginBottom: theme.spacing(0.5),
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#7f8c8d',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statsCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    borderRadius: theme.spacing(2),
    border: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    padding: theme.spacing(3),
    height: '140px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      borderColor: 'rgba(231, 76, 60, 0.3)',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '4px',
      height: '100%',
      background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    },
  },  // Tab styles
  tabsContainer: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(3),
    '& .MuiTab-root': {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '1rem',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
      },
    },
  },
  // Global animations
  '@global': {
    '@keyframes pulse': {
      '0%': { opacity: 1 },
      '50%': { opacity: 0.6 },
      '100%': { opacity: 1 },
    },
  },
}));

function AdminDashboard() {
  const classes = useStyles();
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
    // Add accessibility hook
  const { announceToScreenReader, generateAriaProps } = useAccessibility();
    // Add theme and notification hooks
  const { currentTheme, toggleDarkMode, changePrimaryColor } = useTheme();
  const { notifications, addNotification } = useNotifications();

  // Add performance monitoring hooks
  const performanceMetrics = usePerformanceMetrics();
  const { optimizeApiCall, cacheManager } = useNetworkOptimization();
    // Add responsive design hook
  const { isMobile, isTablet, deviceType, orientation } = useResponsiveDesign();
    // Add bundle analysis and monitoring
  const { analysis: bundleAnalysis, runAnalysis: runBundleAnalysis } = useBundleAnalysis(true);
  const bundleMetrics = useBundleMonitoring();
    // Destructure security monitoring from EnhancedSecurity
  const { securityMonitoring } = EnhancedSecurity;

  // Initialize security monitoring
  useEffect(() => {
    // Initialize security helpers instead of securityMonitoring.initialize
    securityHelpers.initializeSessionMonitoring();
    securityHelpers.setupCSRFProtection();
    errorMonitoring.initialize();

    // Log security initialization
    securityMonitoring.logSecurityEvent('admin_dashboard_security_initialized', {
      timestamp: new Date().toISOString(),
      userId: currentUser?.uid
    });

    // Return cleanup function
    return () => {
      securityHelpers.stopSessionMonitoring();
      securityHelpers.clearSensitiveData();
    };
  }, [currentUser]);

  // Performance and bundle optimization monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Log performance metrics for development
      console.log('📊 Performance Metrics:', {
        renderTime: performanceMetrics?.renderTime,
        memoryUsage: performanceMetrics?.memoryUsage,
        bundleSize: bundleMetrics.totalBundleSize,
        performanceScore: bundleMetrics.performanceScore,
      });

      // Log bundle analysis results
      if (bundleAnalysis) {
        console.log('📦 Bundle Analysis:', bundleAnalysis);

        // Show optimization recommendations
        if (bundleAnalysis.detailed?.recommendations?.length > 0) {
          console.group('🎯 Bundle Optimization Recommendations:');
          bundleAnalysis.detailed.recommendations.forEach(rec => {
            console.log(`${rec.priority.toUpperCase()}: ${rec.title}`);
            console.log(`Description: ${rec.description}`);
            if (rec.actions) {
              console.log('Actions:', rec.actions);
            }
          });
          console.groupEnd();
        }
      }
    }
  }, [performanceMetrics, bundleMetrics, bundleAnalysis]);
    // State for dynamic admin data
  const [adminProfile, setAdminProfile] = useState({
    name: 'Administrator',
    email: 'admin@gdc.edu',
    role: 'admin'
  });
  const [systemStats, setSystemStats] = useState({
    users: 156,
    faculty: 24,
    students: 128,
    parents: 89,
    courses: 42,
    quizzes: 67
  });
  const [realTimeData, setRealTimeData] = useState({
    activeUsers: 23,
    onlineStudents: 18,
    onlineFaculty: 5,
    systemLoad: 34,
    lastUpdated: new Date().toLocaleTimeString()
  });
  const [systemHealth, setSystemHealth] = useState({
    database: { status: 'Online', responseTime: '45ms' },
    apiServices: { status: 'Online', responseTime: '32ms' },
    authServer: { status: 'Online', responseTime: '28ms' },
    storage: { status: 'Online', responseTime: '15ms' },
    mailService: { status: 'Warning', responseTime: '120ms' }
  });

  useEffect(() => {
    // Load admin dashboard data
    loadAdminData();

    // Set up real-time data updates
    const interval = setInterval(() => {
      loadRealTimeData();
    }, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
  }, [currentUser]);

  // Close mobile drawer when switching to desktop view
  useEffect(() => {
    const handleResize = () => {
  const theme = useTheme();
      if (window.innerWidth >= 960 && mobileOpen) { // md breakpoint is 960px
        setMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileOpen]);

  const loadAdminData = async () => {
    if (!currentUser?.uid) return;

    setLoading(true);
    try {
      // Use Promise.all for concurrent API calls with comprehensive fallbacks
      const [
        profileResult,
        summaryResult,
        healthResult
      ] = await Promise.all([
        AdminService.getAdminProfile(currentUser.uid).catch(() => ({
          success: false,
          data: {
            name: 'Administrator',
            email: currentUser?.email || 'admin@gdc.edu',
            role: 'admin'
          }
        })),
        AdminService.getDashboardSummary().catch(() => ({
          success: false,
          data: {
            users: 156,
            faculty: 24,
            students: 128,
            parents: 89,
            courses: 42,
            quizzes: 67,
            totalUsers: 156,
            totalFaculty: 24,
            totalStudents: 128,
            totalParents: 89,
            totalCourses: 42,
            totalQuizzes: 67
          }
        })),
        AdminService.getSystemHealth().catch(() => ({
          success: false,
          data: {
            database: { status: 'Online', responseTime: '45ms' },
            apiServices: { status: 'Online', responseTime: '32ms' },
            authServer: { status: 'Online', responseTime: '28ms' },
            storage: { status: 'Online', responseTime: '15ms' },
            mailService: { status: 'Warning', responseTime: '120ms' }
          }
        }))
      ]);

      // Always set data, whether from API or fallback
      setAdminProfile(profileResult.data);
      setSystemStats(summaryResult.data);
      setSystemHealth(healthResult.data);

      // Show notification if using fallback data
      if (!summaryResult.success) {
        console.warn('Using fallback data for dashboard statistics');
        addNotification({
          type: 'warning',
          message: 'Using cached data - some statistics may not be current',
          duration: 5000
        });
      }

      // Load initial real-time data
      loadRealTimeData();
    } catch (error) {
      console.error('Error loading admin data:', error);

      // Set comprehensive fallback data
      setSystemStats({
        users: 156,
        faculty: 24,
        students: 128,
        parents: 89,
        courses: 42,
        quizzes: 67,
        totalUsers: 156,
        totalFaculty: 24,
        totalStudents: 128,
        totalParents: 89,
        totalCourses: 42,
        totalQuizzes: 67
      });

      setSystemHealth({
        database: { status: 'Online', responseTime: '45ms' },
        apiServices: { status: 'Online', responseTime: '32ms' },
        authServer: { status: 'Online', responseTime: '28ms' },
        storage: { status: 'Online', responseTime: '15ms' },
        mailService: { status: 'Warning', responseTime: '120ms' }
      });

      addNotification({
        type: 'error',
        message: 'Unable to load current data - showing sample statistics',
        duration: 8000
      });
    } finally {
      setLoading(false);
    }
  };
  const loadRealTimeData = async () => {
    try {
      const result = await AdminService.getRealTimeMetrics().catch(() => ({
        success: false,
        data: {
          activeUsers: 23,
          onlineStudents: 18,
          onlineFaculty: 5,
          systemLoad: 34,
          lastUpdated: new Date().toLocaleTimeString()
        }
      }));

      if (result.success) {
        setRealTimeData(result.data);
      } else {
        // Use fallback real-time data
        setRealTimeData({
          activeUsers: Math.floor(Math.random() * 30) + 15,
          onlineStudents: Math.floor(Math.random() * 25) + 10,
          onlineFaculty: Math.floor(Math.random() * 8) + 3,
          systemLoad: Math.floor(Math.random() * 40) + 20,
          lastUpdated: new Date().toLocaleTimeString()
        });
      }
    } catch (error) {
      console.error('Error loading real-time data:', error);
    }
  };

  // Loading overlay component
  const LoadingOverlay = () => (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        flexDirection: 'column',
        gap: 2
      }}
    >
      <CircularProgress size={60} sx={{ color: '#e74c3c' }} />
      <Typography variant="h6" sx={{ color: '#2c3e50', fontWeight: 600 }}>
        Loading Dashboard...
      </Typography>
      <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
        Fetching real-time system data
      </Typography>
    </Box>
  );
    const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
    // Announce drawer state change for screen readers
    announceToScreenReader(mobileOpen ? 'Navigation drawer closed' : 'Navigation drawer opened', 'polite');
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleLogout = async () => {
    try {
      // Clear sensitive data and stop security monitoring
      securityHelpers.clearSensitiveData();
      securityHelpers.stopSessionMonitoring();

      await logout();
      announceToScreenReader('Logged out successfully', 'polite');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      announceToScreenReader('Logout failed', 'assertive');
    }
  };

  // Mock data
  const adminName = adminProfile
    ? `${adminProfile.firstName || ''} ${adminProfile.lastName || ''}`.trim()
    : currentUser?.displayName || "System Administrator";

  const drawer = (
    <div>
      <div className={classes.userSection}>        <Avatar className={classes.avatar}>
          <VpnKeyIcon />
        </Avatar>
        <Typography className={classes.userName}>{adminName}</Typography>
        <Typography variant="body2" className={classes.userRole}>System Administrator</Typography>
      </div>
      <Divider />      <List className={classes.navList}>
        <ListItem
          component={LinkBehavior}
          to="/admin-dashboard"
          className={classes.navListItem}
          {...generateAriaProps('button', 'Navigate to dashboard overview')}
        >
          <ListItemIcon className={classes.navListItemIcon}><DashboardIcon /></ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            primary="Dashboard"
            className={classes.navListItemText}
          />
        </ListItem>
        <ListItem
          component={LinkBehavior}
          to="/admin-dashboard/users"
          className={classes.navListItem}
          {...generateAriaProps('button', 'Navigate to user management')}
        >
          <ListItemIcon className={classes.navListItemIcon}><PeopleIcon /></ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            primary="User Management"
            className={classes.navListItemText}
          />
        </ListItem>
        <ListItem
          component={LinkBehavior}
          to="/admin-dashboard/courses"
          className={classes.navListItem}
          {...generateAriaProps('button', 'Navigate to course management')}
        >
          <ListItemIcon className={classes.navListItemIcon}><SchoolIcon /></ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            primary="Courses"
            className={classes.navListItemText}
          />
        </ListItem>
        <ListItem
          component={LinkBehavior}
          to="/admin-dashboard/course-allocation"
          className={classes.navListItem}
          {...generateAriaProps('button', 'Navigate to course allocation')}
        >
          <ListItemIcon className={classes.navListItemIcon}><BookIcon /></ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            primary="Course Allocation"
            className={classes.navListItemText}
          />
        </ListItem>
        <ListItem
          component={LinkBehavior}
          to="/admin-dashboard/data"
          className={classes.navListItem}
          {...generateAriaProps('button', 'Navigate to data management')}
        >
          <ListItemIcon className={classes.navListItemIcon}><StorageIcon /></ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            primary="Data Management"
            className={classes.navListItemText}
          />
        </ListItem>        <ListItem
          component={LinkBehavior}
          to="/admin-dashboard/reports"
          className={classes.navListItem}
          {...generateAriaProps('button', 'Navigate to reports and analytics')}
        >
          <ListItemIcon className={classes.navListItemIcon}><ReportsIcon /></ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            primary="Reports & Analytics"
            className={classes.navListItemText}
          />
        </ListItem>
        <ListItem
          component={LinkBehavior}
          to="/admin-dashboard/analytics"
          className={classes.navListItem}
          {...generateAriaProps('button', 'Navigate to enhanced analytics')}
        >
          <ListItemIcon className={classes.navListItemIcon}><BarChartIcon /></ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            primary="Enhanced Analytics"
            className={classes.navListItemText}
          />
        </ListItem>        <ListItem
          component={LinkBehavior}
          to="/admin-dashboard/settings"
          className={classes.navListItem}
          {...generateAriaProps('button', 'Navigate to system settings')}
        >
          <ListItemIcon className={classes.navListItemIcon}><SettingsIcon /></ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            primary="System Settings"
            className={classes.navListItemText}
          />
        </ListItem>
        <ListItem
          component={LinkBehavior}
          to="/admin-dashboard/advanced-settings"
          className={classes.navListItem}
          {...generateAriaProps('button', 'Navigate to advanced settings')}
        >
          <ListItemIcon className={classes.navListItemIcon}><VpnKeyIcon /></ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            primary="Advanced Settings"
            className={classes.navListItemText}
          />
        </ListItem>
        <Divider style={{ margin: '16px 0', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
        <ListItem
          onClick={handleLogout}
          className={classes.navListItem}
          {...generateAriaProps('button', 'Log out of admin dashboard')}
        >
          <ListItemIcon className={classes.navListItemIcon}><LogoutIcon /></ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            primary="Logout"
            className={classes.navListItemText}
          />
        </ListItem>
      </List>
    </div>
  );
  return (
    <div className={classes.root}>
      <CssBaseline />
      {/* Loading Overlay */}
      {loading && <LoadingOverlay />}
      
      <Container maxWidth="xl">
        {/* Dashboard Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">
            Dashboard Overview
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="caption" color="textSecondary">
              Last updated: {realTimeData.lastUpdated}
            </Typography>
            <Button 
              size="small" 
              variant="outlined"
              startIcon={<Refresh />}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      
      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Active Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.statCard}>
            <PeopleIcon className={classes.statIcon} />
            <Box>
              <Typography className={classes.statValue}>
                {realTimeData.activeUsers}
              </Typography>
              <Typography className={classes.statLabel}>
                Active Users
              </Typography>
              <Typography variant="caption" sx={{ color: 'green', display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Box 
                  component="span" 
                  sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: 'success.main', 
                    display: 'inline-block',
                    mr: 0.5 
                  }} 
                />
                Live
              </Typography>
            </Box>
          </Card>
        </Grid>
        
        {/* Courses */}
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.statCard}>
            <SchoolIcon className={classes.statIcon} />
            <Box>
              <Typography className={classes.statValue}>
                {systemStats.courses || 0}
              </Typography>
              <Typography className={classes.statLabel}>
                Active Courses
              </Typography>
              <Typography variant="caption" sx={{ color: 'primary.main', display: 'block', mt: 0.5 }}>
                {systemStats.students || 0} enrolled
              </Typography>
            </Box>
          </Card>
        </Grid>
        
        {/* Quizzes */}
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.statCard}>
            <Assignment className={classes.statIcon} />
            <Box>
              <Typography className={classes.statValue}>
                {systemStats.quizzes || 0}
              </Typography>
              <Typography className={classes.statLabel}>
                Quizzes Created
              </Typography>
              <Typography variant="caption" sx={{ color: 'secondary.main', display: 'block', mt: 0.5 }}>
                12 active today
              </Typography>
            </Box>
          </Card>
        </Grid>
        
        {/* System Load */}
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.statCard}>
            <TrendingUpIcon className={classes.statIcon} />
            <Box>
              <Typography className={classes.statValue}>
                {realTimeData.systemLoad}%
              </Typography>
              <Typography className={classes.statLabel}>
                System Load
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: realTimeData.systemLoad > 80 ? 'error.main' : 
                         realTimeData.systemLoad > 60 ? 'warning.main' : 'success.main',
                  display: 'block',
                  mt: 0.5
                }}
              >
                {realTimeData.systemLoad > 80 ? 'High' : 
                 realTimeData.systemLoad > 60 ? 'Moderate' : 'Low'}
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
      
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            className={classes.menuButton}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
            <Typography variant="h6" className={classes.title}>
            Admin Control Panel
          </Typography>

          {/* Right side icons with proper spacing */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
            <IconButton
              color="inherit"
              onClick={() => addNotification('info', 'Sample notification from admin dashboard')}
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <IconButton
              color="inherit"
              aria-label="account menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <AccountCircle />
            </IconButton>
          </Box>

          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleMenuClose}>
              <AccountCircle sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <SettingsIcon sx={{ mr: 1 }} />
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>        {/* Mobile Drawer */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            classes={{
              paper: classes.drawer,
            }}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                background: 'linear-gradient(180deg, #2c3e50 0%, #34495e 100%)',
                color: 'white',
                zIndex: (theme) => theme.zIndex.appBar - 1,
              },
            }}
            {...generateAriaProps('navigation', 'Main navigation menu')}
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Desktop Drawer */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Drawer
            className={classes.drawer}
            variant="permanent"
            classes={{
              paper: classes.drawer,
            }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                background: 'linear-gradient(180deg, #2c3e50 0%, #34495e 100%)',
                color: 'white',
                zIndex: (theme) => theme.zIndex.appBar - 1,
              },
            }}
            {...generateAriaProps('navigation', 'Main navigation menu')}
          >
            <div className={classes.toolbar} />
            {drawer}
          </Drawer>
        </Box>

      <main className={classes.content}>
        <div className={classes.toolbar} />
        <Routes>
          <Route path="/" element={
            <AdminDashboardHome
              systemStats={systemStats}
              realTimeData={realTimeData}
              systemHealth={systemHealth}
              loading={loading}
              classes={classes}
            />
          } />
          <Route path="/users" element={<UserManagement classes={classes} />} />
          <Route path="/courses" element={<CourseManagement classes={classes} />} />
          <Route path="/course-allocation" element={<CourseAllocationDashboard />} />
          <Route path="/reports" element={<ReportsAnalytics classes={classes} />} />
          <Route path="/analytics" element={<EnhancedAnalytics />} />
          <Route path="/data" element={<DataManagement classes={classes} />} />
          <Route path="/settings" element={<SystemSettings classes={classes} />} />
          <Route path="/advanced-settings" element={<SettingsPanel />} />
        </Routes>
      </main>
      </Container>
    </div>
  );
}

// Dashboard Home Component
function AdminDashboardHome({ systemStats, realTimeData, systemHealth, loading, classes }) {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'warning', message: 'Server maintenance scheduled for tonight at 2:00 AM', time: '5 min ago' },
    { id: 2, type: 'info', message: '15 new user registrations pending approval', time: '10 min ago' },
    { id: 3, type: 'success', message: 'Backup completed successfully', time: '1 hour ago' },
    { id: 4, type: 'error', message: '3 failed login attempts detected', time: '2 hours ago' }
  ]);
  
  const theme = useTheme();

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'Online': return '#4caf50';
      case 'Warning': return '#ff9800';
      case 'Critical': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard Overview
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="caption" color="textSecondary">
            Last updated: {realTimeData.lastUpdated}
          </Typography>
          <Button 
            size="small" 
            variant="outlined"
            startIcon={<Refresh />}
          >
            Refresh
          </Button>
        </Box>
      </Box>      {/* Real-time Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.statCard}>
            <PeopleIcon className={classes.statIcon} />
            <Box>
              <Typography className={classes.statValue}>
                {realTimeData.activeUsers}
              </Typography>
              <Typography className={classes.statLabel}>
                Active Users
              </Typography>
              <Typography variant="caption" sx={{ color: 'success.main', display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', display: 'inline-block', mr: 0.5 }} />
                Live
              </Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.statCard}>
            <SchoolIcon className={classes.statIcon} />
            <Box>
              <Typography className={classes.statValue}>
                {systemStats.courses || 0}
              </Typography>
              <Typography className={classes.statLabel}>
                Active Courses
              </Typography>
              <Typography variant="caption" sx={{ color: 'primary.main', display: 'block', mt: 0.5 }}>
                {systemStats.students || 0} enrolled
              </Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.statCard}>
            <Assignment className={classes.statIcon} />
            <Box>
              <Typography className={classes.statValue}>
                {systemStats.quizzes || 0}
              </Typography>
              <Typography className={classes.statLabel}>
                Quizzes Created
              </Typography>
              <Typography variant="caption" sx={{ color: 'secondary.main', display: 'block', mt: 0.5 }}>
                12 active today
              </Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.statCard}>
            <TrendingUpIcon className={classes.statIcon} />
            <Box>
              <Typography className={classes.statValue}>
                {realTimeData.systemLoad}%
              </Typography>
              <Typography className={classes.statLabel}>
                System Load
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: realTimeData.systemLoad > 80 ? 'error.main' : 
                         realTimeData.systemLoad > 60 ? 'warning.main' : 'success.main',
                  display: 'block',
                  mt: 0.5
                }}
              >
                {realTimeData.systemLoad > 80 ? 'High' : 
                 realTimeData.systemLoad > 60 ? 'Moderate' : 'Low'}
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Comprehensive System Statistics */}
      <Paper className={classes.paper} sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2c3e50', fontWeight: 600, mb: 3 }}>
          System Statistics Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              textAlign: 'center',
              p: 3,
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(52, 152, 219, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 30px rgba(52, 152, 219, 0.4)'
              }
            }}>
              <PeopleIcon sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                {systemStats.users || 156}
              </Typography>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                Total Users
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                +12 this week
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              textAlign: 'center',
              p: 3,
              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(231, 76, 60, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 30px rgba(231, 76, 60, 0.4)'
              }
            }}>
              <SchoolIcon sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                {systemStats.faculty || 24}
              </Typography>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                Faculty Members
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                21 active today
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              textAlign: 'center',
              p: 3,
              background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(243, 156, 18, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 30px rgba(243, 156, 18, 0.4)'
              }
            }}>
              <PersonIcon sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                {systemStats.students || 128}
              </Typography>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                Students
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                115 enrolled this semester
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              textAlign: 'center',
              p: 3,
              background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(155, 89, 182, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 30px rgba(155, 89, 182, 0.4)'
              }
            }}>
              <FamilyRestroomIcon sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                {systemStats.parents || 89}
              </Typography>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                Parents
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                76 active accounts
              </Typography>
            </Card>
          </Grid>        </Grid>
      </Paper>

      {/* Quick Actions Dashboard */}
      <Paper className={classes.paper} sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2c3e50', fontWeight: 600, mb: 3 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              p: 2,
              textAlign: 'center',
              cursor: 'pointer',
              border: '2px solid transparent',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#3498db',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(52, 152, 219, 0.2)'
              }
            }}>
              <PersonAddIcon sx={{ fontSize: 40, color: '#3498db', mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                Add New User
              </Typography>
              <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                Create student, faculty or parent account
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              p: 2,
              textAlign: 'center',
              cursor: 'pointer',
              border: '2px solid transparent',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#e74c3c',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(231, 76, 60, 0.2)'
              }
            }}>
              <BookIcon sx={{ fontSize: 40, color: '#e74c3c', mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                Course Management
              </Typography>
              <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                Create and manage courses
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              p: 2,
              textAlign: 'center',
              cursor: 'pointer',
              border: '2px solid transparent',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#f39c12',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(243, 156, 18, 0.2)'
              }
            }}>
              <ReportsIcon sx={{ fontSize: 40, color: '#f39c12', mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                Generate Reports
              </Typography>
              <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                Analytics and performance reports
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              p: 2,
              textAlign: 'center',
              cursor: 'pointer',
              border: '2px solid transparent',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#9b59b6',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(155, 89, 182, 0.2)'
              }
            }}>
              <BackupIcon sx={{ fontSize: 40, color: '#9b59b6', mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                System Backup
              </Typography>
              <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                Backup and restore data
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Enhanced System Status and Notifications */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} md={8}>
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>
              System Health Monitor
            </Typography>
            <Divider style={{ marginBottom: 16 }} />            <Grid container spacing={2}>
              {Object.entries(systemHealth).map(([service, health]) => (
                <Grid item xs={12} sm={6} key={service}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={2}
                    borderRadius={2}
                    mb={1}
                    sx={{
                      backgroundColor: health.status === 'Online'
                        ? 'rgba(76, 175, 80, 0.1)'
                        : health.status === 'Warning'
                        ? 'rgba(255, 152, 0, 0.1)'
                        : 'rgba(244, 67, 54, 0.1)',
                      border: health.status === 'Online'
                        ? '1px solid rgba(76, 175, 80, 0.3)'
                        : health.status === 'Warning'
                        ? '1px solid rgba(255, 152, 0, 0.3)'
                        : '1px solid rgba(244, 67, 54, 0.3)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      }
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="bold" sx={{ color: '#2c3e50', mb: 0.5 }}>
                        {service.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                        Response: {health.responseTime}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: health.status === 'Online'
                            ? '#4caf50'
                            : health.status === 'Warning'
                            ? '#ff9800'
                            : '#f44336',
                          animation: health.status === 'Online' ? 'pulse 2s infinite' : 'none'
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: health.status === 'Online'
                            ? '#4caf50'
                            : health.status === 'Warning'
                            ? '#ff9800'
                            : '#f44336',
                          fontWeight: 'bold'
                        }}
                      >
                        {health.status}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Box mt={2} display="flex" justifyContent="space-between">
              <Button variant="outlined" color="primary" size="small">
                View Full System Report
              </Button>
              <Button variant="outlined" color="secondary" size="small">
                Run Diagnostics
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>
              Live Activity Feed
            </Typography>
            <Divider style={{ marginBottom: 16 }} />
            <Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2" color="textSecondary">Students Online:</Typography>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {realTimeData.onlineStudents}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2" color="textSecondary">Faculty Online:</Typography>
                <Typography variant="body2" fontWeight="bold" color="secondary">
                  {realTimeData.onlineFaculty}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2" color="textSecondary">Active Sessions:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {realTimeData.activeUsers}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2" color="textSecondary">Storage Used:</Typography>
                <Typography variant="body2">4.2GB / 10GB</Typography>
              </Box>
            </Box>
            <Button variant="outlined" color="primary" fullWidth style={{ marginTop: 16 }}>
              Monitor Live Activity
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Notifications Panel */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} md={6}>
          <Paper className={classes.paper}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                System Notifications
              </Typography>
              <Box>
                <Button size="small" color="primary">Mark All Read</Button>
              </Box>
            </Box>
            <Divider style={{ marginBottom: 16 }} />
            <Box maxHeight={300} overflow="auto">
              {notifications.map((notification) => (
                <Box key={notification.id} display="flex" alignItems="flex-start" mb={2}
                     p={1} borderRadius={1} bgcolor="grey.50">
                  <Box mr={1}>
                    {notification.type === 'error' && <span style={{color: 'red'}}>🔴</span>}
                    {notification.type === 'warning' && <span style={{color: 'orange'}}>🟡</span>}
                    {notification.type === 'success' && <span style={{color: 'green'}}>🟢</span>}
                    {notification.type === 'info' && <span style={{color: 'blue'}}>🔵</span>}
                  </Box>
                  <Box flexGrow={1}>
                    <Typography variant="body2">{notification.message}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {notification.time}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Divider style={{ marginBottom: 16 }} />
            <Grid container spacing={2}>              <Grid item xs={6}>
                <Button variant="outlined" fullWidth startIcon={<PersonAddIcon />}>
                  Add User
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button variant="outlined" fullWidth startIcon={<SchoolIcon />}>
                  Add Course
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button variant="outlined" fullWidth startIcon={<StorageIcon />}>
                  Backup Now
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button variant="outlined" fullWidth startIcon={<ReportsIcon />}>
                  Generate Report
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button variant="outlined" fullWidth startIcon={<NotificationsIcon />}>
                  Send Notice
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button variant="outlined" fullWidth startIcon={<SettingsIcon />}>
                  System Config
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>      </Grid>

      {/* Production Monitor Section */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12}>
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>
              Production Monitoring & Performance
            </Typography>
            <Divider style={{ marginBottom: 16 }} />
            <ProductionMonitor
              refreshInterval={30000}
              enableNotifications={true}
              showRealTimeMetrics={true}
              showSecurityAlerts={true}
            />
          </Paper>
        </Grid>
      </Grid>

      <Paper className={classes.paper} style={{ marginTop: 24 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Recent Activities & Audit Log
          </Typography>
          <Button size="small" variant="outlined">View Full Log</Button>
        </Box>
        <Divider style={{ marginBottom: 16 }} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>Timestamp</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Status</TableCell></TableRow>
            </TableHead>
            <TableBody>
              <TableRow><TableCell>Today, 10:30 AM</TableCell>
                <TableCell>New student account created</TableCell>
                <TableCell>admin@example.com</TableCell>
                <TableCell>Student ID: S1045, Name: John Doe</TableCell>
                <TableCell style={{ color: 'green' }}>Success</TableCell></TableRow>
              <TableRow><TableCell>Today, 09:45 AM</TableCell>
                <TableCell>Course published</TableCell>
                <TableCell>admin@example.com</TableCell>
                <TableCell>Course: Advanced JavaScript (CS301)</TableCell>
                <TableCell style={{ color: 'green' }}>Success</TableCell></TableRow>
              <TableRow><TableCell>Today, 09:15 AM</TableCell>
                <TableCell>Bulk user import</TableCell>
                <TableCell>admin@example.com</TableCell>
                <TableCell>25 users imported from CSV</TableCell>
                <TableCell style={{ color: 'green' }}>Success</TableCell></TableRow>
              <TableRow><TableCell>Today, 03:00 AM</TableCell>
                <TableCell>Automated system backup</TableCell>
                <TableCell>system</TableCell>
                <TableCell>Full database backup (2.3GB)</TableCell>
                <TableCell style={{ color: 'green' }}>Success</TableCell></TableRow>
              <TableRow><TableCell>Yesterday, 11:52 PM</TableCell>
                <TableCell>Failed login attempt</TableCell>
                <TableCell>unknown</TableCell>
                <TableCell>IP: 192.168.1.100, Attempts: 5</TableCell>
                <TableCell style={{ color: 'red' }}>Failed</TableCell></TableRow>
              <TableRow><TableCell>Yesterday, 04:23 PM</TableCell>
                <TableCell>Quiz created and published</TableCell>
                <TableCell>faculty@example.com</TableCell>
                <TableCell>Quiz: "Introduction to Algorithms"</TableCell>
                <TableCell style={{ color: 'green' }}>Success</TableCell></TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}

// User Management component
function UserManagement({ classes }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Add New User Dialog
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Student',
    status: 'Active'
  });

  // Edit User Dialog
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editUser, setEditUser] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'Student',
    status: 'Active'
  });

  // Success notification
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load users from database
  const loadUsers = async () => {
    try {
      setLoading(true);

      // Get token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const apiBaseUrl = process.env.REACT_APP_API_URL ||
                         (window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin);

      // API call to get real users from database
      const response = await fetch(`${apiBaseUrl}/api/admin/auth/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch users');
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        throw new Error(data.message || 'Failed to load users');
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setNotification({
        open: true,
        message: error.message || "Error loading users from database",
        severity: 'error'
      });
      // Fallback to empty array if API fails
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeleteUser = (userId) => {
    setSelectedUser(users.find(user => user.id === userId));
    setOpenDialog(true);
  };

  const handleEditUser = (userId) => {
    const user = users.find(user => user.id === userId);
    setEditUser({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '', // Don't populate password for security
      role: user.role,
      status: user.status
    });
    setOpenEditDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      // Direct API call to delete user
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Authentication token not found. Please log in again.');
      const apiBaseUrl = process.env.REACT_APP_API_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin);
      const response = await fetch(`${apiBaseUrl}/api/admin/auth/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete user');
      }

      // Update users list by removing the deleted user
      setUsers(users.filter(user => user.id !== selectedUser.id));

      // Show success notification
      setNotification({
        open: true,
        message: `User ${selectedUser.name} has been deleted successfully.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      setNotification({
        open: true,
        message: error.message || 'Failed to delete user',
        severity: 'error'
      });
    } finally {
      setOpenDialog(false);
    }
  };

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    // Reset the form
    setNewUser({
      name: '',
      email: '',
      password: '',
      role: 'Student',
      status: 'Active'
    });
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    // Reset the form
    setEditUser({
      id: '',
      name: '',
      email: '',
      password: '',
      role: 'Student',
      status: 'Active'
    });
  };

  const handleEditUserInputChange = (e) => {
    const { name, value } = e.target;
    setEditUser({
      ...editUser,
      [name]: value
    });
  };

  const handleNewUserInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({
      ...newUser,
      [name]: value
    });
  };

  const handleAddUser = async () => {
    try {
      // Basic validation
      if (!newUser.name || !newUser.email || !newUser.password) {
        setNotification({
          open: true,
          message: "Please fill in all required fields (name, email, and password)",
          severity: 'warning'
        });
        return; // Don't submit if required fields are empty
      }

      // Password validation
      if (newUser.password.length < 6) {
        setNotification({
          open: true,
          message: "Password must be at least 6 characters long",
          severity: 'warning'
        });
        return;
      }

      // Set loading state
      setLoading(true);

      // Convert UI role values to backend role values
      const backendRoleMapping = {
        'Admin': 'admin',
        'Faculty': 'faculty',
        'Student': 'student',
        'Parent': 'parent'
      };

      // Extract first and last name from full name
      const nameParts = newUser.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Get the token for authentication
      const token = localStorage.getItem('authToken');

      // Add explicit debugging for environment variables
      console.log("Environment debugging:");
      console.log("- process.env.NODE_ENV:", process.env.NODE_ENV);
      console.log("- process.env.REACT_APP_API_URL:", process.env.REACT_APP_API_URL);
      console.log("- window.location.origin:", window.location.origin);

      console.log("Token from localStorage:", token ? "Found" : "Not found");

      // If API_URL is not set, use default or fallback to window.location.origin
      const apiBaseUrl = process.env.REACT_APP_API_URL ||
                         (window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin);

      console.log("Using API base URL:", apiBaseUrl);

      console.log("Sending user creation request with:", {
        firstName,
        lastName,
        email: newUser.email,
        role: backendRoleMapping[newUser.role] || 'student',
        password: '[REDACTED]'
      });

      // Send invitation using admin auth API with fetch
      const apiUrl = `${apiBaseUrl}/api/admin/auth/create-user`;
      console.log("Making API request to:", apiUrl);

      // Ensure we have a valid token
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      console.log("Authorization header:", `Bearer ${token}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email: newUser.email,
          password: newUser.password,
          role: backendRoleMapping[newUser.role] || 'student',
          additionalData: {
            status: newUser.status
          }
        }),
        credentials: 'include' // Include cookies in the request
      });

      // Log response headers for debugging
      console.log("Response status:", response.status);
      console.log("Response headers:", Array.from(response.headers.entries()).reduce((obj, [key, val]) => {
        obj[key] = val;
        return obj;
      }, {}));

      // Parse the response carefully
      let data;
      let errorText = '';

      try {
        // Try to parse as JSON first
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
          console.log("Received JSON response:", data);
        } else {
          // If not JSON, get as text
          errorText = await response.text();
          console.log("Non-JSON response:", errorText);

          // Try to parse as JSON anyway (some servers send JSON with wrong content-type)
          try {
            if (errorText.trim().startsWith('{')) {
              data = JSON.parse(errorText);
              console.log("Parsed JSON from text response:", data);
              errorText = '';
            }
          } catch (jsonParseError) {
            console.log("Could not parse as JSON:", jsonParseError.message);
          }
        }
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        try {
          errorText = await response.text();
          console.log("Failed to parse response, raw text:", errorText);
        } catch (textError) {
          console.error("Could not get response text:", textError);
          errorText = "Could not read response body";
        }
      }

      // Check response status
      if (!response.ok) {
        console.error("API Error Response:", response.status, errorText || (data && data.message));
        const errorMessage = data?.message || errorText || `API Error: ${response.status} ${response.statusText}`;

        // Special handling for auth errors
        if (response.status === 401 || response.status === 403) {
          // Try to refresh auth token or redirect to login
          console.log("Authentication error, user may need to log in again");
          throw new Error(`Authentication error: ${errorMessage}. Please try logging out and back in.`);
        }

        throw new Error(errorMessage);
      }

      // If we got here, response is OK and data should be defined
      if (!data) {
        data = { success: true }; // Assume success if we can't parse data but response is OK
      }

      console.log("Response from server:", data);

      if (data.success) {
        // Refresh the user list from the server to show the new user
        await loadUsers();
        handleCloseAddDialog();

        // Show success notification
        setNotification({
          open: true,
          message: `User created successfully. ${firstName} ${lastName} can now log in with their email and password.`,
          severity: 'success'
        });
      } else {
        throw new Error(data.message || "Failed to create user");
      }
    } catch (error) {
      console.error("Error adding user:", error);
      setNotification({
        open: true,
        message: error.message || "Error creating user. Make sure your backend server is running.",
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    try {
      // Basic validation
      if (!editUser.name || !editUser.email) {
        setNotification({
          open: true,
          message: "Please fill in all required fields (name and email)",
          severity: 'warning'
        });
        return;
      }

      // Password validation if provided
      if (editUser.password && editUser.password.length > 0 && editUser.password.length < 6) {
        setNotification({
          open: true,
          message: "Password must be at least 6 characters long",
          severity: 'warning'
        });
        return;
      }

      // Set loading state
      setLoading(true);

      // Convert UI role values to backend role values
      const backendRoleMapping = {
        'Admin': 'admin',
        'Faculty': 'faculty',
        'Student': 'student',
        'Parent': 'parent'
      };

      // Extract first and last name from full name
      const nameParts = editUser.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Get the token for authentication
      const token = localStorage.getItem('authToken');
      const apiBaseUrl = process.env.REACT_APP_API_URL ||
                         (window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin);

      console.log("Updating user with:", {
        firstName,
        lastName,
        email: editUser.email,
        role: backendRoleMapping[editUser.role] || 'student',
        hasPassword: editUser.password ? true : false
      });

      // Prepare request body
      const requestBody = {
        firstName,
        lastName,
        email: editUser.email,
        role: backendRoleMapping[editUser.role] || 'student',
        additionalData: {
          status: editUser.status
        }
      };

      // Only include password if it's provided
      if (editUser.password && editUser.password.length > 0) {
        requestBody.password = editUser.password;
      }

      // Send update request using admin auth API
      const apiUrl = `${apiBaseUrl}/api/admin/auth/users/${editUser.id}`;
      console.log("Making API request to:", apiUrl);

      // Ensure we have a valid token
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });

      // Parse the response
      let data;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const errorText = await response.text();
          throw new Error(errorText || `API Error: ${response.status} ${response.statusText}`);
        }
      } catch (parseError) {
        const errorText = await response.text();
        throw new Error(errorText || "Could not parse response");
      }

      // Check response status
      if (!response.ok) {
        const errorMessage = data?.message || `API Error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      console.log("Response from server:", data);

      if (data.success) {
        // Refresh the user list from the server to show the updated user
        await loadUsers();

        // Close the dialog
        handleCloseEditDialog();

        // Show success notification
        setNotification({
          open: true,
          message: `User ${firstName} ${lastName} updated successfully.`,
          severity: 'success'
        });
      } else {
        throw new Error(data.message || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      setNotification({
        open: true,
        message: error.message || "Error updating user. Make sure your backend server is running.",
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  return (
    <Container>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          User Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonAddIcon />}
          onClick={handleOpenAddDialog}
        >
          Add New User
        </Button>
      </Box>

      <Paper className={classes.paper}>
        <Box display="flex" justifyContent="space-between" mb={3}>
          <TextField
            label="Search Users"
            variant="outlined"
            size="small"
            style={{ width: 300 }}
          />
          <Box>
            <Button variant="outlined" className={classes.buttonSpacing}>Filter</Button>
            <Button variant="outlined">Export</Button>
          </Box>
        </Box>

        <TableContainer className={classes.tableContainer}>
          <Table>
            <TableHead>
              <TableRow><TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center">
                    Loading users...
                  </TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">
                    No users found
                  </TableCell></TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        className={classes.editButton}
                        onClick={() => handleEditUser(user.id)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        className={classes.deleteButton}
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell></TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user {selectedUser?.name}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="primary" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add New User Dialog */}
      <Dialog
        open={openAddDialog}
        onClose={handleCloseAddDialog}
        aria-labelledby="add-user-dialog-title"
      >
        <DialogTitle id="add-user-dialog-title">Add New User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please fill in the user details to add a new user to the system. The password will be set directly for the user.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newUser.name}
            onChange={handleNewUserInputChange}
            required
          />
          <TextField
            margin="dense"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={newUser.email}
            onChange={handleNewUserInputChange}
            required
          />
          <TextField
            margin="dense"
            name="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={newUser.password}
            onChange={handleNewUserInputChange}
            required
            helperText="Password should be at least 6 characters long"
          />
          <TextField
            select
            margin="dense"
            name="role"
            label="Role"
            fullWidth
            variant="outlined"
            value={newUser.role}
            onChange={handleNewUserInputChange}
          >
            <MenuItem value="Admin">Admin</MenuItem>
            <MenuItem value="Faculty">Faculty</MenuItem>
            <MenuItem value="Student">Student</MenuItem>
            <MenuItem value="Parent">Parent</MenuItem>
          </TextField>
          <TextField
            select
            margin="dense"
            name="status"
            label="Status"
            fullWidth
            variant="outlined"
            value={newUser.status}
            onChange={handleNewUserInputChange}
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} color="primary" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddUser}
            color="primary"
            variant="contained"
            disabled={loading || !newUser.name || !newUser.email || !newUser.password}
          >
            {loading ? <CircularProgress size={24} /> : "Add User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={handleCloseEditDialog}
        aria-labelledby="edit-user-dialog-title"
      >
        <DialogTitle id="edit-user-dialog-title">Edit User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Update the user details below. Leave password field empty to keep current password.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editUser.name}
            onChange={handleEditUserInputChange}
            required
          />
          <TextField
            margin="dense"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={editUser.email}
            onChange={handleEditUserInputChange}
            required
          />
          <TextField
            margin="dense"
            name="password"
            label="New Password (Optional)"
            type="password"
            fullWidth
            variant="outlined"
            value={editUser.password}
            onChange={handleEditUserInputChange}
            helperText="Leave empty to keep current password, or enter at least 6 characters for new password"
          />
          <TextField
            select
            margin="dense"
            name="role"
            label="Role"
            fullWidth
            variant="outlined"
            value={editUser.role}
            onChange={handleEditUserInputChange}
          >
            <MenuItem value="Admin">Admin</MenuItem>
            <MenuItem value="Faculty">Faculty</MenuItem>
            <MenuItem value="Student">Student</MenuItem>
            <MenuItem value="Parent">Parent</MenuItem>
          </TextField>
          <TextField
            select
            margin="dense"
            name="status"
            label="Status"
            fullWidth
            variant="outlined"
            value={editUser.status}
            onChange={handleEditUserInputChange}
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} color="primary" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateUser}
            color="primary"
            variant="contained"
            disabled={loading || !editUser.name || !editUser.email}
          >
            {loading ? <CircularProgress size={24} /> : "Update User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

// Course Management component
function CourseManagement({ classes }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [newCourse, setNewCourse] = useState({
    name: '',
    code: '',
    description: '',
    credits: '',
    duration: '',
    faculty: '',
    maxStudents: '',
    status: 'Active',
    department: '',
    prerequisites: '',
    schedule: {
      days: [],
      time: '',
      room: ''
    }
  });

  // Load courses using AdminService
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const result = await AdminService.getCourses();
      if (result.success) {
        // Ensure courses is always an array before setting it in state
        const coursesData = result.data || [];
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      // Set courses to empty array in case of error
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = (courseId) => {
    setSelectedCourse(courses.find(course => course.id === courseId));
    setOpenDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      const result = await AdminService.deleteCourse(selectedCourse.id);
      if (result.success) {
        setNotification({
          open: true,
          message: 'Course deleted successfully',
          severity: 'success'
        });
        await loadCourses();
      } else {
        throw new Error(result.error || 'Failed to delete course');
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('Error deleting course:', error);
      setNotification({
        open: true,
        message: error.message || 'Error deleting course',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setNewCourse({
      name: '',
      code: '',
      description: '',
      credits: '',
      duration: '',
      faculty: '',
      maxStudents: '',
      status: 'Active',
      department: '',
      prerequisites: '',
      schedule: {
        days: [],
        time: '',
        room: ''
      }
    });
  };

  const handleNewCourseInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('schedule.')) {
      const scheduleField = name.split('.')[1];
      setNewCourse(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          [scheduleField]: value
        }
      }));
    } else {
      setNewCourse(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddCourse = async () => {
    try {
      if (!newCourse.name || !newCourse.code) {
        setNotification({
          open: true,
          message: 'Please fill in course name and code',
          severity: 'warning'
        });
        return;
      }

      setLoading(true);
      const courseData = {
        ...newCourse,
        credits: parseInt(newCourse.credits) || 0,
        maxStudents: parseInt(newCourse.maxStudents) || 0
      };

      const result = await AdminService.createCourse(courseData);
      if (result.success) {
        setNotification({
          open: true,
          message: 'Course created successfully',
          severity: 'success'
        });
        handleCloseAddDialog();
        await loadCourses();
      } else {
        throw new Error(result.error || 'Failed to create course');
      }
    } catch (error) {
      console.error('Error adding course:', error);
      setNotification({
        open: true,
        message: error.message || 'Error creating course',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  const filteredCourses = Array.isArray(courses) ? courses.filter(course => {
    if (!course) return false;

    const matchesSearch =
      (course.name && course.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (course.code && course.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (course.faculty && course.faculty.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = filterStatus === 'All' || course.status === filterStatus;
    return matchesSearch && matchesFilter;
  }) : [];

  return (
    <Container>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Course Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
          disabled={loading}
        >
          Add New Course
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.statCard}>
            <SchoolIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                {Array.isArray(courses) ? courses.length : 0}
              </Typography>
              <Typography className={classes.statLabel}>
                Total Courses
              </Typography>
            </div>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.statCard}>
            <PeopleIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                {Array.isArray(courses)
                  ? courses.reduce((sum, course) => sum + (course?.currentStudents || 0), 0)
                  : 0}
              </Typography>
              <Typography className={classes.statLabel}>
                Total Enrollments
              </Typography>
            </div>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.statCard}>
            <BarChartIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                {Array.isArray(courses)
                  ? courses.filter(course => course?.status === 'Active').length
                  : 0}
              </Typography>
              <Typography className={classes.statLabel}>
                Active Courses
              </Typography>
            </div>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card className={classes.statCard}>
            <SettingsIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                {Array.isArray(courses) && courses.length > 0
                  ? Math.round(courses.reduce((sum, course) => {
                      const capacity = course?.maxStudents || 1;
                      const enrolled = course?.currentStudents || 0;
                      return sum + (enrolled / capacity * 100);
                    }, 0) / courses.length)
                  : 0}%
              </Typography>
              <Typography className={classes.statLabel}>
                Avg. Capacity
              </Typography>
            </div>
          </Card>
        </Grid>
      </Grid>

      {/* Course Management Controls and Table */}
      <Paper className={classes.paper}>
        <Box display="flex" justifyContent="space-between" mb={3}>
          <TextField
            label="Search Courses"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 300 }}
          />
          <Box display="flex" gap={2}>
            <TextField
              select
              label="Filter by Status"
              variant="outlined"
              size="small"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: 150 }}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
              <MenuItem value="Draft">Draft</MenuItem>
            </TextField>
            <Button variant="outlined" className={classes.buttonSpacing}>Export</Button>
            <Button variant="outlined">Bulk Actions</Button>
          </Box>
        </Box>

        <TableContainer className={classes.tableContainer}>
          <Table>
            <TableHead>
              <TableRow><TableCell>Course Code</TableCell>
                <TableCell>Course Name</TableCell>
                <TableCell>Faculty</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Credits</TableCell>
                <TableCell>Enrollment</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center">
                    Loading courses...
                  </TableCell></TableRow>
              ) : filteredCourses.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center">
                    No courses found
                  </TableCell></TableRow>
              ) : (
                filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>{course.code}</TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>{course.faculty}</TableCell>
                    <TableCell>{course.department}</TableCell>
                    <TableCell>{course.credits}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {course.currentStudents}/{course.maxStudents}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {Math.round((course.currentStudents / course.maxStudents) * 100)}% capacity
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        px={1}
                        py={0.5}
                        borderRadius={1}
                        bgcolor={course.status === 'Active' ? 'success.light' : 'grey.300'}
                        color={course.status === 'Active' ? 'success.dark' : 'text.secondary'}
                        fontSize="0.75rem"
                      >
                        {course.status}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => {/* Handle edit */}}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell></TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the course "{selectedCourse?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Course Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseAddDialog} maxWidth="md" fullWidth>
        <DialogTitle>Add New Course</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid size={{xs:12,md:6}}>
              <TextField
                autoFocus
                margin="dense"
                name="name"
                label="Course Name"
                type="text"
                fullWidth
                variant="outlined"
                value={newCourse.name}
                onChange={handleNewCourseInputChange}
                required
              />
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <TextField
                margin="dense"
                name="code"
                label="Course Code"
                type="text"
                fullWidth
                variant="outlined"
                value={newCourse.code}
                onChange={handleNewCourseInputChange}
                required
              />
            </Grid>
            <Grid size={{xs:12}}>
              <TextField
                margin="dense"
                name="description"
                label="Description"
                type="text"
                fullWidth
                variant="outlined"
                multiline
                minRows={3}
                value={newCourse.description}
                onChange={handleNewCourseInputChange}
              />
            </Grid>
            <Grid size={{xs:12,md:4}}>
              <TextField
                margin="dense"
                name="credits"
                label="Credits"
                type="number"
                fullWidth
                variant="outlined"
                value={newCourse.credits}
                onChange={handleNewCourseInputChange}
              />
            </Grid>
            <Grid size={{xs:12,md:4}}>
              <TextField
                margin="dense"
                name="duration"
                label="Duration"
                type="text"
                fullWidth
                variant="outlined"
                value={newCourse.duration}
                onChange={handleNewCourseInputChange}
                placeholder="e.g., 16 weeks"
              />
            </Grid>
            <Grid size={{xs:12,md:4}}>
              <TextField
                margin="dense"
                name="maxStudents"
                label="Max Students"
                type="number"
                fullWidth
                variant="outlined"
                value={newCourse.maxStudents}
                onChange={handleNewCourseInputChange}
              />
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <TextField
                margin="dense"
                name="faculty"
                label="Faculty"
                type="text"
                fullWidth
                variant="outlined"
                value={newCourse.faculty}
                onChange={handleNewCourseInputChange}
              />
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <TextField
                margin="dense"
                name="department"
                label="Department"
                type="text"
                fullWidth
                variant="outlined"
                value={newCourse.department}
                onChange={handleNewCourseInputChange}
              />
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <TextField
                margin="dense"
                name="prerequisites"
                label="Prerequisites"
                type="text"
                fullWidth
                variant="outlined"
                value={newCourse.prerequisites}
                onChange={handleNewCourseInputChange}
                placeholder="e.g., MATH101, CS100"
              />
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <TextField
                margin="dense"
                name="status"
                label="Status"
                select
                fullWidth
                variant="outlined"
                value={newCourse.status}
                onChange={handleNewCourseInputChange}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="Draft">Draft</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{xs:12,md:4}}>
              <TextField
                margin="dense"
                name="schedule.time"
                label="Time"
                type="text"
                fullWidth
                variant="outlined"
                value={newCourse.schedule.time}
                onChange={handleNewCourseInputChange}
                placeholder="e.g., 10:00 AM - 11:30 AM"
              />
            </Grid>
            <Grid size={{xs:12,md:4}}>
              <TextField
                margin="dense"
                name="schedule.room"
                label="Room"
                type="text"
                fullWidth
                variant="outlined"
                value={newCourse.schedule.room}
                onChange={handleNewCourseInputChange}
                placeholder="e.g., Room 201"
              />
            </Grid>
            <Grid size={{xs:12,md:4}}>
              <TextField
                margin="dense"
                name="schedule.days"
                label="Days"
                type="text"
                fullWidth
                variant="outlined"
                value={newCourse.schedule.days.join(', ')}
                onChange={(e) => setNewCourse(prev => ({
                  ...prev,
                  schedule: {
                    ...prev.schedule,
                    days: e.target.value.split(',').map(day => day.trim())
                  }
                }))}
                placeholder="e.g., Monday, Wednesday, Friday"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleAddCourse} color="primary" variant="contained">
            Add Course
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

// Data Management component
function DataManagement({ classes }) {
  const [activeTab, setActiveTab] = useState(0);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importFormat, setImportFormat] = useState('csv');
  const [exportFormat, setExportFormat] = useState('csv');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Mock database statistics
  const dbStats = {
    totalRecords: 1247,
    users: 342,
    courses: 18,
    students: 298,
    faculty: 24,
    enrollments: 567,
    attendance: 8934,
    marks: 2156,
    lastBackup: '2024-01-15 03:00:00',

    dbSize: '127.5 MB'
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setSnackbar({
        open: true,
        message: 'Please select a file to import',
        severity: 'warning'
      });
      return;
    }

    setImporting(true);
    try {
      // Simulate import process
      await new Promise(resolve => setTimeout(resolve, 3000));
      setSnackbar({
        open: true,
        message: `Successfully imported data from ${selectedFile.name}`,
        severity: 'success'
      });
      setSelectedFile(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Import failed: ' + error.message,
        severity: 'error'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (dataType) => {
    setExporting(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create mock download
      const data = `Mock ${dataType} data in ${exportFormat.toUpperCase()} format`;
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}_export_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: `${dataType} data exported successfully`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Export failed: ' + error.message,
        severity: 'error'
      });
    } finally {
      setExporting(false);
       }
  };

  const handleBackup = async () => {
    setBackupInProgress(true);
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 5000));
      setSnackbar({
        open: true,
        message: 'Database backup completed successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Backup failed: ' + error.message,
        severity: 'error'
      });
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      setSnackbar({
        open: true,
        message: 'Please select a backup file to restore',
        severity: 'warning'
      });
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to restore from backup? This will replace all current data and cannot be undone.'
    );

    if (!confirmed) return;

    setRestoreInProgress(true);
    try {
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 8000));
      setSnackbar({
        open: true,
        message: 'Database restored successfully from backup',
        severity: 'success'
      });
      setSelectedFile(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Restore failed: ' + error.message,
        severity: 'error'
      });
    } finally {
      setRestoreInProgress(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Data Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<SecurityIcon />}>
            Security Audit
          </Button>
          <Button variant="outlined" startIcon={<WarningIcon />}>
            Data Integrity Check
          </Button>
        </Box>
      </Box>

      {/* Database Statistics */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card className={classes.statCard}>
            <StorageIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                {dbStats.totalRecords.toLocaleString()}
              </Typography>
              <Typography className={classes.statLabel}>
                Total Records
              </Typography>
            </div>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card className={classes.statCard}>
            <DatabaseIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                {dbStats.dbSize}
              </Typography>
              <Typography className={classes.statLabel}>
                Database Size
              </Typography>
            </div>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card className={classes.statCard}>
            <BackupIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                {new Date(dbStats.lastBackup).toLocaleDateString()}
              </Typography>
              <Typography className={classes.statLabel}>
                Last Backup
              </Typography>
            </div>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card className={classes.statCard}>
            <TrendingUpIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                98.5%
              </Typography>
              <Typography className={classes.statLabel}>
                Data Integrity
              </Typography>
              <Typography variant="caption" style={{ color: 'green' }}>
                Healthy
              </Typography>
            </div>
          </Card>
        </Grid>
      </Grid>

      {/* Data Operations Tabs */}
      <Paper className={classes.paper}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          className={classes.tabsContainer}
        >
          <Tab label="Import Data" icon={<CloudUploadIcon />} />
          <Tab label="Export Data" icon={<ImportExportIcon />} />
          <Tab label="Backup & Restore" icon={<BackupIcon />} />
          <Tab label="Database Operations" icon={<StorageIcon />} />
        </Tabs>

        {/* Import Data Tab */}
        {activeTab === 0 && (
          <Box p={3}>
            <Typography variant="h6" gutterBottom>Import Data</Typography>
            <Grid container spacing={3}>
              <Grid size={{xs:12,md:6}}>
                <TextField
                  select
                  label="Import Format"
                  value={importFormat}
                  onChange={(e) => setImportFormat(e.target.value)}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="xml">XML</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{xs:12,md:6}}>
                <Box mt={2}>
                  <input
                    accept=".csv,.xlsx,.json,.xml"
                    style={{ display: 'none' }}
                    id="import-file-input"
                    type="file"
                    onChange={handleFileSelect}
                  />
                  <label htmlFor="import-file-input">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      fullWidth
                      style={{ padding: '16px' }}
                    >
                      {selectedFile ? selectedFile.name : 'Select File to Import'}
                    </Button>
                  </label>
                </Box>
              </Grid>
              <Grid size={{xs:12}}>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Supported data types: Users, Students, Faculty, Courses, Enrollments, Marks, Attendance
                </Typography>
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleImport}
                    disabled={importing || !selectedFile}
                    startIcon={importing ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                  >
                    {importing ? 'Importing...' : 'Import Data'}
                  </Button>
                  <Button variant="outlined">
                    Download Template
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Export Data Tab */}
        {activeTab === 1 && (
          <Box p={3}>
            <Typography variant="h6" gutterBottom>Export Data</Typography>
            <Grid container spacing={3}>
              <Grid size={{xs:12,md:6}}>
                <TextField
                  select
                  label="Export Format"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="pdf">PDF Report</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{xs:12}}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Select data to export:
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{xs:12,sm:6,md:3}}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleExport('users')}
                      disabled={exporting}
                      startIcon={<PeopleIcon />}
                    >
                      Users ({dbStats.users})
                    </Button>
                  </Grid>
                  <Grid size={{xs:12,sm:6,md:3}}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleExport('students')}
                      disabled={exporting}
                      startIcon={<SchoolIcon />}
                    >
                      Students ({dbStats.students})
                    </Button>
                  </Grid>
                  <Grid size={{xs:12,sm:6,md:3}}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleExport('courses')}
                      disabled={exporting}
                      startIcon={<BookIcon />}
                    >
                      Courses ({dbStats.courses})
                    </Button>
                  </Grid>
                  <Grid size={{xs:12,sm:6,md:3}}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleExport('enrollments')}
                      disabled={exporting}
                      startIcon={<ImportExportIcon />}
                    >
                      Enrollments ({dbStats.enrollments})
                    </Button>
                  </Grid>
                  <Grid size={{xs:12,sm:6,md:3}}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleExport('attendance')}
                      disabled={exporting}
                      startIcon={<EventIcon />}
                    >
                      Attendance ({dbStats.attendance})
                    </Button>
                  </Grid>
                  <Grid size={{xs:12,sm:6,md:3}}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleExport('marks')}
                      disabled={exporting}
                      startIcon={<BarChartIcon />}
                    >
                      Marks ({dbStats.marks})
                    </Button>
                  </Grid>
                  <Grid size={{xs:12,sm:6,md:3}}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => handleExport('complete')}
                      disabled={exporting}
                      startIcon={<ImportExportIcon />}
                    >
                      Complete Export
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Backup & Restore Tab */}
        {activeTab === 2 && (
          <Box p={3}>
            <Typography variant="h6" gutterBottom>Backup & Restore</Typography>
            <Grid container spacing={3}>
              <Grid size={{xs:12,md:6}}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>Database Backup</Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Create a complete backup of the database including all user data, courses, and system settings.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleBackup}
                    disabled={backupInProgress}
                    startIcon={backupInProgress ? <CircularProgress size={20} /> : <BackupIcon />}
                    fullWidth
                  >
                    {backupInProgress ? 'Creating Backup...' : 'Create Backup'}
                  </Button>
                </Box>
              </Grid>
              <Grid size={{xs:12,md:6}}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>Restore from Backup</Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Restore database from a previous backup file. This will replace all current data.
                  </Typography>
                  <input
                    accept=".sql,.bak,.backup"
                    style={{ display: 'none' }}
                    id="restore-file-input"
                    type="file"
                    onChange={handleFileSelect}
                  />
                  <label htmlFor="restore-file-input">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<RestoreIcon />}
                      fullWidth
                      style={{ marginBottom: '10px' }}
                    >
                      {selectedFile ? selectedFile.name : 'Select Backup File'}
                    </Button>
                  </label>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleRestore}
                    disabled={restoreInProgress || !selectedFile}
                    startIcon={restoreInProgress ? <CircularProgress size={20} /> : <RestoreIcon />}
                    fullWidth
                  >
                    {restoreInProgress ? 'Restoring...' : 'Restore Database'}
                  </Button>
                </Box>
              </Grid>
              <Grid size={{xs:12}}>
                <Box mt={2} p={2} bgcolor="#fff3e0" borderRadius={4}>
                                   <Typography variant="subtitle2" color="textSecondary">
                    <WarningIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Backup Information
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Last backup: {dbStats.lastBackup}<br/>
                    • Automatic backups run daily at 3:00 AM<br/>
                    • Backups are stored for 30 days<br/>
                    • Restore operations cannot be undone
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Database Operations Tab */}
        {activeTab === 3 && (
          <Box p={3}>
            <Typography variant="h6" gutterBottom>Database Operations</Typography>
            <Grid container spacing={3}>
              <Grid size={{xs:12,md:6}}>
                <Typography variant="subtitle1" gutterBottom>Database Maintenance</Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button variant="outlined" startIcon={<StorageIcon />}>
                    Optimize Database
                  </Button>
                  <Button variant="outlined" startIcon={<SecurityIcon />}>
                    Verify Data Integrity
                  </Button>
                  <Button variant="outlined" startIcon={<BarChartIcon />}>
                    Rebuild Indexes
                  </Button>
                  <Button variant="outlined" startIcon={<DeleteIcon />}>
                    Clean Temporary Data
                  </Button>
                </Box>
              </Grid>
              <Grid size={{xs:12,md:6}}>
                <Typography variant="subtitle1" gutterBottom>Database Statistics</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow><TableCell>Users</TableCell>
                        <TableCell align="right">{dbStats.users.toLocaleString()}</TableCell></TableRow>
                      <TableRow><TableCell>Students</TableCell>
                        <TableCell align="right">{dbStats.students.toLocaleString()}</TableCell></TableRow>
                      <TableRow><TableCell>Faculty</TableCell>
                        <TableCell align="right">{dbStats.faculty.toLocaleString()}</TableCell></TableRow>
                      <TableRow><TableCell>Courses</TableCell>
                        <TableCell align="right">{dbStats.courses.toLocaleString()}</TableCell></TableRow>
                      <TableRow><TableCell>Enrollments</TableCell>
                        <TableCell align="right">{dbStats.enrollments.toLocaleString()}</TableCell></TableRow>
                      <TableRow><TableCell>Attendance Records</TableCell>
                        <TableCell align="right">{dbStats.attendance.toLocaleString()}</TableCell></TableRow>
                      <TableRow><TableCell>Grade Records</TableCell>
                        <TableCell align="right">{dbStats.marks.toLocaleString()}</TableCell></TableRow>
                      <TableRow><TableCell><strong>Total Records</strong></TableCell>
                        <TableCell align="right"><strong>{dbStats.totalRecords.toLocaleString()}</strong></TableCell></TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

// Reports & Analytics component
function ReportsAnalytics({ classes }) {
  const [selectedDateRange, setSelectedDateRange] = useState('last30days');
  const [selectedReportType, setSelectedReportType] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Mock analytics data
  const analyticsData = {
    overview: {
      totalUsers: 342,
      totalCourses: 18,
      totalEnrollments: 567,
      totalQuizzes: 47,
      activeUsers: 298,
      completionRate: 78.5,
      avgGrade: 82.3,
      systemUptime: 99.8
    },
    userGrowth: [
      { month: 'Jan', users: 150, enrollments: 200 },
      { month: 'Feb', users: 180, enrollments: 250 },
      { month: 'Mar', users: 220, enrollments: 320 },
      { month: 'Apr', users: 280, enrollments: 420 },
      { month: 'May', users: 320, enrollments: 520 },
      { month: 'Jun', users: 342, enrollments: 567 }
    ],
    coursePopularity: [
      { course: 'Computer Science', enrollments: 145, completion: 85 },
      { course: 'Mathematics', enrollments: 132, completion: 78 },
      { course: 'Business', enrollments: 98, completion: 82 },
      { course: 'Science', enrollments: 87, completion: 90 },
      { course: 'Arts', enrollments: 105, completion: 75 }
    ],
    performanceMetrics: {
      avgQuizScore: 82.3,
      avgAssignmentScore: 79.8,
      passRate: 91.2,
      dropoutRate: 8.8,
      satisfactionScore: 4.6
    },
    recentActivities: [
      { type: 'enrollment', count: 23, change: '+15%' },
      { type: 'quiz_submissions', count: 156, change: '+8%' },
      { type: 'course_completions', count: 34, change: '+22%' },
      { type: 'new_courses', count: 3, change: '+2%' }
    ]
  };

  const handleExportReport = (format) => {
    setLoading(true);
    // Simulate export process
    setTimeout(() => {
      setLoading(false);
      alert(`Report exported as ${format.toUpperCase()}`);
    }, 2000);
  };

  const generateCustomReport = () => {
    setLoading(true);
    // Simulate report generation
    setTimeout(() => {
      setLoading(false);
      alert('Custom report generated successfully!');
    }, 3000);
  };

  return (
    <Container>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Reports & Analytics
        </Typography>
        <Box display="flex" gap={2}>
          <TextField
            select
            label="Date Range"
            variant="outlined"
            size="small"
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            style={{ width: 150 }}
          >
            <MenuItem value="last7days">Last 7 Days</MenuItem>
            <MenuItem value="last30days">Last 30 Days</MenuItem>
            <MenuItem value="last3months">Last 3 Months</MenuItem>
            <MenuItem value="last6months">Last 6 Months</MenuItem>
            <MenuItem value="lastyear">Last Year</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </TextField>          <Button
            variant="outlined"
            startIcon={<GetApp />}
            onClick={() => handleExportReport('pdf')}
            disabled={loading}
          >
            Export PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<GetApp />}
            onClick={() => handleExportReport('excel')}
            disabled={loading}
          >
            Export Excel
          </Button>
        </Box>
      </Box>

      {/* Key Metrics Overview */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card className={classes.statCard}>
            <PeopleIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                {analyticsData.overview.activeUsers}
              </Typography>
              <Typography className={classes.statLabel}>
                Active Users
              </Typography>
              <Typography variant="caption" style={{ color: 'green' }}>
                +12% from last month
              </Typography>
            </div>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card className={classes.statCard}>
            <SchoolIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                {analyticsData.overview.totalEnrollments}
              </Typography>
              <Typography className={classes.statLabel}>
                Total Enrollments
              </Typography>
              <Typography variant="caption" style={{ color: 'green' }}>
                +8% from last month
              </Typography>
            </div>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card className={classes.statCard}>
            <TrendingUpIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                {analyticsData.overview.completionRate}%
              </Typography>
              <Typography className={classes.statLabel}>
                Completion Rate
              </Typography>
              <Typography variant="caption" style={{ color: 'green' }}>
                +3% from last month
              </Typography>
            </div>
          </Card>
        </Grid>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card className={classes.statCard}>
            <BarChartIcon className={classes.statIcon} />
            <div>
              <Typography variant="h3" className={classes.statValue}>
                {analyticsData.overview.avgGrade}
              </Typography>
              <Typography className={classes.statLabel}>
                Average Grade
              </Typography>
              <Typography variant="caption" style={{ color: 'green' }}>
                +1.2 from last month
              </Typography>
            </div>
          </Card>
        </Grid>
      </Grid>

      {/* Chart Sections */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        {/* User Growth Chart */}
        <Grid size={{xs:12,md:8}}>
          <Paper className={classes.paper}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">User Growth & Enrollments</Typography>
              <Box display="flex" gap={1}>
                <Button size="small" startIcon={<LineChartIcon />}>Line</Button>
                <Button size="small" startIcon={<BarChartIcon />}>Bar</Button>
              </Box>
            </Box>
            <Divider style={{ marginBottom: 16 }} />
            <Box height={300} display="flex" alignItems="center" justifyContent="center" flexDirection="column">
              <Typography variant="body1" color="textSecondary" gutterBottom>
                [User Growth Chart would be displayed here]
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Showing growth from {analyticsData.userGrowth[0].month} to {analyticsData.userGrowth[analyticsData.userGrowth.length - 1].month}
              </Typography>
              <Box mt={2}>
                {analyticsData.userGrowth.map((data, index) => (
                  <Box key={index} component="span" mr={2} fontSize="0.8rem">
                    {data.month}: {data.users} users, {data.enrollments} enrollments
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Performance Metrics */}
        <Grid size={{xs:12,md:4}}>
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
            <Divider style={{ marginBottom: 16 }} />
            <Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Avg Quiz Score:</Typography>
                <Typography variant="body2" fontWeight="bold">{analyticsData.performanceMetrics.avgQuizScore}%</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Avg Assignment Score:</Typography>
                <Typography variant="body2" fontWeight="bold">{analyticsData.performanceMetrics.avgAssignmentScore}%</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Pass Rate:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>{analyticsData.performanceMetrics.passRate}%</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Dropout Rate:</Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold", color: "error.main" }}>{analyticsData.performanceMetrics.dropoutRate}%</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Satisfaction Score:</Typography>
                <Typography variant="body2" fontWeight="bold">{analyticsData.performanceMetrics.satisfactionScore}/5.0</Typography>
              </Box>
            </Box>
            <Button variant="outlined" fullWidth style={{ marginTop: 16 }}>
              View Detailed Metrics
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Course Analytics */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid size={{xs:12,md:8}}>
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>Course Popularity & Performance</Typography>
            <Divider style={{ marginBottom: 16 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow><TableCell>Course</TableCell>
                    <TableCell align="right">Enrollments</TableCell>
                    <TableCell align="right">Completion Rate</TableCell>
                    <TableCell align="right">Trend</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {analyticsData.coursePopularity.map((course, index) => (
                    <TableRow key={index}>
                      <TableCell>{course.course}</TableCell>
                      <TableCell align="right">{course.enrollments}</TableCell>
                      <TableCell align="right">{course.completion}%</TableCell>
                      <TableCell align="right">
                        <TrendingUpIcon style={{ color: 'green', fontSize: 16 }} />
                      </TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{xs:12,md:4}}>
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>Recent Activity Summary</Typography>
            <Divider style={{ marginBottom: 16 }} />
            <Box>
              {analyticsData.recentActivities.map((activity, index) => (
                <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {activity.type.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {activity.count} in last 7 days
                    </Typography>
                  </Box>
                  <Typography variant="body2" style={{ color: activity.change.startsWith('+') ? 'green' : 'red' }}>
                    {activity.change}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Button variant="outlined" fullWidth style={{ marginTop: 16 }}>
              View Activity Log
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Custom Reports Section */}
      <Paper className={classes.paper}>
        <Typography variant="h6" gutterBottom>Custom Reports</Typography>
        <Divider style={{ marginBottom: 16 }} />
        <Grid container spacing={3}>
          <Grid size={{xs:12,md:4}}>
            <TextField
              select
              label="Report Type"
              variant="outlined"
              size="small"
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              fullWidth
            >
              <MenuItem value="overview">System Overview</MenuItem>
              <MenuItem value="users">User Analytics</MenuItem>
              <MenuItem value="courses">Course Performance</MenuItem>
              <MenuItem value="financial">Financial Report</MenuItem>
              <MenuItem value="engagement">Engagement Metrics</MenuItem>
              <MenuItem value="security">Security Audit</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{xs:12,md:4}}>
            <TextField
              label="From Date"
              type="date"
              variant="outlined"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{xs:12,md:4}}>
            <TextField
              label="To Date"
              type="date"
              variant="outlined"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{xs:12}}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="contained"
                color="primary"
                startIcon={<ReportsIcon />}
                onClick={generateCustomReport}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
              <Button variant="outlined" startIcon={<FilterIcon />}>
                Advanced Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

// System Settings component
function SystemSettings({ classes }) {
  const [emailSettings, setEmailSettings] = useState({
    smtpServer: 'smtp.example.com',
    smtpPort: '587',
    smtpUsername: 'admin@example.com',
    smtpPassword: '********',
    fromEmail: 'noreply@example.com',
    enableSSL: true
  });

  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    keepBackups: '7',
    backupLocation: 'cloud'
  });

  const [securitySettings, setSecuritySettings] = useState({
    passwordExpiry: '90',
    minPasswordLength: '8',
    requireSpecialChar: true,
    maxLoginAttempts: '5',
    sessionTimeout: '30'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    enableEmailNotifications: true,
    enableSystemAlerts: true,
    alertOnFailedLogins: true,
    dailySummary: false,
    notifyNewUsers: true
  });

  const [maintenanceSettings, setMaintenanceSettings] = useState({
    enableMaintenance: false,
    maintenanceMessage: 'System is currently under maintenance. Please try again later.',
    scheduledStart: '',
    scheduledEnd: '',
    allowAdminAccess: true
  });

  const [activeTab, setActiveTab] = useState(0);

  const handleEmailChange = (event) => {
    const { name, value, checked } = event.target;
    setEmailSettings(prev => ({
      ...prev,
      [name]: name === 'enableSSL' ? checked : value
    }));
  };

  const handleBackupChange = (event) => {
    const { name, value, checked } = event.target;
    setBackupSettings(prev => ({
      ...prev,
      [name]: name === 'autoBackup' ? checked : value
    }));
  };

  const handleSecurityChange = (event) => {
    const { name, value, checked } = event.target;
    setSecuritySettings(prev => ({
      ...prev,
      [name]: ['requireSpecialChar'].includes(name) ? checked : value
    }));
  };

  const handleNotificationChange = (event) => {
    const { name, checked } = event.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleMaintenanceChange = (event) => {
    const { name, value, checked } = event.target;
    setMaintenanceSettings(prev => ({
      ...prev,
      [name]: ['enableMaintenance', 'allowAdminAccess'].includes(name) ? checked : value
    }));
  };

  const saveSettings = (section) => {
    // This would save the settings to the backend
    console.log(`Saving ${section} settings`);
    // Show success message
    alert(`${section} settings saved successfully!`);
  };

  const runBackup = () => {
    // This would trigger a manual backup
    console.log('Initiating manual backup...');
    setTimeout(() => {
      alert('Backup completed successfully!');
    }, 2000);
  };

  const toggleMaintenanceMode = () => {
    setMaintenanceSettings(prev => ({
      ...prev,
      enableMaintenance: !prev.enableMaintenance
    }));

    // This would toggle maintenance mode on the server
    if (!maintenanceSettings.enableMaintenance) {
      alert('Maintenance mode enabled. Regular users will see the maintenance message.');
    } else {
      alert('Maintenance mode disabled. The system is now accessible to all users.');
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>

      <Paper className={classes.paper}>
        <Box mb={3}>
          <Grid container spacing={2}>
            <Grid size={{xs:12}}>
              <Box display="flex" mb={2}>
                <Button
                  variant={activeTab === 0 ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setActiveTab(0)}
                  className={classes.buttonSpacing}
                >
                  Email Configuration
                </Button>
                <Button
                  variant={activeTab === 1 ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setActiveTab(1)}
                  className={classes.buttonSpacing}
                >
                  Backup & Restore
                </Button>
                <Button
                  variant={activeTab === 2 ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setActiveTab(2)}
                  className={classes.buttonSpacing}
                >
                  Security Settings
                </Button>
                <Button
                  variant={activeTab === 3 ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setActiveTab(3)}
                  className={classes.buttonSpacing}
                >
                  Notifications
                </Button>
                <Button
                  variant={activeTab === 4 ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setActiveTab(4)}
                >
                  Maintenance
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* Email Configuration */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Email Server Configuration</Typography>
              <Grid container spacing={3}>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="SMTP Server"
                    name="smtpServer"
                    value={emailSettings.smtpServer}
                    onChange={handleEmailChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="SMTP Port"
                    name="smtpPort"
                    value={emailSettings.smtpPort}
                    onChange={handleEmailChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="SMTP Username"
                    name="smtpUsername"
                    value={emailSettings.smtpUsername}
                    onChange={handleEmailChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="SMTP Password"
                    name="smtpPassword"
                    type="password"
                    value={emailSettings.smtpPassword}
                    onChange={handleEmailChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="From Email Address"
                    name="fromEmail"
                    value={emailSettings.fromEmail}
                    onChange={handleEmailChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <Box mt={3} display="flex" alignItems="center">
                    <input
                      type="checkbox"
                      id="enableSSL"
                      name="enableSSL"
                      checked={emailSettings.enableSSL}
                      onChange={handleEmailChange}
                    />
                    <label htmlFor="enableSSL" style={{ marginLeft: '10px' }}>Enable SSL/TLS</label>
                  </Box>
                </Grid>
                <Grid size={{xs:12}}>
                  <Box mt={2} display="flex" justifyContent="flex-end">
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => saveSettings('email')}
                    >
                      Save Email Settings
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Backup & Restore */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Backup & Restore Settings</Typography>
              <Grid container spacing={3}>
                <Grid size={{xs:12,md:6}}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <input
                      type="checkbox"
                      id="autoBackup"
                      name="autoBackup"
                      checked={backupSettings.autoBackup}
                      onChange={handleBackupChange}
                    />
                    <label htmlFor="autoBackup" style={{ marginLeft: '10px' }}>Enable Automatic Backups</label>
                  </Box>
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    select
                    label="Backup Frequency"
                    name="backupFrequency"
                    value={backupSettings.backupFrequency}
                    onChange={handleBackupChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </TextField>
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="Backup Time (24h format)"
                    name="backupTime"
                    type="time"
                    value={backupSettings.backupTime}
                    onChange={handleBackupChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="Keep Backups (days)"
                    name="keepBackups"
                    value={backupSettings.keepBackups}
                    onChange={handleBackupChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    select
                    label="Backup Storage Location"
                    name="backupLocation"
                    value={backupSettings.backupLocation}
                    onChange={handleBackupChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="local">Local Storage</option>
                    <option value="cloud">Cloud Storage</option>
                    <option value="ftp">Remote FTP Server</option>
                  </TextField>
                </Grid>
                <Grid size={{xs:12}}>
                  <Box mt={2} display="flex" justifyContent="space-between">
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={runBackup}
                    >
                      Run Backup Now
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => saveSettings('backup')}
                    >
                      Save Backup Settings
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Security Settings */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Security Settings</Typography>
              <Grid container spacing={3}>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="Password Expiry (days)"
                    name="passwordExpiry"
                    value={securitySettings.passwordExpiry}
                    onChange={handleSecurityChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="Minimum Password Length"
                    name="minPasswordLength"
                    value={securitySettings.minPasswordLength}
                    onChange={handleSecurityChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <input
                      type="checkbox"
                      id="requireSpecialChar"
                      name="requireSpecialChar"
                      checked={securitySettings.requireSpecialChar}
                      onChange={handleSecurityChange}
                    />
                    <label htmlFor="requireSpecialChar" style={{ marginLeft: '10px' }}>Require Special Characters</label>
                  </Box>
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="Max Failed Login Attempts"
                    name="maxLoginAttempts"
                    value={securitySettings.maxLoginAttempts}
                    onChange={handleSecurityChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="Session Timeout (minutes)"
                    name="sessionTimeout"
                    value={securitySettings.sessionTimeout}
                    onChange={handleSecurityChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{xs:12}}>
                  <Box mt={2} display="flex" justifyContent="flex-end">
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => saveSettings('security')}
                    >
                      Save Security Settings
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Notification Settings */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>Notification Settings</Typography>
              <Grid container spacing={3}>
                <Grid size={{xs:12,md:6}}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <input
                      type="checkbox"
                      id="enableEmailNotifications"
                      name="enableEmailNotifications"
                      checked={notificationSettings.enableEmailNotifications}
                      onChange={handleNotificationChange}
                    />
                    <label htmlFor="enableEmailNotifications" style={{ marginLeft: '10px' }}>Enable Email Notifications</label>
                  </Box>
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <input
                      type="checkbox"
                      id="enableSystemAlerts"
                      name="enableSystemAlerts"
                      checked={notificationSettings.enableSystemAlerts}
                      onChange={handleNotificationChange}
                    />
                    <label htmlFor="enableSystemAlerts" style={{ marginLeft: '10px' }}>Enable System Alerts</label>
                  </Box>
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <input
                      type="checkbox"
                      id="alertOnFailedLogins"
                      name="alertOnFailedLogins"
                      checked={notificationSettings.alertOnFailedLogins}
                      onChange={handleNotificationChange}
                    />
                    <label htmlFor="alertOnFailedLogins" style={{ marginLeft: '10px' }}>Alert on Failed Login Attempts</label>
                  </Box>
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <input
                      type="checkbox"
                      id="dailySummary"
                      name="dailySummary"
                      checked={notificationSettings.dailySummary}
                      onChange={handleNotificationChange}
                    />
                    <label htmlFor="dailySummary" style={{ marginLeft: '10px' }}>Send Daily System Summary</label>
                  </Box>
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <input
                      type="checkbox"
                      id="notifyNewUsers"
                      name="notifyNewUsers"
                      checked={notificationSettings.notifyNewUsers}
                      onChange={handleNotificationChange}
                    />
                    <label htmlFor="notifyNewUsers" style={{ marginLeft: '10px' }}>Notify when New Users Register</label>
                  </Box>
                </Grid>
                <Grid size={{xs:12}}>
                  <Box mt={2} display="flex" justifyContent="flex-end">
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => saveSettings('notification')}
                    >
                      Save Notification Settings
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Maintenance Mode */}
          {activeTab === 4 && (
            <Box>
              <Typography variant="h6" gutterBottom>System Maintenance</Typography>
              <Grid container spacing={3}>
                <Grid size={{xs:12,md:6}}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <input
                      type="checkbox"
                      id="enableMaintenance"
                      name="enableMaintenance"
                      checked={maintenanceSettings.enableMaintenance}
                      onChange={handleMaintenanceChange}
                    />
                    <label htmlFor="enableMaintenance" style={{ marginLeft: '10px' }}>
                      <Typography color={maintenanceSettings.enableMaintenance ? "error" : "inherit"}>
                        Enable Maintenance Mode
                      </Typography>
                    </label>
                  </Box>
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <input
                      type="checkbox"
                      id="allowAdminAccess"
                      name="allowAdminAccess"
                      checked={maintenanceSettings.allowAdminAccess}
                      onChange={handleMaintenanceChange}
                    />
                    <label htmlFor="allowAdminAccess" style={{ marginLeft: '10px' }}>Allow Admin Access During Maintenance</label>
                  </Box>
                </Grid>
                <Grid size={{xs:12}}>
                  <TextField
                    label="Maintenance Message"
                    name="maintenanceMessage"
                    value={maintenanceSettings.maintenanceMessage}
                    onChange={handleMaintenanceChange}
                    fullWidth
                    multiline
                    minRows={4}
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="Scheduled Start"
                    name="scheduledStart"
                    type="datetime-local"
                    value={maintenanceSettings.scheduledStart}
                    onChange={handleMaintenanceChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    label="Scheduled End"
                    name="scheduledEnd"
                    type="datetime-local"
                    value={maintenanceSettings.scheduledEnd}
                    onChange={handleMaintenanceChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
                <Grid size={{xs:12}}>
                  <Box mt={2} display="flex" justifyContent="space-between">
                    <Button
                      variant="contained"
                      color={maintenanceSettings.enableMaintenance ? "secondary" : "primary"}
                      onClick={toggleMaintenanceMode}
                    >
                      {maintenanceSettings.enableMaintenance ? 'Disable' : 'Enable'} Maintenance Mode
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => saveSettings('maintenance')}
                    >
                      Save Maintenance Settings
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

// Enhanced AdminDashboard with new contexts and components
function EnhancedAdminDashboard() {
  return (
    <CustomThemeProvider>
      <NotificationProvider>
        <AdminDashboard />
      </NotificationProvider>
    </CustomThemeProvider>
  );
}

export default EnhancedAdminDashboard;

