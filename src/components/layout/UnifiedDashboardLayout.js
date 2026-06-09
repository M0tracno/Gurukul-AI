import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AccountCircle,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { CssBaseline } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useAuth } from '../../auth/AuthContext';

import { AppBar, Avatar, Badge, Box, Container, Divider, Drawer, Grid, IconButton, List, ListItem, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Toolbar, Typography } from '@mui/material';
const drawerWidth = 240;

/**
 * Mobile breakpoint key — navigation collapses at ≤768px (theme.breakpoints.values.md).
 * Requirements: 8.3 (collapsible mobile navigation at ≤768px)
 */
const MOBILE_BREAKPOINT = 'md';

const UnifiedDashboardLayout = ({
  children,
  title,
  menuItems = [],
  currentView = 'dashboard',
  onViewChange,
  userStats = {},
  notifications = 0
}) => {
  const navigate = useNavigate();
  const { currentUser, userRole, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(MOBILE_BREAKPOINT));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleMenuClose();
  };

  const handleMenuItemClick = (item) => {
    if (onViewChange) {
      onViewChange(item.key);
    }
    setMobileOpen(false);
  };  const drawerContent = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      color: 'rgba(255, 255, 255, 0.95)'
    }}>
      <Box sx={{ height: 64 }} />

      {/* User Info Section */}
      <Box sx={{ 
        p: 3, 
        textAlign: 'center', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(167, 139, 250, 0.08)'
      }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            margin: '0 auto 16px',
            bgcolor: '#3b82f6',
            fontSize: '1.5rem',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            color: 'white'
          }}
        >
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: 'rgba(255, 255, 255, 0.95)' }}>
          {currentUser?.name || 'User'}
        </Typography>
        <Typography variant="body2" sx={{ 
          textTransform: 'capitalize',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '0.875rem'
        }}>
          {userRole || 'User'}
        </Typography>
      </Box>      {/* Navigation Menu */}
      <List sx={{ p: 2, flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem
            key={item.key}
            onClick={() => handleMenuItemClick(item)}
            sx={{
              m: 1,
              borderRadius: 2,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              minHeight: 48,
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                backgroundColor: 'rgba(167, 139, 250, 0.1)',
                transform: 'translateX(4px)',
                boxShadow: '0 4px 12px rgba(167, 139, 250, 0.15)',
                color: '#a78bfa'
              },
              ...(currentView === item.key && {
                backgroundColor: 'rgba(167, 139, 250, 0.15)',
                color: '#a78bfa',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                boxShadow: '0 4px 12px rgba(167, 139, 250, 0.2)',
                '& .MuiListItemIcon-root': {
                  color: '#a78bfa'
                }
              })
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={{
                '& .MuiListItemText-primary': {
                  fontWeight: currentView === item.key ? 600 : 500,
                  color: 'inherit',
                  fontSize: '0.95rem'
                }
              }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />

      {/* Settings Menu */}
      <List sx={{ p: 2 }}>
        <ListItem
          sx={{
            m: 1,
            borderRadius: 2,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: 48,
            cursor: 'pointer',
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              backgroundColor: 'rgba(167, 139, 250, 0.1)',
              transform: 'translateX(4px)',
              boxShadow: '0 4px 12px rgba(167, 139, 250, 0.15)',
              color: '#a78bfa'
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Settings"
            sx={{
              '& .MuiListItemText-primary': {
                color: 'inherit',
                fontSize: '0.95rem',
                fontWeight: 500
              }
            }}
          />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{
      display: 'flex',
      // Prevent horizontal scroll across all viewports 320–2560px (Requirement 8.1)
      overflowX: 'hidden',
      maxWidth: '100vw',
      minHeight: '100vh',
    }}>
      <CssBaseline />

      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { xs: '100%', [MOBILE_BREAKPOINT]: `calc(100% - ${drawerWidth}px)` },
          ml: { xs: 0, [MOBILE_BREAKPOINT]: `${drawerWidth}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 2px 4px -1px rgba(0,0,0,0.2), 0 4px 5px 0 rgba(0,0,0,0.14), 0 1px 10px 0 rgba(0,0,0,0.12)'}}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label={mobileOpen ? "close navigation menu" : "open navigation menu"}
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              display: { [MOBILE_BREAKPOINT]: 'none' }
            }}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              fontSize: '1.25rem'
            }}
          >
            {title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginLeft: 'auto', paddingRight: 1 }}>
            <IconButton color="inherit">
              <Badge badgeContent={notifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
              aria-controls="user-menu"
              aria-haspopup="true"
              sx={{
                p: 0.75,
                borderRadius: 1.5,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'scale(1.05)'}}}
            >
              <AccountCircle />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { [MOBILE_BREAKPOINT]: drawerWidth }, flexShrink: { [MOBILE_BREAKPOINT]: 0 } }}
        aria-label="Sidebar navigation"
      >        {/* Mobile drawer — collapsible at ≤768px (Requirement 8.3) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', [MOBILE_BREAKPOINT]: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
              border: 'none',
              boxShadow: '4px 0 20px rgba(0, 0, 0, 0.8)'
            }
          }}
        >{drawerContent}
        </Drawer>

        {/* Desktop drawer — permanent, visible above 768px */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', [MOBILE_BREAKPOINT]: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
              border: 'none',
              boxShadow: '4px 0 20px rgba(0, 0, 0, 0.5)'
            }
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* User Menu */}
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'}}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'}}
        sx={{
          mt: 1,
          '& .MuiPaper-root': {
            borderRadius: 1.5,
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            minWidth: 200,
            overflow: 'visible',
            mt: 0.5},
          '& .MuiMenuItem-root': {
            p: '12px 16px',
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.95rem',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(58, 134, 255, 0.08)',
              transform: 'translateX(4px)'},
            '&:first-of-type': {
              mt: 0.5},
            '&:last-of-type': {
              mb: 0.5}},
          '& .MuiDivider-root': {
            m: '4px 8px'}}}
        PaperProps={{
          elevation: 3,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0}}}}
      >
        <MenuItem
          onClick={handleMenuClose}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5}}
        >
          <Avatar sx={{ width: 24, height: 24 }} />
          <Typography variant="body2">Profile</Typography>
        </MenuItem>
        <MenuItem
          onClick={handleLogout}
          sx={{
            display: 'flex',
            alignItems: 'center',        gap: 1.5,
            color: 'error.main'}}
        >
          <LogoutIcon sx={{ fontSize: 20 }} />
          <Typography variant="body2">Logout</Typography>
        </MenuItem>
      </Menu>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { xs: '100%', [MOBILE_BREAKPOINT]: `calc(100% - ${drawerWidth}px)` },
          // Prevent horizontal scroll across 320–2560px (Requirement 8.1)
          minWidth: 0,
          overflowX: 'hidden',
          maxWidth: '100vw',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #111118 50%, #0a0a1a 100%)',
          minHeight: '100vh',
          boxSizing: 'border-box',
        }}
      >
        <Toolbar />

        {/* Dynamic Content */}
        <Container
          maxWidth="xl"
          sx={{
            p: 0,
            // Prevent any child overflow from causing horizontal scroll
            overflowX: 'hidden',
            maxWidth: '2560px',
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default UnifiedDashboardLayout;

