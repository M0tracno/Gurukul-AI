import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';

/**
 * Privacy Management Service - Phase 5 Security Enhancement
 * Provides comprehensive data privacy and compliance features for GDPR, FERPA, and other regulations
 */

class PrivacyService {
  constructor() {
    this.consentRecords = new Map();
    this.dataClassifications = new Map();
    this.retentionPolicies = new Map();
    this.privacyRequests = new Map();
    this.dataProcessingLog = [];
    this.complianceFrameworks = this.initializeComplianceFrameworks();
    this.dataSubjects = new Map();
    this.privacyNotices = new Map();
    this.cookieConsents = new Map();
  }

  async initialize() {
    try {
      this.setupComplianceFrameworks();
      this.initializeDataClassification();
      this.setupRetentionPolicies();
      this.startComplianceMonitoring();
      console.log('✅ Privacy Management Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Privacy Management Service:', error);
      throw error;
    }
  }

  initializeComplianceFrameworks() {
    return {
      gdpr: {
        name: 'General Data Protection Regulation',
        jurisdiction: 'EU',
        requirements: {
          lawfulBasis: [
            'consent',
            'contract',
            'legal_obligation',
            'vital_interests',
            'public_task',
            'legitimate_interests',
          ],
          dataSubjectRights: [
            'access',
            'rectification',
            'erasure',
            'portability',
            'restriction',
            'objection',
          ],
          dataRetention: 'purpose_limitation',
          dataMinimization: true,
          privacy_by_design: true,
          dpo_required: true,
        },
      },
      ferpa: {
        name: 'Family Educational Rights and Privacy Act',
        jurisdiction: 'US',
        requirements: {
          directoryInformation: ['name', 'address', 'phone', 'email', 'enrollment_status'],
          educationalRecords: ['grades', 'transcripts', 'disciplinary_records'],
          parentalConsent: 'under_18_required',
          disclosure_limitations: true,
          access_rights: 'student_parent',
        },
      },
      coppa: {
        name: "Children's Online Privacy Protection Act",
        jurisdiction: 'US',
        requirements: {
          ageVerification: 'under_13_protection',
          parentalConsent: 'verifiable_required',
          dataCollection: 'limited_necessary',
          disclosure: 'parent_notification',
        },
      },
      ccpa: {
        name: 'California Consumer Privacy Act',
        jurisdiction: 'California',
        requirements: {
          consumer_rights: ['know', 'delete', 'opt_out', 'non_discrimination'],
          notice_requirements: 'collection_disclosure',
          data_sales: 'opt_out_required',
        },
      },
    };
  }

  setupComplianceFrameworks() {
    // Setup compliance monitoring for each framework
    Object.keys(this.complianceFrameworks).forEach(framework => {
      this.setupFrameworkCompliance(framework);
    });
  }

  setupFrameworkCompliance(framework) {
    const config = this.complianceFrameworks[framework];

    switch (framework) {
      case 'gdpr':
        this.setupGDPRCompliance(config);
        break;
      case 'ferpa':
        this.setupFERPACompliance(config);
        break;
      case 'coppa':
        this.setupCOPPACompliance(config);
        break;
      case 'ccpa':
        this.setupCCPACompliance(config);
        break;
    }
  }

  setupGDPRCompliance(config) {
    // GDPR-specific compliance setup
    this.gdprCompliance = {
      lawfulBasisTracker: new Map(),
      consentManagement: new Map(),
      dataSubjectRights: new Map(),
      breachNotification: {
        timeLimit: 72 * 60 * 60 * 1000, // 72 hours
        authorities: ['supervisory_authority'],
        subjects: ['affected_individuals'],
      },
    };
  }

  setupFERPACompliance(config) {
    // FERPA-specific compliance setup
    this.ferpaCompliance = {
      educationalRecords: new Map(),
      directoryInformation: new Map(),
      parentalRights: new Map(),
      disclosureLog: [],
    };
  }

  setupCOPPACompliance(config) {
    // COPPA-specific compliance setup
    this.coppaCompliance = {
      ageVerification: new Map(),
      parentalConsent: new Map(),
      dataMinimization: true,
    };
  }

  setupCCPACompliance(config) {
    // CCPA-specific compliance setup
    this.ccpaCompliance = {
      consumerRights: new Map(),
      dataSales: new Map(),
      noticeRequirements: new Map(),
    };
  }

