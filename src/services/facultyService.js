import DatabaseService from './databaseService';

/**
 * Faculty Service
 * Handles all API calls specific to faculty functionality
 */

class FacultyService {
  constructor() {
    this.databaseService = DatabaseService;
  }

  /**
   * Get faculty profile information
   */
  async getFacultyProfile(facultyId) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/faculty/${facultyId}`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching faculty profile:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get courses taught by faculty
   */
  async getCourses(facultyId) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/faculty/${facultyId}/courses`
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching faculty courses:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get students enrolled in faculty's courses
   */
  async getStudents(facultyId, courseId = null) {
    try {
      const endpoint = courseId
        ? `/api/faculty/${facultyId}/courses/${courseId}/students`
        : `/api/faculty/${facultyId}/students`;

      const response = await this.databaseService.fetchWithAuth(endpoint);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching students:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get assignments for faculty courses
   */
  async getAssignments(facultyId, courseId = null) {
    try {
      const endpoint = courseId
        ? `/api/faculty/${facultyId}/courses/${courseId}/assignments`
        : `/api/faculty/${facultyId}/assignments`;

      const response = await this.databaseService.fetchWithAuth(endpoint);
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
   * Create new assignment
   */
  async createAssignment(facultyId, courseId, assignmentData) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/faculty/${facultyId}/courses/${courseId}/assignments`,
        {
          method: 'POST',
          body: JSON.stringify(assignmentData),
        }
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error creating assignment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get assignment submissions for grading
   */
  async getSubmissions(assignmentId) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/assignments/${assignmentId}/submissions`
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Grade assignment submission
   */
  async gradeSubmission(submissionId, gradeData) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/submissions/${submissionId}/grade`,
        {
          method: 'POST',
          body: JSON.stringify(gradeData),
        }
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error grading submission:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create quiz
   */
  async createQuiz(facultyId, courseId, quizData) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/faculty/${facultyId}/courses/${courseId}/quizzes`,
        {
          method: 'POST',
          body: JSON.stringify(quizData),
        }
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error creating quiz:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get quizzes for faculty courses
   */
  async getQuizzes(facultyId, courseId = null) {
    try {
      const endpoint = courseId
        ? `/api/faculty/${facultyId}/courses/${courseId}/quizzes`
        : `/api/faculty/${facultyId}/quizzes`;

      const response = await this.databaseService.fetchWithAuth(endpoint);
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
   * Mark attendance for a course
   */
  async markAttendance(courseId, attendanceData) {
    try {
      const response = await this.databaseService.markAttendance(courseId, attendanceData);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error marking attendance:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get attendance records for a course
   */
  async getAttendance(courseId, date = null) {
    try {
      const response = await this.databaseService.getAttendance(courseId, date);
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
   * Send feedback to student
   */
  async sendFeedback(facultyId, studentId, feedbackData) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/faculty/${facultyId}/students/${studentId}/feedback`,
        {
          method: 'POST',
          body: JSON.stringify(feedbackData),
        }
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error sending feedback:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get messages for faculty
   */
  async getMessages(facultyId) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/faculty/${facultyId}/messages`
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Send message to parent
   */
  async sendMessage(facultyId, parentId, messageData) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/faculty/${facultyId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...messageData,
            recipientId: parentId,
            recipientType: 'parent',
          }),
        }
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get faculty dashboard summary
   */
  async getDashboardSummary(facultyId) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/faculty/${facultyId}/dashboard`
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      return {
        success: false,
        error: error.message,
        data: {
          studentCount: 0,
          submissionsPending: 0,
          activeQuizzes: 0,
          recentMessages: [],
        },
      };
    }
  }

  // ============ ENHANCED QUIZ MANAGEMENT METHODS ============

  /**
   * Get comprehensive quiz analytics for faculty
   * Fetches aggregated analytics across all of the authenticated faculty's assessments
   */
  async getQuizAnalytics(quizId = null, timeRange = 'all') {
    try {
      const endpoint = quizId
        ? `/api/quizzes/${quizId}/analytics?timeRange=${timeRange}`
        : `/api/faculty/me/quiz-analytics?timeRange=${timeRange}`;

      const response = await this.databaseService.fetchWithAuth(endpoint);
      
      // Unwrap the standard success envelope { success: true, data, meta? }
      if (response && response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      }
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching quiz analytics:', error);
      return {
        success: false,
        error: error.message,
        data: {},
      };
    }
  }

  /**
   * Get quiz attempts for a specific quiz
   */
  async getQuizAttempts(quizId) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/quizzes/${quizId}/attempts`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get single quiz details
   */
  async getQuiz(quizId) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/quizzes/${quizId}`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching quiz:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update existing quiz
   */
  async updateQuiz(quizId, quizData) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/quizzes/${quizId}`, {
        method: 'PUT',
        body: JSON.stringify(quizData),
      });
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error updating quiz:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete quiz
   */
  async deleteQuiz(quizId) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
      });
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error deleting quiz:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Duplicate quiz
   */
  async duplicateQuiz(quizId, newTitle) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/quizzes/${quizId}/duplicate`,
        {
          method: 'POST',
          body: JSON.stringify({ title: newTitle }),
        }
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error duplicating quiz:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Export quiz results
   */
  async exportQuizResults(quizId, format = 'csv') {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/quizzes/${quizId}/export?format=${format}`,
        {
          method: 'GET',
        }
      );

      // Handle file download
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-results-${quizId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error exporting quiz results:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============ QUESTION BANK METHODS ============

  /**
   * Get question bank with filters
   */
  async getQuestionBank(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = `/api/question-bank${queryParams ? `?${queryParams}` : ''}`;

      const response = await this.databaseService.fetchWithAuth(endpoint);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching question bank:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Create new question for question bank
   */
  async createQuestion(questionData) {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/question-bank', {
        method: 'POST',
        body: JSON.stringify(questionData),
      });
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error creating question:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update question in question bank
   */
  async updateQuestion(questionId, questionData) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/question-bank/${questionId}`,
        {
          method: 'PUT',
          body: JSON.stringify(questionData),
        }
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error updating question:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete question from question bank
   */
  async deleteQuestion(questionId) {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/question-bank/${questionId}`,
        {
          method: 'DELETE',
        }
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error deleting question:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Bulk delete questions
   */
  async bulkDeleteQuestions(questionIds) {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/question-bank/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ questionIds }),
      });
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error bulk deleting questions:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Export questions from question bank
   */
  async exportQuestions(questionIds = [], format = 'json') {
    try {
      const response = await this.databaseService.fetchWithAuth(
        `/api/question-bank/export?format=${format}`,
        {
          method: 'POST',
          body: JSON.stringify({ questionIds }),
        }
      );

      // Handle file download
      const blob = new Blob([JSON.stringify(response)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `questions-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error exporting questions:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Import questions to question bank
   */
  async importQuestions(questionsData) {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/question-bank/import', {
        method: 'POST',
        body: JSON.stringify({ questions: questionsData }),
      });
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error importing questions:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get question categories
   */
  async getQuestionCategories() {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/question-bank/categories');
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching question categories:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Create new question category
   */
  async createQuestionCategory(categoryData) {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/question-bank/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error creating question category:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get subjects for questions/quizzes
   */
  async getSubjects() {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/subjects');
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return {
        success: false,
        error: error.message,
        data: ['Mathematics', 'Science', 'English', 'History', 'Geography'], // fallback
      };
    }
  }
}

const facultyService = new FacultyService();
export default facultyService;
