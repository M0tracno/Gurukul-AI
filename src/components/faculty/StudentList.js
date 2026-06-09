import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Menu,
  MenuItem,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Email as EmailIcon,
  Grade as GradeIcon,
  TrendingUp as TrendingUpIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import { useDatabase } from '../../hooks/useDatabase';
import EnhancedFacultyService from '../../services/enhancedFacultyService';

// Styled components for modern design
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease-in-out',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  overflow: 'hidden',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
  },
}));

const StudentAvatar = styled(Avatar)(({ theme, performance }) => {
  const getColor = () => {
    if (performance === 'Excellent') return '#4CAF50';
    if (performance === 'Good') return '#2196F3';
    if (performance === 'Average') return '#FF9800';
    return '#f44336';
  };

  return {
    width: 56,
    height: 56,
    backgroundColor: getColor(),
    fontSize: '1.5rem',
    fontWeight: 'bold',
    border: `3px solid ${getColor()}20`,
  };
});

const PerformanceChip = styled(Chip)(({ theme, performance }) => {
  const getColors = () => {
    switch (performance) {
      case 'Excellent':
        return { bg: '#4CAF50', color: 'white' };
      case 'Good':
        return { bg: '#2196F3', color: 'white' };
      case 'Average':
        return { bg: '#FF9800', color: 'white' };
      default:
        return { bg: '#f44336', color: 'white' };
    }
  };

  const colors = getColors();
  return {
    backgroundColor: colors.bg,
    color: colors.color,
    fontWeight: 600,
    borderRadius: 12,
  };
});

const StatusChip = styled(Chip)(({ theme, status }) => ({
  backgroundColor: status === 'Active' ? '#4CAF50' : '#f44336',
  color: 'white',
  fontWeight: 600,
  borderRadius: 12,
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: 24,
  padding: theme.spacing(4),
  marginBottom: theme.spacing(3),
  position: 'relative',
  overflow: 'hidden',
  color: 'white',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 150,
    height: 150,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '50%',
  },
}));

const StatsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
  flexWrap: 'wrap',
}));

const StatCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.8)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
  },
}));

const StudentCard = styled(StyledCard)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  '& .MuiCardContent-root': {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(3),
  },
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  borderRadius: 8,
  padding: theme.spacing(0.5),
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    transform: 'scale(1.1)',
  },
}));

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: theme.spacing(3),
  },
  searchContainer: {
    marginBottom: theme.spacing(3),
    '& .MuiOutlinedInput-root': {
      borderRadius: 16,
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      '& fieldset': {
        borderColor: 'rgba(102, 126, 234, 0.3)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(102, 126, 234, 0.6)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#667eea',
      },
    },
  },
  filterButton: {
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    '&:hover': {
      background: 'rgba(255, 255, 255, 1)',
    },
  },
  studentGrid: {
    '& .MuiGrid-item': {
      transition: 'all 0.3s ease',
    },
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(6),
    color: '#666',
    background: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    backdropFilter: 'blur(10px)',
  },
}));