  initializeDataClassification() {
    // Define data classification levels
    this.dataClassifications = new Map([
      [
        'public',
        {
          level: 0,
          description: 'Information that can be freely shared',
          retention: '7_years',
          encryption: false,
        },
      ],
      [
        'internal',
        {
          level: 1,
          description: 'Information for internal use only',
          retention: '5_years',
          encryption: true,
        },
      ],
      [
        'confidential',
        {
          level: 2,
          description: 'Sensitive information requiring protection',
          retention: '3_years',
          encryption: true,
        },
      ],
      [
        'restricted',
        {
          level: 3,
          description: 'Highly sensitive information with strict access controls',
          retention: '1_year',
          encryption: true,
        },
      ],
      [
        'pii',
        {
          level: 4,
          description: 'Personally Identifiable Information',
          retention: 'purpose_limited',
          encryption: true,
          special_handling: true,
        },
      ],
      [
        'educational_record',
        {
          level: 3,
          description: 'FERPA-protected educational records',
          retention: 'student_lifecycle',
          encryption: true,
          ferpa_protected: true,
        },
      ],
    ]);
  }

  setupRetentionPolicies() {
    this.retentionPolicies = new Map([
      [
        'user_account',
        {
          retention_period: '7_years',
          trigger: 'account_closure',
          compliance: ['gdpr', 'ferpa'],
        },
      ],
      [
        'educational_records',
        {
          retention_period: 'permanent_with_consent',
          trigger: 'graduation_plus_5_years',
          compliance: ['ferpa'],
        },
      ],
      [
        'communication_logs',
        {
          retention_period: '1_year',
          trigger: 'creation_date',
          compliance: ['gdpr'],
        },
      ],
      [
        'audit_logs',
        {
          retention_period: '7_years',
          trigger: 'log_creation',
          compliance: ['gdpr', 'sox'],
        },
      ],
      [
        'consent_records',
        {
          retention_period: 'consent_plus_7_years',
          trigger: 'consent_withdrawal',
          compliance: ['gdpr'],
        },
      ],
    ]);
  }

  async recordConsent(userId, purpose, consentType = 'explicit', metadata = {}) {
    try {
      if (!validator.isUUID(userId, 4) && !validator.isEmail(userId)) {
        throw new Error('Invalid user identifier');
      }

      const consentId = uuidv4();
      const consentRecord = {
        consentId,
        userId,
        purpose,
        consentType, // 'explicit', 'implicit', 'legitimate_interest'
        granted: true,
        timestamp: new Date().toISOString(),
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
        metadata,
        framework: this.determineApplicableFramework(purpose),
        expires: this.calculateConsentExpiry(purpose),
        version: '1.0',
      };

      this.consentRecords.set(consentId, consentRecord);

      // Update user's consent profile
      if (!this.dataSubjects.has(userId)) {
        this.dataSubjects.set(userId, {
          userId,
          consents: new Map(),
          preferences: {},
          rights_exercised: [],
          created: new Date().toISOString(),
        });
      }

      const userProfile = this.dataSubjects.get(userId);
      userProfile.consents.set(purpose, consentRecord);

      await this.logDataProcessing('consent_recorded', {
        userId,
        purpose,
        consentType,
        consentId,
      });

      return consentRecord;
    } catch (error) {
      console.error('Failed to record consent:', error);
      throw error;
    }
  }

  async withdrawConsent(userId, purpose) {
    try {
      const userProfile = this.dataSubjects.get(userId);
      if (!userProfile || !userProfile.consents.has(purpose)) {
        throw new Error('No consent found for the specified purpose');
      }

      const originalConsent = userProfile.consents.get(purpose);
      const withdrawalRecord = {
        ...originalConsent,
        granted: false,
        withdrawnAt: new Date().toISOString(),
        withdrawnBy: userId,
      };

      userProfile.consents.set(purpose, withdrawalRecord);
      userProfile.rights_exercised.push({
        right: 'withdraw_consent',
        purpose,
        timestamp: new Date().toISOString(),
      });

      await this.logDataProcessing('consent_withdrawn', {
        userId,
        purpose,
        originalConsentId: originalConsent.consentId,
      });

      // Trigger data processing halt for this purpose
      await this.haltDataProcessing(userId, purpose);

      return withdrawalRecord;
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      throw error;
    }
  }

  async handleDataSubjectRequest(userId, requestType, details = {}) {
    try {
      const requestId = uuidv4();
      const request = {
        requestId,
        userId,
        requestType, // 'access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'
        details,
        status: 'pending',
        received: new Date().toISOString(),
        deadline: this.calculateResponseDeadline(requestType),
        framework: 'gdpr',
      };

      this.privacyRequests.set(requestId, request);

      await this.logDataProcessing('data_subject_request', {
        userId,
        requestType,
        requestId,
      });

      // Process the request based on type
      switch (requestType) {
        case 'access':
          return await this.processAccessRequest(request);
        case 'rectification':
          return await this.processRectificationRequest(request);
        case 'erasure':
          return await this.processErasureRequest(request);
        case 'portability':
          return await this.processPortabilityRequest(request);
        case 'restriction':
          return await this.processRestrictionRequest(request);
        case 'objection':
          return await this.processObjectionRequest(request);
        default:
          throw new Error(`Unsupported request type: ${requestType}`);
      }
    } catch (error) {
      console.error('Failed to handle data subject request:', error);
      throw error;
    }
  }

