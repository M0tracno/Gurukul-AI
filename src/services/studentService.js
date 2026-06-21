import DatabaseService from './databaseService';

/**
 * Student Service
 * Handles all API calls specific to student functionality
 */

class StudentService {
  constructor() {
    this.databaseService = DatabaseService;
  }

  /**
   * Get student profile information
   */
  async getStudentProfile(studentId) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/students/${studentId}`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching student profile:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all courses enrolled by the student
   */
  async getEnrolledCourses(studentId) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/students/${studentId}/courses`
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get assignments for a student
   */
  async getAssignments(studentId) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/students/${studentId}/assignments`
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get grades for a student
   */
  async getGrades(studentId) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/students/${studentId}/grades`
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching grades:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get feedback for a student
   */
  async getFeedback(studentId) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/students/${studentId}/feedback`
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching feedback:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get quizzes for a student
   */
  async getQuizzes(studentId) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/students/${studentId}/quizzes`
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get attendance records for a student
   */
  async getAttendance(studentId, courseId = null) {
    try {
      const endpoint = courseId
        ? `/api/students/${studentId}/attendance?courseId=${courseId}`
        : `/api/students/${studentId}/attendance`;

      const response = await this.databaseService.fetchWithAuth(endpoint);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Submit assignment for a student
   */
  async submitAssignment(studentId, assignmentId, submissionData) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/students/${studentId}/assignments/${assignmentId}/submit`,
        {
          method: 'POST',
          body: JSON.stringify(submissionData),
        }
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error submitting assignment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Take quiz
   */
  async submitQuiz(studentId, quizId, answers) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/students/${studentId}/quizzes/${quizId}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({ answers }),
        }
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error submitting quiz:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get student dashboard summary data
   */
  async getDashboardSummary(studentId) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/students/${studentId}/dashboard`
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      // Return fallback data structure
      return {
        success: false,
        error: error.message,
        data: {
          overallGrade: 'N/A',
          pendingAssignments: 0,
          courses: [],
          recentFeedback: [],
          upcomingQuizzes: [],
        },
      };
    }
  }
}

export default new StudentService();
