import type { QueryFilter } from 'mongoose';
import { BaseRepository, type QueryOptions } from './baseRepository.js';
import Course, { type ICourse } from '../models/Course.js';

/**
 * Repository for Course documents.
 * Extends BaseRepository with course-specific query methods.
 * Course has soft-delete (deletedAt) — default queries exclude deleted records.
 */
export class CourseRepository extends BaseRepository<ICourse> {
  constructor() {
    super(Course);
  }

  /**
   * Find all courses taught by a specific faculty member, excluding soft-deleted records.
   * Uses .lean() for read performance.
   */
  async findByFaculty(facultyId: string, options?: QueryOptions): Promise<ICourse[]> {
    const filter = this.buildSoftDeleteFilter(
      { faculty: facultyId } as unknown as QueryFilter<ICourse>,
      options?.includeDeleted
    );

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
    return results as ICourse[];
  }

  /**
   * Find a course by its unique code, excluding soft-deleted records.
   * Uses .lean() for read performance.
   */
  async findByCode(code: string, options?: QueryOptions): Promise<ICourse | null> {
    const filter = this.buildSoftDeleteFilter(
      { code } as QueryFilter<ICourse>,
      options?.includeDeleted
    );
    const result = await this.model.findOne(filter).lean().exec();
    return result as ICourse | null;
  }
}
