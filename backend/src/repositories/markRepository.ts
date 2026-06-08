import type { QueryFilter } from 'mongoose';
import { BaseRepository, type QueryOptions } from './baseRepository.js';
import Mark, { type IMark } from '../models/Mark.js';

/**
 * Repository for Mark (assessment) documents.
 * Extends BaseRepository with mark-specific query methods.
 * Mark does NOT have soft-delete — all records are always visible.
 */
export class MarkRepository extends BaseRepository<IMark> {
  constructor() {
    super(Mark);
  }

  /**
   * Find all marks for a specific enrollment.
   * Uses .lean() for read performance.
   */
  async findByEnrollment(enrollmentId: string, options?: QueryOptions): Promise<IMark[]> {
    const filter = { enrollment: enrollmentId } as unknown as QueryFilter<IMark>;

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
    return results as IMark[];
  }

  /**
   * Find marks for a specific enrollment filtered by assessment type.
   * Uses .lean() for read performance.
   */
  async findByEnrollmentAndType(
    enrollmentId: string,
    type: IMark['type'],
    options?: QueryOptions
  ): Promise<IMark[]> {
    const filter = {
      enrollment: enrollmentId,
      type,
    } as unknown as QueryFilter<IMark>;

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
    return results as IMark[];
  }
}
