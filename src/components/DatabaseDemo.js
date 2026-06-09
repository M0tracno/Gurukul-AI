import React, { useState } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

/**
 * A demo component for testing database operations
 */
const DatabaseDemo = () => {
  const { loading, getAllUsers, createUser, deleteUser } = useDatabase();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  const handleLoadUsers = async () => {
    try {
      setError(null);
      const result = await getAllUsers();
      if (result.success) {
        setUsers(result.data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError(error.message);
    }
  };

  const handleCreateUser = async () => {
    try {
      setError(null);
      const testUser = {
        name: `Test User ${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        role: 'student',
      };

      const result = await createUser(testUser);
      if (result.success) {
        handleLoadUsers(); // Refresh the list
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.message);
    }
  };

  return (
    <Paper style={{ padding: 20 }}>
      <Typography variant="h6" gutterBottom>
        Database Operations Demo
      </Typography>

      <Box mb={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleLoadUsers}
          disabled={loading}
          style={{ marginRight: 10 }}
        >
          Load Users
        </Button>
        <Button variant="contained" color="secondary" onClick={handleCreateUser} disabled={loading}>
          Create Test User
        </Button>
      </Box>

      {error && (
        <Box mb={2} p={2} bgcolor="#ffebee" borderRadius={4}>
          <Typography sx={{ color: 'error.main' }}>{error}</Typography>
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      onClick={() => deleteUser(user.id).then(handleLoadUsers)}
                      disabled={loading}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default DatabaseDemo;
