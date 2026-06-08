import { io } from 'socket.io-client';
import env from '../config/env';

/**
 * Real-time WebSocket Service for Phase 2 Smart Features
 * Provides live collaboration, instant messaging, and real-time notifications
 * Part of the Educational Management System - Phase 2 Enhancement
 */


class RealtimeService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventListeners = new Map();
    this.rooms = new Set();
    this.userInfo = null;
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, error
    
    this.initialize();
  }

  async initialize() {
    try {
      const socketUrl = env.SOCKET_URL;
      
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        autoConnect: false
      });

      this.setupSocketListeners();
      console.log('Real-time Service initialized');
    } catch (error) {
      console.error('Failed to initialize Real-time Service:', error);
      this.connectionState = 'error';
    }
  }

  setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      console.log('Connected to real-time server');
      
      // Re-join rooms after reconnection
      this.rooms.forEach(room => {
        this.socket.emit('join_room', { room, userInfo: this.userInfo });
      });

      this.emit('connection_status', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.connectionState = 'disconnected';
      console.log('Disconnected from real-time server:', reason);
      this.emit('connection_status', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      this.isConnected = false;
      this.connectionState = 'error';
      console.error('Connection error:', error);
      this.emit('connection_status', { status: 'error', error: error.message });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      this.emit('connection_status', { status: 'reconnected', attempt: attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      this.reconnectAttempts++;
      console.error('Reconnection failed:', error);
      this.emit('connection_status', { 
        status: 'reconnect_failed', 
        attempt: this.reconnectAttempts,
        error: error.message 
      });
    });

    // Message and event handlers
    this.socket.on('message', (data) => this.handleMessage(data));
    this.socket.on('notification', (data) => this.handleNotification(data));
    this.socket.on('user_joined', (data) => this.handleUserJoined(data));
    this.socket.on('user_left', (data) => this.handleUserLeft(data));
    this.socket.on('typing_start', (data) => this.handleTypingStart(data));
    this.socket.on('typing_stop', (data) => this.handleTypingStop(data));
    this.socket.on('collaboration_update', (data) => this.handleCollaborationUpdate(data));
    this.socket.on('room_update', (data) => this.handleRoomUpdate(data));
  }

  // ==================== CONNECTION MANAGEMENT ====================

  async connect(userInfo) {
    try {
      this.userInfo = userInfo;
      this.connectionState = 'connecting';
      
      if (!this.socket) {
        await this.initialize();
      }

      this.socket.connect();
      
      // Wait for connection with timeout
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          this.socket.emit('user_info', userInfo);
          resolve({ status: 'connected', userInfo });
        });

        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      this.connectionState = 'error';
      throw error;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.rooms.clear();
      this.userInfo = null;
      this.connectionState = 'disconnected';
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      state: this.connectionState,
      rooms: Array.from(this.rooms),
      userInfo: this.userInfo
    };
  }

  // ==================== ROOM MANAGEMENT ====================

  async joinRoom(roomId, roomType = 'general') {
    if (!this.isConnected) {
      throw new Error('Not connected to real-time server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('join_room', {
        room: roomId,
        type: roomType,
        userInfo: this.userInfo
      });

      this.socket.once(`joined_${roomId}`, (data) => {
        this.rooms.add(roomId);
        resolve(data);
      });

      this.socket.once(`join_error_${roomId}`, (error) => {
        reject(new Error(error.message));
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 5000);
    });
  }

  async leaveRoom(roomId) {
    if (!this.isConnected) return;

    this.socket.emit('leave_room', { room: roomId, userInfo: this.userInfo });
    this.rooms.delete(roomId);
  }

  getRooms() {
    return Array.from(this.rooms);
  }

  // ==================== MESSAGING ====================

  sendMessage(roomId, message, messageType = 'text') {
    if (!this.isConnected) {
      throw new Error('Not connected to real-time server');
    }

    const messageData = {
      id: this.generateMessageId(),
      room: roomId,
      type: messageType,
      content: message,
      sender: this.userInfo,
      timestamp: new Date().toISOString(),
      metadata: {
        platform: 'web',
        version: '2.0'
      }
    };

    this.socket.emit('send_message', messageData);
    return messageData;
  }

  sendPrivateMessage(recipientId, message, messageType = 'text') {
    if (!this.isConnected) {
      throw new Error('Not connected to real-time server');
    }

    const messageData = {
      id: this.generateMessageId(),
      recipient: recipientId,
      type: messageType,
      content: message,
      sender: this.userInfo,
      timestamp: new Date().toISOString(),
      private: true
    };

    this.socket.emit('private_message', messageData);
    return messageData;
  }

  sendTypingIndicator(roomId, isTyping = true) {
    if (!this.isConnected) return;

    this.socket.emit(isTyping ? 'typing_start' : 'typing_stop', {
      room: roomId,
      user: this.userInfo
    });
  }

  // ==================== LIVE COLLABORATION ====================

  startCollaboration(sessionId, documentType, documentData) {
    if (!this.isConnected) {
      throw new Error('Not connected to real-time server');
    }

    const collaborationData = {
      sessionId,
      documentType,
      documentData,
      user: this.userInfo,
      timestamp: new Date().toISOString()
    };

    this.socket.emit('start_collaboration', collaborationData);
    return collaborationData;
  }

  sendCollaborationUpdate(sessionId, operation, data) {
    if (!this.isConnected) return;

    const updateData = {
      sessionId,
      operation, // 'insert', 'delete', 'update', 'cursor_move'
      data,
      user: this.userInfo,
      timestamp: new Date().toISOString(),
      operationId: this.generateOperationId()
    };

    this.socket.emit('collaboration_update', updateData);
    return updateData;
  }

  endCollaboration(sessionId) {
    if (!this.isConnected) return;

    this.socket.emit('end_collaboration', {
      sessionId,
      user: this.userInfo,
      timestamp: new Date().toISOString()
    });
  }

  // ==================== REAL-TIME NOTIFICATIONS ====================

  sendNotification(targetUsers, notification) {
    if (!this.isConnected) return;

    const notificationData = {
      id: this.generateNotificationId(),
      targets: Array.isArray(targetUsers) ? targetUsers : [targetUsers],
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      priority: notification.priority || 'medium',
      sender: this.userInfo,
      timestamp: new Date().toISOString(),
      metadata: notification.metadata || {}
    };

    this.socket.emit('send_notification', notificationData);
    return notificationData;
  }

  broadcastNotification(roomId, notification) {
    if (!this.isConnected) return;

    const notificationData = {
      id: this.generateNotificationId(),
      room: roomId,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      priority: notification.priority || 'medium',
      sender: this.userInfo,
      timestamp: new Date().toISOString(),
      broadcast: true
    };

    this.socket.emit('broadcast_notification', notificationData);
    return notificationData;
  }

  // ==================== EVENT HANDLING ====================

  handleMessage(data) {
    this.emit('message_received', data);
  }

  handleNotification(data) {
    this.emit('notification_received', data);
  }

  handleUserJoined(data) {
    this.emit('user_joined', data);
  }

  handleUserLeft(data) {
    this.emit('user_left', data);
  }

  handleTypingStart(data) {
    this.emit('typing_start', data);
  }

  handleTypingStop(data) {
    this.emit('typing_stop', data);
  }

  handleCollaborationUpdate(data) {
    this.emit('collaboration_update', data);
  }

  handleRoomUpdate(data) {
    this.emit('room_update', data);
  }

  // ==================== EVENT LISTENER MANAGEMENT ====================

  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName).add(callback);
  }

  off(eventName, callback) {
    if (this.eventListeners.has(eventName)) {
      this.eventListeners.get(eventName).delete(callback);
    }
  }

  emit(eventName, data) {
    if (this.eventListeners.has(eventName)) {
      this.eventListeners.get(eventName).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }

  // ==================== UTILITY METHODS ====================

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== STATUS AND DIAGNOSTICS ====================

  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionState: this.connectionState,
      rooms: Array.from(this.rooms),
      userInfo: this.userInfo,
      reconnectAttempts: this.reconnectAttempts,
      eventListeners: Array.from(this.eventListeners.keys()),
      lastPing: this.socket?.connected ? Date.now() : null
    };
  }

  ping() {
    if (!this.isConnected) return Promise.reject(new Error('Not connected'));

    return new Promise((resolve) => {
      const startTime = Date.now();
      this.socket.emit('ping', startTime);
      
      this.socket.once('pong', (timestamp) => {
        const latency = Date.now() - timestamp;
        resolve({ latency, timestamp });
      });
    });
  }

  // ==================== CLEANUP ====================

  cleanup() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.eventListeners.clear();
    this.rooms.clear();
    this.userInfo = null;
    this.isConnected = false;
    this.connectionState = 'disconnected';
  }
}

// Create singleton instance
const realtimeService = new RealtimeService();

export default realtimeService;
