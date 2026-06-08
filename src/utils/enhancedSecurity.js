import DOMPurify from 'dompurify';

// Enhanced security validation and protection utilities

// Input sanitization and validation
export class SecurityValidator {  static patterns = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^\+?[\d\s\-()]{10,}$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    safeText: /^[a-zA-Z0-9\s\-_.,!?]*$/,
    noScript: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    noSql: /\b(union|select|insert|delete|update|drop|create|alter|exec|script)\b/gi,
  };

  static sanitizeHtml(input) {
    if (typeof input !== 'string') return '';
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
      ALLOWED_ATTR: [],
    });
  }

  static sanitizeInput(input, type = 'text') {
    if (typeof input !== 'string') return '';

    switch (type) {
      case 'email':
        return input.toLowerCase().trim();
      case 'phone':
        return input.replace(/[^\d+\-\s()]/g, '');
      case 'alphanumeric':
        return input.replace(/[^a-zA-Z0-9]/g, '');
      case 'text':
      default:
        return this.sanitizeHtml(input.trim());
    }
  }

  static validateInput(input, type = 'text', options = {}) {
    const { required = false, minLength = 0, maxLength = 1000 } = options;

    if (required && (!input || input.trim().length === 0)) {
      return { isValid: false, error: 'This field is required' };
    }

    if (!input) return { isValid: true };

    const sanitized = this.sanitizeInput(input, type);
    
    if (sanitized.length < minLength) {
      return { 
        isValid: false, 
        error: `Minimum length is ${minLength} characters` 
      };
    }

    if (sanitized.length > maxLength) {
      return { 
        isValid: false, 
        error: `Maximum length is ${maxLength} characters` 
      };
    }

    const pattern = this.patterns[type];
    if (pattern && !pattern.test(sanitized)) {
      return { 
        isValid: false, 
        error: `Invalid ${type} format` 
      };
    }

    // Check for malicious patterns
    if (!this.patterns.noScript.test(sanitized) || !this.patterns.noSql.test(sanitized)) {
      return { 
        isValid: false, 
        error: 'Invalid characters detected' 
      };
    }

    return { isValid: true, sanitized };
  }

  static validateForm(formData, rules) {
    const errors = {};
    const sanitizedData = {};
    let isValid = true;

    Object.keys(rules).forEach(field => {
      const value = formData[field];
      const rule = rules[field];
      
      const validation = this.validateInput(value, rule.type, rule.options);
      
      if (!validation.isValid) {
        errors[field] = validation.error;
        isValid = false;
      } else {
        sanitizedData[field] = validation.sanitized || value;
      }
    });

    return { isValid, errors, sanitizedData };
  }
}

// XSS Protection
export const xssProtection = {
  escapeHtml: (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  sanitizeUrl: (url) => {
    try {
      const urlObj = new URL(url);
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
      
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return '#';
      }
      
      return urlObj.href;
    } catch {
      return '#';
    }
  },

  sanitizeAttribute: (attr, value) => {
    const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover'];
    
    if (dangerousAttrs.includes(attr.toLowerCase())) {
      return null;
    }
    
    if (attr.toLowerCase() === 'href') {
      return xssProtection.sanitizeUrl(value);
    }
    
    return SecurityValidator.sanitizeHtml(value);
  },
};

// CSRF Protection
export const csrfProtection = {
  generateToken: () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  setToken: (token) => {
    sessionStorage.setItem('csrf_token', token);
    // Set meta tag for forms
    let metaTag = document.querySelector('meta[name="csrf-token"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'csrf-token';
      document.head.appendChild(metaTag);
    }
    metaTag.content = token;
  },

  getToken: () => {
    return sessionStorage.getItem('csrf_token') || 
           document.querySelector('meta[name="csrf-token"]')?.content;
  },

  validateToken: (token) => {
    const storedToken = csrfProtection.getToken();
    return storedToken && token === storedToken;
  },
};

// Authentication Security
export const authSecurity = {
  hashPassword: async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  validatePasswordStrength: (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;
    const strength = score < 3 ? 'weak' : score < 4 ? 'medium' : 'strong';

    return {
      score,
      strength,
      checks,
      isValid: score >= 3,
    };
  },

  generateSecureToken: (length = 32) => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array))
      .replace(/[+/=]/g, '')
      .substring(0, length);
  },

  validateJWT: (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      const now = Date.now() / 1000;

      return payload.exp > now;
    } catch {
      return false;
    }
  },
};

// Rate Limiting
export class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = new Map();
  }

  isAllowed(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside time window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  getRemainingRequests(identifier) {
    const userRequests = this.requests.get(identifier) || [];
    const now = Date.now();
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  getResetTime(identifier) {
    const userRequests = this.requests.get(identifier) || [];
    if (userRequests.length === 0) return 0;
    
    const oldestRequest = Math.min(...userRequests);
    return oldestRequest + this.timeWindow;
  }
}

// Content Security Policy helpers
export const cspHelpers = {
  generateNonce: () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
  },

  createCSPHeader: (nonce) => {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
      ].join('; ')
    };
  },
};

// Security monitoring
export const securityMonitoring = {
  logSecurityEvent: (event, details = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: sessionStorage.getItem('sessionId'),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('🚨 Security Event:', logEntry);
    }

    // Send to monitoring service
    try {
      fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfProtection.getToken(),
        },
        body: JSON.stringify(logEntry),
      }).catch(() => {
        // Silently fail to avoid disrupting user experience
      });
    } catch {
      // Fallback to local storage for offline scenarios
      const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
      logs.push(logEntry);
      localStorage.setItem('security_logs', JSON.stringify(logs.slice(-100)));
    }
  },

  detectSuspiciousActivity: () => {
    // Detect rapid form submissions
    let lastSubmission = 0;
    return (formType) => {
      const now = Date.now();
      if (now - lastSubmission < 1000) {
        securityMonitoring.logSecurityEvent('rapid_form_submission', {
          formType,
          timeDiff: now - lastSubmission,
        });
        return true;
      }
      lastSubmission = now;    return false;
    };
  },
};

const EnhancedSecurity = {
  SecurityValidator,
  xssProtection,
  csrfProtection,
  authSecurity,
  RateLimiter,
  cspHelpers,
  securityMonitoring,
};

export default EnhancedSecurity;
