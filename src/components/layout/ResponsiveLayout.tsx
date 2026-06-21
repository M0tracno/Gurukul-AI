/**
 * ResponsiveLayout — Breakpoint-driven responsive shell.
 *
 * Provides a no-horizontal-scroll layout across 320–2560px with a collapsible
 * mobile navigation at ≤768px. Integrates the design-system Navigation
 * component and design tokens for consistent styling.
 *
 * Requirements: 8.1 (no horizontal scroll), 8.2 (breakpoint adjustments),
 *               8.3 (collapsible mobile nav at ≤768px).
 */

import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Container,
  Divider,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState, useCallback } from 'react';

import { Navigation, type NavigationItem } from '../../design-system/components/Navigation';
import { spacing } from '../../design-system/tokens/spacing';

/** Width of the navigation drawer on desktop */
const DRAWER_WIDTH = 260;

/** Mobile breakpoint — navigation collapses at or below this value */
const MOBILE_BREAKPOINT = 'md'; // 768px per theme config

export interface ResponsiveLayoutProps {
  /** Page title displayed in the app bar. */
  title: string;
  /** Navigation items for the sidebar. */
  navigationItems: NavigationItem[];
  /** ID of the currently active navigation item. */
  activeNavigationId?: string;
  /** Callback when a navigation item is selected. */
  onNavigationSelect?: (id: string) => void;
  /** User display name. */
  userName?: string;
  /** User role label. */
  userRole?: string;
  /** Number of unread notifications. */
  notificationCount?: number;
  /** Callback for logout action. */
  onLogout?: () => void;
  /** Callback for profile action. */
  onProfile?: () => void;
  /** Main content. */
  children: React.ReactNode;
}

