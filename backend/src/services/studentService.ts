import type { QueryFilter } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { BaseRepository } from '../repositories/baseRepository.js';
import Student from '../models/Student.js';
import type { IStudent } from '../models/Student.js';
import type { Pagination, PaginatedResult, UserRole } from '../types/common.js';

export interface StudentFilters {
  grade?: string;
  active?: boolean;
  search?: string;
}

class StudentRepository extends BaseRepository<IStudent> {
  constructor() {
    super(Student);
  }

  async findByEmail(email: string): Promise<IStudent | null> {
    return this.findMany({ email } as QueryFilter<IStudent>).then(
      (results) => results[0] ?? null,
    );
  }

  async findByStudentId(studentId: string): Promise<IStudent | null> {
    return this.findMany({ studentId } as QueryFilter<IStudent>).then(
      (results) => results[0] ?? null,
    );
  }
}

const studentRepository = new StudentRepository();

/**
 * Student service — business logic layer.
 * Never references HTTP Request/Response objects.
 */
export class StudentService {
  /**
   * Find a student by ID with RBAC check.
   * - Admin/Teacher can view any student.
   * - Student can only view their own record.
   */
  async findById(id: string, requestorId: string, role: UserRole): Promise<IStudent> {
    if (role === 'student' && requestorId !== id) {
      throw AppError.forbidden('Students can only access their own records');
    }

    const student = await studentRepository.findById(id);
    if (!student) {
      throw AppError.notFound(`Student with id ${id} not found`);
    }

    return student;
  }

  /**
   * Find all students with optional filters and pagination.
   */
  async findAll(
    filters: StudentFilters,
    pagination: Pagination,
  ): Promise<PaginatedResult<IStudent>> {
    const query: QueryFilter<IStudent> = {};

    if (filters.grade) {
      (query as Record<string, unknown>).grade = filters.grade;
    }
    if (filters.active !== undefined) {
      (query as Record<string, unknown>).active = filters.active;
    }
    if (filters.search) {
      (query as Record<string, unknown>).$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { studentId: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      studentRepository.findMany(query, {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: pagination.sortBy ?? 'createdAt',
        sortOrder: pagination.sortOrder ?? 'desc',
      }),
      studentRepository.count(query),
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
   * Create a new student.
   */
  async create(data: Partial<IStudent>): Promise<IStudent> {
    // Check for duplicate email
    if (data.email) {
      const existing = await studentRepository.findByEmail(data.email);
      if (existing) {
        throw new AppError(409, 'CONFLICT', `A student with email ${data.email} already exists`);
      }
    }

    // Check for duplicate studentId
    if (data.studentId) {
      const existing = await studentRepository.findByStudentId(data.studentId);
      if (existing) {
        throw new AppError(409, 'CONFLICT', `A student with ID ${data.studentId} already exists`);
      }
    }

    return studentRepository.create(data);
  }

  /**
   * Update an existing student.
   */
  async update(id: string, data: Partial<IStudent>): Promise<IStudent> {
    const updated = await studentRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound(`Student with id ${id} not found`);
    }
    return updated;
  }

  /**
   * Soft-delete a student.
   */
  async softDelete(id: string): Promise<void> {
    const student = await studentRepository.findById(id);
    if (!student) {
      throw AppError.notFound(`Student with id ${id} not found`);
    }
    await studentRepository.softDelete(id);
  }
}

export const studentService = new StudentService();
