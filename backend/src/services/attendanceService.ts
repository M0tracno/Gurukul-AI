import type { QueryFilter } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { BaseRepository } from '../repositories/baseRepository.js';
import Attendance from '../models/Attendance.js';
import type { IAttendance } from '../models/Attendance.js';
import type { Pagination, PaginatedResult } from '../types/common.js';

class AttendanceRepository extends BaseRepository<IAttendance> {
  constructor() {
    super(Attendance);
  }

  async findByEnrollment(enrollmentId: string): Promise<IAttendance[]> {
    return this.findMany(
      { enrollment: enrollmentId } as QueryFilter<IAttendance>,
      { sortBy: 'date', sortOrder: 'desc' },
    );
  }
}

const attendanceRepository = new AttendanceRepository();

/**
 * Attendance service — business logic layer.
 * Never references HTTP Request/Response objects.
 */
export class AttendanceService {
  /**
   * Find an attendance record by ID.
   */
  async findById(id: string): Promise<IAttendance> {
    const attendance = await attendanceRepository.findById(id);
    if (!attendance) {
      throw AppError.notFound(`Attendance record with id ${id} not found`);
    }
    return attendance;
  }

  /**
   * Record attendance for an enrollment on a given date.
   */
  async recordAttendance(data: Partial<IAttendance>): Promise<IAttendance> {
    return attendanceRepository.create(data);
  }

  /**
   * Find attendance records for an enrollment with pagination.
   */
  async findByEnrollment(
    enrollmentId: string,
    pagination: Pagination,
  ): Promise<PaginatedResult<IAttendance>> {
    const query = { enrollment: enrollmentId } as QueryFilter<IAttendance>;

    const [data, total] = await Promise.all([
      attendanceRepository.findMany(query, {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: pagination.sortBy ?? 'date',
        sortOrder: pagination.sortOrder ?? 'desc',
      }),
      attendanceRepository.count(query),
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
   * Compute attendance percentage for an enrollment.
   * Counts 'present' and 'late' as attended; 'absent' and 'excused' as not attended.
   * Returns percentage rounded to the nearest integer.
   *
   * Validates: Requirements 9.4 (Property 25)
   */
  async computeAttendancePercent(enrollmentId: string): Promise<number> {
    const records = await attendanceRepository.findByEnrollment(enrollmentId);

    if (records.length === 0) {
      return 0;
    }

    const attendedCount = records.filter(
      (r) => r.status === 'present' || r.status === 'late',
    ).length;

    return Math.round((attendedCount / records.length) * 100);
  }
}

export const attendanceService = new AttendanceService();