/**
 * ResponsiveLayout provides the application shell with:
 * - A fixed app bar with a hamburger toggle on mobile
 * - A permanent side navigation on screens wider than 768px
 * - A collapsible (temporary) drawer navigation at ≤768px
 * - No horizontal scrolling across the 320–2560px viewport range
 * - Fluid content area constrained to a maximum width
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  title,
  navigationItems,
  activeNavigationId,
  onNavigationSelect,
  userName = 'User',
  userRole = 'User',
  notificationCount = 0,
  onLogout,
  onProfile,
  children,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(MOBILE_BREAKPOINT));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleNavSelect = useCallback(
    (id: string) => {
      onNavigationSelect?.(id);
      if (isMobile) {
        setMobileOpen(false);
      }
    },
    [onNavigationSelect, isMobile]
  );

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = useCallback(() => {
    handleMenuClose();
    onLogout?.();
  }, [onLogout]);

  const handleProfile = useCallback(() => {
    handleMenuClose();
    onProfile?.();
  }, [onProfile]);

  // Sidebar content (shared between mobile and desktop drawers)
  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        color: 'rgba(255, 255, 255, 0.95)',
        overflowX: 'hidden',
      }}
    >
      {/* Spacer for the fixed AppBar */}
      <Toolbar />

      {/* User info section */}
      <Box
        sx={{
          p: `${spacing.lg}px`,
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(167, 139, 250, 0.08)',
        }}
      >
        <Avatar
          sx={{
            width: 56,
            height: 56,
            margin: '0 auto',
            mb: `${spacing.sm}px`,
            bgcolor: '#3b82f6',
            fontSize: '1.25rem',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          }}
          aria-hidden="true"
        >
          {userName.charAt(0).toUpperCase()}
        </Avatar>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)' }}
        >
          {userName}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            textTransform: 'capitalize',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          {userRole}
        </Typography>
      </Box>

      {/* Design-system Navigation component */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Navigation
          items={navigationItems}
          activeId={activeNavigationId}
          onSelect={handleNavSelect}
          aria-label="Main navigation"
          sx={{
            '& .MuiListItemButton-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                backgroundColor: 'rgba(167, 139, 250, 0.1)',
                color: '#a78bfa',
              },
              '&.Mui-selected': {
                backgroundColor: 'rgba(167, 139, 250, 0.15)',
                color: '#a78bfa',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(167, 139, 250, 0.2)',
                },
              },
              '& .MuiListItemIcon-root': {
                color: 'inherit',
              },
            },
          }}
        />
      </Box>

      <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />

      {/* Settings footer */}
      <Box sx={{ p: `${spacing.sm}px` }}>
        <Navigation
          items={[{ id: 'settings', label: 'Settings', icon: <SettingsIcon /> }]}
          onSelect={() => {}}
          aria-label="Settings navigation"
          sx={{
            '& .MuiListItemButton-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                backgroundColor: 'rgba(167, 139, 250, 0.1)',
                color: '#a78bfa',
              },
              '& .MuiListItemIcon-root': {
                color: 'inherit',
              },
            },
          }}
        />
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        // Prevent horizontal scroll across all viewports (320–2560px)
        overflowX: 'hidden',
        maxWidth: '100vw',
      }}
    >
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          // On desktop, offset by the drawer width
          width: { xs: '100%', [MOBILE_BREAKPOINT]: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { xs: 0, [MOBILE_BREAKPOINT]: `${DRAWER_WIDTH}px` },
          zIndex: t => t.zIndex.drawer + 1,
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow:
            '0 2px 4px -1px rgba(0,0,0,0.2), 0 4px 5px 0 rgba(0,0,0,0.14), 0 1px 10px 0 rgba(0,0,0,0.12)',
        }}
      >
        <Toolbar>
          {/* Hamburger button — visible only at ≤768px */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          )}

          <Typography
            variant="h6"
            component="h1"
            noWrap
            sx={{ flexGrow: 1, fontWeight: 600, fontSize: '1.25rem' }}
          >
            {title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton color="inherit" aria-label={`${notificationCount} notifications`}>
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
              aria-controls="user-menu"
              aria-haspopup="true"
              aria-label="User account menu"
            >
              <AccountCircle />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{
          width: { xs: 0, [MOBILE_BREAKPOINT]: DRAWER_WIDTH },
          flexShrink: 0,
        }}
        aria-label="Sidebar navigation"
      >
        {/* Mobile drawer — temporary, collapsible at ≤768px */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', [MOBILE_BREAKPOINT]: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
              border: 'none',
              boxShadow: '4px 0 20px rgba(0, 0, 0, 0.8)',
            },
          }}
        >
          {sidebarContent}
        </Drawer>

        {/* Desktop drawer — permanent, visible above 768px */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', [MOBILE_BREAKPOINT]: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
              border: 'none',
              boxShadow: '4px 0 20px rgba(0, 0, 0, 0.5)',
            },
          }}
          open
        >
          {sidebarContent}
        </Drawer>
      </Box>

      {/* User Menu */}
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleProfile}>
          <Avatar sx={{ width: 24, height: 24, mr: 1 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <LogoutIcon sx={{ fontSize: 20, mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          // Prevent content from causing horizontal scroll
          minWidth: 0,
          width: { xs: '100%', [MOBILE_BREAKPOINT]: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #111118 50%, #0a0a1a 100%)',
        }}
      >
        {/* Toolbar spacer */}
        <Toolbar />

        {/* Content container — fluid with max-width for ultra-wide screens */}
        <Container
          maxWidth={false}
          sx={{
            flexGrow: 1,
            px: {
              xs: `${spacing.sm}px`, // 8px padding on smallest screens
              sm: `${spacing.md}px`, // 16px on small+
              lg: `${spacing.lg}px`, // 24px on large
              xl: `${spacing.xl}px`, // 32px on extra-large
            },
            py: `${spacing.lg}px`,
            maxWidth: '2560px',
            // Prevent any child overflow from causing horizontal scroll
            overflowX: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default ResponsiveLayout;
