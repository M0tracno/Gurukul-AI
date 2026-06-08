import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { AppBar, Box, Card, CardContent, Drawer, Fab, IconButton, List, ListItem, ListItemIcon, ListItemText, Menu, MenuItem, Tab, Tabs, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { 
  AutoAwesome,
  Analytics,
  Notifications,
  VideoCall,
  SmartToy,
  Dashboard,
  Close
} from '@mui/icons-material';

// Smart Features Quick Access Component
const SmartFeaturesQuickAccess = ({ onFeatureSelect }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const originalTheme = useTheme();
  
  const features = [
    {
      id: 'ai-insights',
      title: 'AI Insights',
      description: 'Personalized learning analytics',
      icon: <SmartToy />,
      color: theme.palette.primary.main,
      path: '/smart-features/ai-insights'
    },
    {
      id: 'collaboration',
      title: 'Live Collaboration',
      description: 'Real-time communication',
      icon: <VideoCall />,
      color: theme.palette.secondary.main,
      path: '/smart-features/collaboration'
    },
    {
      id: 'analytics',
      title: 'Advanced Analytics',
      description: 'Performance tracking',
      icon: <Analytics />,
      color: theme.palette.success.main,
      path: '/smart-features/analytics'
    },
    {
      id: 'notifications',
      title: 'Smart Notifications',
      description: 'Intelligent alerts',
      icon: <Notifications />,
      color: theme.palette.info.main,
      path: '/smart-features/notifications'
    }
  ];

  const handleFeatureClick = (feature) => {
    if (onFeatureSelect) {
      onFeatureSelect(feature);
    }
    navigate(feature.path);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Smart Features
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
        {features.map((feature) => (
          <motion.div
            key={feature.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  bgcolor: alpha(feature.color, 0.05)
                }
              }}
              onClick={() => handleFeatureClick(feature)}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ color: feature.color, mr: 1 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="subtitle2" noWrap>
                    {feature.title}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Box>
    </Box>
  );
};

// Smart Features Tabs Component
const SmartFeaturesTabs = ({ currentPath, onTabChange }) => {
  const theme = useTheme();
  const tabs = [
    { label: 'Hub', value: '/smart-features', icon: <Dashboard /> },
    { label: 'AI Insights', value: '/smart-features/ai-insights', icon: <SmartToy /> },
    { label: 'Collaboration', value: '/smart-features/collaboration', icon: <VideoCall /> },
    { label: 'Analytics', value: '/smart-features/analytics', icon: <Analytics /> },
    { label: 'Notifications', value: '/smart-features/notifications', icon: <Notifications /> }
  ];

  const currentTab = tabs.find(tab => currentPath.startsWith(tab.value))?.value || tabs[0].value;

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Tabs
        value={currentTab}
        onChange={(event, newValue) => onTabChange && onTabChange(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            minHeight: 48,
            textTransform: 'none'
          }
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            label={tab.label}
            value={tab.value}
            icon={tab.icon}
            iconPosition="start"
            sx={{
              '& .MuiTab-iconWrapper': {
                mr: 1,
                mb: 0
              }
            }}
          />
        ))}
      </Tabs>
    </AppBar>
  );
};

// Floating Action Button for Quick Access
const SmartFeaturesFAB = () => {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const features = [
    { 
      title: 'AI Insights', 
      icon: <SmartToy />, 
      path: '/smart-features/ai-insights',
      color: theme.palette.primary.main 
    },
    { 
      title: 'Collaboration', 
      icon: <VideoCall />, 
      path: '/smart-features/collaboration',
      color: theme.palette.secondary.main 
    },
    { 
      title: 'Analytics', 
      icon: <Analytics />, 
      path: '/smart-features/analytics',
      color: theme.palette.success.main 
    },
    { 
      title: 'Notifications', 
      icon: <Notifications />, 
      path: '/smart-features/notifications',
      color: theme.palette.info.main 
    }
  ];

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setOpen(true);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setOpen(false);
  };

  const handleFeatureSelect = (path) => {
    navigate(path);
    handleClose();
  };

  return (
    <>
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: theme.zIndex.speedDial
        }}
        onClick={handleClick}
      >
        <AutoAwesome />
      </Fab>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center'
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center'
        }}
        PaperProps={{
          sx: {
            mt: -1,
            minWidth: 200,
            maxWidth: 300
          }
        }}
      >
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle2" sx={{ px: 1, pb: 1 }}>
            Smart Features
          </Typography>
          {features.map((feature) => (
            <MenuItem
              key={feature.path}
              onClick={() => handleFeatureSelect(feature.path)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&:hover': {
                  bgcolor: alpha(feature.color, 0.1)
                }
              }}
            >
              <Box sx={{ color: feature.color, mr: 1.5 }}>
                {feature.icon}
              </Box>
              <Typography variant="body2">
                {feature.title}
              </Typography>
            </MenuItem>
          ))}
        </Box>
      </Menu>
    </>
  );
};

