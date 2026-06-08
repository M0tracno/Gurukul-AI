import DatabaseService from './databaseService';

/**
 * AdminService - Handles all admin-related API operations
 * Provides methods for admin dashboard functionality including user management,
 * course management, system analytics, and data operations
 */
class AdminService {
  constructor() {
    this.databaseService = DatabaseService;
  }

  /**
   * Get admin profile information
   */
  async getAdminProfile(adminId) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/admin/${adminId}/profile`);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get system dashboard summary
   */
  async getDashboardSummary() {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/dashboard/summary');
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      return {
        success: false,
        error: error.message,
        data: {
          users: 0,
          faculty: 0,
          students: 0,
          parents: 0,
          courses: 0,
          quizzes: 0,
          activeUsers: 0,
          systemLoad: 0
        }
      };
    }
  }

  /**
   * Get real-time system metrics
   */
  async getRealTimeMetrics() {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/metrics/realtime');
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      return {
        success: false,
        error: error.message,
        data: {
          activeUsers: 0,
          onlineStudents: 0,
          onlineFaculty: 0,
          systemLoad: 0,
          lastUpdated: new Date().toLocaleTimeString()
        }
      };
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/system/health');
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching system health:', error);
      return {
        success: false,
        error: error.message,
        data: {
          database: { status: 'Unknown', responseTime: 'N/A' },
          apiServices: { status: 'Unknown', responseTime: 'N/A' },
          authServer: { status: 'Unknown', responseTime: 'N/A' },
          storage: { status: 'Unknown', responseTime: 'N/A' },
          mailService: { status: 'Unknown', responseTime: 'N/A' }
        }
      };
    }
  }
  /**
   * User Management APIs
   */
  async getUsers() {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/auth/users');
      return {
        success: true,
        data: response.users || response
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Alias method for getAllUsers (backward compatibility)
  async getAllUsers() {
    return this.getUsers();
  }

  async createUser(userData) {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/auth/create-user', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateUser(userId, userData) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/admin/auth/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteUser(userId) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/admin/auth/users/${userId}`, {
        method: 'DELETE'
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Course Management APIs
   */
  async getCourses() {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/courses');
      // Ensure we have an array of courses
      const coursesData = response.courses || response || [];
      return {
        success: true,
        data: Array.isArray(coursesData) ? coursesData : []
      };
    } catch (error) {
      console.error('Error fetching courses:', error);
      return {
        success: false,
        error: error.message,
        data: []  // Always return an empty array for data when there's an error
      };
    }
  }

  async createCourse(courseData) {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData)
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error creating course:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateCourse(courseId, courseData) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify(courseData)
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error updating course:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteCourse(courseId) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/admin/courses/${courseId}`, {
        method: 'DELETE'
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error deleting course:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analytics and Reports APIs
   */
  async getAnalyticsData(dateRange = 'last30days') {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/admin/analytics?range=${dateRange}`);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      return {
        success: false,
        error: error.message,
        data: {
          overview: {
            totalUsers: 0,
            totalCourses: 0,
            totalEnrollments: 0,
            totalQuizzes: 0,
            activeUsers: 0,
            completionRate: 0,
            avgGrade: 0,
            systemUptime: 0
          },
          userGrowth: [],
          coursePopularity: [],
          performanceMetrics: {
            avgQuizScore: 0,
            avgAssignmentScore: 0,
            passRate: 0,
            dropoutRate: 0,
            satisfactionScore: 0
          },
          recentActivities: []
        }
      };
    }
  }

  async exportReport(reportType, format = 'pdf') {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/admin/reports/export`, {
        method: 'POST',
        body: JSON.stringify({ reportType, format })
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error exporting report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Data Management APIs
   */
  async getDatabaseStats() {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/database/stats');
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching database stats:', error);
      return {
        success: false,
        error: error.message,
        data: {
          totalRecords: 0,
          users: 0,
          courses: 0,
          students: 0,
          faculty: 0,
          enrollments: 0,
          attendance: 0,
          marks: 0,
          lastBackup: null,
          dbSize: '0 MB'
        }
      };
    }
  }

  async exportData(dataType, format = 'csv') {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/admin/data/export`, {
        method: 'POST',
        body: JSON.stringify({ dataType, format })
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async importData(file, dataType, format) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataType', dataType);
      formData.append('format', format);

      const response = await this.databaseService.fetchWithAuth('/api/admin/data/import', {
        method: 'POST',
        body: formData,
        headers: {} // Let fetch set the content-type for FormData
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error importing data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createBackup() {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/database/backup', {
        method: 'POST'
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async restoreBackup(backupFile) {
    try {
      const formData = new FormData();
      formData.append('backup', backupFile);

      const response = await this.databaseService.fetchWithAuth('/api/admin/database/restore', {
        method: 'POST',
        body: formData,
        headers: {} // Let fetch set the content-type for FormData
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error restoring backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * System Settings APIs
   */
  async getSystemSettings() {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/settings');
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching system settings:', error);
      return {
        success: false,
        error: error.message,
        data: {}
      };
    }
  }

  async updateSystemSettings(settings) {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error updating system settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Notification and Messaging APIs
   */
  async getSystemNotifications() {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/notifications');
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async sendSystemNotification(notificationData) {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/admin/notifications', {
        method: 'POST',
        body: JSON.stringify(notificationData)
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Activity Log APIs
   */
  async getActivityLogs(limit = 100) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/admin/logs/activity?limit=${limit}`);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async getSecurityLogs(limit = 100) {
    try {
      const response = await this.databaseService.fetchWithAuth(`/api/admin/logs/security?limit=${limit}`);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching security logs:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

const adminService = new AdminService();
export default adminService;