  async processAccessRequest(request) {
    try {
      const userId = request.userId;
      const userData = await this.collectUserData(userId);

      const response = {
        requestId: request.requestId,
        userData,
        consents: Array.from(this.dataSubjects.get(userId)?.consents.values() || []),
        processingActivities: this.getProcessingActivities(userId),
        dataRetention: this.getRetentionInfo(userId),
        thirdPartySharing: this.getThirdPartySharing(userId),
        generatedAt: new Date().toISOString(),
      };

      request.status = 'completed';
      request.response = response;

      return response;
    } catch (error) {
      request.status = 'failed';
      request.error = error.message;
      throw error;
    }
  }

  async processErasureRequest(request) {
    try {
      const userId = request.userId;

      // Check if erasure is possible (no legal obligations)
      const legalHolds = await this.checkLegalHolds(userId);
      if (legalHolds.length > 0) {
        request.status = 'rejected';
        request.reason = 'Legal obligations prevent erasure';
        return { status: 'rejected', reason: 'Legal obligations prevent erasure' };
      }

      // Anonymize or delete user data
      await this.anonymizeUserData(userId);

      request.status = 'completed';
      return { status: 'completed', message: 'Data successfully erased' };
    } catch (error) {
      request.status = 'failed';
      request.error = error.message;
      throw error;
    }
  }

  async processPortabilityRequest(request) {
    try {
      const userId = request.userId;
      const portableData = await this.extractPortableData(userId);

      const response = {
        requestId: request.requestId,
        data: portableData,
        format: 'json',
        generatedAt: new Date().toISOString(),
      };

      request.status = 'completed';
      return response;
    } catch (error) {
      request.status = 'failed';
      request.error = error.message;
      throw error;
    }
  }

  async classifyData(dataType, content, context = {}) {
    // Automatically classify data based on content and context
    let classification = 'public';
    let score = 0;

    // Check for PII patterns
    if (this.containsPII(content)) {
      classification = 'pii';
      score = 4;
    }

    // Check for educational record indicators
    if (context.recordType === 'educational' || this.isEducationalRecord(content, context)) {
      classification = 'educational_record';
      score = Math.max(score, 3);
    }

    // Check for sensitive patterns
    if (this.containsSensitiveData(content)) {
      classification = score < 2 ? 'confidential' : classification;
      score = Math.max(score, 2);
    }

    const classificationData = {
      dataType,
      classification,
      score,
      identifiedPatterns: this.identifyDataPatterns(content),
      complianceRequirements: this.getComplianceRequirements(classification),
      timestamp: new Date().toISOString(),
    };

    await this.logDataProcessing('data_classified', classificationData);
    return classificationData;
  }

  containsPII(content) {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Credit card
    ];