// Smart Features Drawer Component
const SmartFeaturesDrawer = ({ open, onClose, onFeatureSelect }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const features = [
    {
      title: 'Smart Features Hub',
      subtitle: 'Overview and quick access',
      icon: <Dashboard />,
      path: '/smart-features',
      color: theme.palette.grey[600]
    },
    {
      title: 'AI Insights Dashboard',
      subtitle: 'Personalized learning analytics',
      icon: <SmartToy />,
      path: '/smart-features/ai-insights',
      color: theme.palette.primary.main
    },
    {
      title: 'Real-time Collaboration',
      subtitle: 'Live communication tools',
      icon: <VideoCall />,
      path: '/smart-features/collaboration',
      color: theme.palette.secondary.main
    },
    {
      title: 'Advanced Analytics',
      subtitle: 'Performance and engagement tracking',
      icon: <Analytics />,
      path: '/smart-features/analytics',
      color: theme.palette.success.main
    },
    {
      title: 'Smart Notifications',
      subtitle: 'Intelligent alert management',
      icon: <Notifications />,
      path: '/smart-features/notifications',
      color: theme.palette.info.main
    }
  ];

  const handleFeatureClick = (feature) => {
    if (onFeatureSelect) {
      onFeatureSelect(feature);
    }
    navigate(feature.path);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 320 }
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Smart Features
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>

        <List>
          {features.map((feature) => (
            <ListItem
              key={feature.path}
              button
              onClick={() => handleFeatureClick(feature)}
              selected={location.pathname === feature.path}
              sx={{
                borderRadius: 1,
                mb: 1,
                '&.Mui-selected': {
                  bgcolor: alpha(feature.color, 0.1),
                  '&:hover': {
                    bgcolor: alpha(feature.color, 0.15)
                  }
                },
                '&:hover': {
                  bgcolor: alpha(feature.color, 0.05)
                }
              }}
            >
              <ListItemIcon sx={{ color: feature.color }}>
                {feature.icon}
              </ListItemIcon>
              <ListItemText
                primary={feature.title}
                secondary={feature.subtitle}
                primaryTypographyProps={{
                  variant: 'subtitle2'
                }}
                secondaryTypographyProps={{
                  variant: 'caption'
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

// Main Navigation Component
const SmartFeaturesNavigation = ({ 
  variant = 'tabs', // 'tabs', 'drawer', 'fab', 'quickAccess'
  onFeatureSelect,
  drawerOpen = false,
  onDrawerClose
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleTabChange = (newValue) => {
    navigate(newValue);
  };

  switch (variant) {
    case 'tabs':
      return (
        <SmartFeaturesTabs
          currentPath={location.pathname}
          onTabChange={handleTabChange}
        />
      );
    
    case 'drawer':
      return (
        <SmartFeaturesDrawer
          open={drawerOpen}
          onClose={onDrawerClose}
          onFeatureSelect={onFeatureSelect}
        />
      );
    
    case 'fab':
      return <SmartFeaturesFAB />;
    
    case 'quickAccess':
      return <SmartFeaturesQuickAccess onFeatureSelect={onFeatureSelect} />;
    
    default:
      return (
        <SmartFeaturesTabs
          currentPath={location.pathname}
          onTabChange={handleTabChange}
        />
      );
  }
};

export default SmartFeaturesNavigation;
export {
  SmartFeaturesQuickAccess,
  SmartFeaturesTabs,
  SmartFeaturesFAB,
  SmartFeaturesDrawer
};
