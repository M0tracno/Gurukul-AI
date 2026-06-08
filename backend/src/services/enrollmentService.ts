import type { QueryFilter } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { BaseRepository } from '../repositories/baseRepository.js';
import Enrollment from '../models/Enrollment.js';
import type { IEnrollment } from '../models/Enrollment.js';
import type { Pagination, PaginatedResult } from '../types/common.js';

export interface EnrollmentFilters {
  student?: string;
  course?: string;
  status?: 'active' | 'completed' | 'withdrawn' | 'failed';
}

class EnrollmentRepository extends BaseRepository<IEnrollment> {
  constructor() {
    super(Enrollment);
  }

  async findByStudent(studentId: string): Promise<IEnrollment[]> {
    return this.findMany({ student: studentId } as QueryFilter<IEnrollment>);
  }

  async findByCourse(courseId: string): Promise<IEnrollment[]> {
    return this.findMany({ course: courseId } as QueryFilter<IEnrollment>);
  }

  async findByStudentAndCourse(studentId: string, courseId: string): Promise<IEnrollment | null> {
    const results = await this.findMany({
      student: studentId,
      course: courseId,
    } as QueryFilter<IEnrollment>);
    return results[0] ?? null;
  }
}

const enrollmentRepository = new EnrollmentRepository();

/**
 * Enrollment service — business logic layer.
 * Never references HTTP Request/Response objects.
 */
export class EnrollmentService {
  /**
   * Find an enrollment by ID.
   */
  async findById(id: string): Promise<IEnrollment> {
    const enrollment = await enrollmentRepository.findById(id);
    if (!enrollment) {
      throw AppError.notFound(`Enrollment with id ${id} not found`);
    }
    return enrollment;
  }

  /**
   * Find all enrollments with optional filters and pagination.
   */
  async findAll(
    filters: EnrollmentFilters,
    pagination: Pagination,
  ): Promise<PaginatedResult<IEnrollment>> {
    const query: QueryFilter<IEnrollment> = {};

    if (filters.student) {
      (query as Record<string, unknown>).student = filters.student;
    }
    if (filters.course) {
      (query as Record<string, unknown>).course = filters.course;
    }
    if (filters.status) {
      (query as Record<string, unknown>).status = filters.status;
    }

    const [data, total] = await Promise.all([
      enrollmentRepository.findMany(query, {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: pagination.sortBy ?? 'enrollmentDate',
        sortOrder: pagination.sortOrder ?? 'desc',
      }),
      enrollmentRepository.count(query),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /**
   * Find all enrollments for a student.
   */
  async findByStudent(studentId: string): Promise<IEnrollment[]> {
    return enrollmentRepository.findByStudent(studentId);
  }

  /**
   * Find all enrollments for a course.
   */
  async findByCourse(courseId: string): Promise<IEnrollment[]> {
    return enrollmentRepository.findByCourse(courseId);
  }

  /**
   * Create a new enrollment.
   * Checks for duplicate enrollment (student already enrolled in course).
   */
  async create(data: Partial<IEnrollment>): Promise<IEnrollment> {
    if (data.student && data.course) {
      const existing = await enrollmentRepository.findByStudentAndCourse(
        data.student.toString(),
        data.course.toString(),
      );
      if (existing) {
        throw new AppError(
          409,
          'CONFLICT',
          'Student is already enrolled in this course',
        );
      }
    }

    return enrollmentRepository.create(data);
  }

  /**
   * Update an existing enrollment.
   */
  async update(id: string, data: Partial<IEnrollment>): Promise<IEnrollment> {
    const updated = await enrollmentRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound(`Enrollment with id ${id} not found`);
    }
    return updated;
  }
}

export const enrollmentService = new EnrollmentService();
