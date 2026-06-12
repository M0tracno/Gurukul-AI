import DatabaseService from './databaseService';

/**
 * Feedback Service
 * Handles all API calls for the Feedback feature, mirroring the established
 * service pattern (uses DatabaseService.fetchWithAuth for base URL + auth
 * header, and unwraps the canonical success envelope { success, data, meta }).
 */

const EMPTY_STATS = {
  total: 0,
  positive: 0,
  needsAttention: 0,
  averageRating: 0,
};

class FeedbackService {
  constructor() {
    this.databaseService = DatabaseService;
  }

  /**
   * Get the feedback addressed to the authenticated teacher along with the
   * aggregate Feedback_Stats. Backed by GET /api/feedback/received which
   * returns { success, data: FeedbackDTO[], meta: { page, limit, total, stats } }.
   *
   * The author scope is derived from the auth token on the backend, so no
   * identifier is sent from the client.
   */
  async getReceivedFeedback({ page = 1, limit = 20 } = {}) {
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      }).toString();

      const response = await this.databaseService.fetchWithAuth(
        `/api/feedback/received?${query}`
      );

      return {
        success: true,
        data: Array.isArray(response?.data) ? response.data : [],
        stats: { ...EMPTY_STATS, ...(response?.meta?.stats || {}) },
        meta: response?.meta || null,
      };
    } catch (error) {
      console.error('Error fetching received feedback:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        stats: { ...EMPTY_STATS },
        meta: null,
      };
    }
  }

  /**
   * Submit a feedback/rating about a teacher or course. Backed by
   * POST /api/feedback which returns { success, data: FeedbackDTO } on 201.
   *
   * The author scope is derived from the auth token on the backend, so no
   * author identifier is sent from the client.
   *
   * @param {Object} input
   * @param {'teacher'|'course'} input.targetType - The kind of target being rated.
   * @param {string} input.targetId - The identifier of the teacher or course.
   * @param {number} input.rating - Integer rating on the configured scale (1-5).
   * @param {string} [input.comment] - Optional comment text.
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async submitFeedback({ targetType, targetId, rating, comment } = {}) {
    try {
      const response = await this.databaseService.fetchWithAuth('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, rating, comment }),
      });

      return {
        success: true,
        data: response?.data ?? null,
      };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

const feedbackService = new FeedbackService();
export default feedbackService;
