import DOMPurify from 'dompurify';

// Security utilities for input validation, sanitization, and CSRF protection

/**
 * Input validation utilities
 */
export const validators = {
  // Email validation with comprehensive regex
  email: email => {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  // Password strength validation
  password: password => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid:
        password.length >= minLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumbers &&
        hasSpecialChar,
      errors: {
        length: password.length < minLength,
        upperCase: !hasUpperCase,
        lowerCase: !hasLowerCase,
        numbers: !hasNumbers,
        specialChar: !hasSpecialChar,
      },
    };
  },

  // Phone number validation (international format)
  phone: phone => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
  },

  // Student ID validation
  studentId: id => {
    const idRegex = /^[A-Za-z0-9]{6,20}$/;
    return idRegex.test(id);
  },

  // Name validation (allows letters, spaces, hyphens, apostrophes)
  name: name => {
    const nameRegex = /^[a-zA-Z\s\-']{2,50}$/;
    return nameRegex.test(name.trim());
  },

  // Course code validation
  courseCode: code => {
    const codeRegex = /^[A-Za-z0-9-]{3,10}$/;
    return codeRegex.test(code);
  },

  // Grade validation (0-100 or A-F)
  grade: grade => {
    if (typeof grade === 'number') {
      return grade >= 0 && grade <= 100;
    }
    if (typeof grade === 'string') {
      return /^[A-F][+-]?$/.test(grade.toUpperCase());
    }
    return false;
  },
};

/**
 * Input sanitization utilities
 */
