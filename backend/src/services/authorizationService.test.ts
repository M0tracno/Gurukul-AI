import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';

import { AuthorizationService } from './authorizationService.js';
import { AppError } from '../middleware/errorHandler.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// Mock Mongoose models
jest.mock('../models/Course.js', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('../models/Enrollment.js', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  beforeEach(() => {
    service = new AuthorizationService();
    jest.clearAllMocks();
  });

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      expect(service.isAdmin('admin')).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(service.isAdmin('student')).toBe(false);
      expect(service.isAdmin('teacher')).toBe(false);
      expect(service.isAdmin('parent')).toBe(false);
    });
  });

  describe('assertStudentOwnership', () => {
    it('should not throw when student accesses their own records', () => {
      expect(() => {
        service.assertStudentOwnership('student-1', 'student-1', 'student');
      }).not.toThrow();
    });

    it('should throw 403 when student tries to access another student records', () => {
      expect(() => {
        service.assertStudentOwnership('student-1', 'student-2', 'student');
      }).toThrow(AppError);

      try {
        service.assertStudentOwnership('student-1', 'student-2', 'student');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
        expect((error as AppError).message).toContain('own records');
      }
    });

    it('should not throw for admin accessing any student records', () => {
      expect(() => {
        service.assertStudentOwnership('admin-1', 'student-2', 'admin');
      }).not.toThrow();
    });
  });

  describe('assertParentAccess', () => {
    it('should not throw for admin accessing any student data', async () => {
      await expect(
        service.assertParentAccess('admin-1', 'student-1', 'admin'),
      ).resolves.toBeUndefined();
    });

    it('should not throw when parent has active relation to the target student', async () => {
      const parentId = new mongoose.Types.ObjectId().toString();
      const studentId = new mongoose.Types.ObjectId().toString();

      // Register the model for the test
      const schema = new mongoose.Schema(
        {
          parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
          studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
          isActive: { type: Boolean, default: true },
        },
        { collection: 'parent_student_relations' },
      );

      // Only register if not already registered
      if (!mongoose.models['ParentStudentRelation']) {
        mongoose.model('ParentStudentRelation', schema);
      }

      const mockFindOne = jest.fn<() => { lean: () => Promise<unknown> }>().mockReturnValue({
        lean: () => Promise.resolve({ parentId, studentId, isActive: true }),
      });
      mongoose.models['ParentStudentRelation']!.findOne = mockFindOne as unknown as typeof mongoose.Model.findOne;

      await expect(
        service.assertParentAccess(parentId, studentId, 'parent'),
      ).resolves.toBeUndefined();
    });

    it('should throw 403 when parent has no relation to target student', async () => {
      const parentId = new mongoose.Types.ObjectId().toString();
      const studentId = new mongoose.Types.ObjectId().toString();

      // Register the model for the test
      const schema = new mongoose.Schema(
        {
          parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
          studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
          isActive: { type: Boolean, default: true },
        },
        { collection: 'parent_student_relations' },
      );

      if (!mongoose.models['ParentStudentRelation']) {
        mongoose.model('ParentStudentRelation', schema);
      }

      const mockFindOne = jest.fn<() => { lean: () => Promise<unknown> }>().mockReturnValue({
        lean: () => Promise.resolve(null),
      });
      mongoose.models['ParentStudentRelation']!.findOne = mockFindOne as unknown as typeof mongoose.Model.findOne;

      await expect(
        service.assertParentAccess(parentId, studentId, 'parent'),
      ).rejects.toThrow(AppError);

      try {
        await service.assertParentAccess(parentId, studentId, 'parent');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
        expect((error as AppError).message).toContain('ward');
      }
    });
  });

  describe('assertTeacherCourseAccess', () => {
    it('should not throw for admin accessing any course', async () => {
      await expect(
        service.assertTeacherCourseAccess('admin-1', new mongoose.Types.ObjectId().toString(), 'admin'),
      ).resolves.toBeUndefined();
    });

    it('should not throw when teacher is assigned to the course', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      (Course.findOne as jest.Mock).mockReturnValue({
        lean: () => Promise.resolve({ _id: courseId, faculty: teacherId }),
      });

      await expect(
        service.assertTeacherCourseAccess(teacherId, courseId, 'teacher'),
      ).resolves.toBeUndefined();
    });

    it('should throw 403 when teacher is not assigned to the course', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      (Course.findOne as jest.Mock).mockReturnValue({
        lean: () => Promise.resolve(null),
      });

      await expect(
        service.assertTeacherCourseAccess(teacherId, courseId, 'teacher'),
      ).rejects.toThrow(AppError);

      try {
        await service.assertTeacherCourseAccess(teacherId, courseId, 'teacher');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
        expect((error as AppError).message).toContain('assigned courses');
      }
    });
  });

  describe('assertTeacherStudentAccess', () => {
    it('should not throw for admin accessing any student', async () => {
      await expect(
        service.assertTeacherStudentAccess('admin-1', 'student-1', 'admin'),
      ).resolves.toBeUndefined();
    });

    it('should not throw when student is enrolled in one of the teacher courses', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString();
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();

      (Course.find as jest.Mock).mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve([{ _id: courseId }]),
        }),
      });

      (Enrollment.findOne as jest.Mock).mockReturnValue({
        lean: () => Promise.resolve({ student: studentId, course: courseId }),
      });

      await expect(
        service.assertTeacherStudentAccess(teacherId, studentId, 'teacher'),
      ).resolves.toBeUndefined();
    });

    it('should throw 403 when teacher has no courses', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString();
      const studentId = new mongoose.Types.ObjectId().toString();

      (Course.find as jest.Mock).mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve([]),
        }),
      });

      await expect(
        service.assertTeacherStudentAccess(teacherId, studentId, 'teacher'),
      ).rejects.toThrow(AppError);

      try {
        await service.assertTeacherStudentAccess(teacherId, studentId, 'teacher');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
      }
    });

    it('should throw 403 when student is not enrolled in any teacher courses', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString();
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();

      (Course.find as jest.Mock).mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve([{ _id: courseId }]),
        }),
      });

      (Enrollment.findOne as jest.Mock).mockReturnValue({
        lean: () => Promise.resolve(null),
      });

      await expect(
        service.assertTeacherStudentAccess(teacherId, studentId, 'teacher'),
      ).rejects.toThrow(AppError);

      try {
        await service.assertTeacherStudentAccess(teacherId, studentId, 'teacher');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
        expect((error as AppError).message).toContain('enrolled');
      }
    });
  });
});
