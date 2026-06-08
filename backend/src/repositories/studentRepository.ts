import type { QueryFilter } from 'mongoose';
import { BaseRepository, type QueryOptions } from './baseRepository.js';
import Student, { type IStudent } from '../models/Student.js';

/**
 * Repository for Student documents.
 * Extends BaseRepository with student-specific query methods.
 * Student has soft-delete (deletedAt) — default queries exclude deleted records.
 */
export class StudentRepository extends BaseRepository<IStudent> {
  constructor() {
    super(Student);
  }

  /**
   * Find a student by email, excluding soft-deleted records.
   * Uses .lean() for read performance.
   */
  async findByEmail(email: string, options?: QueryOptions): Promise<IStudent | null> {
    const filter = this.buildSoftDeleteFilter(
      { email } as QueryFilter<IStudent>,
      options?.includeDeleted
    );
    const result = await this.model.findOne(filter).lean().exec();
    return result as IStudent | null;
  }

  /**
   * Find a student by their unique studentId field, excluding soft-deleted records.
   * Uses .lean() for read performance.
   */
  async findByStudentId(studentId: string, options?: QueryOptions): Promise<IStudent | null> {
    const filter = this.buildSoftDeleteFilter(
      { studentId } as QueryFilter<IStudent>,
      options?.includeDeleted
    );
    const result = await this.model.findOne(filter).lean().exec();
    return result as IStudent | null;
  }
}
