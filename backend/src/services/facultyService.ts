import type { QueryFilter } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { BaseRepository } from '../repositories/baseRepository.js';
import Faculty from '../models/Faculty.js';
import type { IFaculty } from '../models/Faculty.js';
import type { Pagination, PaginatedResult, UserRole } from '../types/common.js';
import { credentialService } from './credentialService.js';
import type { CredentialDeliveryMethod } from './credentialService.js';
import { emailService } from './emailService.js';
import { authTokenService } from './authTokenService.js';
import { auditService } from './auditService.js';
import { redactSecrets } from '../utils/auditContext.js';
import type { AuditContext } from '../utils/auditContext.js';
import type { ResetResult } from './studentService.js';

export interface FacultyFilters {
  department?: string;
  active?: boolean;
  search?: string;
  /**
   * The `grade` filter is invalid for faculty (it is a student-only concept);
   * its presence alongside a `department` filter is the conflicting combination
   * rejected with HTTP 400 (Requirement 10.5). It is accepted here only so the
   * conflict can be detected and rejected in {@link FacultyService.list}.
   */
  grade?: string;
}

/**
 * Admin-supplied fields for creating a Faculty_Account with credentials.
 * `password` is only meaningful for the `admin_set` delivery method.
 *
 * `isAdmin` is optional and only honored by an admin-privileged caller; when it
 * is omitted (or false) the account is created with `isAdmin: false` and
 * `role: 'faculty'` (Requirement 5.8).
 */
export interface CreateFacultyInput {
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department: string;
  credentialDeliveryMethod: CredentialDeliveryMethod;
  password?: string;
  title?: string;
  phone?: string;
  bio?: string;
  isAdmin?: boolean;
}

/**
 * Admin-supplied fields for updating a Faculty_Account profile.
 *
 * Credential material (password) and the immutable identifier (`employeeId`)
 * are intentionally excluded; password changes flow through the reset path and
 * the task scopes update uniqueness to `email` only. Privilege fields (`role`,
 * `isAdmin`) are admin-only and are handled at the route layer per the design,
 * so they are not part of this profile-update shape.
 */
export interface UpdateFacultyInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
  title?: string;
  phone?: string;
  bio?: string;
}

/**
 * Outward-facing faculty shape. The password field is ALWAYS omitted
 * (Requirements 5.3, 8.1) along with all credential/setup-token material.
 */
export interface FacultyResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department: string;
  title: string;
  isAdmin: boolean;
  role: 'faculty' | 'admin';
  active: boolean;
  createdAt: Date;
  deletedAt?: Date | null;
}

/**
 * Result of a faculty account-creation request. The plaintext temporary
 * password is present ONLY for the `temporary_password` method and is revealed
 * exactly once (Requirement 8.2); `setupLinkSent` is true for the `setup_link`
 * method.
 */
export interface CreateFacultyAccountResult {
  account: FacultyResponse;
  temporaryPassword?: string;
  setupLinkSent?: boolean;
}

/**
 * Map a persisted Faculty document to the outward-facing response shape,
 * excluding the password and any setup-token material.
 */
