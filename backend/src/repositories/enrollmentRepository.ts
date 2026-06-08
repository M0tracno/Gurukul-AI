import type { QueryFilter } from 'mongoose';
import { BaseRepository, type QueryOptions } from './baseRepository.js';
import Enrollment, { type IEnrollment } from '../models/Enrollment.js';

/**
 * Repository for Enrollment documents.
 * Extends BaseRepository with enrollment-specific query methods.
 * Enrollment does NOT have soft-delete — all records are always visible.
 */
export class EnrollmentRepository extends BaseRepository<IEnrollment> {
  constructor() {
    super(Enrollment);
  }

  /**
   * Find all enrollments for a specific student.
   * Uses .lean() for read performance.
   */
  async findByStudent(studentId: string, options?: QueryOptions): Promise<IEnrollment[]> {
    const filter = { student: studentId } as unknown as QueryFilter<IEnrollment>;

    let query = this.model.find(filter);

    if (options?.sortBy) {
      const sortDirection = options.sortOrder === 'desc' ? -1 : 1;
      query = query.sort({ [options.sortBy]: sortDirection });
    }

    if (options?.page && options?.limit) {
      const skip = (options.page - 1) * options.limit;
      query = query.skip(skip).limit(options.limit);
    } else if (options?.limit) {
      query = query.limit(options.limit);
    }

    const results = await query.lean().exec();
    return results as IEnrollment[];
  }

  /**
   * Find all enrollments for a specific course.
   * Uses .lean() for read performance.
   */
  async findByCourse(courseId: string, options?: QueryOptions): Promise<IEnrollment[]> {
    const filter = { course: courseId } as unknown as QueryFilter<IEnrollment>;

    let query = this.model.find(filter);

    if (options?.sortBy) {
      const sortDirection = options.sortOrder === 'desc' ? -1 : 1;
      query = query.sort({ [options.sortBy]: sortDirection });
    }

    if (options?.page && options?.limit) {
      const skip = (options.page - 1) * options.limit;
      query = query.skip(skip).limit(options.limit);
    } else if (options?.limit) {
      query = query.limit(options.limit);
    }

    const results = await query.lean().exec();
    return results as IEnrollment[];
  }

  /**
   * Find a specific enrollment by student and course combination.
   * Uses .lean() for read performance.
   */
  async findByStudentAndCourse(
    studentId: string,
    courseId: string
  ): Promise<IEnrollment | null> {
    const filter = {
      student: studentId,
      course: courseId,
    } as unknown as QueryFilter<IEnrollment>;

    const result = await this.model.findOne(filter).lean().exec();
    return result as IEnrollment | null;
  }
}
