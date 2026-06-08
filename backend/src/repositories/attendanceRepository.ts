import type { QueryFilter } from 'mongoose';
import { BaseRepository, type QueryOptions } from './baseRepository.js';
import Attendance, { type IAttendance } from '../models/Attendance.js';

/**
 * Repository for Attendance documents.
 * Extends BaseRepository with attendance-specific query methods.
 * Attendance does NOT have soft-delete — all records are always visible.
 */
export class AttendanceRepository extends BaseRepository<IAttendance> {
  constructor() {
    super(Attendance);
  }

  /**
   * Find all attendance records for a specific enrollment.
   * Uses .lean() for read performance.
   */
  async findByEnrollment(enrollmentId: string, options?: QueryOptions): Promise<IAttendance[]> {
    const filter = { enrollment: enrollmentId } as unknown as QueryFilter<IAttendance>;

    let query = this.model.find(filter);

    if (options?.sortBy) {
      const sortDirection = options.sortOrder === 'desc' ? -1 : 1;
      query = query.sort({ [options.sortBy]: sortDirection });
    } else {
      // Default sort by date descending for attendance
      query = query.sort({ date: -1 });
    }

    if (options?.page && options?.limit) {
      const skip = (options.page - 1) * options.limit;
      query = query.skip(skip).limit(options.limit);
    } else if (options?.limit) {
      query = query.limit(options.limit);
    }

    const results = await query.lean().exec();
    return results as IAttendance[];
  }

  /**
   * Find attendance for a specific enrollment on a specific date.
   * Uses .lean() for read performance.
   */
  async findByEnrollmentAndDate(
    enrollmentId: string,
    date: Date
  ): Promise<IAttendance | null> {
    const filter = {
      enrollment: enrollmentId,
      date,
    } as unknown as QueryFilter<IAttendance>;

    const result = await this.model.findOne(filter).lean().exec();
    return result as IAttendance | null;
  }
}
