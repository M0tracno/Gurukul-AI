// Browser-compatible event emitter (replaces Node.js 'events' module)
class EventEmitter {
  constructor() {
    this._listeners = new Map();
  }
  on(event, listener) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(listener);
    return this;
  }
  emit(event, ...args) {
    const listeners = this._listeners.get(event);
    if (listeners) listeners.forEach(fn => fn(...args));
    return !!listeners;
  }
  off(event, listener) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      this._listeners.set(event, listeners.filter(fn => fn !== listener));
    }
    return this;
  }
  removeAllListeners(event) {
    if (event) this._listeners.delete(event);
    else this._listeners.clear();
    return this;
  }
}

// src/services/SmartNotificationService.js

class SmartNotificationService extends EventEmitter {
  constructor() {
    super();
    this.notificationQueue = [];
    this.userPreferences = new Map();
    this.notificationHistory = new Map();
    this.contextualRules = new Map();
    this.smartFilters = new Map();
    this.deliveryChannels = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      await this.loadUserPreferences();
      this.setupContextualRules();
      this.initializeSmartFilters();
      this.setupDeliveryChannels();
      this.startIntelligentProcessing();
      this.isInitialized = true;
      console.log('Smart Notification Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Smart Notification Service:', error);
      throw error;
    }
  }

  async loadUserPreferences() {
    // Load user notification preferences
    const preferences = {
      priority: 'high', // high, medium, low
      channels: ['push', 'email', 'in-app'], // Preferred delivery channels
      quietHours: { start: '22:00', end: '07:00' },
      subjectFilters: ['assignments', 'grades', 'announcements'],
      frequency: 'immediate', // immediate, batched, digest
      smartGrouping: true,
      adaptiveTiming: true
    };
    
    this.userPreferences.set('default', preferences);
  }

  setupContextualRules() {
    // Academic context rules
    this.contextualRules.set('assignment_due', {
      urgency: 'high',
      timing: [24, 6, 1], // hours before due date
      escalation: true,
      personalizeMessage: true
    });

    this.contextualRules.set('grade_posted', {
      urgency: 'medium',
      timing: 'immediate',
      groupBySubject: true,
      includeInsights: true
    });

    this.contextualRules.set('class_reminder', {
      urgency: 'medium',
      timing: [30, 10], // minutes before class
      includeLocation: true,
      includePreparation: true
    });

    this.contextualRules.set('system_maintenance', {
      urgency: 'low',
      timing: [24, 2], // hours before maintenance
      batchWithSimilar: true
    });
  }

  initializeSmartFilters() {
    // Relevance filter
    this.smartFilters.set('relevance', (notification, userContext) => {
      const relevanceScore = this.calculateRelevance(notification, userContext);
      return relevanceScore > 0.6;
    });

    // Frequency filter
    this.smartFilters.set('frequency', (notification, userHistory) => {
      const recentSimilar = this.countRecentSimilar(notification, userHistory);
      return recentSimilar < 3;
    });

    // Timing filter
    this.smartFilters.set('timing', (notification, userPrefs) => {
      return this.isOptimalTiming(notification, userPrefs);
    });

    // Priority filter
    this.smartFilters.set('priority', (notification, userPrefs) => {
      return notification.priority >= userPrefs.priority;
    });
  }

  setupDeliveryChannels() {
    // Push notification channel
    this.deliveryChannels.set('push', {
      available: 'Notification' in window,
      send: this.sendPushNotification.bind(this),
      maxLength: 150
    });

    // In-app notification channel
    this.deliveryChannels.set('in-app', {
      available: true,
      send: this.sendInAppNotification.bind(this),
      maxLength: 300
    });

    // Email channel
    this.deliveryChannels.set('email', {
      available: true,
      send: this.sendEmailNotification.bind(this),
      maxLength: 1000
    });

    // SMS channel
    this.deliveryChannels.set('sms', {
      available: true,
      send: this.sendSMSNotification.bind(this),
      maxLength: 160
    });
  }

  async createSmartNotification(notificationData) {
    const smartNotification = {
      id: this.generateNotificationId(),
      timestamp: new Date(),
      ...notificationData,
      
      // Smart metadata
      context: await this.analyzeContext(notificationData),
      userSegment: await this.getUserSegment(notificationData.userId),
      relevanceScore: 0,
      priorityScore: 0,
      timingScore: 0,
      
      // Processing status
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      
      // Analytics
      analytics: {
        created: new Date(),
        processed: null,
        delivered: null,
        opened: null,
        clicked: null
      }
    };

    // Add to processing queue
    this.notificationQueue.push(smartNotification);
    this.processNotificationQueue();

    return smartNotification;
  }

  async processNotificationQueue() {
    if (this.notificationQueue.length === 0) return;

    const notification = this.notificationQueue.shift();
    
    try {
      // Apply smart filtering
      const shouldSend = await this.applySmartFilters(notification);
      
      if (shouldSend) {
        // Apply intelligent timing
        const optimalTiming = await this.calculateOptimalTiming(notification);
        
        if (optimalTiming.sendNow) {
          await this.deliverNotification(notification);
        } else {
          // Schedule for later
          this.scheduleNotification(notification, optimalTiming.scheduledTime);
        }
      } else {
        // Notification filtered out
        notification.status = 'filtered';
        this.recordNotificationMetrics(notification);
      }
    } catch (error) {
      console.error('Error processing notification:', error);
      notification.status = 'failed';
      notification.attempts++;
      
      if (notification.attempts < notification.maxAttempts) {
        // Retry later
        setTimeout(() => {
          this.notificationQueue.push(notification);
          this.processNotificationQueue();
        }, 30000 * notification.attempts);
      }
    }

    // Process next notification
    if (this.notificationQueue.length > 0) {
      setTimeout(() => this.processNotificationQueue(), 100);
    }
  }

  async applySmartFilters(notification) {
    const userPrefs = this.userPreferences.get(notification.userId) || 
                     this.userPreferences.get('default');
    const userHistory = this.notificationHistory.get(notification.userId) || [];
    const userContext = await this.getUserContext(notification.userId);

    // Apply each filter
    for (const [filterName, filterFunction] of this.smartFilters) {
      const passed = filterFunction(notification, userContext, userHistory, userPrefs);
      if (!passed) {
        notification.filteredBy = filterName;
        return false;
      }
    }

    return true;
  }

  async calculateOptimalTiming(notification) {
    const userPrefs = this.userPreferences.get(notification.userId) || 
                     this.userPreferences.get('default');
    
    const now = new Date();
    
    // Check quiet hours
    if (this.isQuietHours(now, userPrefs.quietHours)) {
      const nextActiveTime = this.getNextActiveTime(userPrefs.quietHours);
      return {
        sendNow: false,
        scheduledTime: nextActiveTime,
        reason: 'quiet_hours'
      };
    }

    // Check user engagement patterns
    const engagementScore = await this.predictEngagement(notification, now);
    
    if (engagementScore < 0.3 && notification.priority !== 'urgent') {
      const optimalTime = await this.findOptimalEngagementTime(notification.userId);
      return {
        sendNow: false,
        scheduledTime: optimalTime,
        reason: 'engagement_optimization'
      };
    }

    return {
      sendNow: true,
      reason: 'immediate_delivery'
    };
  }

  async deliverNotification(notification) {
    const userPrefs = this.userPreferences.get(notification.userId) || 
                     this.userPreferences.get('default');
    
    // Select optimal delivery channels
    const channels = this.selectOptimalChannels(notification, userPrefs);
    
    const deliveryResults = [];
    
    for (const channel of channels) {
      try {
        const result = await this.deliveryChannels.get(channel).send(notification);
        deliveryResults.push({
          channel,
          success: true,
          result
        });
      } catch (error) {
        deliveryResults.push({
          channel,
          success: false,
          error: error.message
        });
      }
    }

    // Update notification status
    notification.status = deliveryResults.some(r => r.success) ? 'delivered' : 'failed';
    notification.analytics.delivered = new Date();
    notification.deliveryResults = deliveryResults;

    // Record in history
    this.recordNotificationHistory(notification);
    this.recordNotificationMetrics(notification);

    // Emit delivery event
    this.emit('notificationDelivered', notification);

    return notification;
  }

  selectOptimalChannels(notification, userPrefs) {
    const availableChannels = userPrefs.channels.filter(channel =>
      this.deliveryChannels.get(channel)?.available
    );

    // Priority-based channel selection
    if (notification.priority === 'urgent') {
      return ['push', 'sms'].filter(c => availableChannels.includes(c));
    } else if (notification.priority === 'high') {
      return ['push', 'in-app'].filter(c => availableChannels.includes(c));
    } else {
      return ['in-app'].filter(c => availableChannels.includes(c));
    }
  }

  async sendPushNotification(notification) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      throw new Error('Push notifications not available');
    }

    const options = {
      body: this.truncateText(notification.message, 150),
      icon: notification.icon || '/favicon.ico',
      badge: '/icons/badge-icon.png',
      tag: notification.tag || notification.id,
      data: notification.data || {},
      actions: notification.actions || [],
      silent: notification.priority === 'low'
    };

    const pushNotification = new Notification(notification.title, options);
    
    pushNotification.onclick = () => {
      this.handleNotificationClick(notification);
    };

    return pushNotification;
  }

  async sendInAppNotification(notification) {
    // Send to notification context or event system
    this.emit('inAppNotification', {
      ...notification,
      displayTime: this.calculateDisplayTime(notification)
    });
    
    return { delivered: true, channel: 'in-app' };
  }

  async sendEmailNotification(notification) {
    // In a real implementation, this would integrate with an email service
    const emailData = {
      to: notification.email || notification.userId,
      subject: notification.title,
      body: this.formatEmailBody(notification),
      priority: notification.priority
    };

    // Mock email sending
    console.log('Email notification sent:', emailData);
    return { delivered: true, channel: 'email', messageId: Date.now() };
  }

  async sendSMSNotification(notification) {
    // In a real implementation, this would integrate with an SMS service
    const smsData = {
      to: notification.phone || notification.userId,
      message: this.truncateText(`${notification.title}: ${notification.message}`, 160),
      priority: notification.priority
    };

    // Mock SMS sending
    console.log('SMS notification sent:', smsData);
    return { delivered: true, channel: 'sms', messageId: Date.now() };
  }

  // Helper methods
  calculateRelevance(notification, userContext) {
    let score = 0.5; // Base relevance
    
    // Subject relevance
    if (userContext.subjects.includes(notification.subject)) {
      score += 0.3;
    }
    
    // Role relevance
    if (notification.targetRoles.includes(userContext.role)) {
      score += 0.2;
    }
    
    // Timing relevance
    if (this.isRelevantTiming(notification, userContext)) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  countRecentSimilar(notification, userHistory) {
    const recentHours = 24;
    const cutoff = new Date(Date.now() - recentHours * 60 * 60 * 1000);
    
    return userHistory.filter(n => 
      n.timestamp > cutoff && 
      n.type === notification.type &&
      n.subject === notification.subject
    ).length;
  }

  isOptimalTiming(notification, userPrefs) {
    const now = new Date();
    
    // Check quiet hours
    if (this.isQuietHours(now, userPrefs.quietHours)) {
      return notification.priority === 'urgent';
    }
    
    return true;
  }

  isQuietHours(time, quietHours) {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const currentTime = hour * 100 + minute;
    
    const start = this.parseTimeString(quietHours.start);
    const end = this.parseTimeString(quietHours.end);
    
    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      return currentTime >= start || currentTime <= end;
    }
  }

  parseTimeString(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 100 + minutes;
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  formatEmailBody(notification) {
    return `
      <h2>${notification.title}</h2>
      <p>${notification.message}</p>
      ${notification.actionUrl ? `<a href="${notification.actionUrl}">Take Action</a>` : ''}
      <p><small>Sent at ${new Date().toLocaleString()}</small></p>
    `;
  }

  calculateDisplayTime(notification) {
    const baseTimes = {
      urgent: 10000,
      high: 8000,
      medium: 6000,
      low: 4000
    };
    
    return baseTimes[notification.priority] || baseTimes.medium;
  }

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  recordNotificationHistory(notification) {
    const userId = notification.userId;
    if (!this.notificationHistory.has(userId)) {
      this.notificationHistory.set(userId, []);
    }
    
    const history = this.notificationHistory.get(userId);
    history.push({
      id: notification.id,
      type: notification.type,
      subject: notification.subject,
      timestamp: notification.timestamp,
      delivered: notification.status === 'delivered'
    });
    
    // Keep only last 100 notifications
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  recordNotificationMetrics(notification) {
    // In a real implementation, send to analytics service
    console.log('Notification metrics:', {
      id: notification.id,
      status: notification.status,
      deliveryTime: notification.analytics.delivered,
      channels: notification.deliveryResults?.map(r => r.channel) || []
    });
  }

  handleNotificationClick(notification) {
    notification.analytics.clicked = new Date();
    this.recordNotificationMetrics(notification);
    
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
    
    this.emit('notificationClicked', notification);
  }

  // Analytics and optimization methods
  async predictEngagement(notification, time) {
    // Mock engagement prediction based on time and notification type
    const hour = time.getHours();
    
    // Educational context engagement patterns
    const engagementByHour = {
      6: 0.2, 7: 0.4, 8: 0.7, 9: 0.8, 10: 0.9,
      11: 0.8, 12: 0.6, 13: 0.5, 14: 0.7, 15: 0.8,
      16: 0.9, 17: 0.8, 18: 0.6, 19: 0.5, 20: 0.4,
      21: 0.3, 22: 0.2, 23: 0.1
    };
    
    return engagementByHour[hour] || 0.3;
  }

  async findOptimalEngagementTime(userId) {
    // Mock optimal time calculation
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM next day
    
    return tomorrow;
  }

  async getUserContext(userId) {
    // Mock user context
    return {
      role: 'student',
      subjects: ['Mathematics', 'Science', 'English'],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lastActive: new Date(),
      engagementScore: 0.7
    };
  }

  async getUserSegment(userId) {
    // Mock user segmentation
    return {
      type: 'active_student',
      engagement: 'high',
      preference: 'immediate',
      timezone: 'EST'
    };
  }

  async analyzeContext(notificationData) {
    return {
      academic: notificationData.type?.includes('assignment') || 
                notificationData.type?.includes('grade'),
      urgent: notificationData.priority === 'urgent',
      interactive: !!notificationData.actionUrl,
      personal: notificationData.personal || false
    };
  }

  startIntelligentProcessing() {
    // Start background processing
    setInterval(() => {
      this.processNotificationQueue();
    }, 5000);

    // Cleanup old data
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // Every hour
  }

  cleanupOldData() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    for (const [userId, history] of this.notificationHistory) {
      const filtered = history.filter(n => n.timestamp > oneWeekAgo);
      this.notificationHistory.set(userId, filtered);
    }
  }

  getNextActiveTime(quietHours) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [endHour, endMinute] = quietHours.end.split(':').map(Number);
    tomorrow.setHours(endHour, endMinute, 0, 0);
    
    return tomorrow;
  }

  scheduleNotification(notification, scheduledTime) {
    const delay = scheduledTime.getTime() - Date.now();
    
    setTimeout(() => {
      this.notificationQueue.push(notification);
      this.processNotificationQueue();
    }, delay);
    
    notification.status = 'scheduled';
    notification.scheduledTime = scheduledTime;
  }

  // Public API methods
  async sendNotification(notificationData) {
    return await this.createSmartNotification(notificationData);
  }

  async updateUserPreferences(userId, preferences) {
    this.userPreferences.set(userId, {
      ...this.userPreferences.get(userId) || this.userPreferences.get('default'),
      ...preferences
    });
  }

  async getNotificationHistory(userId, limit = 50) {
    const history = this.notificationHistory.get(userId) || [];
    return history.slice(-limit);
  }

  async getNotificationStats(userId) {
    const history = this.notificationHistory.get(userId) || [];
    const last24h = history.filter(n => 
      n.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    return {
      total: history.length,
      last24h: last24h.length,
      delivered: history.filter(n => n.delivered).length,
      deliveryRate: history.length > 0 ? 
        history.filter(n => n.delivered).length / history.length : 0
    };
  }

  isRelevantTiming(notification, userContext) {    // Check if the notification timing is relevant to user's schedule
    const now = new Date();
    const hour = now.getHours();
    
    // Academic hours (8 AM - 6 PM)
    if (notification.context?.academic) {
      return hour >= 8 && hour <= 18;
    }
    
    return true;
  }
}

const smartNotificationService = new SmartNotificationService();
export default smartNotificationService;