function toFacultyResponse(faculty: IFaculty): FacultyResponse {
  return {
    _id: String(faculty._id),
    firstName: faculty.firstName,
    lastName: faculty.lastName,
    email: faculty.email,
    employeeId: faculty.employeeId,
    department: faculty.department,
    title: faculty.title,
    isAdmin: faculty.isAdmin,
    role: faculty.role,
    active: faculty.active,
    createdAt: faculty.createdAt,
    deletedAt: faculty.deletedAt ?? null,
  };
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
   * List Faculty_Accounts for the admin management surface with search,
   * filtering, and pagination, mapping every entry to the outward-facing
   * {@link FacultyResponse} shape so the password is never exposed.
   *
   * Validation (each → HTTP 400 via {@link AppError.badRequest}):
   *  - A `grade` filter combined with a `department` filter is contradictory
   *    (`grade` is a student-only concept) and is rejected (Requirement 10.5).
   *  - A page size outside the inclusive 1..100 range is rejected (Requirement 10.7).
   *
   * Applied filters narrow the result set (Requirements 10.2–10.4):
   *  - `search` matches the first name, last name, or email (case-insensitive).
   *  - `active` matches the `active` flag exactly.
   *  - `department` matches the department exactly.
   *
   * The response includes `meta` with the total count and current page
   * (Requirement 10.6), and excludes the password from every entry (Requirement 10.1).
   *
   * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
   */
  async list(
    filters: FacultyFilters,
    pagination: Pagination,
  ): Promise<PaginatedResult<FacultyResponse>> {
    // Conflicting filters → 400. `grade` is invalid for faculty, so its
    // presence alongside `department` is the contradiction to reject.
    if (filters.grade !== undefined && filters.department !== undefined) {
      throw AppError.badRequest(
        'The `grade` and `department` filters cannot be combined',
      );
    }

    // Page-size bounds → 400 when outside the inclusive 1..100 range.
    if (pagination.limit < 1 || pagination.limit > 100) {
      throw AppError.badRequest('Page size must be between 1 and 100');
    }

    const query: QueryFilter<IFaculty> = {};

    if (filters.department !== undefined) {
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
      // Map to the outward-facing shape so the password is excluded from every
      // entry (Requirement 10.1).
      data: data.map(toFacultyResponse),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /**
   * Admin-driven creation of a Faculty_Account with credentials.
   *
   * Enforces email + employeeId uniqueness (409), prepares credentials via the
   * chosen delivery method, persists the account active (the model pre-save
   * hook hashes the password), and writes a success audit entry.
   *
   * Without administrative privileges the account is created with
   * `isAdmin: false` and `role: 'faculty'` (Requirement 5.8). When an
   * admin-privileged caller requests `isAdmin: true`, the model pre-save hook
   * promotes `role` to `'admin'`.
   *
   * Delivery-method behavior:
   *  - `admin_set`          → persists the admin-provided password.
   *  - `temporary_password` → returns the generated plaintext exactly once.
   *  - `setup_link`         → sends the email BEFORE committing a usable
   *                           credential; a transport failure maps to 502 and
   *                           the account is not created.
   *
   * A bcrypt hashing failure during persistence maps to 500 and the account is
   * not persisted.
   *
   * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8, 8.1, 8.2, 8.3, 8.4, 11.1
   */
  async createWithCredentials(
    input: CreateFacultyInput,
    ctx: AuditContext,
  ): Promise<CreateFacultyAccountResult> {
    // Uniqueness checks → 409 (no duplicate account is created).
    const [emailConflict, employeeIdConflict] = await Promise.all([
      facultyRepository.findByEmail(input.email),
      facultyRepository.findByEmployeeId(input.employeeId),
    ]);
    if (emailConflict) {
      throw new AppError(
        409,
        'CONFLICT',
        `A faculty member with email ${input.email} already exists`,
      );
    }
    if (employeeIdConflict) {
      throw new AppError(
        409,
        'CONFLICT',
        `A faculty member with employee ID ${input.employeeId} already exists`,
      );
    }

    // Prepare credentials per the chosen delivery method.
    const credential = credentialService.prepareCredential(
      input.credentialDeliveryMethod,
      input.password,
    );

    // For setup_link, send the email BEFORE committing a usable credential so
    // a transport failure (502) never leaves the account in a usable state.
    let setupLinkSent: boolean | undefined;
    if (input.credentialDeliveryMethod === 'setup_link') {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const setupUrl = `${baseUrl}/account-setup/${credential.setupTokenRaw}`;
      try {
        await emailService.sendSetupLink(
          input.email,
          setupUrl,
          `${input.firstName} ${input.lastName}`,
        );
      } catch {
        // Transport unavailable → 502; the account is not created.
        throw new AppError(
          502,
          'EMAIL_UNAVAILABLE',
          'The email service is currently unavailable; the account was not created',
        );
      }
      setupLinkSent = true;
    }

    // For setup_link there is no usable password yet; persist an unguessable
    // random secret (never returned) so the model password requirement is met
    // while the only path to a credential is consuming the setup token.
    const passwordToPersist =
      credential.passwordToPersist ?? credentialService.generateTemporaryPassword();

    let created: IFaculty;
    try {
      created = await facultyRepository.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        employeeId: input.employeeId,
        department: input.department,
        title: input.title,
        phone: input.phone,
        bio: input.bio,
        password: passwordToPersist,
        active: true,
        // Without admin privileges the account is a plain faculty member
        // (Requirement 5.8); the model pre-save hook promotes role → 'admin'
        // when isAdmin is true.
        isAdmin: input.isAdmin === true,
        role: input.isAdmin === true ? 'admin' : 'faculty',
        setupTokenHash: credential.setupTokenHash,
        setupTokenExpiresAt: credential.setupTokenExpiresAt,
      });
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      // bcrypt hashing failure in the pre-save hook (or other persistence
      // failure) → 500; nothing is persisted.
      throw AppError.internal('Failed to create the faculty account');
    }

    // Success audit entry (metadata passes through the redaction guard so no
    // secret can ever be written).
    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'account_created',
      resource: 'Faculty',
      resourceId: String(created._id),
      correlationId: ctx.correlationId,
      metadata: redactSecrets({
        credentialDeliveryMethod: input.credentialDeliveryMethod,
      }),
    });

    const result: CreateFacultyAccountResult = { account: toFacultyResponse(created) };
    if (credential.temporaryPasswordForResponse) {
      // Revealed exactly once in the creation response (Requirement 8.2).
      result.temporaryPassword = credential.temporaryPasswordForResponse;
    }
    if (setupLinkSent) {
      result.setupLinkSent = true;
    }
    return result;
  }

  /**
   * Admin-driven update of a Faculty_Account profile.
   *
   * Returns 404 when the account does not exist, enforces email uniqueness
   * within the Faculty collection (409) when the email changes, applies the
   * patch, and writes a success audit entry. The password field is never
   * included in the returned shape. Privilege fields (`role`, `isAdmin`) are
   * admin-only and handled at the route layer, so they are not part of the
   * accepted patch shape.
   *
   * @see Requirements 6.1, 6.2, 6.3, 6.4, 11.1
   */
  async updateAccount(
    id: string,
    patch: UpdateFacultyInput,
    ctx: AuditContext,
  ): Promise<FacultyResponse> {
    const existing = await facultyRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Faculty with id ${id} not found`);
    }

    // Email uniqueness within Faculty (409) — only when the email is changing.
    if (patch.email && patch.email !== existing.email) {
      const emailConflict = await facultyRepository.findByEmail(patch.email);
      if (emailConflict && String(emailConflict._id) !== id) {
        throw new AppError(
          409,
          'CONFLICT',
          `A faculty member with email ${patch.email} already exists`,
        );
      }
    }

    const updated = await facultyRepository.update(id, patch as Partial<IFaculty>);
    if (!updated) {
      throw AppError.notFound(`Faculty with id ${id} not found`);
    }

    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'account_updated',
      resource: 'Faculty',
      resourceId: id,
      correlationId: ctx.correlationId,
      metadata: redactSecrets({ updatedFields: Object.keys(patch) }),
    });

    return toFacultyResponse(updated);
  }

  /**
   * Soft-delete (deactivate) a Faculty_Account.
   *
   * Idempotent: sets `active:false` and records `deletedAt:now`, retaining the
   * record. Returns 404 only when the account never existed; deactivating an
   * already-deactivated account succeeds without error. Writes a success audit
   * entry.
   *
   * @see Requirements 7.1, 11.1
   */
  async deactivate(id: string, ctx: AuditContext): Promise<void> {
    // Use the include-deleted lookup so a repeat call on an already
    // soft-deleted record remains idempotent rather than reporting 404.
    const existing = await facultyRepository.findByIdIncludingDeleted(id);
    if (!existing) {
      throw AppError.notFound(`Faculty with id ${id} not found`);
    }

    await Faculty.findByIdAndUpdate(id, {
      $set: { active: false, deletedAt: new Date() },
    }).exec();

    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'account_deactivated',
      resource: 'Faculty',
      resourceId: id,
      correlationId: ctx.correlationId,
      metadata: redactSecrets({}),
    });
  }

  /**
   * Reactivate a previously deactivated Faculty_Account.
   *
   * Sets `active:true` and clears `deletedAt`, removing the deactivation-based
   * authentication block. Returns 404 when the account never existed. Writes a
   * success audit entry.
   *
   * @see Requirements 7.2, 7.4, 11.1
   */
  async reactivate(id: string, ctx: AuditContext): Promise<FacultyResponse> {
    const existing = await facultyRepository.findByIdIncludingDeleted(id);
    if (!existing) {
      throw AppError.notFound(`Faculty with id ${id} not found`);
    }

    const updated = await Faculty.findByIdAndUpdate(
      id,
      { $set: { active: true, deletedAt: null } },
      { returnDocument: 'after' },
    )
      .lean()
      .exec();

    if (!updated) {
      throw AppError.notFound(`Faculty with id ${id} not found`);
    }

    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'account_reactivated',
      resource: 'Faculty',
      resourceId: id,
      correlationId: ctx.correlationId,
      metadata: redactSecrets({}),
    });

    return toFacultyResponse(updated as IFaculty);
  }

  /**
   * Admin-initiated password reset for an existing Faculty_Account.
   *
   * Generates a fresh credential per the chosen delivery method, revokes every
   * active refresh token for the account (so existing sessions can no longer be
   * refreshed), and writes a `password_change` audit entry that never carries a
   * password value. Returns 404 when the account does not exist.
   *
   * Delivery-method behavior:
   *  - `admin_set`          → persists the admin-provided password (>= 8 chars).
   *  - `temporary_password` → persists the new password and returns the
   *                           plaintext exactly once (Requirement 9.1).
   *  - `setup_link`         → sends the email BEFORE persisting the new setup
   *                           token; a transport failure maps to 502 and the
   *                           stored password is left unchanged (Requirement 9.2).
   *
   * No password data is ever returned except the deliberate one-time temporary
   * password (Requirement 9.5).
   *
   * @see Requirements 9.1, 9.2, 9.3, 9.5, 11.2
   */
  async resetPassword(
    id: string,
    method: CredentialDeliveryMethod,
    ctx: AuditContext,
    adminProvidedPassword?: string,
  ): Promise<ResetResult> {
    // 404 when the account does not exist. A direct model lookup returns a live
    // Mongoose document (savable, triggers the pre-save bcrypt hook) and is not
    // soft-delete filtered, so a reset on a deactivated account still resolves.
    const existing = await Faculty.findById(id).exec();
    if (!existing) {
      throw AppError.notFound(`Faculty with id ${id} not found`);
    }

    // Prepare the new credential per the chosen delivery method.
    const credential = credentialService.prepareCredential(method, adminProvidedPassword);

    // For setup_link, send the email BEFORE persisting the new token so a
    // transport failure (502) leaves the stored password unchanged.
    let setupLinkSent: boolean | undefined;
    if (method === 'setup_link') {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const setupUrl = `${baseUrl}/account-setup/${credential.setupTokenRaw}`;
      try {
        await emailService.sendSetupLink(
          existing.email,
          setupUrl,
          `${existing.firstName} ${existing.lastName}`,
        );
      } catch {
        throw new AppError(
          502,
          'EMAIL_UNAVAILABLE',
          'The email service is currently unavailable; the password was not reset',
        );
      }
      setupLinkSent = true;
    }

    // Apply the credential change. For setup_link the password is left intact
    // and a fresh single-use setup token is stored; the account holder sets the
    // new password by consuming the token.
    if (method === 'setup_link') {
      existing.setupTokenHash = credential.setupTokenHash;
      existing.setupTokenExpiresAt = credential.setupTokenExpiresAt;
      existing.setupTokenUsedAt = undefined;
    } else if (credential.passwordToPersist) {
      // Assigning the plaintext triggers the model pre-save bcrypt hook.
      existing.password = credential.passwordToPersist;
    }
    await existing.save();

    // Revoke every active refresh token so existing sessions cannot refresh.
    await authTokenService.revokeTokenFamily(id);

    // Password-change audit entry — never carries any password value.
    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'password_change',
      resource: 'Faculty',
      resourceId: id,
      correlationId: ctx.correlationId,
      metadata: redactSecrets({ credentialDeliveryMethod: method }),
    });

    const result: ResetResult = {};
    if (credential.temporaryPasswordForResponse) {
      // Revealed exactly once in the reset response (Requirement 9.1).
      result.temporaryPassword = credential.temporaryPasswordForResponse;
    }
    if (setupLinkSent) {
      result.setupLinkSent = true;
    }
    return result;
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
