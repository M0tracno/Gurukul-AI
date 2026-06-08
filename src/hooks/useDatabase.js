import { useState, useCallback, useEffect } from 'react';
import databaseService from '../services/databaseService';
import { useAuth } from '../auth/AuthContext';

/**
 * Custom hook for database operations
 * Provides a simple interface for interacting with the database
 */
export function useDatabase() {
  const { currentUser, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create generic operation handler with loading and error states
  const handleOperation = useCallback(async (operation, ...args) => {
    setLoading(true);
    setError(null);
    try {
      // Always call the actual operation, even in demo mode
      const result = await operation(...args);
      setLoading(false);
      
      if (!result.success) {
        setError(result.error || 'Operation failed');
      }
      
      return result;
    } catch (err) {
      console.error('Database operation failed:', err);
      setLoading(false);
      setError(err.message || 'An unknown error occurred');
      return { success: false, error: err };
    }
  }, []);

  // Faculty operations
  const createFacultyProfile = useCallback((facultyData) => {
    return handleOperation(databaseService.faculty.createFaculty, currentUser?.uid, facultyData);
  }, [currentUser, handleOperation]);

  const updateFacultyProfile = useCallback((facultyData) => {
    return handleOperation(databaseService.faculty.updateFaculty, currentUser?.uid, facultyData);
  }, [currentUser, handleOperation]);

  const getFacultyProfile = useCallback((facultyId = currentUser?.uid) => {
    return handleOperation(databaseService.faculty.getFacultyById, facultyId);
  }, [currentUser, handleOperation]);

  const getAllFaculty = useCallback(() => {
    return handleOperation(databaseService.faculty.getAllFaculty);
  }, [handleOperation]);

  // Student operations
  const createStudentProfile = useCallback((studentData) => {
    return handleOperation(databaseService.student.createStudent, currentUser?.uid, studentData);
  }, [currentUser, handleOperation]);

  const updateStudentProfile = useCallback((studentData) => {
    return handleOperation(databaseService.student.updateStudent, currentUser?.uid, studentData);
  }, [currentUser, handleOperation]);

  const getStudentProfile = useCallback((studentId = currentUser?.uid) => {
    return handleOperation(databaseService.student.getStudentById, studentId);
  }, [currentUser, handleOperation]);

  const getAllStudents = useCallback(() => {
    return handleOperation(databaseService.student.getAllStudents);
  }, [handleOperation]);

  const getStudentsByClass = useCallback((classId, section) => {
    return handleOperation(databaseService.student.getStudentsByClass, classId, section);
  }, [handleOperation]);

  const getStudentCourses = useCallback((studentId = currentUser?.uid) => {
    return handleOperation(databaseService.student.getStudentCourses, studentId);
  }, [currentUser, handleOperation]);

  // User operations
  const createUser = useCallback((userData) => {
    return handleOperation(databaseService.user.createUser, userData);
  }, [handleOperation]);

  const updateUser = useCallback((userId, userData) => {
    return handleOperation(databaseService.user.updateUser, userId, userData);
  }, [handleOperation]);

  const deleteUser = useCallback((userId) => {
    return handleOperation(databaseService.user.deleteUser, userId);
  }, [handleOperation]);

  const getUserById = useCallback((userId) => {
    return handleOperation(databaseService.user.getUserById, userId);
  }, [handleOperation]);

  const getAllUsers = useCallback(() => {
    return handleOperation(databaseService.user.getAllUsers);
  }, [handleOperation]);

  // Course operations
  const createCourse = useCallback((courseData) => {
    return handleOperation(databaseService.course.createCourse, courseData);
  }, [handleOperation]);

  const updateCourse = useCallback((courseId, courseData) => {
    return handleOperation(databaseService.course.updateCourse, courseId, courseData);
  }, [handleOperation]);

  const getCourse = useCallback((courseId) => {
    return handleOperation(databaseService.course.getCourseById, courseId);
  }, [handleOperation]);

  const getAllCourses = useCallback(() => {
    return handleOperation(databaseService.course.getAllCourses);
  }, [handleOperation]);

  const getMyTeachingCourses = useCallback(() => {
    if (userRole !== 'faculty') {
      return Promise.resolve({ success: false, error: 'Not a faculty member' });
    }
    return handleOperation(databaseService.course.getCoursesByFaculty, currentUser?.uid);
  }, [currentUser, userRole, handleOperation]);

  const assignFacultyToCourse = useCallback((courseId, facultyId) => {
    return handleOperation(databaseService.course.assignFacultyToCourse, courseId, facultyId);
  }, [handleOperation]);

  const enrollStudentsInCourse = useCallback((courseId, studentIds) => {
    return handleOperation(databaseService.course.enrollStudentsInCourse, courseId, studentIds);
  }, [handleOperation]);

  const removeStudentFromCourse = useCallback((courseId, studentId) => {
    return handleOperation(databaseService.course.removeStudentFromCourse, courseId, studentId);
  }, [handleOperation]);

  // Marks operations
  const recordMarks = useCallback((marksData) => {
    return handleOperation(databaseService.marks.recordMarks, marksData);
  }, [handleOperation]);

  const getAssessmentMarks = useCallback((courseId, assessmentType, assessmentName) => {
    return handleOperation(
      databaseService.marks.getAssessmentMarks, 
      courseId, 
      assessmentType, 
      assessmentName
    );
  }, [handleOperation]);

  const getCourseMarks = useCallback((courseId) => {
    return handleOperation(databaseService.marks.getCourseMarks, courseId);
  }, [handleOperation]);

  const getStudentMarks = useCallback((studentId = currentUser?.uid) => {
    return handleOperation(databaseService.marks.getStudentMarks, studentId);
  }, [currentUser, handleOperation]);

  const getStudentCourseMarks = useCallback((studentId, courseId) => {
    return handleOperation(
      databaseService.marks.getStudentCourseMarks, 
      studentId, 
      courseId
    );
  }, [handleOperation]);

  // Message operations
  const sendMessage = useCallback((teacherId, messageData) => {
    return handleOperation(
      databaseService.messages.sendMessage, 
      currentUser?.uid, 
      teacherId, 
      messageData
    );
  }, [currentUser, handleOperation]);

  const getFacultyMessages = useCallback((facultyId = currentUser?.uid) => {
    return handleOperation(
      databaseService.messages.getFacultyMessages, 
      facultyId
    );
  }, [currentUser, handleOperation]);

  const getParentMessages = useCallback((parentId = currentUser?.uid) => {
    return handleOperation(
      databaseService.messages.getParentMessages, 
      parentId
    );
  }, [currentUser, handleOperation]);

  const markMessageAsRead = useCallback((messageId) => {
    return handleOperation(
      databaseService.messages.markMessageAsRead, 
      messageId
    );
  }, [handleOperation]);

  // Get count of unread messages
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  useEffect(() => {
    // Only fetch unread messages count for faculty role
    if (userRole === 'faculty' && currentUser?.uid) {
      const fetchUnreadCount = async () => {
        try {
          const result = await getFacultyMessages();
          if (result.success) {
            const unreadCount = result.data.filter(msg => !msg.read).length;
            setUnreadMessages(unreadCount);
          }
        } catch (error) {
          console.error('Error getting unread message count:', error);
        }
      };
      
      fetchUnreadCount();
      
      // In a real app, we would set up a listener for new messages here
    }
  }, [userRole, currentUser, getFacultyMessages]);

  // Attendance operations
  const recordAttendance = useCallback((attendanceData) => {
    return handleOperation(databaseService.attendance.recordAttendance, attendanceData);
  }, [handleOperation]);

  const updateAttendance = useCallback((courseId, date, studentRecords) => {
    return handleOperation(
      databaseService.attendance.updateAttendance, 
      courseId, 
      date, 
      studentRecords
    );
  }, [handleOperation]);

  const getAttendance = useCallback((courseId, date) => {
    return handleOperation(
      databaseService.attendance.getAttendance, 
      courseId, 
      date
    );
  }, [handleOperation]);

  const getCourseAttendance = useCallback((courseId) => {
    return handleOperation(
      databaseService.attendance.getCourseAttendance, 
      courseId
    );
  }, [handleOperation]);

  const getStudentAttendance = useCallback((studentId = currentUser?.uid) => {
    return handleOperation(
      databaseService.attendance.getStudentAttendance, 
      studentId
    );
  }, [currentUser, handleOperation]);

  const getStudentAttendancePercentage = useCallback((studentId, courseId) => {
    return handleOperation(
      databaseService.attendance.getStudentAttendancePercentage, 
      studentId, 
      courseId
    );
  }, [handleOperation]);

  // Generic collection access functions for backward compatibility
  const getCollection = useCallback((collectionName, filter = {}) => {
    // Map collection names to specific methods
    switch (collectionName) {
      case 'courses':
        if (filter.facultyId) {
          return handleOperation(databaseService.course.getCoursesByFaculty, filter.facultyId);
        }
        return getAllCourses();
      case 'students':
        if (filter.parentId) {
          // Return mock children data for parent
          return Promise.resolve({
            success: true,
            data: [
              { id: 'child1', name: 'John Doe', class: '10A' },
              { id: 'child2', name: 'Jane Doe', class: '8B' }
            ]
          });
        }
        return getAllStudents();
      case 'teachers':
      case 'faculty':
        return getAllFaculty();
      case 'messages':
        if (filter.parentId || userRole === 'parent') {
          return getParentMessages();
        }
        if (filter.facultyId || userRole === 'faculty') {
          return getFacultyMessages();
        }
        return Promise.resolve({ success: true, data: [] });
      case 'attendance':
        if (filter.courseId && filter.date) {
          return getAttendance(filter.courseId, filter.date);
        }
        if (filter.courseId) {
          return getCourseAttendance(filter.courseId);
        }
        if (filter.studentId) {
          return getStudentAttendance(filter.studentId);
        }
        return Promise.resolve({ success: true, data: [] });
      case 'enrollments':
        if (filter.studentId) {
          return getStudentCourses(filter.studentId);
        }
        return Promise.resolve({ success: true, data: [] });
      case 'grades':
      case 'marks':
        if (filter.studentId) {
          return getStudentMarks(filter.studentId);
        }
        if (filter.courseId) {
          return getCourseMarks(filter.courseId);
        }
        return Promise.resolve({ success: true, data: [] });
      case 'assignments':
        // Mock assignments data for now
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 'assign1',
              title: 'Math Quiz 1',
              course: 'Mathematics',
              dueDate: '2023-12-15',
              status: 'submitted'
            }
          ]
        });
      default:
        console.warn(`Unknown collection: ${collectionName}`);
        return Promise.resolve({ success: true, data: [] });
    }
  }, [getAllCourses, getAllStudents, getAllFaculty, getParentMessages, getFacultyMessages, 
      getAttendance, getCourseAttendance, getStudentAttendance, getStudentCourses, 
      getStudentMarks, getCourseMarks, userRole, handleOperation]);

  const addDocument = useCallback((collectionName, data) => {
    // Map collection names to specific methods
    switch (collectionName) {
      case 'messages':
        if (data.receiverId) {
          return sendMessage(data.receiverId, data);
        }
        return Promise.resolve({ success: false, error: 'Missing receiver ID' });
      case 'attendance':
        return recordAttendance(data);
      case 'marks':
      case 'grades':
        return recordMarks(data);
      default:
        console.warn(`Unknown collection for adding: ${collectionName}`);
        return Promise.resolve({ success: false, error: 'Unknown collection' });
    }
  }, [sendMessage, recordAttendance, recordMarks]);

  return {
    // Status
    loading,
    error,
    
    // Faculty operations
    createFacultyProfile,
    updateFacultyProfile,
    getFacultyProfile,
    getAllFaculty,
    
    // Student operations
    createStudentProfile,
    updateStudentProfile,
    getStudentProfile,
    getAllStudents,
    getStudentsByClass,
    getStudentCourses,
    
    // User operations
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    getAllUsers,
    
    // Course operations
    createCourse,
    updateCourse,
    getCourse,
    getAllCourses,
    getMyTeachingCourses,
    assignFacultyToCourse,
    enrollStudentsInCourse,
    removeStudentFromCourse,
    
    // Marks operations
    recordMarks,
    getAssessmentMarks,
    getCourseMarks,
    getStudentMarks,
    getStudentCourseMarks,
    
    // Message operations
    sendMessage,
    getFacultyMessages,
    getParentMessages,
    markMessageAsRead,
    unreadMessages,
    
    // Attendance operations
    recordAttendance,
    updateAttendance,
    getAttendance,
    getCourseAttendance,
    getStudentAttendance,
    getStudentAttendancePercentage,
    
    // Generic functions
    getCollection,
    addDocument
  };
}


