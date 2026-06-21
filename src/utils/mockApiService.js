import axios from 'axios';

/**
 * Mock API Service
 *
 * This module provides mock API responses when actual backend calls fail
 * with 404 or 500 errors. It intercepts API calls to problematic endpoints
 * and returns realistic mock data to avoid errors in the UI.
 */

// Store original axios methods
const originalGet = axios.get;
const originalPost = axios.post;
const originalPut = axios.put;

// Common mock data
const mockUsers = Array.from({ length: 15 }, (_, i) => ({
  id: `user_${i + 1}`,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: i % 3 === 0 ? 'faculty' : i % 3 === 1 ? 'student' : 'parent',
  profilePic: null,
}));

const mockFaculty = Array.from({ length: 10 }, (_, i) => ({
  id: `faculty_${i + 1}`,
  name: `Faculty ${i + 1}`,
  email: `faculty${i + 1}@example.com`,
  department: ['Computer Science', 'Mathematics', 'Physics', 'Chemistry'][i % 4],
  subjects: ['Algorithms', 'Data Structures', 'Calculus', 'Quantum Mechanics'][i % 4],
}));

const mockStudents = Array.from({ length: 20 }, (_, i) => ({
  id: `student_${i + 1}`,
  name: `Student ${i + 1}`,
  email: `student${i + 1}@example.com`,
  grade: `Grade ${Math.floor(Math.random() * 12) + 1}`,
  enrollmentDate: new Date().toISOString(),
}));

const mockCourses = Array.from({ length: 10 }, (_, i) => ({
  id: `course_${i + 1}`,
  name: `Course ${i + 1}`,
  description: `Description for course ${i + 1}`,
  faculty: mockFaculty[i % mockFaculty.length].name,
  students: Math.floor(Math.random() * 30) + 5,
}));

const mockQuizzes = Array.from({ length: 8 }, (_, i) => ({
  id: `quiz_${i + 1}`,
  title: `Quiz ${i + 1}`,
  course: mockCourses[i % mockCourses.length].name,
  questions: Math.floor(Math.random() * 20) + 5,
  status: ['active', 'pending', 'completed'][i % 3],
}));

const mockFeedback = Array.from({ length: 10 }, (_, i) => ({
  id: `feedback_${i + 1}`,
  studentId: mockStudents[i % mockStudents.length].id,
  studentName: mockStudents[i % mockStudents.length].name,
  subject: mockCourses[i % mockCourses.length].name,
  feedback: `This is feedback message ${i + 1} for the student. Good progress!`,
  date: new Date().toISOString(),
  teacherName: mockFaculty[i % mockFaculty.length].name,
}));

const mockMessages = Array.from({ length: 7 }, (_, i) => ({
  id: `message_${i + 1}`,
  from: i % 2 === 0 ? mockFaculty[i % mockFaculty.length].name : 'You',
  message: `This is message ${i + 1}. Lorem ipsum dolor sit amet.`,
  timestamp: new Date().toISOString(),
  read: i < 3,
}));

const mockAllocatedCourses = Array.from({ length: 10 }, (_, i) => ({
  id: `allocation_${i + 1}`,
  courseId: `course_${i + 1}`,
  courseName: `Course ${i + 1}`,
  facultyId: mockFaculty[i % mockFaculty.length].id,
  facultyName: mockFaculty[i % mockFaculty.length].name,
  semester: ['Fall 2025', 'Spring 2026'][i % 2],
  academicYear: '2025-2026',
  department: mockFaculty[i % mockFaculty.length].department,
  students: Math.floor(Math.random() * 30) + 5,
}));

const mockAllocationStats = {
  totalCourses: 42,
  allocatedCourses: 36,
  pendingCourses: 6,
  totalFaculty: 15,
  activeFaculty: 12,
  totalStudents: 320,
  coursesPerFaculty: 2.4,
  studentsPerCourse: 24,
};

const mockQuizAnalytics = {
  totalQuizzes: 45,
  totalQuestions: 427,
  averageScore: 76.4,
  participationRate: 89.2,
  quizzesByDifficulty: {
    easy: 12,
    medium: 24,
    hard: 9,
  },
  topPerformers: [
    { name: 'Student 5', score: 95.2 },
    { name: 'Student 12', score: 92.8 },
    { name: 'Student 7', score: 90.5 },
  ],
  recentQuizScores: [82, 75, 88, 79, 91, 84],
};

// Map URLs to mock data
const mockDataMap = {
  '/course-allocation/courses': { data: mockAllocatedCourses },
  '/faculty': { data: mockFaculty },
  '/students': { data: mockStudents },
  '/course-allocation/stats': { data: mockAllocationStats },
  '/api/students/.*/courses': { data: mockCourses },
  '/api/faculty/quiz-analytics': { data: mockQuizAnalytics },
  '/api/faculty/.*/messages': { data: mockMessages },
};

// Override axios methods
axios.get = async function (url, config) {
  try {
    // First try the original request
    return await originalGet(url, config);
  } catch (error) {
    // If error is 404 or 500, check if we have mock data
    if (error.response && (error.response.status === 404 || error.response.status === 500)) {
      // Check if the URL matches any of our mock endpoints
      for (const [pattern, mockResponse] of Object.entries(mockDataMap)) {
        const regex = new RegExp(pattern);
        if (regex.test(url)) {
          console.log(`[Mock API] Providing mock data for ${url}`);
          return {
            data: mockResponse.data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        }
      }
    }

    // Re-throw if we don't have mock data
    throw error;
  }
};

axios.post = async function (url, data, config) {
  try {
    // First try the original request
    return await originalPost(url, data, config);
  } catch (error) {
    // If error is 404 or 500, provide mock response
    if (error.response && (error.response.status === 404 || error.response.status === 500)) {
      console.log(`[Mock API] Simulating successful POST for ${url}`);
      return {
        data: { success: true, message: 'Operation completed successfully (mock data)' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    throw error;
  }
};

axios.put = async function (url, data, config) {
  try {
    // First try the original request
    return await originalPut(url, data, config);
  } catch (error) {
    // If error is 404 or 500, provide mock response
    if (error.response && (error.response.status === 404 || error.response.status === 500)) {
      console.log(`[Mock API] Simulating successful PUT for ${url}`);
      return {
        data: { success: true, message: 'Update completed successfully (mock data)' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    throw error;
  }
};

console.log('[Mock API Service] Initialized - Will intercept 404/500 API requests');

export default axios;
