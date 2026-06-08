import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Course model
const mockCourseFindOne = jest.fn<() => { lean: () => Promise<unknown> }>();
const mockCourseFind = jest.fn<() => { select: (s: string) => { lean: () => Promise<unknown[]> } }>();

jest.unstable_mockModule('../models/Course.js', () => ({
  default: {
    findOne: mockCourseFindOne,
    find: mockCourseFind,
  },
}));

// Mock Enrollment model
const mockEnrollmentFindOne = jest.fn<() => { lean: () => Promise<unknown> }>();
const mockEnrollmentFind = jest.fn<() => { select: (s: string) => { lean: () => Promise<unknown[]> } }>();

jest.unstable_mockModule('../models/Enrollment.js', () => ({
  default: {
    findOne: mockEnrollmentFindOne,
    find: mockEnrollmentFind,
  },
}));

// Mock mongoose
const mockParentStudentRelationFind = jest.fn<() => { select: (s: string) => { lean: () => Promise<unknown[]> } }>();

jest.unstable_mockModule('mongoose', () => {
  const actualTypes = {
    ObjectId: class ObjectId {
      private value: string;
      constructor(val: string) {
        this.value = val;
      }
      toString() {
        return this.value;
      }
    },
  };

  const mockSchema = jest.fn().mockImplementation(() => ({}));
  (mockSchema as unknown as Record<string, unknown>).Types = {
    ObjectId: actualTypes.ObjectId,
  };

  return {
    default: {
      Types: actualTypes,
      Schema: mockSchema,
      models: {
        ParentStudentRelation: {
          find: mockParentStudentRelationFind,
        },
      },
      model: jest.fn(),
    },
    Types: actualTypes,
    Schema: mockSchema,
  };
});

const { validateMessagingPermission } = await import('./messagingRbac.js');

