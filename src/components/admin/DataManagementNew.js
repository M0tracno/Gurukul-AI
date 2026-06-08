import React, { useState, useEffect } from 'react';
import { toLocaleString } from '@mui/material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Backup as BackupIcon,
  CloudUpload as CloudUploadIcon,
  GetApp as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

const DataManagementNew = () => {
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [storageInfo, setStorageInfo] = useState(null);
  const [openBackupDialog, setOpenBackupDialog] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadDataManagementInfo();
  }, []);

  const loadDataManagementInfo = async () => {
    setLoading(true);
    
    // Mock data
    setTimeout(() => {
      setStorageInfo({
        totalSpace: 1000, // GB
        usedSpace: 650, // GB
        availableSpace: 350, // GB
        databaseSize: 45.6, // GB
        fileSize: 234.8, // GB
        backupSize: 89.2, // GB
        mediaSize: 280.4, // GB
      });

      setBackups([
        {
          id: 1,
          name: 'Full System Backup',
          date: '2024-01-20 02:00:00',
          size: '89.2 GB',
          type: 'Automatic',
          status: 'Completed',
          location: 'Cloud Storage',
        },
        {
          id: 2,
          name: 'Database Backup',
          date: '2024-01-19 14:30:00',
          size: '45.6 GB',
          type: 'Manual',
          status: 'Completed',
          location: 'Local Server',
        },
        {
          id: 3,
          name: 'User Data Backup',
          date: '2024-01-18 23:00:00',
          size: '156.8 GB',
          type: 'Scheduled',
          status: 'Completed',
          location: 'Cloud Storage',
        },
        {
          id: 4,
          name: 'Course Files Backup',
          date: '2024-01-17 01:15:00',
          size: '67.3 GB',
          type: 'Automatic',
          status: 'Failed',
          location: 'Local Server',
        },
      ]);

      setLoading(false);
    }, 1000);
  };

  const handleCreateBackup = () => {
    setLoading(true);
    
    // Simulate backup creation
    setTimeout(() => {
      const newBackup = {
        id: backups.length + 1,
        name: 'Manual System Backup',
        date: new Date().toLocaleString(),
        size: '92.4 GB',
        type: 'Manual',
        status: 'Completed',
        location: 'Cloud Storage',
      };
      
      setBackups([newBackup, ...backups]);
      setOpenBackupDialog(false);
      setLoading(false);
      showNotification('Backup created successfully', 'success');
    }, 3000);
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const getStoragePercentage = () => {
    if (!storageInfo) return 0;
    return (storageInfo.usedSpace / storageInfo.totalSpace) * 100;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Failed': return 'error';
      case 'In Progress': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2D3748', mb: 1 }}>
            Data Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage system data, backups, and storage
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<BackupIcon />}
          onClick={() => setOpenBackupDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            px: 3,
            py: 1.5,
          }}
        >
          Create Backup
        </Button>
      </Box>

      {/* Storage Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{xs:12,md:8}}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Storage Overview
              </Typography>
              
              {storageInfo && (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body1">
                      Total Storage Usage
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                      {storageInfo.usedSpace} GB / {storageInfo.totalSpace} GB
                    </Typography>
                  </Box>
                  
                  <LinearProgress
                    variant="determinate"
                    value={getStoragePercentage()}
                    sx={{
                      height: 12,
                      borderRadius: 6,
                      mb: 3,
                      backgroundColor: '#f5f5f5',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getStoragePercentage() > 80 ? '#f44336' : '#667eea',
                        borderRadius: 6,
                      },
                    }}
                  />
                  
                  <Grid container spacing={2}>
                    <Grid size={{xs:6,sm:3}}>
                      <Box textAlign="center" p={2} sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                          {storageInfo.databaseSize} GB
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Database
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid size={{xs:6,sm:3}}>
                      <Box textAlign="center" p={2} sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#764ba2' }}>
                          {storageInfo.fileSize} GB
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Files
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid size={{xs:6,sm:3}}>
                      <Box textAlign="center" p={2} sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#f093fb' }}>
                          {storageInfo.backupSize} GB
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Backups
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid size={{xs:6,sm:3}}>
                      <Box textAlign="center" p={2} sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#4facfe' }}>
                          {storageInfo.mediaSize} GB
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Media
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{xs:12,md:4}}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Data Management Tools
              </Typography>
                <List>
                <ListItem component="div" sx={{ borderRadius: 2, mb: 1, cursor: 'pointer' }}>
                  <ListItemIcon>
                    <BackupIcon sx={{ color: '#667eea' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Create Backup"
                    secondary="Full system backup"
                  />
                </ListItem>
                
                <ListItem component="div" sx={{ borderRadius: 2, mb: 1, cursor: 'pointer' }}>
                  <ListItemIcon>
                    <CloudUploadIcon sx={{ color: '#764ba2' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Export Data"
                    secondary="Download system data"
                  />
                </ListItem>
                
                <ListItem component="div" sx={{ borderRadius: 2, mb: 1, cursor: 'pointer' }}>
                  <ListItemIcon>
                    <RefreshIcon sx={{ color: '#f093fb' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Refresh Data"
                    secondary="Update cache and indexes"
                  />
                </ListItem>
                
                <ListItem component="div" sx={{ borderRadius: 2, mb: 1, cursor: 'pointer' }}>
                  <ListItemIcon>
                    <SecurityIcon sx={{ color: '#4facfe' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Security Scan"
                    secondary="Check data integrity"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Health Alerts */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{xs:12}}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                System Health Alerts
              </Typography>
              
              <Grid container spacing={2}>
                <Grid size={{xs:12,sm:6,md:3}}>
                  <Alert 
                    severity="success" 
                    icon={<CheckCircleIcon />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Database Online
                    </Typography>
                    <Typography variant="caption">
                      All systems operational
                    </Typography>
                  </Alert>
                </Grid>
                
                <Grid size={{xs:12,sm:6,md:3}}>
                  <Alert 
                    severity="warning" 
                    icon={<WarningIcon />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      High Storage Usage
                    </Typography>
                    <Typography variant="caption">
                      {getStoragePercentage().toFixed(1)}% used
                    </Typography>
                  </Alert>
                </Grid>
                
                <Grid size={{xs:12,sm:6,md:3}}>
                  <Alert 
                    severity="info" 
                    icon={<ScheduleIcon />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Scheduled Backup
                    </Typography>
                    <Typography variant="caption">
                      Tonight at 2:00 AM
                    </Typography>
                  </Alert>
                </Grid>
                
                <Grid size={{xs:12,sm:6,md:3}}>
                  <Alert 
                    severity="success" 
                    icon={<SecurityIcon />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Security Status
                    </Typography>
                    <Typography variant="caption">
                      All checks passed
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Backup History */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box p={3} pb={0}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Backup History
            </Typography>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Backup Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell></TableRow>
                ) : backups.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No backups found</Typography>
                    </TableCell></TableRow>
                ) : (
                  backups.map((backup) => (
                    <TableRow key={backup.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {backup.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {backup.date}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {backup.size}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={backup.type} 
                          size="small" 
                          variant="outlined"
                          color={backup.type === 'Manual' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={backup.status} 
                          size="small" 
                          color={getStatusColor(backup.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {backup.location}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          sx={{ mr: 1, minWidth: 'auto' }}
                          disabled={backup.status !== 'Completed'}
                        >
                          Download
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          color="error"
                          sx={{ minWidth: 'auto' }}
                        >
                          Delete
                        </Button>
                      </TableCell></TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Backup Dialog */}
      <Dialog open={openBackupDialog} onClose={() => setOpenBackupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Create System Backup
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 3 }}>
            This will create a complete backup of all system data including database, user files, and configurations.
          </Alert>
          
          <Typography variant="body1" gutterBottom>
            Backup will include:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <StorageIcon sx={{ color: '#667eea' }} />
              </ListItemIcon>
              <ListItemText primary="Database (45.6 GB)" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CloudUploadIcon sx={{ color: '#764ba2' }} />
              </ListItemIcon>
              <ListItemText primary="User Files (234.8 GB)" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon sx={{ color: '#f093fb' }} />
              </ListItemIcon>
              <ListItemText primary="System Configuration" />
            </ListItem>
          </List>
          
          <Typography variant="body2" color="text.secondary">
            Estimated backup size: ~92 GB
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Estimated time: 15-20 minutes
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenBackupDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateBackup} 
            variant="contained"
            disabled={loading}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            {loading ? <CircularProgress size={20} /> : 'Create Backup'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DataManagementNew;