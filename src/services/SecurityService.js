/**
 * Enhanced Security Service - Phase 1 Foundation
 * Provides comprehensive security features including CSP, XSS protection, and input validation
 */

class SecurityService {
  constructor() {
    this.isInitialized = false;
    this.securityPolicies = {
      csp: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://*.googleapis.com',
          'https://*.googletagmanager.com',
          'https://*.google-analytics.com',
        ],
        'script-src-elem': [
          "'self'",
          "'unsafe-inline'",
          'https://*.googleapis.com',
          'https://*.googletagmanager.com',
          'https://*.google-analytics.com',
        ],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': [
          "'self'",
          'http://localhost:*',
          'https://localhost:*',
          'https://*.onrender.com',
          'https://*.googleapis.com',
          'https://*.google-analytics.com',
          'https://www.google-analytics.com',
          'wss://*.onrender.com',
        ],
        'frame-src': ["'none'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
      },
    };

    // Bind event handler for proper cleanup
    this.handleSecurityViolation = this.handleSecurityViolation.bind(this);
  }

  /**
   * Initialize security service
   */
  initialize() {
    if (this.isInitialized) return;

    try {
      this.setupContentSecurityPolicy();
      this.setupXSSProtection();
      this.setupClickjackingProtection();
      this.setupReferrerPolicy();
      this.monitorSecurityViolations();

      this.isInitialized = true;
      console.log('🔒 Security Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Security Service:', error);
    }
  }

  /**
   * Setup Content Security Policy
   */
  setupContentSecurityPolicy() {
    if (typeof document === 'undefined') return;

    // Create CSP meta tag
    const cspContent = Object.entries(this.securityPolicies.csp)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');

    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!existingCSP) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = cspContent;
      document.head.appendChild(meta);
    }
  }

  /**
   * Setup XSS Protection
   */
  setupXSSProtection() {
    if (typeof document === 'undefined') return;

    // Add X-XSS-Protection header via meta tag
    const xssProtection = document.createElement('meta');
    xssProtection.httpEquiv = 'X-XSS-Protection';
    xssProtection.content = '1; mode=block';
    document.head.appendChild(xssProtection);

    // Add X-Content-Type-Options header
    const noSniff = document.createElement('meta');
    noSniff.httpEquiv = 'X-Content-Type-Options';
    noSniff.content = 'nosniff';
    document.head.appendChild(noSniff);
  }
  /**
   * Setup Clickjacking Protection
   */
  setupClickjackingProtection() {
    if (typeof document === 'undefined') return;

    // Note: X-Frame-Options can only be set via HTTP headers, not meta tags
    // This should be configured at the server/hosting level
    // For now, we'll skip the meta tag to avoid console warnings
    console.log('🔒 X-Frame-Options should be configured at server/hosting level');
  }

  /**
   * Setup Referrer Policy
   */
  setupReferrerPolicy() {
    if (typeof document === 'undefined') return;

    const referrerPolicy = document.createElement('meta');
    referrerPolicy.name = 'referrer';
    referrerPolicy.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(referrerPolicy);
  }
  /**
   * Monitor security violations
   */
  monitorSecurityViolations() {
    if (typeof document === 'undefined') return;

    document.addEventListener('securitypolicyviolation', this.handleSecurityViolation);
  }

  /**
   * Handle security policy violations
   */
  handleSecurityViolation(event) {
    console.warn('🚨 CSP Violation:', {
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      originalPolicy: event.originalPolicy,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
    });

    // Report to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportSecurityViolation(event);
    }
  }

  /**
   * Report security violation to monitoring service
   */
  reportSecurityViolation(violation) {
    // In a real application, you would send this to your monitoring service
    console.error('Security violation reported:', violation);
  }

  /**
   * Sanitize HTML input to prevent XSS attacks
   */
  sanitizeHTML(input) {
    if (typeof input !== 'string') return input;

    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Validate and sanitize user input
   */
  sanitizeInput(input, type = 'text') {
    if (!input) return '';

    let sanitized = String(input).trim();

    switch (type) {
      case 'email':
        // Basic email validation and sanitization
        sanitized = sanitized.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
          throw new Error('Invalid email format');
        }
        break;

      case 'phone':
        // Remove non-numeric characters except +
        sanitized = sanitized.replace(/[^\d+\-\s()]/g, '');
        break;

      case 'text':
        // Remove potentially dangerous characters
        sanitized = this.sanitizeHTML(sanitized);
        break;

      case 'url':
        try {
          const url = new URL(sanitized);
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Invalid URL protocol');
          }
          sanitized = url.toString();
        } catch {
          throw new Error('Invalid URL format');
        }
        break;

      case 'number':
        const num = parseFloat(sanitized);
        if (isNaN(num)) {
          throw new Error('Invalid number format');
        }
        return num;

      default:
        sanitized = this.sanitizeHTML(sanitized);
    }

    return sanitized;
  }

  /**
   * Generate secure random string
   */
  generateSecureToken(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if running in secure context
   */
  isSecureContext() {
    return window.isSecureContext || window.location.protocol === 'https:';
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    const requirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      noCommonPatterns: !/^(password|123456|qwerty)/i.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;
    const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong';

    return {
      score,
      strength,
      requirements,
      isValid: score >= 4,
    };
  }

  /**
   * Encrypt sensitive data for local storage
   */
  async encryptData(data, key) {
    if (!this.isSecureContext()) {
      console.warn('⚠️ Not in secure context, encryption may not be available');
      return btoa(JSON.stringify(data)); // Fallback to base64 encoding
    }

    try {
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        derivedKey,
        encoder.encode(JSON.stringify(data))
      );

      return btoa(
        JSON.stringify({
          encrypted: Array.from(new Uint8Array(encrypted)),
          iv: Array.from(iv),
          salt: Array.from(salt),
        })
      );
    } catch (error) {
      console.error('Encryption failed:', error);
      return btoa(JSON.stringify(data)); // Fallback
    }
  }

  /**
   * Decrypt sensitive data from local storage
   */
  async decryptData(encryptedData, key) {
    if (!this.isSecureContext()) {
      try {
        return JSON.parse(atob(encryptedData)); // Fallback from base64
      } catch {
        return null;
      }
    }

    try {
      const data = JSON.parse(atob(encryptedData));
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new Uint8Array(data.salt),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(data.iv) },
        derivedKey,
        new Uint8Array(data.encrypted)
      );

      return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  /**
   * Rate limiting for API calls
   */
  createRateLimiter(maxRequests = 10, windowMs = 60000) {
    const requests = new Map();

    return {
      check: identifier => {
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old requests
        for (const [key, timestamps] of requests.entries()) {
          requests.set(
            key,
            timestamps.filter(time => time > windowStart)
          );
          if (requests.get(key).length === 0) {
            requests.delete(key);
          }
        }

        // Check current requests
        const userRequests = requests.get(identifier) || [];
        if (userRequests.length >= maxRequests) {
          return false; // Rate limited
        }

        // Add current request
        userRequests.push(now);
        requests.set(identifier, userRequests);
        return true; // Allowed
      },

      reset: identifier => {
        requests.delete(identifier);
      },
    };
  }

  /**
   * Secure session storage
   */
  secureStorage = {
    setItem: async (key, value) => {
      const encryptedValue = await this.encryptData(value, key);
      sessionStorage.setItem(key, encryptedValue);
    },

    getItem: async key => {
      const encryptedValue = sessionStorage.getItem(key);
      if (!encryptedValue) return null;
      return await this.decryptData(encryptedValue, key);
    },

    removeItem: key => {
      sessionStorage.removeItem(key);
    },

    clear: () => {
      sessionStorage.clear();
    },
  }; /**
   * Cleanup security service
   */
  cleanup() {
    try {
      // Remove event listeners if any were added
      if (typeof document !== 'undefined') {
        document.removeEventListener('securitypolicyviolation', this.handleSecurityViolation);
      }

      // Reset initialization state
      this.isInitialized = false;

      console.log('🔒 Security Service cleaned up successfully');
    } catch (error) {
      console.error('❌ Failed to cleanup Security Service:', error);
    }
  }

  /**
   * Get security status report
   */
  getSecurityStatus() {
    return {
      isInitialized: this.isInitialized,
      isSecureContext: this.isSecureContext(),
      cspEnabled: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
      xssProtectionEnabled: !!document.querySelector('meta[http-equiv="X-XSS-Protection"]'),
      frameOptionsEnabled: !!document.querySelector('meta[http-equiv="X-Frame-Options"]'),
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
const securityService = new SecurityService();

export default securityService;
