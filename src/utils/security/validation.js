import validator from 'validator';
import CryptoJS from 'crypto-js';

/**
 * Security Validation Utilities - Phase 5 Security Enhancement
 * Provides utility functions for security validation and checks
 */


/**
 * Password validation with comprehensive security checks
 */
export const validatePassword = (password) => {
  const errors = [];
  const warnings = [];
  
  // Basic requirements
  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Advanced checks
  if (password.length < 16) {
    warnings.push('Consider using a longer password (16+ characters)');
  }
  
  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    warnings.push('Avoid repeating characters');
  }
  
  if (/123|abc|qwe|asd/i.test(password)) {
    warnings.push('Avoid common character sequences');
  }
  
  // Check against common passwords
  const commonPasswords = [
    'password', '123456', 'qwerty', 'admin', 'letmein', 
    'welcome', 'monkey', '1234567890', 'password123'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password contains common words or patterns');
  }
  
  // Calculate strength score
  let score = 0;
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 15;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 15;
  if (!/(.)\1{2,}/.test(password)) score += 5;
  if (!/123|abc|qwe/i.test(password)) score += 5;
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.min(score, 100),
    strength: score >= 80 ? 'Strong' : score >= 60 ? 'Medium' : score >= 40 ? 'Weak' : 'Very Weak'
  };
};

/**
 * Email validation with security considerations
 */
export const validateEmail = (email) => {
  const errors = [];
  
  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }
  
  if (!validator.isEmail(email)) {
    errors.push('Invalid email format');
  }
  
  // Check for suspicious patterns
  if (email.includes('..')) {
    errors.push('Email contains invalid character sequences');
  }
  
  // Check for temporary email providers
  const tempEmailDomains = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
    'mailinator.com', 'throwaway.email'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (tempEmailDomains.includes(domain)) {
    errors.push('Temporary email addresses are not allowed');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    domain,
    isTemporary: tempEmailDomains.includes(domain)
  };
};

/**
 * Phone number validation
 */
export const validatePhoneNumber = (phone, countryCode = 'US') => {
  const errors = [];
  
  if (!phone) {
    errors.push('Phone number is required');
    return { isValid: false, errors };
  }
  
  if (!validator.isMobilePhone(phone, countryCode)) {
    errors.push('Invalid phone number format');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    formatted: phone.replace(/\D/g, '')
  };
};

/**
 * Security token validation
 */
export const validateSecurityToken = (token, type = 'mfa') => {
  const errors = [];
  
  if (!token) {
    errors.push('Security token is required');
    return { isValid: false, errors };
  }
  
  switch (type) {
    case 'mfa':
      if (!/^\d{6}$/.test(token)) {
        errors.push('MFA token must be 6 digits');
      }
      break;
    case 'backup':
      if (!/^[A-Z0-9]{8}-[A-Z0-9]{8}$/.test(token)) {
        errors.push('Invalid backup code format');
      }
      break;
    case 'reset':
      if (token.length < 32) {
        errors.push('Invalid reset token format');
      }
      break;
    default:
      errors.push('Unknown token type');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    type
  };
};

/**
 * Input sanitization for security
 */
export const sanitizeInput = (input, type = 'text') => {
  if (!input) return '';
  
  let sanitized = input.toString().trim();
  
  switch (type) {
    case 'html':      // Remove potentially dangerous HTML
      sanitized = sanitized
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
      break;
    case 'sql':
      // Escape SQL special characters
      sanitized = sanitized.replace(/['"\\;]/g, '\\$&');
      break;
    case 'filename':
      // Remove dangerous filename characters
      sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '');
      break;
    default:
      // Basic XSS prevention
      sanitized = sanitized
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
  }
  
  return sanitized;
};

/**
 * Generate secure random values
 */
export const generateSecureRandom = (length = 32, type = 'hex') => {
  const randomBytes = CryptoJS.lib.WordArray.random(length);
  
  switch (type) {
    case 'base64':
      return CryptoJS.enc.Base64.stringify(randomBytes);
    case 'base32':
      // Simple base32 encoding
      return CryptoJS.enc.Base64.stringify(randomBytes)
        .replace(/[+=]/g, '')
        .toUpperCase();
    case 'alphanumeric':
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      const bytes = randomBytes.words;
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.abs(bytes[i % bytes.length]) % chars.length;
        result += chars[randomIndex];
      }
      return result;
    default: // hex
      return randomBytes.toString();
  }
};

/**
 * Hash data securely
 */
export const secureHash = (data, salt = null) => {
  if (!salt) {
    salt = generateSecureRandom(16);
  }
  
  const hash = CryptoJS.PBKDF2(data, salt, {
    keySize: 256 / 32,
    iterations: 10000
  });
  
  return {
    hash: hash.toString(),
    salt: salt.toString(),
    combined: `${salt}:${hash}`
  };
};

/**
 * Verify hashed data
 */
export const verifyHash = (data, storedHash) => {
  try {
    const [salt, hash] = storedHash.split(':');
    const computedHash = CryptoJS.PBKDF2(data, salt, {
      keySize: 256 / 32,
      iterations: 10000
    });
    
    return computedHash.toString() === hash;
  } catch (error) {
    return false;
  }
};

/**
 * Check for security violations in user input
 */
export const detectSecurityViolations = (input) => {
  const violations = [];
  
  // Check for SQL injection patterns
  const sqlPatterns = [
    /union\s+select/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /drop\s+table/i,
    /update\s+set/i,
    /exec\s*\(/i,
    /script\s*:/i
  ];
  
  sqlPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      violations.push('Potential SQL injection detected');
    }
  });
  
  // Check for XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ];
  
  xssPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      violations.push('Potential XSS attack detected');
    }
  });
  
  // Check for path traversal
  if (/\.\.[/\\]/.test(input)) {
    violations.push('Path traversal attempt detected');
  }
  
  // Check for command injection
  const cmdPatterns = [
    /[;&|`$]/,
    /\|\s*\w+/,
    /;\s*\w+/,
    /&&\s*\w+/
  ];
  
  cmdPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      violations.push('Potential command injection detected');
    }
  });
  
  return {
    hasViolations: violations.length > 0,
    violations,
    riskLevel: violations.length > 3 ? 'high' : violations.length > 1 ? 'medium' : violations.length > 0 ? 'low' : 'none'
  };
};

/**
 * Rate limiting helper
 */
export const createRateLimiter = (maxAttempts, windowMs) => {
  const attempts = new Map();
  
  return {
    checkLimit: (identifier) => {
      const now = Date.now();
      const userAttempts = attempts.get(identifier) || [];
      
      // Remove old attempts outside the window
      const validAttempts = userAttempts.filter(time => now - time < windowMs);
      
      if (validAttempts.length >= maxAttempts) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: Math.min(...validAttempts) + windowMs
        };
      }
      
      // Record this attempt
      validAttempts.push(now);
      attempts.set(identifier, validAttempts);
      
      return {
        allowed: true,
        remaining: maxAttempts - validAttempts.length,
        resetTime: now + windowMs
      };
    },
    
    reset: (identifier) => {
      attempts.delete(identifier);
    }
  };
};

export default {
  validatePassword,
  validateEmail,
  validatePhoneNumber,
  validateSecurityToken,
  sanitizeInput,
  generateSecureRandom,
  secureHash,
  verifyHash,
  detectSecurityViolations,
  createRateLimiter
};
