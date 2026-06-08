import type { QueryFilter } from 'mongoose';
import { BaseRepository, type QueryOptions } from './baseRepository.js';
import Faculty, { type IFaculty } from '../models/Faculty.js';

/**
 * Repository for Faculty documents.
 * Extends BaseRepository with faculty-specific query methods.
 * Faculty has soft-delete (deletedAt) — default queries exclude deleted records.
 */
export class FacultyRepository extends BaseRepository<IFaculty> {
  constructor() {
    super(Faculty);
  }

  /**
   * Find a faculty member by email, excluding soft-deleted records.
   * Uses .lean() for read performance.
   */
  async findByEmail(email: string, options?: QueryOptions): Promise<IFaculty | null> {
    const filter = this.buildSoftDeleteFilter(
      { email } as QueryFilter<IFaculty>,
      options?.includeDeleted
    );
    const result = await this.model.findOne(filter).lean().exec();
    return result as IFaculty | null;
  }

  /**
   * Find a faculty member by their unique employeeId field, excluding soft-deleted records.
   * Uses .lean() for read performance.
   */
  async findByEmployeeId(employeeId: string, options?: QueryOptions): Promise<IFaculty | null> {
    const filter = this.buildSoftDeleteFilter(
      { employeeId } as QueryFilter<IFaculty>,
      options?.includeDeleted
    );
    const result = await this.model.findOne(filter).lean().exec();
    return result as IFaculty | null;
  }
}
