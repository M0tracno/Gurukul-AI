import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import errorMonitoring from '../utils/errorMonitoring';
import securityHelpers from '../utils/securityHelpers';
import env from '../config/env';

// Import utilities with fallback handling

// Log imports to verify they're correctly exported
console.log({
  securityHelpers: typeof securityHelpers !== 'undefined',
});

// Base API URL
const API_BASE_URL = `${env.API_URL}/api`;

export const useDashboard = userType => {
  const { currentUser, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [notifications, setNotifications] = useState(0);
  const [currentView, setCurrentView] = useState('dashboard');

  // Generic API call function
  const apiCall = async (endpoint, options = {}) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call to ${endpoint} failed:`, error);
      throw error;
    }
  };

  // Load dashboard data based on user type
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      let dashboardData = {};

      switch (userType) {
        case 'admin':
          dashboardData = await loadAdminData();
          break;
        case 'faculty':
          dashboardData = await loadFacultyData();
          break;
        case 'student':
          dashboardData = await loadStudentData();
          break;
        case 'parent':
          dashboardData = await loadParentData();
          break;
        default:
          throw new Error('Invalid user type');
      }

      setStats(dashboardData.stats || {});
      setNotifications(dashboardData.notifications || 0);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error.message);
      errorMonitoring.captureError(error, { userType, userId: currentUser?.id });
    } finally {
      setLoading(false);
    }
  };

  // Admin-specific data loading
  const loadAdminData = async () => {
    try {
      const [usersData, systemData] = await Promise.all([
        apiCall('/admin/users/stats'),
        apiCall('/admin/system/stats'),
      ]);

      return {
        stats: {
          totalUsers: usersData.totalUsers || 0,
          totalStudents: usersData.totalStudents || 0,
          totalFaculty: usersData.totalFaculty || 0,
          totalParents: usersData.totalParents || 0,
          systemHealth: systemData.health || 'Good',
        },
        notifications: systemData.notifications || 0,
      };
    } catch (error) {
      console.error('Error loading admin data:', error);
      // Fallback data
      return {
        stats: {
          totalUsers: 0,
          totalStudents: 0,
          totalFaculty: 0,
          totalParents: 0,
          systemHealth: 'Unknown',
        },
        notifications: 0,
      };
    }
  };

  // Faculty-specific data loading
  const loadFacultyData = async () => {
    try {
      const [coursesData, studentsData] = await Promise.all([
        apiCall('/faculty/courses'),
        apiCall('/faculty/students'),
      ]);

      return {
        stats: {
          totalCourses: coursesData.courses?.length || 0,
          totalStudents: studentsData.students?.length || 0,
          pendingAssignments: coursesData.pendingAssignments || 0,
          recentSubmissions: coursesData.recentSubmissions || 0,
        },
        notifications: coursesData.notifications || 0,
      };
    } catch (error) {
      console.error('Error loading faculty data:', error);
      return {
        stats: {
          totalCourses: 0,
          totalStudents: 0,
          pendingAssignments: 0,
          recentSubmissions: 0,
        },
        notifications: 0,
      };
    }
  };

  // Student-specific data loading
  const loadStudentData = async () => {
    try {
      const [coursesData, gradesData] = await Promise.all([
        apiCall('/student/courses'),
        apiCall('/student/grades'),
      ]);

      return {
        stats: {
          enrolledCourses: coursesData.courses?.length || 0,
          completedAssignments: gradesData.completed || 0,
          pendingAssignments: gradesData.pending || 0,
          averageGrade: gradesData.average || 'N/A',
        },
        notifications: coursesData.notifications || 0,
      };
    } catch (error) {
      console.error('Error loading student data:', error);
      return {
        stats: {
          enrolledCourses: 0,
          completedAssignments: 0,
          pendingAssignments: 0,
          averageGrade: 'N/A',
        },
        notifications: 0,
      };
    }
  };

  // Parent-specific data loading
  const loadParentData = async () => {
    try {
      const childrenData = await apiCall('/parent/children');

      return {
        stats: {
          totalChildren: childrenData.children?.length || 0,
          totalCourses: childrenData.totalCourses || 0,
          recentGrades: childrenData.recentGrades || 0,
          pendingMeetings: childrenData.pendingMeetings || 0,
        },
        notifications: childrenData.notifications || 0,
      };
    } catch (error) {
      console.error('Error loading parent data:', error);
      return {
        stats: {
          totalChildren: 0,
          totalCourses: 0,
          recentGrades: 0,
          pendingMeetings: 0,
        },
        notifications: 0,
      };
    }
  };

  // Handle view changes
  const handleViewChange = newView => {
    setCurrentView(newView);
    // Log analytics
    try {
      errorMonitoring.captureEvent('dashboard_view_change', {
        userType,
        userId: currentUser?.id,
        fromView: currentView,
        toView: newView,
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  // Refresh data
  const refreshData = () => {
    loadDashboardData();
  };
  // Initialize data on mount
  useEffect(() => {
    if (currentUser && userRole) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userRole, userType]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(
      () => {
        if (currentView === 'dashboard') {
          loadDashboardData();
        }
      },
      5 * 60 * 1000
    ); // 5 minutes

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);
  return {
    loading,
    error,
    stats,
    notifications,
    currentView,
    handleViewChange,
    refreshData,
    apiCall,
  };
};

// Adding default export to maintain compatibility with existing code
export default useDashboard;
