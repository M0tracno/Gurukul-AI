import io from 'socket.io-client';
import axios from '../utils/mockApiService';
import env from '../config/env';

/**
 * Messaging Service
 * Handles all messaging functionality between parents and teachers
 * Integrates with Socket.IO for real-time messaging
 */

class MessagingService {
  constructor() {
    this.socket = null;
    this.baseURL = env.API_URL;
    this.apiURL = `${this.baseURL}/api/messages`;
    this.isConnected = false;
    this.messageListeners = new Set();
    this.connectionListeners = new Set();
  }

  /**
   * Initialize Socket.IO connection
   */
  async initializeSocket(authToken) {
    try {
      if (this.socket && this.socket.connected) {
        return;
      }

      this.socket = io(this.baseURL, {
        auth: {
          token: authToken,
        },
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
      });

      this.socket.on('connect', () => {
        console.log('Connected to messaging server');
        this.isConnected = true;
        this.notifyConnectionListeners('connected');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from messaging server');
        this.isConnected = false;
        this.notifyConnectionListeners('disconnected');
      });

      this.socket.on('new_message', message => {
        console.log('New message received:', message);
        this.notifyMessageListeners('new_message', message);
      });

      this.socket.on('message_delivered', data => {
        console.log('Message delivered:', data);
        this.notifyMessageListeners('message_delivered', data);
      });

      this.socket.on('message_read', data => {
        console.log('Message read:', data);
        this.notifyMessageListeners('message_read', data);
      });

      this.socket.on('typing_start', data => {
        this.notifyMessageListeners('typing_start', data);
      });

      this.socket.on('typing_stop', data => {
        this.notifyMessageListeners('typing_stop', data);
      });

      this.socket.on('connect_error', error => {
        console.error('Socket connection error:', error);
        this.notifyConnectionListeners('error', error);
      });
    } catch (error) {
      console.error('Error initializing socket:', error);
      throw error;
    }
  }