export const sanitizers = {
  // Enhanced HTML sanitization using DOMPurify
  html: input => {
    if (typeof input !== 'string') return '';
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [
        'b',
        'i',
        'em',
        'strong',
        'u',
        'br',
        'p',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
      ],
      ALLOWED_ATTR: ['class'],
      FORBID_SCRIPTS: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'iframe'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onsubmit', 'onfocus', 'onblur'],
    });
  },

  // Educational content sanitization (more permissive for quiz/assignment content)
  educationalContent: input => {
    if (typeof input !== 'string') return '';
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'b',
        'i',
        'u',
        's',
        'sub',
        'sup',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'blockquote',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'img',
        'a',
        'code',
        'pre',
      ],
      ALLOWED_ATTR: {
        img: ['src', 'alt', 'width', 'height'],
        a: ['href', 'target'],
        table: ['border', 'cellpadding', 'cellspacing'],
        th: ['align', 'valign'],
        td: ['align', 'valign'],
        '*': ['class'],
      },
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
      FORBID_SCRIPTS: true,
      FORBID_TAGS: [
        'script',
        'object',
        'embed',
        'link',
        'style',
        'iframe',
        'form',
        'input',
        'button',
      ],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onsubmit', 'onfocus', 'onblur'],
    });
  },

  // Plain text sanitization with DOMPurify
  text: input => {
    if (typeof input !== 'string') return '';
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    })
      .trim()
      .substring(0, 1000);
  },

  // Email sanitization
  email: input => {
    if (typeof input !== 'string') return '';
    const sanitized = DOMPurify.sanitize(input.trim().toLowerCase(), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
    return validators.email(sanitized) ? sanitized : '';
  },

  // Phone number sanitization
  phone: input => {
    if (typeof input !== 'string') return '';
    return input.replace(/[^\d\s+()-]/g, '').trim();
  },

  // Name sanitization
  name: input => {
    if (typeof input !== 'string') return '';
    const sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    return sanitized.replace(/[^a-zA-Z\s'-]/g, '').trim();
  },

  // SQL injection prevention (enhanced)
  sql: input => {
    if (typeof input !== 'string') return '';
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
      .replace(/['";\\]/g, '') // Remove SQL special characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove SQL block comment start
      .replace(/\*\//g, '') // Remove SQL block comment end
      .replace(/\b(DROP|DELETE|UPDATE|INSERT|CREATE|ALTER|EXEC|EXECUTE|UNION|SELECT)\b/gi, '') // Remove SQL keywords
      .trim();
  },

  // File name sanitization
  fileName: input => {
    if (typeof input !== 'string') return '';
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
      .replace(/[^a-zA-Z0-9._-]/g, '') // Only allow safe characters
      .replace(/\.{2,}/g, '.') // Remove multiple dots
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .substring(0, 100); // Limit length
  },

  // URL sanitization (enhanced)
  url: input => {
    if (typeof input !== 'string') return '';
    try {
      const sanitized = DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
      const url = new URL(sanitized);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  },
};

/**
 * CSRF Protection utilities
 */
export const csrfProtection = {
  // Generate CSRF token
  generateToken: () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  // Store CSRF token in session storage
  storeToken: token => {
    try {
      sessionStorage.setItem('csrf_token', token);
      return true;
    } catch (error) {
      console.error('Failed to store CSRF token:', error);
      return false;
    }
  },

  // Retrieve CSRF token from session storage
  getToken: () => {
    try {
      return sessionStorage.getItem('csrf_token');
    } catch (error) {
      console.error('Failed to retrieve CSRF token:', error);
      return null;
    }
  },

  // Validate CSRF token
  validateToken: receivedToken => {
    const storedToken = csrfProtection.getToken();
    return storedToken && receivedToken && storedToken === receivedToken;
  },
  // Add CSRF token to request headers
  addToHeaders: (headers = {}) => {
    const token = csrfProtection.getToken();
    if (token) {
      return {
        ...headers,
        'X-CSRF-Token': token,
      };
    }
    return headers;
  },

  // Initialize CSRF protection
  initialize: () => {
    const token = csrfProtection.generateToken();
    csrfProtection.storeToken(token);
    return token;
  },
};

/**
 * Rate limiting utilities (client-side)
 */
export const rateLimiter = {
  // Track request counts per endpoint
  requestCounts: new Map(),

  // Check if request is allowed
  isAllowed: (endpoint, maxRequests = 10, windowMs = 60000) => {
    const now = Date.now();
    const key = endpoint;

    if (!rateLimiter.requestCounts.has(key)) {
      rateLimiter.requestCounts.set(key, []);
    }

    const requests = rateLimiter.requestCounts.get(key);

    // Remove old requests outside the time window
    const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);

    if (recentRequests.length >= maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    rateLimiter.requestCounts.set(key, recentRequests);

    return true;
  },

  // Get remaining requests
  getRemainingRequests: (endpoint, maxRequests = 10, windowMs = 60000) => {
    const now = Date.now();
    const key = endpoint;

    if (!rateLimiter.requestCounts.has(key)) {
      return maxRequests;
    }

    const requests = rateLimiter.requestCounts.get(key);
    const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);

    return Math.max(0, maxRequests - recentRequests.length);
  },

  // Clear rate limit data for an endpoint
  clearEndpoint: endpoint => {
    rateLimiter.requestCounts.delete(endpoint);
  },
  // Clear all rate limit data
  clearAll: () => {
    rateLimiter.requestCounts.clear();
  },
};

/**
 * Session Security helpers
 */
export const sessionSecurity = {
  // Session timeout (30 minutes)
  SESSION_TIMEOUT: 30 * 60 * 1000,

  // Check if session is valid
  isSessionValid: () => {
    const lastActivity = localStorage.getItem('lastActivity');
    if (!lastActivity) return false;

    const now = Date.now();
    return now - parseInt(lastActivity) < sessionSecurity.SESSION_TIMEOUT;
  },

  // Update last activity timestamp
  updateActivity: () => {
    localStorage.setItem('lastActivity', Date.now().toString());
  },

  // Clear sensitive data on logout
  clearSensitiveData: () => {
    // Clear session storage
    sessionStorage.clear();

    // Clear specific localStorage items (keep user preferences)
    const keysToRemove = ['userToken', 'lastActivity', 'csrf_token', 'authData'];
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear CSRF token
    csrfProtection.storeToken('');

    // Clear rate limiter data
    rateLimiter.clearAll();
  },
  // Session monitoring state
  _isMonitoring: false,
  _eventListeners: [],
  _intervalId: null,

  // Start session monitoring
  startMonitoring: () => {
    if (sessionSecurity._isMonitoring) return;

    // Update activity on user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const updateActivity = () => {
      sessionSecurity.updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
      sessionSecurity._eventListeners.push({ event, handler: updateActivity });
    });

    // Check session validity periodically
    const checkSession = () => {
      if (!sessionSecurity.isSessionValid()) {
        // Session expired - redirect to login
        sessionSecurity.clearSensitiveData();
        window.location.href = '/login';
      }
    };

    // Check every 5 minutes
    sessionSecurity._intervalId = setInterval(checkSession, 5 * 60 * 1000);
    sessionSecurity._isMonitoring = true;
  },

  // Stop session monitoring
  stopMonitoring: () => {
    if (!sessionSecurity._isMonitoring) return;

    // Remove event listeners
    sessionSecurity._eventListeners.forEach(({ event, handler }) => {
      document.removeEventListener(event, handler, { passive: true });
    });
    sessionSecurity._eventListeners = [];

    // Clear interval
    if (sessionSecurity._intervalId) {
      clearInterval(sessionSecurity._intervalId);
      sessionSecurity._intervalId = null;
    }

    sessionSecurity._isMonitoring = false;
  },

  // Initialize session monitoring (alias for backward compatibility)
  initializeSessionMonitoring: () => {
    sessionSecurity.startMonitoring();
  },
};

/**
 * Secure form data preparation
 */
export const prepareFormData = (formData, validationRules = {}) => {
  const sanitizedData = {};
  const errors = {};

  for (const [key, value] of Object.entries(formData)) {
    const rule = validationRules[key];

    if (rule) {
      // Validate
      if (rule.validator && !rule.validator(value)) {
        errors[key] = rule.message || `Invalid ${key}`;
        continue;
      }

      // Sanitize
      if (rule.sanitizer) {
        sanitizedData[key] = rule.sanitizer(value);
      } else {
        sanitizedData[key] = sanitizers.text(value);
      }
    } else {
      // Default sanitization
      sanitizedData[key] = sanitizers.text(value);
    }
  }

  return {
    data: sanitizedData,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

/**
 * Secure API request wrapper
 */
export const secureApiRequest = async (url, options = {}) => {
  // Check session validity
  if (!sessionSecurity.isSessionValid()) {
    sessionSecurity.clearSensitiveData();
    throw new Error('Session expired. Please login again.');
  }

  // Check rate limiting
  if (!rateLimiter.isAllowed(url)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Update session activity
  sessionSecurity.updateActivity();

  // Add CSRF protection
  const headers = csrfProtection.addToHeaders(options.headers);

  // Add security headers
  const secureHeaders = {
    ...headers,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  // Sanitize request body if it exists
  let sanitizedBody = options.body;
  if (sanitizedBody && typeof sanitizedBody === 'object') {
    sanitizedBody = JSON.stringify(sanitizeRequestBody(sanitizedBody));
  }

  const secureOptions = {
    ...options,
    body: sanitizedBody,
    headers: secureHeaders,
    credentials: 'same-origin', // Ensure cookies are sent with same-origin requests
  };

  try {
    const response = await fetch(url, secureOptions);

    // Handle CSRF token refresh
    const newToken = response.headers.get('X-CSRF-Token');
    if (newToken) {
      csrfProtection.storeToken(newToken);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('Secure API request failed:', error);
    throw error;
  }
};

/**
 * Sanitize request body recursively
 */
const sanitizeRequestBody = body => {
  if (typeof body !== 'object' || body === null) {
    return body;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      // Apply appropriate sanitization based on field name
      if (key.toLowerCase().includes('email')) {
        sanitized[key] = sanitizers.email(value);
      } else if (key.toLowerCase().includes('phone')) {
        sanitized[key] = sanitizers.phone(value);
      } else if (key.toLowerCase().includes('name')) {
        sanitized[key] = sanitizers.name(value);
      } else if (
        key.toLowerCase().includes('content') ||
        key.toLowerCase().includes('description')
      ) {
        sanitized[key] = sanitizers.educationalContent(value);
      } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
        sanitized[key] = sanitizers.url(value);
      } else {
        sanitized[key] = sanitizers.text(value);
      }
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Initialize security measures
 */
export const initializeSecurity = () => {
  // Generate and store initial CSRF token
  const token = csrfProtection.generateToken();
  csrfProtection.storeToken(token);

  // Set up global error handling for security violations
  window.addEventListener('securitypolicyviolation', e => {
    console.error('Content Security Policy violation:', e);
    // Report to error monitoring service
  });

  // Clear sensitive data on page unload
  window.addEventListener('beforeunload', () => {
    // Clear sensitive session data if needed
    try {
      sessionStorage.removeItem('sensitive_data');
    } catch (error) {
      console.error('Error clearing sensitive data:', error);
    }
  });

  return token;
};

// Content Security Policy helpers
export const cspHelpers = {
  // Generate nonce for inline scripts
  generateNonce: () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  },

  // Validate external URLs before loading
  isAllowedDomain: (url, allowedDomains = []) => {
    try {
      const urlObj = new URL(url);
      return allowedDomains.some(
        domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  },
};

// Main security helpers object that combines all utilities
export const securityHelpers = {
  validators,
  sanitizers,
  csrfProtection,
  rateLimiter,
  sessionSecurity,
  prepareFormData,
  secureApiRequest,
  initializeSecurity: initializeSecurity,
  cspHelpers,

  // Convenience methods for dashboard usage
  initializeSessionMonitoring: () => sessionSecurity.startMonitoring(),
  stopSessionMonitoring: () => sessionSecurity.stopMonitoring(),
  setupCSRFProtection: () => csrfProtection.initialize(),
  clearSensitiveData: () => sessionSecurity.clearSensitiveData(),
  isSessionValid: () => sessionSecurity.isSessionValid(),
};

// Export default for backward compatibility
export default securityHelpers;
