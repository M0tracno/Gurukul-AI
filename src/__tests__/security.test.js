/**
 * Security Utils Tests - Phase 5 Security Enhancement
 * Unit tests for security validation, monitoring, and encryption utilities
 */

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
} from '../src/utils/security/validation';

  generateDeviceFingerprint,
  analyzeBehaviorPattern,
  correlateSecurityEvents,
  calculateSecurityMetrics,
  detectThreats
} from '../src/utils/security/monitoring';

  encryptData,
  decryptData,
  hashData,
  verifyHashedData,
  generateSecureToken,
  secureStorage
} from '../src/utils/security/encryption';

describe('Security Validation Utils', () => {
  describe('validatePassword', () => {
    test('should accept strong password', () => {
      const result = validatePassword('StrongPassword123!@#');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('Strong');
      expect(result.score).toBeGreaterThan(80);
    });

    test('should reject weak password', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect common passwords', () => {
      const result = validatePassword('password123');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('common'))).toBe(true);
    });
  });

  describe('validateEmail', () => {
    test('should accept valid email', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('example.com');
    });

    test('should reject invalid email', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect temporary email providers', () => {
      const result = validateEmail('test@10minutemail.com');
      expect(result.isTemporary).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    test('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitized = sanitizeInput(maliciousInput, 'html');
      expect(sanitized).not.toContain('<script>');
    });

    test('should escape HTML entities', () => {
      const input = '<div>Hello & "world"</div>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&quot;');
    });

    test('should handle SQL injection attempts', () => {
      const input = "'; DROP TABLE users; --";
      const sanitized = sanitizeInput(input, 'sql');
      expect(sanitized).toContain('\\');
    });
  });

  describe('detectSecurityViolations', () => {
    test('should detect SQL injection patterns', () => {
      const input = 'SELECT * FROM users WHERE id = 1; DROP TABLE users;';
      const result = detectSecurityViolations(input);
      expect(result.hasViolations).toBe(true);
      expect(result.violations.some(v => v.includes('SQL'))).toBe(true);
    });

    test('should detect XSS patterns', () => {
      const input = '<script>alert("xss")</script>';
      const result = detectSecurityViolations(input);
      expect(result.hasViolations).toBe(true);
      expect(result.violations.some(v => v.includes('XSS'))).toBe(true);
    });

    test('should detect path traversal', () => {
      const input = '../../../etc/passwd';
      const result = detectSecurityViolations(input);
      expect(result.hasViolations).toBe(true);
      expect(result.violations.some(v => v.includes('traversal'))).toBe(true);
    });
  });

  describe('createRateLimiter', () => {
    test('should allow requests within limit', () => {
      const limiter = createRateLimiter(5, 60000); // 5 requests per minute
      const result = limiter.checkLimit('user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    test('should block requests exceeding limit', () => {
      const limiter = createRateLimiter(2, 60000); // 2 requests per minute
      
      // Make 2 allowed requests
      limiter.checkLimit('user1');
      limiter.checkLimit('user1');
      
      // Third request should be blocked
      const result = limiter.checkLimit('user1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });
});

describe('Security Monitoring Utils', () => {
  describe('generateDeviceFingerprint', () => {
    test('should generate consistent fingerprint', () => {
      // Mock browser APIs for testing
      global.navigator = {
        userAgent: 'Mozilla/5.0 Test Browser',
        language: 'en-US',
        platform: 'Win32',
        hardwareConcurrency: 4
      };
      global.screen = {
        width: 1920,
        height: 1080,
        colorDepth: 24
      };
      global.Intl = {
        DateTimeFormat: () => ({
          resolvedOptions: () => ({ timeZone: 'America/New_York' })
        })
      };

      const fingerprint1 = generateDeviceFingerprint();
      const fingerprint2 = generateDeviceFingerprint();
      
      expect(fingerprint1.fingerprint).toBe(fingerprint2.fingerprint);
      expect(fingerprint1.confidence).toBeGreaterThan(0);
    });
  });

  describe('analyzeBehaviorPattern', () => {
    test('should detect suspicious patterns', () => {
      const suspiciousEvents = [
        { type: 'login', timestamp: new Date('2023-01-01T02:00:00Z'), success: false },
        { type: 'login', timestamp: new Date('2023-01-01T02:01:00Z'), success: false },
        { type: 'login', timestamp: new Date('2023-01-01T02:02:00Z'), success: false },
        { type: 'login', timestamp: new Date('2023-01-01T02:03:00Z'), success: true }
      ];

      const analysis = analyzeBehaviorPattern(suspiciousEvents);
      expect(analysis.suspiciousActivity).toBe(true);
      expect(analysis.riskScore).toBeGreaterThan(0);
      expect(analysis.patterns.length).toBeGreaterThan(0);
    });

    test('should handle normal patterns', () => {
      const normalEvents = [
        { type: 'login', timestamp: new Date('2023-01-01T09:00:00Z'), success: true },
        { type: 'login', timestamp: new Date('2023-01-01T10:00:00Z'), success: true }
      ];

      const analysis = analyzeBehaviorPattern(normalEvents);
      expect(analysis.suspiciousActivity).toBe(false);
      expect(analysis.riskScore).toBe(0);
    });
  });

  describe('calculateSecurityMetrics', () => {
    test('should calculate metrics correctly', () => {
      const events = [
        { type: 'login', timestamp: new Date(), success: true, userId: 'user1', ip: '192.168.1.1' },
        { type: 'login', timestamp: new Date(), success: false, userId: 'user2', ip: '192.168.1.2' },
        { type: 'logout', timestamp: new Date(), success: true, userId: 'user1', ip: '192.168.1.1' }
      ];

      const metrics = calculateSecurityMetrics(events);
      expect(metrics.totalEvents).toBe(3);
      expect(metrics.successfulEvents).toBe(2);
      expect(metrics.failedEvents).toBe(1);
      expect(metrics.uniqueUsers).toBe(2);
      expect(metrics.uniqueIPs).toBe(2);
      expect(metrics.successRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('detectThreats', () => {
    test('should detect brute force attacks', () => {
      const currentEvent = {
        type: 'login',
        success: false,
        ip: '192.168.1.100',
        timestamp: new Date()
      };

      const recentEvents = [
        { type: 'login', success: false, ip: '192.168.1.100', timestamp: new Date(Date.now() - 60000) },
        { type: 'login', success: false, ip: '192.168.1.100', timestamp: new Date(Date.now() - 120000) },
        { type: 'login', success: false, ip: '192.168.1.100', timestamp: new Date(Date.now() - 180000) }
      ];

      const threats = detectThreats(currentEvent, recentEvents);
      const bruteForce = threats.find(t => t.type === 'brute_force');
      expect(bruteForce).toBeDefined();
      expect(bruteForce.severity).toBe('high');
    });
  });
});

describe('Security Encryption Utils', () => {
  describe('encryptData and decryptData', () => {
    test('should encrypt and decrypt data correctly', () => {
      const originalData = { message: 'Hello World', number: 42, array: [1, 2, 3] };
      const password = 'testPassword123!';

      const encrypted = encryptData(originalData, password);
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();

      const decrypted = decryptData(encrypted, password);
      expect(decrypted).toEqual(originalData);
    });

    test('should fail with wrong password', () => {
      const originalData = { message: 'Hello World' };
      const correctPassword = 'correctPassword';
      const wrongPassword = 'wrongPassword';

      const encrypted = encryptData(originalData, correctPassword);
      
      expect(() => {
        decryptData(encrypted, wrongPassword);
      }).toThrow();
    });
  });

  describe('hashData and verifyHashedData', () => {
    test('should hash and verify data correctly', () => {
      const data = 'sensitive information';
      const hashed = hashData(data);
      
      expect(hashed.hash).toBeDefined();
      expect(hashed.salt).toBeDefined();
      expect(hashed.combined).toContain(':');

      const isValid = verifyHashedData(data, hashed);
      expect(isValid).toBe(true);

      const isInvalid = verifyHashedData('wrong data', hashed);
      expect(isInvalid).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    test('should generate tokens of correct length', () => {
      const hexToken = generateSecureToken(16, 'hex');
      expect(hexToken).toHaveLength(32); // hex is 2x the byte length

      const base64Token = generateSecureToken(16, 'base64');
      expect(base64Token.length).toBeGreaterThan(0);

      const alphanumericToken = generateSecureToken(16, 'alphanumeric');
      expect(alphanumericToken).toHaveLength(16);
      expect(/^[A-Z0-9]+$/.test(alphanumericToken)).toBe(true);
    });

    test('should generate unique tokens', () => {
      const token1 = generateSecureToken(32);
      const token2 = generateSecureToken(32);
      expect(token1).not.toBe(token2);
    });
  });

  describe('secureStorage', () => {
    // Mock localStorage for testing
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    global.localStorage = localStorageMock;

    const sessionStorageMock = {
      getItem: jest.fn(() => 'mockkey'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    global.sessionStorage = sessionStorageMock;

    beforeEach(() => {
      localStorageMock.getItem.mockClear();
      localStorageMock.setItem.mockClear();
      sessionStorageMock.getItem.mockClear();
      sessionStorageMock.setItem.mockClear();
    });

    test('should store and retrieve data securely', () => {
      const testData = { userId: 123, preferences: { theme: 'dark' } };
      const key = 'testKey';

      // Mock localStorage to return encrypted data
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        encrypted: 'mockEncryptedData',
        iv: 'mockIV',
        salt: 'mockSalt'
      }));

      const stored = secureStorage.setItem(key, testData);
      expect(stored).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});

// Mock browser APIs that might not be available in test environment
beforeAll(() => {
  // Mock crypto for Node.js testing environment
  if (typeof crypto === 'undefined') {
    global.crypto = {
      getRandomValues: jest.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      })
    };
  }

  // Mock document for canvas testing
  if (typeof document === 'undefined') {
    global.document = {
      createElement: jest.fn(() => ({
        getContext: jest.fn(() => ({
          textBaseline: '',
          font: '',
          fillText: jest.fn(),
          toDataURL: jest.fn(() => 'mock-canvas-data')
        })),
        toDataURL: jest.fn(() => 'mock-canvas-data')
      }))
    };
  }

  // Mock window for audio context testing
  if (typeof window === 'undefined') {
    global.window = {
      AudioContext: jest.fn(() => ({
        createOscillator: jest.fn(() => ({
          connect: jest.fn(),
          frequency: { value: 0 },
          disconnect: jest.fn()
        })),
        createAnalyser: jest.fn(() => ({
          connect: jest.fn(),
          disconnect: jest.fn(),
          frequencyBinCount: 1024,
          getByteFrequencyData: jest.fn()
        })),
        createGain: jest.fn(() => ({
          connect: jest.fn(),
          disconnect: jest.fn(),
          gain: { value: 0 }
        })),
        destination: {}
      })),
      webkitAudioContext: jest.fn()
    };
  }
});