  /**
   * Disconnect Socket.IO
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Join conversation room
   */
  joinConversation(conversationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  /**
   * Leave conversation room
   */
  leaveConversation(conversationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_conversation', { conversationId });
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId, isTyping) {
    if (this.socket && this.isConnected) {
      if (isTyping) {
        this.socket.emit('typing_start', { conversationId });
      } else {
        this.socket.emit('typing_stop', { conversationId });
      }
    }
  }

  /**
   * Add message listener
   */
  addMessageListener(callback) {
    this.messageListeners.add(callback);
  }

  /**
   * Remove message listener
   */
  removeMessageListener(callback) {
    this.messageListeners.delete(callback);
  }

  /**
   * Add connection listener
   */
  addConnectionListener(callback) {
    this.connectionListeners.add(callback);
  }

  /**
   * Remove connection listener
   */
  removeConnectionListener(callback) {
    this.connectionListeners.delete(callback);
  }

  /**
   * Notify message listeners
   */
  notifyMessageListeners(event, data) {
    this.messageListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  /**
   * Notify connection listeners
   */
  notifyConnectionListeners(event, data) {
    this.connectionListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  /**
   * Get auth headers
   */
  getAuthHeaders() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Make authenticated API request
   */
  async makeAuthenticatedRequest(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Send a message
   * POST /api/messages — returns the canonical success envelope { success, data }.
   */
  async sendMessage(messageData) {
    try {
      const response = await this.makeAuthenticatedRequest(`${this.apiURL}`, {
        method: 'POST',
        body: JSON.stringify(messageData),
      });

      return {
        success: true,
        data: response.data,
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
   * Get conversation between parent and teacher about a student
   */
  async getConversation(participantId, studentId, page = 1, limit = 50) {
    try {
      const queryParams = new URLSearchParams({
        participantId,
        studentId,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await this.makeAuthenticatedRequest(
        `${this.apiURL}/conversation?${queryParams}`
      );

      return {
        success: true,
        data: response.data,
        pagination: response.pagination,
      };
    } catch (error) {
      console.error('Error getting conversation:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: null,
      };
    }
  }

  /**
   * Get all conversations for current user
   * GET /api/messages/conversations — returns { success, data: ConversationSummary[], meta }.
   */
  async getConversations(page = 1, limit = 20) {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await this.makeAuthenticatedRequest(
        `${this.apiURL}/conversations?${queryParams}`
      );

      return {
        success: true,
        data: response.data,
        meta: response.meta,
        pagination: response.meta || response.pagination,
      };
    } catch (error) {
      console.error('Error getting conversations:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        meta: null,
        pagination: null,
      };
    }
  }

  /**
   * Get a single conversation thread by conversationId.
   * GET /api/messages/conversations/:conversationId — returns
   * { success, data: MessageDTO[], meta: { page, limit, total, conversationExists } }.
   */
  async getConversationThread(conversationId, page = 1, limit = 50) {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await this.makeAuthenticatedRequest(
        `${this.apiURL}/conversations/${encodeURIComponent(conversationId)}?${queryParams}`
      );

      return {
        success: true,
        data: response.data,
        meta: response.meta,
        conversationExists: response.meta ? response.meta.conversationExists : undefined,
      };
    } catch (error) {
      console.error('Error getting conversation thread:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        meta: null,
      };
    }
  }

  /**
   * Get inbox messages
   */
  async getInbox(page = 1, limit = 20, unreadOnly = false) {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        unreadOnly: unreadOnly.toString(),
      });

      const response = await this.makeAuthenticatedRequest(`${this.apiURL}/inbox?${queryParams}`);

      return {
        success: true,
        data: response.data,
        pagination: response.pagination,
      };
    } catch (error) {
      console.error('Error getting inbox:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: null,
      };
    }
  }

  /**
   * Mark message as read
   * PATCH /api/messages/:messageId/read
   */
  async markAsRead(messageId) {
    try {
      const response = await this.makeAuthenticatedRequest(`${this.apiURL}/${messageId}/read`, {
        method: 'PATCH',
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error marking message as read:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a message (soft delete)
   * DELETE /api/messages/:messageId
   */
  async deleteMessage(messageId) {
    try {
      await this.makeAuthenticatedRequest(`${this.apiURL}/${messageId}`, {
        method: 'DELETE',
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting message:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get available contacts (parents or teachers)
   */
  async getAvailableContacts(studentId = null) {
    try {
      const queryParams = studentId ? `?studentId=${studentId}` : '';
      const response = await this.makeAuthenticatedRequest(`${this.apiURL}/contacts${queryParams}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error getting contacts:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Search messages
   */
  async searchMessages(query, page = 1, limit = 20) {
    try {
      const queryParams = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await this.makeAuthenticatedRequest(`${this.apiURL}/search?${queryParams}`);

      return {
        success: true,
        data: response.data,
        pagination: response.pagination,
      };
    } catch (error) {
      console.error('Error searching messages:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: null,
      };
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount() {
    try {
      const response = await this.makeAuthenticatedRequest(`${this.apiURL}/unread-count`);

      return {
        success: true,
        count: response.count,
      };
    } catch (error) {
      console.error('Error getting unread count:', error);
      return {
        success: false,
        count: 0,
      };
    }
  }

  /**
   * Generate conversation ID for consistent thread management
   */
  generateConversationId(parentId, teacherId, studentId) {
    return `parent_${parentId}_teacher_${teacherId}_student_${studentId}`;
  }
  /**
   * Get message statistics
   */
  async getMessageStats(timeframe = 30) {
    try {
      const queryParams = new URLSearchParams({
        timeframe: timeframe.toString(),
      });

      const response = await this.makeAuthenticatedRequest(`${this.apiURL}/stats?${queryParams}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error getting message stats:', error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Get message templates
   */
  async getMessageTemplates() {
    try {
      const response = await this.makeAuthenticatedRequest(`${this.apiURL}/templates`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error getting message templates:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Process template with variables
   */
  processTemplate(template, variables) {
    let processedTemplate = template;

    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      processedTemplate = processedTemplate.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        variables[key] || placeholder
      );
    });

    return processedTemplate;
  }

  /**
   * Send message with template support
   */
  async sendMessageFromTemplate(templateId, variables, messageData) {
    try {
      // Get templates
      const templatesResult = await this.getMessageTemplates();
      if (!templatesResult.success) {
        throw new Error('Failed to load message templates');
      }

      // Find the template
      const template = templatesResult.data.find(t => t.id === templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Process template
      const processedContent = this.processTemplate(template.template, variables);

      // Send message with processed content
      const finalMessageData = {
        ...messageData,
        content: processedContent,
        subject: messageData.subject || template.title,
        messageType: template.category,
        templateUsed: templateId,
      };

      return await this.sendMessage(finalMessageData);
    } catch (error) {
      console.error('Error sending message from template:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  /**
   * Get or create conversation
   */
  async getOrCreateConversation(participantId, studentId) {
    try {
      // First try to get existing conversation
      const existingConversation = await this.getConversation(participantId, studentId, 1, 1);

      if (existingConversation.success && existingConversation.data.length > 0) {
        return existingConversation;
      }

      // If no conversation exists, it will be created when the first message is sent
      return {
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      };
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: null,
      };
    }
  }

  /**
   * Send message with file attachment
   * @param {Object} messageData - Message data
   * @param {File} file - File to attach
   * @returns {Promise<Object>} Response object
   */
  async sendMessageWithAttachment(messageData, file) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('attachment', file);

      // Add message data to FormData
      Object.keys(messageData).forEach(key => {
        if (messageData[key] !== undefined && messageData[key] !== null) {
          formData.append(key, messageData[key]);
        }
      });

      // Determine endpoint based on user role
      let endpoint = '/api/messages/send-with-attachment';
      const userRole = this.getUserRole();

      if (userRole === 'parent') {
        endpoint = '/api/messages/parent/send-with-attachment';
      } else if (userRole === 'faculty' || userRole === 'admin') {
        endpoint = '/api/messages/faculty/send-with-attachment';
      }

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${this.getToken()}`,
        },
      });

      // Emit through socket if connected
      if (this.socket && this.isConnected) {
        this.socket.emit('send_message', {
          ...response.data.data,
          tempId: messageData.tempId,
        });
      }

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Message with attachment sent successfully',
      };
    } catch (error) {
      console.error('Error sending message with attachment:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: null,
      };
    }
  }

  /**
   * Download message attachment
   * @param {string} messageId - Message ID
   * @param {number} attachmentIndex - Index of attachment in message
   * @returns {Promise<Blob>} File blob
   */
  async downloadAttachment(messageId, attachmentIndex) {
    try {
      const response = await axios.get(
        `/api/messages/${messageId}/attachments/${attachmentIndex}/download`,
        {
          headers: {
            Authorization: `Bearer ${this.getToken()}`,
          },
          responseType: 'blob',
        }
      );

      return {
        success: true,
        data: response.data,
        fileName: this.getFileNameFromHeaders(response.headers),
      };
    } catch (error) {
      console.error('Error downloading attachment:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get file name from response headers
   * @param {Object} headers - Response headers
   * @returns {string} File name
   */
  getFileNameFromHeaders(headers) {
    const contentDisposition = headers['content-disposition'];
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch) {
        return fileNameMatch[1];
      }
    }
    return 'attachment';
  }

  /**
   * Get user role from localStorage or token
   * @returns {string} User role
   */
  getUserRole() {
    try {
      const role = localStorage.getItem('userRole');
      if (role) return role;

      // Try to extract from token
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role;
      }

      return 'parent'; // Default fallback
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'parent';
    }
  }

  /**
   * Validate file for attachment
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size must be less than 10MB',
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported. Please upload images or documents only.',
      };
    }

    return { valid: true };
  }
}

// Create and export singleton instance
const messagingService = new MessagingService();
export default messagingService;
