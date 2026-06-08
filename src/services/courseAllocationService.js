import axios from '../utils/mockApiService';
import env from '../config/env';

const API_BASE_URL = `${env.API_URL}/api`;

// Course Allocation API Service
class CourseAllocationService {
  
  // Get all allocated courses with pagination and filters
  static async getAllocatedCourses(params = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/course-allocation/courses`, {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching allocated courses:', error);
      throw error;
    }
  }

  // Get allocation statistics
  static async getAllocationStats(params = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/course-allocation/stats`, {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching allocation stats:', error);
      throw error;
    }
  }

  // Assign faculty to a single course
  static async assignFacultyToCourse(assignmentData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/course-allocation/assign-faculty`, assignmentData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning faculty to course:', error);
      throw error;
    }
  }

  // Bulk assign faculty to multiple courses
  static async bulkAssignFaculty(assignmentData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/course-allocation/bulk-assign-faculty`, assignmentData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error in bulk faculty assignment:', error);
      throw error;
    }
  }

  // Bulk enroll students in courses
  static async bulkEnrollStudents(enrollmentData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/course-allocation/bulk-enroll-students`, enrollmentData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error in bulk student enrollment:', error);
      throw error;
    }
  }

  // Get all faculty for assignment
  static async getAllFaculty() {
    try {
      const response = await axios.get(`${API_BASE_URL}/faculty`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching faculty:', error);
      throw error;
    }
  }

  // Get all students for enrollment
  static async getAllStudents(params = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/students`, {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  }

  // Get all courses
  static async getAllCourses(params = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/courses`, {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  }
}

export default CourseAllocationService;