const StudentList = () => {
  const classes = useStyles();
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const { getAllStudents, error } = useDatabase(); // Fetch students from enhanced faculty service
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        // First try the enhanced faculty service
        const result = await EnhancedFacultyService.getStudents();
        if (result.success && result.data.length > 0) {
          const formattedStudents = result.data.map(student => ({
            id: student.studentId || student.id,
            name: student.name,
            email: student.email,
            grade: student.grade,
            enrolledCourses: student.courses || [],
            status: student.status,
            performance: student.performance,
          }));
          setStudents(formattedStudents);
          setFilteredStudents(formattedStudents);
        } else {
          // Fallback to database service
          const dbResult = await getAllStudents();
          if (dbResult.success) {
            const formattedStudents = dbResult.data.map(student => ({
              id: student.rollNumber || student.id,
              name: `${student.firstName} ${student.lastName}`,
              email: student.email,
              grade: student.classId
                ? `${student.classId}${student.section ? student.section : ''}`
                : '10th',
              enrolledCourses: student.enrolledCourses || ['Mathematics', 'Science'],
              status: 'Active',
              performance: 'Good',
            }));
            setStudents(formattedStudents);
            setFilteredStudents(formattedStudents);
          }
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [getAllStudents]);
  // Handle search and filter
  useEffect(() => {
    let filtered = students;

    // Apply filter
    if (selectedFilter !== 'All') {
      filtered = filtered.filter(
        student => student.performance === selectedFilter || student.status === selectedFilter
      );
    }

    // Apply search
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        student =>
          student.name.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query) ||
          student.id.toLowerCase().includes(query) ||
          (student.grade && student.grade.toLowerCase().includes(query))
      );
    }

    setFilteredStudents(filtered);
  }, [searchQuery, students, selectedFilter]);

  const handleSearchChange = event => {
    setSearchQuery(event.target.value);
  };
  const handleEditStudent = studentId => {
    // In a real app, this would navigate to edit page or open a modal
    console.log('Edit student with ID:', studentId);
  };

  const handleDeleteStudent = studentId => {
    // In a real app, this would show a confirmation dialog
    console.log('Delete student with ID:', studentId);

    // For demo, just filter out the student
    const updatedStudents = students.filter(student => student.id !== studentId);
    setStudents(updatedStudents);
    setFilteredStudents(
      updatedStudents.filter(
        student =>
          searchQuery === '' ||
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  };
  const getStudentStats = () => {
    const total = students.length;
    const excellent = students.filter(s => s.performance === 'Excellent').length;
    const good = students.filter(s => s.performance === 'Good').length;
    const average = students.filter(s => s.performance === 'Average').length;
    const poor = students.filter(s => s.performance === 'Poor').length;
    const active = students.filter(s => s.status === 'Active').length;

    return { total, excellent, good, average, poor, active };
  };

  const stats = getStudentStats();

  const handleFilterClick = event => {
    setFilterAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchor(null);
  };

  const handleFilterSelect = filter => {
    setSelectedFilter(filter);
    setFilterAnchor(null);

    if (filter === 'All') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(
        student => student.performance === filter || student.status === filter
      );
      setFilteredStudents(filtered);
    }
  };

  const handleViewStudent = studentId => {
    console.log('View student with ID:', studentId);
  };

  return (
    <Container maxWidth="xl" className={classes.root}>
      {/* Header Section */}
      <HeaderSection>
        <Box position="relative" zIndex={2}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <GroupIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Student Management
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Monitor and manage your students effectively
              </Typography>
            </Box>
          </Box>
        </Box>
      </HeaderSection>

      {/* Stats Cards */}
      <StatsContainer>
        <StatCard sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <GroupIcon sx={{ fontSize: 32, color: '#667eea' }} />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="#667eea">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Students
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </StatCard>

        <StatCard sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <TrendingUpIcon sx={{ fontSize: 32, color: '#4CAF50' }} />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="#4CAF50">
                  {stats.excellent}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Excellent Performance
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </StatCard>

        <StatCard sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <SchoolIcon sx={{ fontSize: 32, color: '#2196F3' }} />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="#2196F3">
                  {stats.active}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Students
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </StatCard>
      </StatsContainer>

      {/* Search and Filter */}
      <Box display="flex" gap={2} alignItems="center" className={classes.searchContainer}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search students by name, email, or ID..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          className={classes.filterButton}
          startIcon={<FilterIcon />}
          onClick={handleFilterClick}
          variant="outlined"
        >
          {selectedFilter}
        </Button>
        <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={handleFilterClose}>
          {['All', 'Excellent', 'Good', 'Average', 'Poor', 'Active'].map(filter => (
            <MenuItem key={filter} onClick={() => handleFilterSelect(filter)}>
              {filter}
            </MenuItem>
          ))}
        </Menu>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            borderRadius: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
            },
          }}
        >
          Add Student
        </Button>
      </Box>

      {/* Loading State */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <>
          {/* Students Grid */}
          {filteredStudents.length === 0 ? (
            <Box className={classes.emptyState}>
              <PersonIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No students found
              </Typography>
              <Typography variant="body2">
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'Start by adding your first student'}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3} className={classes.studentGrid}>
              {filteredStudents.map(student => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={student.id}>
                  <StudentCard>
                    <CardContent>
                      {/* Student Header */}
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <StudentAvatar performance={student.performance}>
                          {student.name.charAt(0).toUpperCase()}
                        </StudentAvatar>
                        <Box flex={1}>
                          <Typography variant="h6" fontWeight="bold" noWrap>
                            {student.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            ID: {student.id}
                          </Typography>
                        </Box>
                        <Box>
                          <ActionButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              // Show more options
                            }}
                          >
                            <MoreIcon />
                          </ActionButton>
                        </Box>
                      </Box>

                      {/* Student Details */}
                      <Box mb={2}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <EmailIcon sx={{ fontSize: 16, color: '#666' }} />
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {student.email}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <SchoolIcon sx={{ fontSize: 16, color: '#666' }} />
                          <Typography variant="body2" color="text.secondary">
                            Grade: {student.grade}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Performance and Status */}
                      <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                        <PerformanceChip
                          performance={student.performance}
                          label={student.performance}
                          size="small"
                        />
                        <StatusChip status={student.status} label={student.status} size="small" />
                      </Box>

                      {/* Enrolled Courses */}
                      <Box mb={2}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">
                          ENROLLED COURSES
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                          {student.enrolledCourses?.slice(0, 3).map((course, index) => (
                            <Chip
                              key={index}
                              label={course}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                color: '#667eea',
                                fontSize: '0.7rem',
                                height: 24,
                              }}
                            />
                          ))}
                          {student.enrolledCourses?.length > 3 && (
                            <Chip
                              label={`+${student.enrolledCourses.length - 3}`}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                color: '#667eea',
                                fontSize: '0.7rem',
                                height: 24,
                              }}
                            />
                          )}
                        </Box>
                      </Box>

                      {/* Action Buttons */}
                      <Divider sx={{ my: 2 }} />
                      <Box display="flex" justifyContent="space-between">
                        <ActionButton
                          size="small"
                          onClick={() => handleViewStudent(student.id)}
                          sx={{ color: '#2196F3' }}
                        >
                          <ViewIcon />
                        </ActionButton>
                        <ActionButton
                          size="small"
                          onClick={() => handleEditStudent(student.id)}
                          sx={{ color: '#FF9800' }}
                        >
                          <EditIcon />
                        </ActionButton>
                        <ActionButton
                          size="small"
                          onClick={() => handleDeleteStudent(student.id)}
                          sx={{ color: '#f44336' }}
                        >
                          <DeleteIcon />
                        </ActionButton>
                      </Box>
                    </CardContent>
                  </StudentCard>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Container>
  );
};

export default StudentList;
