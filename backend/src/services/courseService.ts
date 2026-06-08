import type { QueryFilter } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { BaseRepository } from '../repositories/baseRepository.js';
import Course from '../models/Course.js';
import type { ICourse } from '../models/Course.js';
import type { Pagination, PaginatedResult } from '../types/common.js';

export interface CourseFilters {
  faculty?: string;
  active?: boolean;
  search?: string;
}

class CourseRepository extends BaseRepository<ICourse> {
  constructor() {
    super(Course);
  }

  async findByFaculty(facultyId: string): Promise<ICourse[]> {
    return this.findMany({ faculty: facultyId } as QueryFilter<ICourse>);
  }
}

const courseRepository = new CourseRepository();

/**
 * Course service — business logic layer.
 * Never references HTTP Request/Response objects.
 */
export class CourseService {
  /**
   * Find a course by ID.
   */
  async findById(id: string): Promise<ICourse> {
    const course = await courseRepository.findById(id);
    if (!course) {
      throw AppError.notFound(`Course with id ${id} not found`);
    }
    return course;
  }

  /**
   * Find all courses with optional filters and pagination.
   */
  async findAll(
    filters: CourseFilters,
    pagination: Pagination,
  ): Promise<PaginatedResult<ICourse>> {
    const query: QueryFilter<ICourse> = {};

    if (filters.faculty) {
      (query as Record<string, unknown>).faculty = filters.faculty;
    }
    if (filters.active !== undefined) {
      (query as Record<string, unknown>).active = filters.active;
    }
    if (filters.search) {
      (query as Record<string, unknown>).$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      courseRepository.findMany(query, {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: pagination.sortBy ?? 'createdAt',
        sortOrder: pagination.sortOrder ?? 'desc',
      }),
      courseRepository.count(query),
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
   * Find courses assigned to a specific faculty member.
   */
  async findByFaculty(
    facultyId: string,
    pagination: Pagination,
  ): Promise<PaginatedResult<ICourse>> {
    const query = { faculty: facultyId } as QueryFilter<ICourse>;

    const [data, total] = await Promise.all([
      courseRepository.findMany(query, {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: pagination.sortBy ?? 'createdAt',
        sortOrder: pagination.sortOrder ?? 'desc',
      }),
      courseRepository.count(query),
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
   * Create a new course.
   */
  async create(data: Partial<ICourse>): Promise<ICourse> {
    return courseRepository.create(data);
  }

  /**
   * Update an existing course.
   */
  async update(id: string, data: Partial<ICourse>): Promise<ICourse> {
    const updated = await courseRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound(`Course with id ${id} not found`);
    }
    return updated;
  }

  /**
   * Soft-delete a course.
   */
  async softDelete(id: string): Promise<void> {
    const course = await courseRepository.findById(id);
    if (!course) {
      throw AppError.notFound(`Course with id ${id} not found`);
    }
    await courseRepository.softDelete(id);
  }
}

export const courseService = new CourseService();
