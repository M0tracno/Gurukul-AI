import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock logger to avoid import.meta.url issues in ts-jest
jest.mock('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Mongoose models with controllable mock functions
const mockCourseFindOne = jest.fn();
const mockCourseFind = jest.fn();
const mockEnrollmentFindOne = jest.fn();

jest.unstable_mockModule('../models/Course.js', () => ({
  default: {
    findOne: mockCourseFindOne,
    find: mockCourseFind,
  },
}));

jest.unstable_mockModule('../models/Enrollment.js', () => ({
  default: {
    findOne: mockEnrollmentFindOne,
  },
}));

const { AuthorizationService } = await import('./authorizationService.js');
const { AppError } = await import('../middleware/errorHandler.js');
type AppErrorInstance = InstanceType<typeof AppError>;

describe('AuthorizationService', () => {
  let service: InstanceType<typeof AuthorizationService>;

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
        expect((error as AppErrorInstance).statusCode).toBe(403);
        expect((error as AppErrorInstance).message).toContain('own records');
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
        expect((error as AppErrorInstance).statusCode).toBe(403);
        expect((error as AppErrorInstance).message).toContain('ward');
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

      mockCourseFindOne.mockReturnValue({
        lean: () => Promise.resolve({ _id: courseId, faculty: teacherId }),
      });

      await expect(
        service.assertTeacherCourseAccess(teacherId, courseId, 'teacher'),
      ).resolves.toBeUndefined();
    });

    it('should throw 403 when teacher is not assigned to the course', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      mockCourseFindOne.mockReturnValue({
        lean: () => Promise.resolve(null),
      });

      await expect(
        service.assertTeacherCourseAccess(teacherId, courseId, 'teacher'),
      ).rejects.toThrow(AppError);

      try {
        await service.assertTeacherCourseAccess(teacherId, courseId, 'teacher');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppErrorInstance).statusCode).toBe(403);
        expect((error as AppErrorInstance).message).toContain('assigned courses');
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

      mockCourseFind.mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve([{ _id: courseId }]),
        }),
      });

      mockEnrollmentFindOne.mockReturnValue({
        lean: () => Promise.resolve({ student: studentId, course: courseId }),
      });

      await expect(
        service.assertTeacherStudentAccess(teacherId, studentId, 'teacher'),
      ).resolves.toBeUndefined();
    });

    it('should throw 403 when teacher has no courses', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString();
      const studentId = new mongoose.Types.ObjectId().toString();

      mockCourseFind.mockReturnValue({
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
        expect((error as AppErrorInstance).statusCode).toBe(403);
      }
    });

    it('should throw 403 when student is not enrolled in any teacher courses', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString();
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();

      mockCourseFind.mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve([{ _id: courseId }]),
        }),
      });

      mockEnrollmentFindOne.mockReturnValue({
        lean: () => Promise.resolve(null),
      });

      await expect(
        service.assertTeacherStudentAccess(teacherId, studentId, 'teacher'),
      ).rejects.toThrow(AppError);

      try {
        await service.assertTeacherStudentAccess(teacherId, studentId, 'teacher');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppErrorInstance).statusCode).toBe(403);
        expect((error as AppErrorInstance).message).toContain('enrolled');
      }
    });
  });

  describe('assertConversationParticipant', () => {
    const facultyId = new mongoose.Types.ObjectId();
    const parentId = new mongoose.Types.ObjectId();
    const message = {
      senderId: parentId,
      senderModel: 'Parent' as const,
      recipientId: facultyId,
      recipientModel: 'Faculty' as const,
    };

    it('should not throw for admin', () => {
      expect(() => {
        service.assertConversationParticipant('any-id', 'admin', message);
      }).not.toThrow();
    });

    it('should not throw when the teacher is the recipient', () => {
      expect(() => {
        service.assertConversationParticipant(facultyId.toString(), 'teacher', message);
      }).not.toThrow();
    });

    it('should not throw when the parent is the sender', () => {
      expect(() => {
        service.assertConversationParticipant(parentId.toString(), 'parent', message);
      }).not.toThrow();
    });

    it('should throw 403 when the user is not a participant', () => {
      const outsider = new mongoose.Types.ObjectId().toString();
      try {
        service.assertConversationParticipant(outsider, 'teacher', message);
        throw new Error('expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppErrorInstance).statusCode).toBe(403);
        expect((error as AppErrorInstance).message).toContain('participant');
      }
    });

    it('should throw 403 when the id matches but the role-to-model mapping does not', () => {
      // A parent sharing the faculty recipient's raw id must not be treated as a participant.
      try {
        service.assertConversationParticipant(facultyId.toString(), 'parent', message);
        throw new Error('expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppErrorInstance).statusCode).toBe(403);
      }
    });
  });

  describe('assertMessageRecipient', () => {
    const facultyId = new mongoose.Types.ObjectId();
    const message = {
      recipientId: facultyId,
      recipientModel: 'Faculty' as const,
    };

    it('should not throw for admin', () => {
      expect(() => {
        service.assertMessageRecipient('any-id', 'admin', message);
      }).not.toThrow();
    });

    it('should not throw when the user is the recipient', () => {
      expect(() => {
        service.assertMessageRecipient(facultyId.toString(), 'teacher', message);
      }).not.toThrow();
    });

    it('should throw 403 when the user is not the recipient', () => {
      const other = new mongoose.Types.ObjectId().toString();
      try {
        service.assertMessageRecipient(other, 'teacher', message);
        throw new Error('expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppErrorInstance).statusCode).toBe(403);
        expect((error as AppErrorInstance).message).toContain('recipient');
      }
    });

    it('should throw 403 for the sender who is not the recipient', () => {
      // Recipient-only: even a conversation participant who only sent the message cannot mark it read.
      try {
        service.assertMessageRecipient(facultyId.toString(), 'parent', message);
        throw new Error('expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppErrorInstance).statusCode).toBe(403);
      }
    });
  });

  describe('assertMessageParticipant', () => {
    const facultyId = new mongoose.Types.ObjectId();
    const parentId = new mongoose.Types.ObjectId();
    const message = {
      senderId: parentId,
      senderModel: 'Parent' as const,
      recipientId: facultyId,
      recipientModel: 'Faculty' as const,
    };

    it('should not throw for admin', () => {
      expect(() => {
        service.assertMessageParticipant('any-id', 'admin', message);
      }).not.toThrow();
    });

    it('should not throw for the sender', () => {
      expect(() => {
        service.assertMessageParticipant(parentId.toString(), 'parent', message);
      }).not.toThrow();
    });

    it('should not throw for the recipient', () => {
      expect(() => {
        service.assertMessageParticipant(facultyId.toString(), 'teacher', message);
      }).not.toThrow();
    });

    it('should throw 403 for a non-participant', () => {
      const outsider = new mongoose.Types.ObjectId().toString();
      try {
        service.assertMessageParticipant(outsider, 'parent', message);
        throw new Error('expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppErrorInstance).statusCode).toBe(403);
        expect((error as AppErrorInstance).message).toContain('delete');
      }
    });
  });

  describe('assertFeedbackTarget', () => {
    const teacherId = new mongoose.Types.ObjectId();

    it('should not throw for admin', () => {
      expect(() => {
        service.assertFeedbackTarget('any-id', 'admin', {
          targetType: 'teacher',
          targetId: teacherId,
        });
      }).not.toThrow();
    });

    it('should not throw when the feedback targets the authenticated teacher', () => {
      expect(() => {
        service.assertFeedbackTarget(teacherId.toString(), 'teacher', {
          targetType: 'teacher',
          targetId: teacherId,
        });
      }).not.toThrow();
    });

    it('should throw 403 when the feedback targets a different teacher', () => {
      const otherTeacher = new mongoose.Types.ObjectId();
      try {
        service.assertFeedbackTarget(teacherId.toString(), 'teacher', {
          targetType: 'teacher',
          targetId: otherTeacher,
        });
        throw new Error('expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppErrorInstance).statusCode).toBe(403);
        expect((error as AppErrorInstance).message).toContain('addressed to you');
      }
    });

    it('should throw 403 when the feedback targets a course rather than the teacher', () => {
      try {
        service.assertFeedbackTarget(teacherId.toString(), 'teacher', {
          targetType: 'course',
          targetId: teacherId,
        });
        throw new Error('expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppErrorInstance).statusCode).toBe(403);
      }
    });
  });
});
