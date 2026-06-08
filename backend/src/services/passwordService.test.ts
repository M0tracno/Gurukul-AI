/**
 * Unit tests for PasswordService
 *
 * Tests password hashing (bcrypt cost factor 12), password comparison,
 * account lockout after 5 failed attempts within 10 minutes, and lockout reset.
 *
 * **Validates: Requirements 4.5, 4.6**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as bcrypt from 'bcryptjs';
import { PasswordService } from './passwordService.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Parent from '../models/Parent.js';

let mongoServer: MongoMemoryServer;
let service: PasswordService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  service = new PasswordService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Student.deleteMany({});
  await Faculty.deleteMany({});
  await Parent.deleteMany({});
});

function createStudentData(overrides: Record<string, unknown> = {}) {
  const id = Math.random().toString(36).slice(2);
  return {
    firstName: 'Test',
    lastName: 'Student',
    email: `student_${id}@school.edu`,
    password: 'hashedPassword123',
    studentId: `STU-${id}`,
    grade: '10th',
    failedLoginAttempts: 0,
    ...overrides,
  };
}

function createFacultyData(overrides: Record<string, unknown> = {}) {
  const id = Math.random().toString(36).slice(2);
  return {
    firstName: 'Test',
    lastName: 'Faculty',
    email: `faculty_${id}@school.edu`,
    password: 'hashedPassword123',
    employeeId: `EMP-${id}`,
    department: 'CS',
    failedLoginAttempts: 0,
    ...overrides,
  };
}

function createParentData(overrides: Record<string, unknown> = {}) {
  const id = Math.random().toString(36).slice(2);
  return {
    parentId: `PAR-${id}`,
    firstName: 'Test',
    lastName: 'Parent',
    email: `parent_${id}@school.edu`,
    password: 'hashedPassword123',
    failedLoginAttempts: 0,
    ...overrides,
  };
}

describe('PasswordService', () => {
  describe('hashPassword', () => {
    it('should produce a bcrypt hash with cost factor 12', async () => {
      const password = 'MySecurePassword!123';
      const hash = await service.hashPassword(password);

      // bcrypt hashes start with $2a$ or $2b$ followed by the cost factor
      expect(hash).toMatch(/^\$2[aby]\$12\$/);
    });

    it('should produce different hashes for the same password (unique salts)', async () => {
      const password = 'SamePassword';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce a hash that is verifiable with bcrypt.compare', async () => {
      const password = 'VerifyMe!2024';
      const hash = await service.hashPassword(password);

      const isMatch = await bcrypt.compare(password, hash);
      expect(isMatch).toBe(true);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'CorrectPassword';
      const hash = await service.hashPassword(password);

      const result = await service.comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'CorrectPassword';
      const hash = await service.hashPassword(password);

      const result = await service.comparePassword('WrongPassword', hash);
      expect(result).toBe(false);
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment failedLoginAttempts for a Student', async () => {
      const student = await Student.create(createStudentData());

      const result = await service.recordFailedAttempt(
        student._id.toString(),
        'Student'
      );

      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(4);

      const updated = await Student.findById(student._id);
      expect(updated!.failedLoginAttempts).toBe(1);
    });

    it('should lock account after 5 failed attempts', async () => {
      const student = await Student.create(
        createStudentData({ failedLoginAttempts: 4 })
      );

      const result = await service.recordFailedAttempt(
        student._id.toString(),
        'Student'
      );

      expect(result.locked).toBe(true);
      expect(result.attemptsRemaining).toBe(0);

      const updated = await Student.findById(student._id);
      expect(updated!.lockedUntil).toBeDefined();
      expect(updated!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return locked status if account is already locked', async () => {
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
      const student = await Student.create(
        createStudentData({
          failedLoginAttempts: 5,
          lockedUntil,
        })
      );

      const result = await service.recordFailedAttempt(
        student._id.toString(),
        'Student'
      );

      expect(result.locked).toBe(true);
      expect(result.attemptsRemaining).toBe(0);
    });

    it('should work with Faculty model', async () => {
      const faculty = await Faculty.create(createFacultyData());

      const result = await service.recordFailedAttempt(
        faculty._id.toString(),
        'Faculty'
      );

      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(4);
    });

    it('should work with Parent model', async () => {
      const parent = await Parent.create(createParentData());

      const result = await service.recordFailedAttempt(
        parent._id.toString(),
        'Parent'
      );

      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(4);
    });

    it('should throw for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.recordFailedAttempt(fakeId, 'Student')
      ).rejects.toThrow('User not found');
    });

    it('should reset counter if lockout has expired', async () => {
      const expiredLock = new Date(Date.now() - 1000); // 1 second ago
      const student = await Student.create(
        createStudentData({
          failedLoginAttempts: 5,
          lockedUntil: expiredLock,
        })
      );

      const result = await service.recordFailedAttempt(
        student._id.toString(),
        'Student'
      );

      // Should have reset and started fresh (1 attempt now)
      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(4);
    });
  });

  describe('resetFailedAttempts', () => {
    it('should reset failedLoginAttempts to 0 and clear lockedUntil', async () => {
      const student = await Student.create(
        createStudentData({
          failedLoginAttempts: 3,
          lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
        })
      );

      await service.resetFailedAttempts(student._id.toString(), 'Student');

      const updated = await Student.findById(student._id);
      expect(updated!.failedLoginAttempts).toBe(0);
      expect(updated!.lockedUntil).toBeUndefined();
    });

    it('should work with Faculty model', async () => {
      const faculty = await Faculty.create(
        createFacultyData({ failedLoginAttempts: 2 })
      );

      await service.resetFailedAttempts(faculty._id.toString(), 'Faculty');

      const updated = await Faculty.findById(faculty._id);
      expect(updated!.failedLoginAttempts).toBe(0);
    });
  });

  describe('isAccountLocked', () => {
    it('should return true when lockedUntil is in the future', async () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      const student = await Student.create(
        createStudentData({ lockedUntil })
      );

      const locked = await service.isAccountLocked(
        student._id.toString(),
        'Student'
      );
      expect(locked).toBe(true);
    });

    it('should return false when lockedUntil is in the past', async () => {
      const lockedUntil = new Date(Date.now() - 1000);
      const student = await Student.create(
        createStudentData({ lockedUntil })
      );

      const locked = await service.isAccountLocked(
        student._id.toString(),
        'Student'
      );
      expect(locked).toBe(false);
    });

    it('should return false when lockedUntil is not set', async () => {
      const student = await Student.create(createStudentData());

      const locked = await service.isAccountLocked(
        student._id.toString(),
        'Student'
      );
      expect(locked).toBe(false);
    });

    it('should throw for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.isAccountLocked(fakeId, 'Student')
      ).rejects.toThrow('User not found');
    });
  });
});
