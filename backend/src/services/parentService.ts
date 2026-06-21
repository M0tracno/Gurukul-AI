import type { QueryFilter } from 'mongoose';
import { BaseRepository } from '../repositories/baseRepository.js';
import Parent from '../models/Parent.js';
import type { IParent } from '../models/Parent.js';
import type { Pagination, PaginatedResult } from '../types/common.js';

/**
 * Filters accepted by the admin parents list (Requirement 10.3). `search`
 * matches the first name, last name, email, phone number, or parent id
 * (case-insensitive), mirroring the faculty/student list endpoints.
 */
export interface ParentFilters {
  search?: string;
  active?: boolean;
}

/**
 * Outward-facing parent shape for the admin list. The password field is ALWAYS
 * omitted (Requirement 10.4). The `Parent` schema already marks `password` as
 * `select: false`; the mapper omits it explicitly here as defense-in-depth.
 */
export interface ParentResponse {
  _id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  occupation?: string;
  relationToStudent: 'Father' | 'Mother' | 'Guardian' | 'Other';
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  deletedAt?: Date | null;
}

/**
 * Map a persisted Parent document to the outward-facing response shape,
 * explicitly excluding the password so it is never exposed (Requirement 10.4).
 */
function toParentResponse(parent: IParent): ParentResponse {
  return {
    _id: String(parent._id),
    parentId: parent.parentId,
    firstName: parent.firstName,
    lastName: parent.lastName,
    fullName: `${parent.firstName} ${parent.lastName}`,
    email: parent.email,
    phoneNumber: parent.phoneNumber,
    address: parent.address,
    occupation: parent.occupation,
    relationToStudent: parent.relationToStudent,
    isActive: parent.isActive,
    isVerified: parent.isVerified,
    lastLogin: parent.lastLogin,
    createdAt: parent.createdAt,
    deletedAt: parent.deletedAt ?? null,
  };
}

class ParentRepository extends BaseRepository<IParent> {
  constructor() {
    super(Parent);
  }
}

const parentRepository = new ParentRepository();

/**
 * Parent service — business logic layer for the admin parents management
 * surface. Never references HTTP Request/Response objects.
 */
export class ParentService {
  /**
   * List Parent records for the admin management surface with search,
   * filtering, and pagination, mapping every entry to the outward-facing
   * {@link ParentResponse} shape so the password is never exposed.
   *
   * Mirrors {@link FacultyService.list}:
   *  - Page size is bounded to a maximum of 100: the effective `limit` is
   *    clamped to the inclusive 1..100 range so it never exceeds 100
   *    (Requirement 10.2).
   *  - `search` matches first name, last name, email, phone number, or parent
   *    id (case-insensitive) (Requirement 10.3).
   *  - `active` matches the `isActive` flag exactly.
   *  - The response includes `meta` with the total count and current page
   *    (Requirement 10.1) and excludes the password from every entry
   *    (Requirement 10.4).
   *
   * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5
   */
  async list(
    filters: ParentFilters,
    pagination: Pagination,
  ): Promise<PaginatedResult<ParentResponse>> {
    // Bound the page size to a maximum of 100 (Requirement 10.2) by clamping
    // the requested limit into the inclusive 1..100 range so the effective
    // page size never exceeds 100.
    const effectiveLimit = Math.min(Math.max(Math.trunc(pagination.limit) || 1, 1), 100);
    const effectivePage = Math.max(Math.trunc(pagination.page) || 1, 1);

    const query: QueryFilter<IParent> = {};

    if (filters.active !== undefined) {
      (query as Record<string, unknown>).isActive = filters.active;
    }
    if (filters.search) {
      (query as Record<string, unknown>).$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phoneNumber: { $regex: filters.search, $options: 'i' } },
        { parentId: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      parentRepository.findMany(query, {
        page: effectivePage,
        limit: effectiveLimit,
        sortBy: pagination.sortBy ?? 'createdAt',
        sortOrder: pagination.sortOrder ?? 'desc',
      }),
      parentRepository.count(query),
    ]);

    return {
      // Map to the outward-facing shape so the password is excluded from every
      // entry (Requirement 10.4).
      data: data.map(toParentResponse),
      meta: {
        page: effectivePage,
        limit: effectiveLimit,
        total,
        totalPages: Math.ceil(total / effectiveLimit),
      },
    };
  }
}

export const parentService = new ParentService();
