import CryptoJS from 'crypto-js';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';

/**
 * Advanced Authentication Service - Phase 5 Security Enhancement
 * Provides enterprise-grade authentication features including MFA, biometric auth, and zero-trust security
 */


class AdvancedAuthService {
  constructor() {
    this.mfaMethods = new Map();
    this.sessionManager = new Map();
    this.biometricSupported = false;
    this.securityPolicies = this.initializeSecurityPolicies();
    this.auditLog = [];
    this.deviceFingerprints = new Map();
    this.behavioralPatterns = new Map();
    this.riskScores = new Map();
  }

  async initialize() {
    try {
      await this.checkBiometricSupport();
      this.setupSessionManagement();
      this.initializeSecurityPolicies();
      this.startSecurityMonitoring();
      this.setupDeviceFingerprinting();
      console.log('✅ Advanced Authentication Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Advanced Authentication Service:', error);
      throw error;
    }
  }
  async checkBiometricSupport() {
    if (window.PublicKeyCredential && 
        await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) {
      this.biometricSupported = true;
      console.log('✅ Biometric authentication supported');
    } else {
      console.log('⚠️ Biometric authentication not supported');
    }
  }

  initializeSecurityPolicies() {
    return {
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90, // days
        preventReuse: 12 // last N passwords
      },
      sessionPolicy: {
        maxDuration: 8 * 60 * 60 * 1000, // 8 hours
        idleTimeout: 30 * 60 * 1000, // 30 minutes
        requireReauth: ['admin', 'sensitive_data'],
        maxConcurrentSessions: 3
      },
      mfaPolicy: {
        required: ['admin', 'teacher', 'parent'],
        methods: ['totp', 'sms', 'email', 'biometric'],
        backupCodesCount: 10,
        gracePeriod: 24 * 60 * 60 * 1000 // 24 hours
      },
      riskPolicy: {
        maxRiskScore: 70,
        requireMfaAbove: 50,
        blockAbove: 90,
        factors: ['location', 'device', 'behavior', 'time']
      }
    };
  }

  async setupMultiFactorAuth(userId, method = 'totp', phoneNumber = null, email = null) {
    try {
      // Validate inputs
      if (!validator.isUUID(userId, 4) && !validator.isEmail(userId)) {
        throw new Error('Invalid user identifier');
      }

      if (method === 'sms' && !validator.isMobilePhone(phoneNumber)) {
        throw new Error('Invalid phone number for SMS MFA');
      }

      if (method === 'email' && !validator.isEmail(email)) {
        throw new Error('Invalid email for email MFA');
      }

      const mfaSetup = {
        userId,
        method,
        createdAt: new Date(),
        isActive: false,
        backupCodes: this.generateBackupCodes(),
        deviceId: this.getCurrentDeviceId()
      };

      switch (method) {
        case 'totp':
          mfaSetup.secret = await this.setupTOTP(userId);
          break;
        case 'sms':
          mfaSetup.phoneNumber = phoneNumber;
          await this.setupSMS(userId, phoneNumber);
          break;
        case 'email':
          mfaSetup.email = email;
          await this.setupEmailMFA(userId, email);
          break;
        case 'biometric':
          if (this.biometricSupported) {
            mfaSetup.credential = await this.setupBiometric(userId);
          } else {
            throw new Error('Biometric authentication not supported');
          }
          break;
        case 'hardware':
          mfaSetup.keyData = await this.setupHardwareKey(userId);
          break;
        default:
          throw new Error(`Unsupported MFA method: ${method}`);
      }

      this.mfaMethods.set(userId, mfaSetup);
      await this.logSecurityEvent('mfa_setup', { 
        userId, 
        method, 
        deviceId: mfaSetup.deviceId,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        qrCode: method === 'totp' ? await this.generateQRCode(mfaSetup.secret.secret, userId) : null,
        backupCodes: mfaSetup.backupCodes,
        setupData: {
          method,
          isActive: false,
          createdAt: mfaSetup.createdAt
        }
      };
    } catch (error) {
      await this.logSecurityEvent('mfa_setup_failed', { 
        userId, 
        method, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async setupTOTP(userId) {
    const totp = new OTPAuth.TOTP({
      issuer: 'GurukuIAI',
      label: userId,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromHex(crypto.getRandomValues(new Uint8Array(20)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')),
    });

    return {
      secret: totp.secret.base32,
      qrCode: totp.toString(),
      backupCodes: this.generateBackupCodes()
    };
  }

  async setupBiometric(userId) {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    const credentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: "Educational Platform",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userId,
        displayName: userId,
      },
      pubKeyCredParams: [{alg: -7, type: "public-key"}],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "direct"
    };

    const credential = await navigator.credentials.create({
      publicKey: credentialCreationOptions
    });

    return {
      credentialId: credential.id,
      publicKey: Array.from(new Uint8Array(credential.response.publicKey)),
      attestationObject: Array.from(new Uint8Array(credential.response.attestationObject)),
      clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON))
    };
  }

  async setupSMS(userId, phoneNumber) {
    // Store phone number for SMS MFA
    return {
      phoneNumber: phoneNumber,
      verified: false
    };
  }

  async setupEmailMFA(userId, email) {
    // Store email for email MFA
    return {
      email: email,
      verified: false
    };
  }

  async setupHardwareKey(userId) {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    const credentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: "Educational Platform",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userId,
        displayName: userId,
      },
      pubKeyCredParams: [{alg: -7, type: "public-key"}],
      authenticatorSelection: {
        authenticatorAttachment: "cross-platform",
        userVerification: "discouraged"
      },
      timeout: 60000,
      attestation: "direct"
    };

    const credential = await navigator.credentials.create({
      publicKey: credentialCreationOptions
    });

    return credential;
  }

  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(this.generateSecureCode(8));
    }
    return codes;
  }

  generateSecureCode(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async generateQRCode(secret, userId) {
    const totp = new OTPAuth.TOTP({
      issuer: 'GurukuIAI',
      label: userId,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    return await QRCode.toDataURL(totp.toString());
  }

  async verifyMFA(userId, token, method = 'totp') {
    try {
      const userMFA = this.mfaMethods.get(userId);
      if (!userMFA || !userMFA.isActive) {
        throw new Error('MFA not set up for this user');
      }

      let isValid = false;

      switch (method) {
        case 'totp': {
          const totp = new OTPAuth.TOTP({
            issuer: 'GurukuIAI',
            label: userId,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(userMFA.secret.secret),
          });
          const delta = totp.validate({ token, window: 2 });
          isValid = delta !== null;
          break;
        }
        case 'backup':
          isValid = userMFA.backupCodes.includes(token.toUpperCase());
          if (isValid) {
            // Remove used backup code
            userMFA.backupCodes = userMFA.backupCodes.filter(code => code !== token.toUpperCase());
          }
          break;
        default:
          throw new Error(`Unsupported MFA verification method: ${method}`);
      }

      await this.logSecurityEvent('mfa_verification', {
        userId,
        method,
        success: isValid,
        timestamp: new Date().toISOString()
      });

      return isValid;
    } catch (error) {
      await this.logSecurityEvent('mfa_verification_failed', {
        userId,
        method,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }
  setupDeviceFingerprinting() {
    const deviceFingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      },
      canvas: this.getCanvasFingerprint(),
      webgl: this.getWebGLFingerprint(),
      fonts: this.getFontFingerprint(),
      timestamp: new Date().toISOString()
    };

    const fingerprintHash = CryptoJS.SHA256(JSON.stringify(deviceFingerprint)).toString();
    return fingerprintHash;
  }

  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint canvas', 2, 2);
      return canvas.toDataURL();
    } catch (error) {
      return 'canvas_not_supported';
    }
  }

  getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'webgl_not_supported';
      
      return {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION)
      };
    } catch (error) {
      return 'webgl_error';
    }
  }

  getFontFingerprint() {
    const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Helvetica', 'Georgia'];
    const available = [];
    
    fonts.forEach(font => {
      if (this.isFontAvailable(font)) {
        available.push(font);
      }
    });
    
    return available;
  }

  isFontAvailable(font) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    ctx.font = `12px ${font}`;
    const testText = 'mmmmmmmmmmlli';
    const metrics1 = ctx.measureText(testText);
    
    ctx.font = '12px serif';
    const metrics2 = ctx.measureText(testText);
    
    return metrics1.width !== metrics2.width;
  }

  getCurrentDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }
  setupSessionManagement() {
    // Enhanced session management with security features
    // Keep sessionManager as Map, add methods separately
    this.sessionMethods = {
      createSession: async (userId, deviceId) => {
        const sessionId = uuidv4();
        const session = {
          sessionId,
          userId,
          deviceId,
          createdAt: new Date(),
          lastActivity: new Date(),
          ipAddress: await this.getClientIP(),
          riskScore: await this.calculateRiskScore(userId, deviceId),
          isActive: true
        };

        this.sessionManager.set(sessionId, session);
        return session;
      },

      validateSession: (sessionId) => {
        const session = this.sessionManager.get(sessionId);
        if (!session || !session.isActive) {
          return false;
        }

        // Check session timeout
        const now = new Date();
        const maxAge = this.securityPolicies.sessionPolicy.maxDuration;
        const idleTimeout = this.securityPolicies.sessionPolicy.idleTimeout;

        if (now - session.createdAt > maxAge || now - session.lastActivity > idleTimeout) {
          this.sessionManager.delete(sessionId);
          return false;
        }        // Update last activity
        session.lastActivity = now;
        return true;
      },

      terminateSession: (sessionId) => {
        this.sessionManager.delete(sessionId);
      }    };
  }

  // Convenience methods for session management
  async createSession(userId, deviceId) {
    return await this.sessionMethods.createSession(userId, deviceId);
  }

  validateSession(sessionId) {
    return this.sessionMethods.validateSession(sessionId);
  }

  terminateSession(sessionId) {
    return this.sessionMethods.terminateSession(sessionId);
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

  async calculateRiskScore(userId, deviceId) {
    let riskScore = 0;

    // Device risk factors
    const knownDevice = this.deviceFingerprints.has(deviceId);
    if (!knownDevice) riskScore += 30;

    // Behavioral risk factors
    const userBehavior = this.behavioralPatterns.get(userId);
    if (userBehavior) {
      // Analyze login patterns, timing, etc.
      riskScore += this.analyzeBehavioralAnomalies(userBehavior);
    }

    // Time-based risk factors
    const currentHour = new Date().getHours();
    if (currentHour < 6 || currentHour > 22) riskScore += 10;

    return Math.min(riskScore, 100);
  }

  analyzeBehavioralAnomalies(userBehavior) {
    // Simplified behavioral analysis
    let anomalyScore = 0;
    
    // Check for unusual login times
    const avgLoginHour = userBehavior.avgLoginHour || 12;
    const currentHour = new Date().getHours();
    const hourDiff = Math.abs(currentHour - avgLoginHour);
    
    if (hourDiff > 6) anomalyScore += 15;
    
    return anomalyScore;
  }

  startSecurityMonitoring() {
    // Start background security monitoring
    setInterval(() => {
      this.cleanupExpiredSessions();
      this.updateRiskScores();
      this.detectAnomalies();
    }, 60000); // Run every minute
  }

  cleanupExpiredSessions() {
    const now = new Date();
    const maxAge = this.securityPolicies.sessionPolicy.maxDuration;
    
    for (const [sessionId, session] of this.sessionManager) {
      if (now - session.createdAt > maxAge || !session.isActive) {
        this.sessionManager.delete(sessionId);
      }
    }
  }

  updateRiskScores() {
    // Update risk scores for active sessions
    for (const [sessionId, session] of this.sessionManager) {
      if (session.isActive) {
        this.calculateRiskScore(session.userId, session.deviceId).then(riskScore => {
          session.riskScore = riskScore;
          this.riskScores.set(session.userId, riskScore);
        });
      }
    }
  }

  detectAnomalies() {
    // Detect security anomalies and trigger alerts
    for (const [userId, riskScore] of this.riskScores) {
      if (riskScore > this.securityPolicies.riskPolicy.maxRiskScore) {
        this.triggerSecurityAlert(userId, riskScore);
      }
    }
  }

  async triggerSecurityAlert(userId, riskScore) {
    const alert = {
      type: 'high_risk_score',
      userId,
      riskScore,
      timestamp: new Date().toISOString(),
      severity: riskScore > 90 ? 'critical' : 'high'
    };

    await this.logSecurityEvent('security_alert', alert);
    
    // TODO: Implement notification system
    console.warn('🚨 Security Alert:', alert);
  }

  async logSecurityEvent(event, data) {
    const logEntry = {
      id: uuidv4(),
      event,
      data,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ipAddress: await this.getClientIP()
    };

    this.auditLog.push(logEntry);
    
    // Keep only last 1000 log entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // TODO: Send to backend logging service
    console.log('🔒 Security Event:', logEntry);
  }

  // Utility methods
  encryptSensitiveData(data, key) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
  }

  decryptSensitiveData(encryptedData, key) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }

  generateSecureToken(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Export security metrics for monitoring
  getSecurityMetrics() {
    return {
      activeSessions: this.sessionManager.size,
      mfaUsers: this.mfaMethods.size,
      averageRiskScore: Array.from(this.riskScores.values()).reduce((a, b) => a + b, 0) / this.riskScores.size || 0,
      securityEvents: this.auditLog.length,
      biometricSupported: this.biometricSupported
    };
  }
}

// Create singleton instance
const advancedAuthService = new AdvancedAuthService();

export default advancedAuthService;