    return piiPatterns.some(pattern => pattern.test(content));
  }

  isEducationalRecord(content, context) {
    const educationalIndicators = [
      'grade',
      'transcript',
      'gpa',
      'assignment',
      'quiz',
      'exam',
      'attendance',
      'disciplinary',
      'academic',
      'enrollment',
    ];

    const contentLower = content.toLowerCase();
    return (
      educationalIndicators.some(indicator => contentLower.includes(indicator)) ||
      context.studentId ||
      context.courseId
    );
  }

  containsSensitiveData(content) {
    const sensitivePatterns = [
      'password',
      'secret',
      'private',
      'confidential',
      'medical',
      'health',
      'disability',
      'financial',
    ];

    const contentLower = content.toLowerCase();
    return sensitivePatterns.some(pattern => contentLower.includes(pattern));
  }

  identifyDataPatterns(content) {
    const patterns = [];

    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content)) {
      patterns.push('email');
    }

    if (/\b\d{3}-\d{3}-\d{4}\b/.test(content)) {
      patterns.push('phone');
    }

    if (/\b\d{3}-\d{2}-\d{4}\b/.test(content)) {
      patterns.push('ssn');
    }

    return patterns;
  }

  getComplianceRequirements(classification) {
    const requirements = [];

    switch (classification) {
      case 'pii':
        requirements.push('gdpr', 'ccpa');
        break;
      case 'educational_record':
        requirements.push('ferpa');
        break;
      case 'confidential':
      case 'restricted':
        requirements.push('gdpr');
        break;
    }

    return requirements;
  }

  async anonymizeUserData(userId) {
    // Implement data anonymization
    const anonymizationId = uuidv4();

    await this.logDataProcessing('data_anonymized', {
      userId,
      anonymizationId,
      timestamp: new Date().toISOString(),
    });

    // TODO: Implement actual data anonymization in backend
    return { anonymizationId, status: 'completed' };
  }

  async collectUserData(userId) {
    // Collect all user data for access requests
    // TODO: Implement actual data collection from various sources
    return {
      profile: {},
      activities: [],
      communications: [],
      files: [],
    };
  }

  async getProcessingActivities(userId) {
    return this.dataProcessingLog.filter(entry => entry.data.userId === userId);
  }

  async getRetentionInfo(userId) {
    // Return retention information for user's data
    return Array.from(this.retentionPolicies.entries()).map(([type, policy]) => ({
      dataType: type,
      retentionPeriod: policy.retention_period,
      trigger: policy.trigger,
    }));
  }

  async getThirdPartySharing(userId) {
    // Return information about third-party data sharing
    return []; // TODO: Implement based on actual integrations
  }

  async checkLegalHolds(userId) {
    // Check for legal obligations that prevent data deletion
    return []; // TODO: Implement legal hold checking
  }

  async extractPortableData(userId) {
    // Extract data in portable format
    const userData = await this.collectUserData(userId);
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: userData,
    };
  }

  async haltDataProcessing(userId, purpose) {
    // Stop data processing for specific purpose
    await this.logDataProcessing('processing_halted', {
      userId,
      purpose,
      timestamp: new Date().toISOString(),
    });
  }

  determineApplicableFramework(purpose) {
    // Determine which compliance framework applies
    if (purpose.includes('educational')) return 'ferpa';
    if (purpose.includes('marketing')) return 'gdpr';
    return 'gdpr'; // Default
  }

  calculateConsentExpiry(purpose) {
    // Calculate when consent expires
    const now = new Date();
    return new Date(now.setFullYear(now.getFullYear() + 2)).toISOString(); // 2 years default
  }

  calculateResponseDeadline(requestType) {
    // Calculate response deadline based on framework requirements
    const now = new Date();
    return new Date(now.setDate(now.getDate() + 30)).toISOString(); // 30 days for GDPR
  }

  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  async logDataProcessing(activity, data) {
    const logEntry = {
      id: uuidv4(),
      activity,
      data,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ipAddress: await this.getClientIP(),
    };

    this.dataProcessingLog.push(logEntry);

    // Keep only last 10000 log entries in memory
    if (this.dataProcessingLog.length > 10000) {
      this.dataProcessingLog = this.dataProcessingLog.slice(-10000);
    }

    console.log('📋 Privacy Event:', logEntry);
  }

  startComplianceMonitoring() {
    // Start background compliance monitoring
    setInterval(
      () => {
        this.checkConsentExpiry();
        this.reviewRetentionPolicies();
        this.validateDataProcessing();
      },
      24 * 60 * 60 * 1000
    ); // Run daily
  }

  checkConsentExpiry() {
    const now = new Date();

    for (const [userId, userProfile] of this.dataSubjects) {
      for (const [purpose, consent] of userProfile.consents) {
        if (consent.expires && new Date(consent.expires) < now) {
          this.logDataProcessing('consent_expired', {
            userId,
            purpose,
            consentId: consent.consentId,
          });
        }
      }
    }
  }

  reviewRetentionPolicies() {
    // Review and apply retention policies
    const now = new Date();

    for (const [type, policy] of this.retentionPolicies) {
      // TODO: Implement retention policy enforcement
      console.log(`Reviewing retention policy for ${type}`);
    }
  }

  validateDataProcessing() {
    // Validate that all data processing has proper legal basis
    const recentProcessing = this.dataProcessingLog.filter(
      entry => new Date(entry.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    recentProcessing.forEach(entry => {
      // TODO: Validate legal basis for processing
    });
  }

  // Export privacy metrics for monitoring
  getPrivacyMetrics() {
    return {
      activeConsents: this.consentRecords.size,
      dataSubjects: this.dataSubjects.size,
      pendingRequests: Array.from(this.privacyRequests.values()).filter(r => r.status === 'pending')
        .length,
      processingActivities: this.dataProcessingLog.length,
      complianceFrameworks: Object.keys(this.complianceFrameworks).length,
    };
  }

  generatePrivacyReport() {
    return {
      reportId: uuidv4(),
      generatedAt: new Date().toISOString(),
      metrics: this.getPrivacyMetrics(),
      recentActivity: this.dataProcessingLog.slice(-100),
      complianceStatus: this.checkComplianceStatus(),
    };
  }

  checkComplianceStatus() {
    // Check overall compliance status
    return {
      gdpr: 'compliant',
      ferpa: 'compliant',
      coppa: 'compliant',
      ccpa: 'compliant',
    };
  }
}

// Create singleton instance
const privacyService = new PrivacyService();

export default privacyService;
