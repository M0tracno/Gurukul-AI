import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AccountCircle,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useAuth } from '../../auth/AuthContext';

import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';

import { accents, ink, surfaces, easing, fonts } from '../../theme/cinematic';

const drawerWidth = 248;
const MOBILE_BREAKPOINT = 'md';

const UnifiedDashboardLayout = ({
  children,
  title,
  accent = 'blue',
  menuItems = [],
  currentView = 'dashboard',
  onViewChange,
  notifications = 0,
}) => {
  const navigate = useNavigate();
  const { currentUser, userRole, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(MOBILE_BREAKPOINT));

  const a = accents[accent] || accents.blue;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenuOpen = event => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleMenuClose();
  };

  const handleMenuItemClick = item => {
    if (onViewChange) onViewChange(item.key);
    setMobileOpen(false);
  };

  const navItemSx = active => ({
    m: 0.5,
    borderRadius: '10px',
    minHeight: 46,
    cursor: 'pointer',
    position: 'relative',
    color: active ? ink.primary : ink.secondary,
    background: active ? a.soft : 'transparent',
    transition: `all 0.35s ${easing.premium}`,
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 8,
      bottom: 8,
      width: 3,
      borderRadius: 3,
      background: active ? a.main : 'transparent',
    },
    '&:hover': { background: active ? a.soft : 'rgba(255,255,255,0.04)', color: ink.primary },
    '& .MuiListItemIcon-root': { color: active ? a.light : ink.tertiary },
  });

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${surfaces.paper} 0%, ${surfaces.base} 100%)`,
        color: ink.primary,
      }}
    >
      <Box sx={{ height: 64 }} />
      {/* User info */}
      <Box sx={{ p: 3, borderBottom: `1px solid ${surfaces.border}` }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              width: 48,
              height: 48,
              fontSize: '1.2rem',
              fontWeight: 700,
              color: a.light,
              background: a.soft,
              border: `1px solid rgba(${a.rgb}, 0.3)`,
            }}
          >
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, color: ink.primary, fontSize: '0.98rem', noWrap: true }}>
              {currentUser?.name || 'User'}
            </Typography>
            <Typography sx={{ textTransform: 'capitalize', color: ink.tertiary, fontSize: '0.82rem' }}>
              {userRole || 'User'}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Navigation */}
      <List sx={{ p: 1.5, flexGrow: 1 }}>
        {menuItems.map(item => {
          const active = currentView === item.key;
          return (
            <ListItem key={item.key} onClick={() => handleMenuItemClick(item)} sx={navItemSx(active)}>
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{ '& .MuiListItemText-primary': { fontWeight: active ? 600 : 500, fontSize: '0.92rem' } }}
              />
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: surfaces.border }} />
      <List sx={{ p: 1.5 }}>
        <ListItem sx={navItemSx(false)}>
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" sx={{ '& .MuiListItemText-primary': { fontSize: '0.92rem', fontWeight: 500 } }} />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', overflowX: 'hidden', maxWidth: '100vw', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { xs: '100%', [MOBILE_BREAKPOINT]: `calc(100% - ${drawerWidth}px)` },
          ml: { xs: 0, [MOBILE_BREAKPOINT]: `${drawerWidth}px` },
          zIndex: t => t.zIndex.drawer + 1,
          backgroundColor: 'rgba(8, 9, 12, 0.72)',
          backdropFilter: 'blur(18px) saturate(140%)',
          borderBottom: `1px solid ${surfaces.border}`,
          boxShadow: 'none',
          backgroundImage: 'none',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label={mobileOpen ? 'close navigation menu' : 'open navigation menu'}
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, color: a.light, display: { [MOBILE_BREAKPOINT]: 'none' } }}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
          <Typography
            sx={{
              flexGrow: 1,
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: '1.15rem',
              letterSpacing: '-0.02em',
              color: ink.primary,
            }}
          >
            {title}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton sx={{ color: ink.secondary }}>
              <Badge badgeContent={notifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <IconButton
              onClick={handleMenuOpen}
              aria-controls="user-menu"
              aria-haspopup="true"
              sx={{ color: ink.secondary, p: 0.75, borderRadius: '10px', '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }}
            >
              <AccountCircle />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { [MOBILE_BREAKPOINT]: drawerWidth }, flexShrink: { [MOBILE_BREAKPOINT]: 0 } }}
        aria-label="Sidebar navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', [MOBILE_BREAKPOINT]: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none', backgroundImage: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', [MOBILE_BREAKPOINT]: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
              borderRight: `1px solid ${surfaces.border}`,
              backgroundImage: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleMenuClose} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 24, height: 24 }} />
          <Typography variant="body2">Profile</Typography>
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'error.main' }}>
          <LogoutIcon sx={{ fontSize: 20 }} />
          <Typography variant="body2">Logout</Typography>
        </MenuItem>
      </Menu>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { xs: '100%', [MOBILE_BREAKPOINT]: `calc(100% - ${drawerWidth}px)` },
          minWidth: 0,
          overflowX: 'hidden',
          maxWidth: '100vw',
          minHeight: '100vh',
          boxSizing: 'border-box',
          position: 'relative',
          background: surfaces.base,
          '&::before': {
            content: '""',
            position: 'fixed',
            inset: 0,
            background: `radial-gradient(55% 45% at 85% 0%, rgba(${a.rgb}, 0.10) 0%, transparent 60%)`,
            pointerEvents: 'none',
            zIndex: 0,
          },
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ p: 0, position: 'relative', zIndex: 1, overflowX: 'hidden', maxWidth: '2560px' }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default UnifiedDashboardLayout;
