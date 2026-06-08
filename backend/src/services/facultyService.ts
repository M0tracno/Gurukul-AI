import type { QueryFilter } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { BaseRepository } from '../repositories/baseRepository.js';
import Faculty from '../models/Faculty.js';
import type { IFaculty } from '../models/Faculty.js';
import type { Pagination, PaginatedResult, UserRole } from '../types/common.js';

export interface FacultyFilters {
  department?: string;
  active?: boolean;
  search?: string;
}

class FacultyRepository extends BaseRepository<IFaculty> {
  constructor() {
    super(Faculty);
  }

  async findByEmail(email: string): Promise<IFaculty | null> {
    return this.findMany({ email } as QueryFilter<IFaculty>).then(
      (results) => results[0] ?? null,
    );
  }

  async findByEmployeeId(employeeId: string): Promise<IFaculty | null> {
    return this.findMany({ employeeId } as QueryFilter<IFaculty>).then(
      (results) => results[0] ?? null,
    );
  }
}

const facultyRepository = new FacultyRepository();

/**
 * Faculty service — business logic layer.
 * Never references HTTP Request/Response objects.
 */
export class FacultyService {
  /**
   * Find a faculty member by ID with RBAC check.
   * - Admin can view any faculty.
   * - Teacher can only view their own record.
   * - Students/Parents have read access to basic faculty info.
   */
  async findById(id: string, requestorId: string, role: UserRole): Promise<IFaculty> {
    if (role === 'teacher' && requestorId !== id) {
      throw AppError.forbidden('Teachers can only access their own records');
    }

    const faculty = await facultyRepository.findById(id);
    if (!faculty) {
      throw AppError.notFound(`Faculty with id ${id} not found`);
    }

    return faculty;
  }

  /**
   * Find all faculty with optional filters and pagination.
   */
  async findAll(
    filters: FacultyFilters,
    pagination: Pagination,
  ): Promise<PaginatedResult<IFaculty>> {
    const query: QueryFilter<IFaculty> = {};

    if (filters.department) {
      (query as Record<string, unknown>).department = filters.department;
    }
    if (filters.active !== undefined) {
      (query as Record<string, unknown>).active = filters.active;
    }
    if (filters.search) {
      (query as Record<string, unknown>).$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { employeeId: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      facultyRepository.findMany(query, {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: pagination.sortBy ?? 'createdAt',
        sortOrder: pagination.sortOrder ?? 'desc',
      }),
      facultyRepository.count(query),
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
   * Create a new faculty member.
   */
  async create(data: Partial<IFaculty>): Promise<IFaculty> {
    if (data.email) {
      const existing = await facultyRepository.findByEmail(data.email);
      if (existing) {
        throw new AppError(409, 'CONFLICT', `A faculty member with email ${data.email} already exists`);
      }
    }

    if (data.employeeId) {
      const existing = await facultyRepository.findByEmployeeId(data.employeeId);
      if (existing) {
        throw new AppError(409, 'CONFLICT', `A faculty member with employee ID ${data.employeeId} already exists`);
      }
    }

    return facultyRepository.create(data);
  }

  /**
   * Update an existing faculty member.
   */
  async update(id: string, data: Partial<IFaculty>): Promise<IFaculty> {
    const updated = await facultyRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound(`Faculty with id ${id} not found`);
    }
    return updated;
  }

  /**
   * Soft-delete a faculty member.
   */
  async softDelete(id: string): Promise<void> {
    const faculty = await facultyRepository.findById(id);
    if (!faculty) {
      throw AppError.notFound(`Faculty with id ${id} not found`);
    }
    await facultyRepository.softDelete(id);
  }
}

export const facultyService = new FacultyService();