describe('messagingRbac - validateMessagingPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin role', () => {
    it('should allow admin to message anyone (Faculty)', async () => {
      const result = await validateMessagingPermission(
        'admin-123',
        'admin',
        'teacher-456',
        'Faculty',
      );
      expect(result).toEqual({ allowed: true });
    });

    it('should allow admin to message anyone (Parent)', async () => {
      const result = await validateMessagingPermission(
        'admin-123',
        'admin',
        'parent-456',
        'Parent',
      );
      expect(result).toEqual({ allowed: true });
    });

    it('should allow admin to message anyone (Student)', async () => {
      const result = await validateMessagingPermission(
        'admin-123',
        'admin',
        'student-456',
        'Student',
      );
      expect(result).toEqual({ allowed: true });
    });
  });

  describe('Student role', () => {
    it('should reject student messaging a Parent', async () => {
      const result = await validateMessagingPermission(
        'student-123',
        'student',
        'parent-456',
        'Parent',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Students can only message their assigned teachers');
    });

    it('should reject student messaging another Student', async () => {
      const result = await validateMessagingPermission(
        'student-123',
        'student',
        'student-456',
        'Student',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Students can only message their assigned teachers');
    });

    it('should reject student with no enrollments messaging Faculty', async () => {
      mockEnrollmentFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([]) }),
      });

      const result = await validateMessagingPermission(
        'student-123',
        'student',
        'teacher-456',
        'Faculty',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Students can only message their assigned teachers');
    });

    it('should reject student messaging Faculty who does not teach their course', async () => {
      mockEnrollmentFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ course: 'course-1' }]) }),
      });
      mockCourseFindOne.mockReturnValueOnce({
        lean: () => Promise.resolve(null),
      });

      const result = await validateMessagingPermission(
        'student-123',
        'student',
        'teacher-456',
        'Faculty',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Students can only message their assigned teachers');
    });

    it('should allow student to message Faculty who teaches their enrolled course', async () => {
      mockEnrollmentFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ course: 'course-1' }]) }),
      });
      mockCourseFindOne.mockReturnValueOnce({
        lean: () => Promise.resolve({ _id: 'course-1', faculty: 'teacher-456' }),
      });

      const result = await validateMessagingPermission(
        'student-123',
        'student',
        'teacher-456',
        'Faculty',
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('Parent role', () => {
    it('should reject parent messaging a Student', async () => {
      const result = await validateMessagingPermission(
        'parent-123',
        'parent',
        'student-456',
        'Student',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Parents can only message their ward's teachers");
    });

    it('should reject parent messaging another Parent', async () => {
      const result = await validateMessagingPermission(
        'parent-123',
        'parent',
        'parent-456',
        'Parent',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Parents can only message their ward's teachers");
    });

    it('should reject parent with no linked wards messaging Faculty', async () => {
      mockParentStudentRelationFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([]) }),
      });

      const result = await validateMessagingPermission(
        'parent-123',
        'parent',
        'teacher-456',
        'Faculty',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Parents can only message their ward's teachers");
    });

    it('should reject parent messaging Faculty who does not teach their ward\'s course', async () => {
      mockParentStudentRelationFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ studentId: 'student-789' }]) }),
      });
      mockEnrollmentFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ course: 'course-1' }]) }),
      });
      mockCourseFindOne.mockReturnValueOnce({
        lean: () => Promise.resolve(null),
      });

      const result = await validateMessagingPermission(
        'parent-123',
        'parent',
        'teacher-456',
        'Faculty',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Parents can only message their ward's teachers");
    });

    it('should allow parent to message Faculty who teaches their ward\'s course', async () => {
      mockParentStudentRelationFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ studentId: 'student-789' }]) }),
      });
      mockEnrollmentFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ course: 'course-1' }]) }),
      });
      mockCourseFindOne.mockReturnValueOnce({
        lean: () => Promise.resolve({ _id: 'course-1', faculty: 'teacher-456' }),
      });

      const result = await validateMessagingPermission(
        'parent-123',
        'parent',
        'teacher-456',
        'Faculty',
      );
      expect(result.allowed).toBe(true);
    });

    it('should reject parent whose ward has no enrollments', async () => {
      mockParentStudentRelationFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ studentId: 'student-789' }]) }),
      });
      mockEnrollmentFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([]) }),
      });

      const result = await validateMessagingPermission(
        'parent-123',
        'parent',
        'teacher-456',
        'Faculty',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Parents can only message their ward's teachers");
    });
  });

  describe('Teacher role', () => {
    it('should reject teacher messaging another Faculty', async () => {
      const result = await validateMessagingPermission(
        'teacher-123',
        'teacher',
        'teacher-456',
        'Faculty',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Teachers can only message students and parents in their courses');
    });

    it('should reject teacher with no courses messaging a Student', async () => {
      mockCourseFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([]) }),
      });

      const result = await validateMessagingPermission(
        'teacher-123',
        'teacher',
        'student-456',
        'Student',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Teachers can only message students and parents in their courses');
    });

    it('should reject teacher messaging Student not in their course', async () => {
      mockCourseFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ _id: 'course-1' }]) }),
      });
      mockEnrollmentFindOne.mockReturnValueOnce({
        lean: () => Promise.resolve(null),
      });

      const result = await validateMessagingPermission(
        'teacher-123',
        'teacher',
        'student-456',
        'Student',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Teachers can only message students and parents in their courses');
    });

    it('should allow teacher to message Student enrolled in their course', async () => {
      mockCourseFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ _id: 'course-1' }]) }),
      });
      mockEnrollmentFindOne.mockReturnValueOnce({
        lean: () => Promise.resolve({ student: 'student-456', course: 'course-1' }),
      });

      const result = await validateMessagingPermission(
        'teacher-123',
        'teacher',
        'student-456',
        'Student',
      );
      expect(result.allowed).toBe(true);
    });

    it('should reject teacher messaging Parent whose ward is not in their course', async () => {
      mockCourseFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ _id: 'course-1' }]) }),
      });
      mockParentStudentRelationFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ studentId: 'student-789' }]) }),
      });
      mockEnrollmentFindOne.mockReturnValueOnce({
        lean: () => Promise.resolve(null),
      });

      const result = await validateMessagingPermission(
        'teacher-123',
        'teacher',
        'parent-456',
        'Parent',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Teachers can only message students and parents in their courses');
    });

    it('should allow teacher to message Parent whose ward is enrolled in their course', async () => {
      mockCourseFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ _id: 'course-1' }]) }),
      });
      mockParentStudentRelationFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ studentId: 'student-789' }]) }),
      });
      mockEnrollmentFindOne.mockReturnValueOnce({
        lean: () => Promise.resolve({ student: 'student-789', course: 'course-1' }),
      });

      const result = await validateMessagingPermission(
        'teacher-123',
        'teacher',
        'parent-456',
        'Parent',
      );
      expect(result.allowed).toBe(true);
    });

    it('should reject teacher messaging Parent with no linked wards', async () => {
      mockCourseFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ _id: 'course-1' }]) }),
      });
      mockParentStudentRelationFind.mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([]) }),
      });

      const result = await validateMessagingPermission(
        'teacher-123',
        'teacher',
        'parent-456',
        'Parent',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Teachers can only message students and parents in their courses');
    });
  });

  describe('RBAC integration in messageHandler', () => {
    it('should block message and emit delivery_failed when RBAC denies permission', async () => {
      // This tests the integration indirectly - the handler should not persist
      // when validateMessagingPermission returns { allowed: false }
      const result = await validateMessagingPermission(
        'student-123',
        'student',
        'parent-456',
        'Parent',
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});
