import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AccountCircle,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { CssBaseline } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../auth/AuthContext';

import { AppBar, Avatar, Badge, Box, Container, Divider, Drawer, Grid, IconButton, List, ListItem, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Toolbar, Typography } from '@mui/material';
const drawerWidth = 240;

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
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 2px 4px -1px rgba(0,0,0,0.2), 0 4px 5px 0 rgba(0,0,0,0.14), 0 1px 10px 0 rgba(0,0,0,0.12)'}}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              display: { sm: 'none' }
            }}
          >
            <MenuIcon />
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
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
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

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
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
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          background: 'linear-gradient(135deg, #0a0a0f 0%, #111118 50%, #0a0a1a 100%)',
          minHeight: '100vh'}}
      >
        <Toolbar />

        {/* Welcome Section */}
        {currentView === 'dashboard' && (
          <Paper sx={{
            mb: 3,
            p: 3,
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)'}}>
            <Typography variant="h4" gutterBottom>
              Welcome, {currentUser?.firstName || 'User'}!
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Here's your {userRole} dashboard overview
            </Typography>            {/* Stats Grid */}
            {userStats && Object.keys(userStats).length > 0 && (
              <Grid container spacing={3} sx={{ mt: 2 }}>
                {Object.entries(userStats || {}).map(([key, value]) => (
                  <Grid size={{xs:12,sm:6,md:3}} key={key}>
                    <Paper sx={{
                      p: 2,
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 2,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.6)'},
                      transition: 'all 0.3s ease'}}>
                      <Typography variant="h4" color="primary">
                        {value}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        )}

        {/* Dynamic Content */}
        <Container maxWidth="xl" sx={{ p: 0 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default UnifiedDashboardLayout;

