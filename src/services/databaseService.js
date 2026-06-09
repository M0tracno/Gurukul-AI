/**
 * Database Service
 * Handles all database operations for the frontend
 */
import env from '../config/env';

const API_URL = env.API_URL;

class DatabaseService {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.demoMode = false;
  }
  updateToken() {
    this.token = localStorage.getItem('authToken');
  }

  // Method to check if token is valid
  async validateToken() {
    try {
      if (!this.token) {
        return false;
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }
  async fetchWithAuth(endpoint, options = {}) {
    // In demo mode, return mock data for certain endpoints
    if (this.demoMode && endpoint.includes('/api/admin')) {
      return this.getMockData(endpoint, options);
    }

    // Update token from localStorage in case it changed
    this.updateToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // Include credentials for CORS
      });

      if (!response.ok) {
        // Handle 401 Unauthorized specifically
        if (response.status === 401) {
          console.warn('Token expired or invalid, redirecting to login');
          // Clear invalid token
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          // Could redirect to login here if needed
          throw new Error('Token is not valid');
        }

        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
      }

      return response.json();
    } catch (error) {
      console.error('API Error:', error.message);

      // If API is not available, fall back to demo mode
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.warn('API not available, falling back to demo mode');
        this.demoMode = true;
        return this.getMockData(endpoint, options);
      }

      throw error;
    }
  }

  // Get mock data for demo mode
  getMockData(endpoint, options = {}) {
    const method = options.method || 'GET';

    console.log(`📝 Mock API call: ${method} ${endpoint}`);

    // Mock data for different endpoints
    if (endpoint.includes('/api/admin/auth/users')) {
      return {
        success: true,
        users: [
          {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@school.edu',
            role: 'faculty',
            department: 'Computer Science',
            active: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@school.edu',
            role: 'student',
            grade: '10th',
            active: true,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }

    if (endpoint.includes('/api/admin/dashboard/summary')) {
      return {
        success: true,
        users: 156,
        faculty: 23,
        students: 125,
        parents: 89,
        courses: 15,
        quizzes: 45,
        activeUsers: 67,
        systemLoad: 42,
      };
    }

    if (endpoint.includes('/api/admin/metrics/realtime')) {
      return {
        success: true,
        activeUsers: Math.floor(Math.random() * 50) + 20,
        onlineStudents: Math.floor(Math.random() * 40) + 15,
        onlineFaculty: Math.floor(Math.random() * 10) + 5,
        systemLoad: Math.floor(Math.random() * 30) + 20,
        lastUpdated: new Date().toLocaleTimeString(),
      };
    }

    if (endpoint.includes('/api/admin/system/health')) {
      return {
        success: true,
        database: { status: 'Healthy', responseTime: '45ms' },
        apiServices: { status: 'Healthy', responseTime: '12ms' },
        authServer: { status: 'Healthy', responseTime: '8ms' },
        storage: { status: 'Healthy', responseTime: '23ms' },
        mailService: { status: 'Healthy', responseTime: '156ms' },
      };
    }

    // Handle POST requests (creating users)
    if (method === 'POST' && endpoint.includes('/api/admin/auth/create-user')) {
      return {
        success: true,
        message: 'User created successfully (demo mode)',
        user: {
          id: Date.now(),
          ...JSON.parse(options.body || '{}'),
          createdAt: new Date().toISOString(),
        },
      };
    }

    // Default mock response
    return {
      success: true,
      message: 'Demo mode response',
      data: {},
    };
  }

  // User Management
  async getAllUsers() {
    return this.fetchWithAuth('/api/users');
  }

  async createUser(userData) {
    return this.fetchWithAuth('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId, userData) {
    return this.fetchWithAuth(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId) {
    return this.fetchWithAuth(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Course Management
  async getAllCourses() {
    return this.fetchWithAuth('/api/courses');
  }

  async getCourse(courseId) {
    return this.fetchWithAuth(`/api/courses/${courseId}`);
  }

  async createCourse(courseData) {
    return this.fetchWithAuth('/api/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  }

  async updateCourse(courseId, courseData) {
    return this.fetchWithAuth(`/api/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  }

  async deleteCourse(courseId) {
    return this.fetchWithAuth(`/api/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  // Enrollment Management
  async getEnrollments(courseId) {
    return this.fetchWithAuth(`/api/courses/${courseId}/enrollments`);
  }

  async enrollStudent(courseId, studentData) {
    return this.fetchWithAuth(`/api/courses/${courseId}/enrollments`, {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  async unenrollStudent(courseId, studentId) {
    return this.fetchWithAuth(`/api/courses/${courseId}/enrollments/${studentId}`, {
      method: 'DELETE',
    });
  }

  // Mark Management
  async getStudentMarks(studentId, courseId) {
    return this.fetchWithAuth(`/api/students/${studentId}/courses/${courseId}/marks`);
  }

  async addMark(studentId, courseId, markData) {
    return this.fetchWithAuth(`/api/students/${studentId}/courses/${courseId}/marks`, {
      method: 'POST',
      body: JSON.stringify(markData),
    });
  }

  async updateMark(studentId, courseId, markId, markData) {
    return this.fetchWithAuth(`/api/students/${studentId}/courses/${courseId}/marks/${markId}`, {
      method: 'PUT',
      body: JSON.stringify(markData),
    });
  }
  // Attendance Management
  async getAttendance(courseId, date) {
    return this.fetchWithAuth(`/api/courses/${courseId}/attendance?date=${date}`);
  }

  async markAttendance(courseId, attendanceData) {
    return this.fetchWithAuth(`/api/courses/${courseId}/attendance`, {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  }

  async updateAttendance(courseId, attendanceId, attendanceData) {
    return this.fetchWithAuth(`/api/courses/${courseId}/attendance/${attendanceId}`, {
      method: 'PUT',
      body: JSON.stringify(attendanceData),
    });
  }

  // Faculty Management
  async getAllFaculty() {
    return this.fetchWithAuth('/api/faculty');
  }

  async getFacultyById(facultyId) {
    return this.fetchWithAuth(`/api/faculty/${facultyId}`);
  }

  async createFaculty(facultyData) {
    return this.fetchWithAuth('/api/faculty', {
      method: 'POST',
      body: JSON.stringify(facultyData),
    });
  }

  async updateFaculty(facultyId, facultyData) {
    return this.fetchWithAuth(`/api/faculty/${facultyId}`, {
      method: 'PUT',
      body: JSON.stringify(facultyData),
    });
  }

  // Student Management
  async getAllStudents() {
    return this.fetchWithAuth('/api/students');
  }

  async getStudentById(studentId) {
    return this.fetchWithAuth(`/api/students/${studentId}`);
  }

  async createStudent(studentData) {
    return this.fetchWithAuth('/api/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(studentId, studentData) {
    return this.fetchWithAuth(`/api/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  }

  async getStudentsByClass(classId, section) {
    return this.fetchWithAuth(`/api/students?class=${classId}&section=${section}`);
  }

  async getStudentCourses(studentId) {
    return this.fetchWithAuth(`/api/students/${studentId}/courses`);
  }

  // Message Management
  async getFacultyMessages(facultyId) {
    return this.fetchWithAuth(`/api/faculty/${facultyId}/messages`);
  }

  async createMessage(messageData) {
    return this.fetchWithAuth('/api/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async getMessages(userId) {
    return this.fetchWithAuth(`/api/messages?userId=${userId}`);
  }
}

const databaseService = new DatabaseService();

// Create the nested structure that useDatabase expects
databaseService.faculty = {
  createFaculty: (facultyId, facultyData) => databaseService.createFaculty(facultyData),
  updateFaculty: (facultyId, facultyData) => databaseService.updateFaculty(facultyId, facultyData),
  getFacultyById: facultyId => databaseService.getFacultyById(facultyId),
  getAllFaculty: () => databaseService.getAllFaculty(),
  getFacultyMessages: facultyId => databaseService.getFacultyMessages(facultyId),
};

databaseService.student = {
  createStudent: (studentId, studentData) => databaseService.createStudent(studentData),
  updateStudent: (studentId, studentData) => databaseService.updateStudent(studentId, studentData),
  getStudentById: studentId => databaseService.getStudentById(studentId),
  getAllStudents: () => databaseService.getAllStudents(),
  getStudentsByClass: (classId, section) => databaseService.getStudentsByClass(classId, section),
  getStudentCourses: studentId => databaseService.getStudentCourses(studentId),
};

databaseService.user = {
  createUser: userData => databaseService.createUser(userData),
  updateUser: (userId, userData) => databaseService.updateUser(userId, userData),
  deleteUser: userId => databaseService.deleteUser(userId),
  getUserById: userId => databaseService.getUserById(userId),
  getAllUsers: () => databaseService.getAllUsers(),
};

databaseService.course = {
  createCourse: courseData => databaseService.createCourse(courseData),
  updateCourse: (courseId, courseData) => databaseService.updateCourse(courseId, courseData),
  deleteCourse: courseId => databaseService.deleteCourse(courseId),
  getCourse: courseId => databaseService.getCourse(courseId),
  getAllCourses: () => databaseService.getAllCourses(),
  getEnrollments: courseId => databaseService.getEnrollments(courseId),
  enrollStudent: (courseId, studentData) => databaseService.enrollStudent(courseId, studentData),
  unenrollStudent: (courseId, studentId) => databaseService.unenrollStudent(courseId, studentId),
};

databaseService.attendance = {
  getAttendance: (courseId, date) => databaseService.getAttendance(courseId, date),
  markAttendance: (courseId, attendanceData) =>
    databaseService.markAttendance(courseId, attendanceData),
  updateAttendance: (courseId, attendanceId, attendanceData) =>
    databaseService.updateAttendance(courseId, attendanceId, attendanceData),
};

databaseService.marks = {
  getStudentMarks: (studentId, courseId) => databaseService.getStudentMarks(studentId, courseId),
  addMark: (studentId, courseId, markData) =>
    databaseService.addMark(studentId, courseId, markData),
  updateMark: (studentId, courseId, markId, markData) =>
    databaseService.updateMark(studentId, courseId, markId, markData),
};

databaseService.messages = {
  createMessage: messageData => databaseService.createMessage(messageData),
  getMessages: userId => databaseService.getMessages(userId),
  getFacultyMessages: facultyId => databaseService.getFacultyMessages(facultyId),
};

export default databaseService;
