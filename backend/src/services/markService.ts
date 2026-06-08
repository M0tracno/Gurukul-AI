import type { QueryFilter } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { BaseRepository } from '../repositories/baseRepository.js';
import Mark from '../models/Mark.js';
import type { IMark } from '../models/Mark.js';
import type { Pagination, PaginatedResult } from '../types/common.js';

export interface MarkFilters {
  enrollment?: string;
  type?: string;
}

class MarkRepository extends BaseRepository<IMark> {
  constructor() {
    super(Mark);
  }

  async findByEnrollment(enrollmentId: string): Promise<IMark[]> {
    return this.findMany(
      { enrollment: enrollmentId } as QueryFilter<IMark>,
      { sortBy: 'createdAt', sortOrder: 'desc' },
    );
  }
}

const markRepository = new MarkRepository();

/**
 * Mark service — business logic layer.
 * Never references HTTP Request/Response objects.
 */
export class MarkService {
  /**
   * Find a mark by ID.
   */
  async findById(id: string): Promise<IMark> {
    const mark = await markRepository.findById(id);
    if (!mark) {
      throw AppError.notFound(`Mark with id ${id} not found`);
    }
    return mark;
  }

  /**
   * Find all marks with optional filters and pagination.
   */
  async findAll(
    filters: MarkFilters,
    pagination: Pagination,
  ): Promise<PaginatedResult<IMark>> {
    const query: QueryFilter<IMark> = {};

    if (filters.enrollment) {
      (query as Record<string, unknown>).enrollment = filters.enrollment;
    }
    if (filters.type) {
      (query as Record<string, unknown>).type = filters.type;
    }

    const [data, total] = await Promise.all([
      markRepository.findMany(query, {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: pagination.sortBy ?? 'createdAt',
        sortOrder: pagination.sortOrder ?? 'desc',
      }),
      markRepository.count(query),
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
   * Find all marks for an enrollment.
   */
  async findByEnrollment(enrollmentId: string): Promise<IMark[]> {
    return markRepository.findByEnrollment(enrollmentId);
  }

  /**
   * Create a new mark.
   */
  async create(data: Partial<IMark>): Promise<IMark> {
    return markRepository.create(data);
  }

  /**
   * Update an existing mark.
   */
  async update(id: string, data: Partial<IMark>): Promise<IMark> {
    const updated = await markRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound(`Mark with id ${id} not found`);
    }
    return updated;
  }

  /**
   * Calculate the weighted grade for an enrollment.
   * Formula: sum(score/maxScore × weight) / sum(weights)
   * Returns a percentage (0–100) rounded to 2 decimal places.
   *
   * Validates: Requirements 9.4 (Property 24)
   */
  async calculateWeightedGrade(enrollmentId: string): Promise<number> {
    const marks = await markRepository.findByEnrollment(enrollmentId);

    if (marks.length === 0) {
      return 0;
    }

    let weightedSum = 0;
    let totalWeight = 0;

    for (const mark of marks) {
      if (mark.maxScore > 0 && mark.weight > 0) {
        weightedSum += (mark.score / mark.maxScore) * mark.weight;
        totalWeight += mark.weight;
      }
    }

    if (totalWeight === 0) {
      return 0;
    }

    const grade = (weightedSum / totalWeight) * 100;
    return Math.round(grade * 100) / 100;
  }
}

export const markService = new MarkService();
