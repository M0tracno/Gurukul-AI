import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  TablePagination,
  IconButton,
  Chip,
  Avatar,
  Fab,
  Alert,
  Snackbar,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  FamilyRestroom as FamilyIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Key as KeyIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import AdminService from '../../services/adminService';

const UserManagementNew = () => {  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  
  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  
  // Form states
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    role: 'student',
    firstName: '',
    lastName: '',
    email: '',
    age: '',
    parentEmail: '',
    parentName: '',
    parentPhone: '',
    department: '',
    qualification: '',
    experience: '',
  });
  
  // Generated credentials
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  
  // Notification
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await AdminService.getUsers();
      if (result.success) {
        setUsers(result.data.users || []);
      } else {
        showNotification('Error loading users', 'error');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generateUniqueId = (role) => {
    const timestamp = Date.now();
    const prefix = role === 'student' ? 'STU' : role === 'faculty' ? 'FAC' : 'PAR';
    return `${prefix}${timestamp}`;
  };

  const handleAddUser = async () => {
    try {
      setLoading(true);
      
      // Generate credentials
      const userPassword = generatePassword();
      const parentPassword = newUser.role === 'student' ? generatePassword() : null;
      const userId = generateUniqueId(newUser.role);
      const parentId = newUser.role === 'student' ? generateUniqueId('parent') : null;

      // Prepare user data
      const userData = {
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        password: userPassword,
        additionalData: {
          ...(newUser.role === 'student' && {
            studentId: userId,
            age: newUser.age,
            grade: 'General',
          }),
          ...(newUser.role === 'faculty' && {
            employeeId: userId,
            department: newUser.department || 'General',
            qualification: newUser.qualification,
            experience: newUser.experience,
          }),
        },
      };

      // Create main user
      const result = await AdminService.createUser(userData);
      
      if (result.success) {
        // Store generated credentials
        const credentials = {
          user: {
            id: userId,
            name: `${newUser.firstName} ${newUser.lastName}`,
            email: newUser.email,
            password: userPassword,
            role: newUser.role,
          },
        };

        // If student, also create parent account
        if (newUser.role === 'student' && newUser.parentEmail) {
          const parentData = {
            role: 'parent',
            firstName: newUser.parentName.split(' ')[0] || 'Parent',
            lastName: newUser.parentName.split(' ').slice(1).join(' ') || 'User',
            email: newUser.parentEmail,
            password: parentPassword,
            additionalData: {
              parentId: parentId,
              studentId: userId,
              phoneNumber: newUser.parentPhone,
            },
          };

          const parentResult = await AdminService.createUser(parentData);
          
          if (parentResult.success) {
            credentials.parent = {
              id: parentId,
              name: newUser.parentName,
              email: newUser.parentEmail,
              password: parentPassword,
              role: 'parent',
            };
          }
        }

        setGeneratedCredentials(credentials);
        setOpenPasswordDialog(true);
        setOpenAddDialog(false);
        resetForm();
        loadUsers();
        showNotification('User created successfully', 'success');
      } else {
        showNotification(result.error || 'Error creating user', 'error');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showNotification('Error creating user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    try {
      setLoading(true);
      
      const userData = {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        additionalData: {
          ...(newUser.role === 'faculty' && {
            department: newUser.department,
            qualification: newUser.qualification,
            experience: newUser.experience,
          }),
        },
      };

      const result = await AdminService.updateUser(selectedUser.id, userData);
      
      if (result.success) {
        setOpenEditDialog(false);
        resetForm();
        loadUsers();
        showNotification('User updated successfully', 'success');
      } else {
        showNotification(result.error || 'Error updating user', 'error');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('Error updating user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setLoading(true);
      
      const result = await AdminService.deleteUser(selectedUser.id);
      
      if (result.success) {
        setOpenDeleteDialog(false);
        setSelectedUser(null);
        loadUsers();
        showNotification('User deleted successfully', 'success');
      } else {
        showNotification(result.error || 'Error deleting user', 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('Error deleting user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewUser({
      role: 'student',
      firstName: '',
      lastName: '',
      email: '',
      age: '',
      parentEmail: '',
      parentName: '',
      parentPhone: '',
      department: '',
      qualification: '',
      experience: '',
    });
    setSelectedUser(null);
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const openEditUserDialog = (user) => {
    setSelectedUser(user);
    setNewUser({
      role: user.role?.toLowerCase() || 'student',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      age: user.age || '',
      parentEmail: '',
      parentName: '',
      parentPhone: '',
      department: user.department || '',
      qualification: user.qualification || '',
      experience: user.experience || '',
    });
    setOpenEditDialog(true);
  };

  const openViewUserDialog = (user) => {
    setSelectedUser(user);
    setOpenViewDialog(true);
  };

  const openDeleteUserDialog = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const filteredUsers = users.filter((user) => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return user.role?.toLowerCase() === 'student';
    if (tabValue === 2) return user.role?.toLowerCase() === 'faculty';
    if (tabValue === 3) return user.role?.toLowerCase() === 'parent';
    return true;
  });

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'student': return 'primary';
      case 'faculty': return 'secondary';
      case 'parent': return 'warning';
      case 'admin': return 'error';
      default: return 'default';
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'student': return <PersonIcon />;
      case 'faculty': return <SchoolIcon />;
      case 'parent': return <FamilyIcon />;
      default: return <PersonIcon />;
    }
  };
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2D3748', mb: 1 }}>
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage students, faculty, and parent accounts
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            px: 3,
            py: 1.5,
          }}
        >
          Add New User
        </Button>
      </Box>

      {/* User Statistics */}
      <Grid container spacing={3} mb={3}>
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #667eea15 0%, #667eea05 100%)' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <PersonIcon sx={{ fontSize: 48, color: '#667eea', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#667eea' }}>
                {users.filter(u => u.role?.toLowerCase() === 'student').length}
              </Typography>
              <Typography variant="h6">Students</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #764ba215 0%, #764ba205 100%)' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <SchoolIcon sx={{ fontSize: 48, color: '#764ba2', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#764ba2' }}>
                {users.filter(u => u.role?.toLowerCase() === 'faculty').length}
              </Typography>
              <Typography variant="h6">Faculty</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #f093fb15 0%, #f093fb05 100%)' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <FamilyIcon sx={{ fontSize: 48, color: '#f093fb', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f093fb' }}>
                {users.filter(u => u.role?.toLowerCase() === 'parent').length}
              </Typography>
              <Typography variant="h6">Parents</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{xs:12,sm:6,md:3}}>
          <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #4facfe15 0%, #4facfe05 100%)' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <BadgeIcon sx={{ fontSize: 48, color: '#4facfe', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4facfe' }}>
                {users.length}
              </Typography>
              <Typography variant="h6">Total Users</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Users Table */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="All Users" />
              <Tab label="Students" />
              <Tab label="Faculty" />
              <Tab label="Parents" />
            </Tabs>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell></TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No users found</Typography>
                    </TableCell></TableRow>
                ) : (
                  filteredUsers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ mr: 2, bgcolor: '#667eea' }}>
                              {getRoleIcon(user.role)}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {user.firstName} {user.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {user.name}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role || 'Student'}
                            color={getRoleColor(user.role)}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {user.employeeId || user.studentId || user.parentId || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.status || 'Active'}
                            color="success"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => openViewUserDialog(user)}
                              sx={{ color: '#2196f3' }}
                            >
                              <ViewIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => openEditUserDialog(user)}
                              sx={{ color: '#ff9800' }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => openDeleteUserDialog(user)}
                              sx={{ color: '#f44336' }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell></TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredUsers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="md" fullWidth>        <DialogTitle>
          Add New User
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={{xs:12}}>
              <FormControl fullWidth>
                <InputLabel>User Role</InputLabel>
                <Select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  label="User Role"
                >
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="faculty">Faculty</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{xs:6}}>
              <TextField
                fullWidth
                label="First Name"
                value={newUser.firstName}
                onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                required
              />
            </Grid>
            
            <Grid size={{xs:6}}>
              <TextField
                fullWidth
                label="Last Name"
                value={newUser.lastName}
                onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                required
              />
            </Grid>
            
            <Grid size={{xs:12}}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </Grid>

            {newUser.role === 'student' && (
              <>
                <Grid size={{xs:6}}>
                  <TextField
                    fullWidth
                    label="Age"
                    type="number"
                    value={newUser.age}
                    onChange={(e) => setNewUser({ ...newUser, age: e.target.value })}
                  />
                </Grid>
                
                <Grid size={{xs:12}}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Parent Information
                    </Typography>
                  </Divider>
                </Grid>
                
                <Grid size={{xs:6}}>
                  <TextField
                    fullWidth
                    label="Parent Name"
                    value={newUser.parentName}
                    onChange={(e) => setNewUser({ ...newUser, parentName: e.target.value })}
                  />
                </Grid>
                
                <Grid size={{xs:6}}>
                  <TextField
                    fullWidth
                    label="Parent Email"
                    type="email"
                    value={newUser.parentEmail}
                    onChange={(e) => setNewUser({ ...newUser, parentEmail: e.target.value })}
                  />
                </Grid>
                
                <Grid size={{xs:6}}>
                  <TextField
                    fullWidth
                    label="Parent Phone"
                    value={newUser.parentPhone}
                    onChange={(e) => setNewUser({ ...newUser, parentPhone: e.target.value })}
                  />
                </Grid>
              </>
            )}

            {newUser.role === 'faculty' && (
              <>
                <Grid size={{xs:6}}>
                  <TextField
                    fullWidth
                    label="Department"
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  />
                </Grid>
                
                <Grid size={{xs:6}}>
                  <TextField
                    fullWidth
                    label="Qualification"
                    value={newUser.qualification}
                    onChange={(e) => setNewUser({ ...newUser, qualification: e.target.value })}
                  />
                </Grid>
                
                <Grid size={{xs:6}}>
                  <TextField
                    fullWidth
                    label="Experience (years)"
                    type="number"
                    value={newUser.experience}
                    onChange={(e) => setNewUser({ ...newUser, experience: e.target.value })}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenAddDialog(false)} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddUser} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={loading || !newUser.firstName || !newUser.lastName || !newUser.email}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            {loading ? <CircularProgress size={20} /> : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generated Password Dialog */}
      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <KeyIcon sx={{ mr: 2, color: '#4caf50' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              User Created Successfully!
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="success" sx={{ mb: 3 }}>
            User account(s) have been created. Please share these credentials with the respective users.
          </Alert>
          
          {generatedCredentials && (
            <Box>
              <Paper sx={{ p: 3, mb: 2, bgcolor: '#f8f9fa' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#667eea' }}>
                  {generatedCredentials.user.role.charAt(0).toUpperCase() + generatedCredentials.user.role.slice(1)} Account
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><BadgeIcon /></ListItemIcon>
                    <ListItemText primary="User ID" secondary={generatedCredentials.user.id} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><PersonIcon /></ListItemIcon>
                    <ListItemText primary="Name" secondary={generatedCredentials.user.name} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><EmailIcon /></ListItemIcon>
                    <ListItemText primary="Email" secondary={generatedCredentials.user.email} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><KeyIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Password" 
                      secondary={
                        <Typography 
                          variant="body2" 
                          sx={{ fontFamily: 'monospace', bgcolor: '#e3f2fd', p: 1, borderRadius: 1, display: 'inline-block' }}
                        >
                          {generatedCredentials.user.password}
                        </Typography>
                      } 
                    />
                  </ListItem>
                </List>
              </Paper>

              {generatedCredentials.parent && (
                <Paper sx={{ p: 3, bgcolor: '#fff3e0' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#f093fb' }}>
                    Parent Account
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><BadgeIcon /></ListItemIcon>
                      <ListItemText primary="Parent ID" secondary={generatedCredentials.parent.id} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><FamilyIcon /></ListItemIcon>
                      <ListItemText primary="Name" secondary={generatedCredentials.parent.name} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><EmailIcon /></ListItemIcon>
                      <ListItemText primary="Email" secondary={generatedCredentials.parent.email} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><KeyIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Password" 
                        secondary={
                          <Typography 
                            variant="body2" 
                            sx={{ fontFamily: 'monospace', bgcolor: '#ffe0b2', p: 1, borderRadius: 1, display: 'inline-block' }}
                          >
                            {generatedCredentials.parent.password}
                          </Typography>
                        } 
                      />
                    </ListItem>
                  </List>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => {
              setOpenPasswordDialog(false);
              setGeneratedCredentials(null);
            }} 
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Other dialogs (Edit, View, Delete) would go here */}
      {/* ... */}

      {/* Notification Snackbar */}
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

export default UserManagementNew;