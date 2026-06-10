import type { QueryFilter } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { BaseRepository } from '../repositories/baseRepository.js';
import Student from '../models/Student.js';
import type { IStudent } from '../models/Student.js';
import type { Pagination, PaginatedResult, UserRole } from '../types/common.js';
import { credentialService } from './credentialService.js';
import type { CredentialDeliveryMethod } from './credentialService.js';
import { emailService } from './emailService.js';
import { authTokenService } from './authTokenService.js';
import { auditService } from './auditService.js';
import { redactSecrets } from '../utils/auditContext.js';
import type { AuditContext } from '../utils/auditContext.js';

export interface StudentFilters {
  grade?: string;
  active?: boolean;
  search?: string;
  /**
   * The `department` filter is invalid for students; its presence alongside a
   * `grade` filter is the conflicting combination rejected with HTTP 400
   * (Requirement 10.5). It is accepted here only so the conflict can be
   * detected and rejected in {@link StudentService.list}.
   */
  department?: string;
}

/**
 * Admin-supplied fields for creating a Student_Account with credentials.
 * `password` is only meaningful for the `admin_set` delivery method.
 */
export interface CreateStudentInput {
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  grade: string;
  credentialDeliveryMethod: CredentialDeliveryMethod;
  password?: string;
  dateOfBirth?: Date;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  address?: string;
}

/**
 * Admin-supplied fields for updating a Student_Account profile.
 *
 * Credential material (password) and immutable identifiers (`studentId`) are
 * intentionally excluded; password changes flow through the reset path and the
 * task scopes update uniqueness to `email` only.
 */
export interface UpdateStudentInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  grade?: string;
  dateOfBirth?: Date;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  address?: string;
}

/**
 * Outward-facing student shape. The password field is ALWAYS omitted
 * (Requirements 4.3, 8.1) along with all credential/setup-token material.
 */
export interface StudentResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  grade: string;
  active: boolean;
  createdAt: Date;
  deletedAt?: Date | null;
}

/**
 * Result of an account-creation request. The plaintext temporary password is
 * present ONLY for the `temporary_password` method and is revealed exactly once
 * (Requirement 8.2); `setupLinkSent` is true for the `setup_link` method.
 */
export interface CreateAccountResult {
  account: StudentResponse;
  temporaryPassword?: string;
  setupLinkSent?: boolean;
}

/**
 * Result of an admin-initiated password reset. The plaintext temporary
 * password is present ONLY for the `temporary_password` method and is revealed
 * exactly once (Requirement 9.1); `setupLinkSent` is true for the `setup_link`
 * method (Requirement 9.2). No password data is ever returned for any other
 * method (Requirement 9.5).
 */
export interface ResetResult {
  temporaryPassword?: string;
  setupLinkSent?: boolean;
}

/**
 * Map a persisted Student document to the outward-facing response shape,
 * excluding the password and any setup-token material.
 */
function toStudentResponse(student: IStudent): StudentResponse {
  return {
    _id: String(student._id),
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    studentId: student.studentId,
    grade: student.grade,
    active: student.active,
    createdAt: student.createdAt,
    deletedAt: student.deletedAt ?? null,
  };
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
   * List Student_Accounts for the admin management surface with search,
   * filtering, and pagination, mapping every entry to the outward-facing
   * {@link StudentResponse} shape so the password is never exposed.
   *
   * Validation (each → HTTP 400 via {@link AppError.badRequest}):
   *  - A `grade` filter combined with a `department` filter is contradictory
   *    (`department` is a faculty-only concept) and is rejected (Requirement 10.5).
   *  - A page size outside the inclusive 1..100 range is rejected (Requirement 10.7).
   *
   * Applied filters narrow the result set (Requirements 10.2–10.4):
   *  - `search` matches the first name, last name, or email (case-insensitive).
   *  - `active` matches the `active` flag exactly.
   *  - `grade` matches the grade exactly.
   *
   * The response includes `meta` with the total count and current page
   * (Requirement 10.6), and excludes the password from every entry (Requirement 10.1).
   *
   * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
   */
  async list(
    filters: StudentFilters,
    pagination: Pagination,
  ): Promise<PaginatedResult<StudentResponse>> {
    // Conflicting filters → 400. `department` is invalid for students, so its
    // presence alongside `grade` is the contradiction to reject.
    if (filters.grade !== undefined && filters.department !== undefined) {
      throw AppError.badRequest(
        'The `grade` and `department` filters cannot be combined',
      );
    }

    // Page-size bounds → 400 when outside the inclusive 1..100 range.
    if (pagination.limit < 1 || pagination.limit > 100) {
      throw AppError.badRequest('Page size must be between 1 and 100');
    }

    const query: QueryFilter<IStudent> = {};

    if (filters.grade !== undefined) {
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
      // Map to the outward-facing shape so the password is excluded from every
      // entry (Requirement 10.1).
      data: data.map(toStudentResponse),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /**
   * Admin-driven creation of a Student_Account with credentials.
   *
   * Enforces email + studentId uniqueness (409), prepares credentials via the
   * chosen delivery method, persists the account active (the model pre-save
   * hook hashes the password), and writes a success audit entry.
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
   * @see Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 5.7, 8.1, 8.2, 8.3, 8.4, 11.1
   */
  async createWithCredentials(
    input: CreateStudentInput,
    ctx: AuditContext,
  ): Promise<CreateAccountResult> {
    // Uniqueness checks → 409 (no duplicate account is created).
    const [emailConflict, studentIdConflict] = await Promise.all([
      studentRepository.findByEmail(input.email),
      studentRepository.findByStudentId(input.studentId),
    ]);
    if (emailConflict) {
      throw new AppError(409, 'CONFLICT', `A student with email ${input.email} already exists`);
    }
    if (studentIdConflict) {
      throw new AppError(
        409,
        'CONFLICT',
        `A student with ID ${input.studentId} already exists`,
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

    let created: IStudent;
    try {
      created = await studentRepository.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        studentId: input.studentId,
        grade: input.grade,
        password: passwordToPersist,
        active: true,
        setupTokenHash: credential.setupTokenHash,
        setupTokenExpiresAt: credential.setupTokenExpiresAt,
        dateOfBirth: input.dateOfBirth,
        parentName: input.parentName,
        parentEmail: input.parentEmail,
        parentPhone: input.parentPhone,
        address: input.address,
      });
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      // bcrypt hashing failure in the pre-save hook (or other persistence
      // failure) → 500; nothing is persisted.
      throw AppError.internal('Failed to create the student account');
    }

    // Success audit entry (metadata passes through the redaction guard so no
    // secret can ever be written).
    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'account_created',
      resource: 'Student',
      resourceId: String(created._id),
      correlationId: ctx.correlationId,
      metadata: redactSecrets({
        credentialDeliveryMethod: input.credentialDeliveryMethod,
      }),
    });

    const result: CreateAccountResult = { account: toStudentResponse(created) };
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
   * Admin-driven update of a Student_Account profile.
   *
   * Returns 404 when the account does not exist, enforces email uniqueness
   * within the Student collection (409) when the email changes, applies the
   * patch, and writes a success audit entry. The password field is never
   * included in the returned shape.
   *
   * @see Requirements 6.1, 6.2, 6.3, 6.4, 11.1
   */
  async updateAccount(
    id: string,
    patch: UpdateStudentInput,
    ctx: AuditContext,
  ): Promise<StudentResponse> {
    const existing = await studentRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Student with id ${id} not found`);
    }

    // Email uniqueness within Student (409) — only when the email is changing.
    if (patch.email && patch.email !== existing.email) {
      const emailConflict = await studentRepository.findByEmail(patch.email);
      if (emailConflict && String(emailConflict._id) !== id) {
        throw new AppError(
          409,
          'CONFLICT',
          `A student with email ${patch.email} already exists`,
        );
      }
    }

    const updated = await studentRepository.update(id, patch as Partial<IStudent>);
    if (!updated) {
      throw AppError.notFound(`Student with id ${id} not found`);
    }

    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'account_updated',
      resource: 'Student',
      resourceId: id,
      correlationId: ctx.correlationId,
      metadata: redactSecrets({ updatedFields: Object.keys(patch) }),
    });

    return toStudentResponse(updated);
  }

  /**
   * Soft-delete (deactivate) a Student_Account.
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
    const existing = await studentRepository.findByIdIncludingDeleted(id);
    if (!existing) {
      throw AppError.notFound(`Student with id ${id} not found`);
    }

    await Student.findByIdAndUpdate(id, {
      $set: { active: false, deletedAt: new Date() },
    }).exec();

    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'account_deactivated',
      resource: 'Student',
      resourceId: id,
      correlationId: ctx.correlationId,
      metadata: redactSecrets({}),
    });
  }

  /**
   * Reactivate a previously deactivated Student_Account.
   *
   * Sets `active:true` and clears `deletedAt`, removing the deactivation-based
   * authentication block. Returns 404 when the account never existed. Writes a
   * success audit entry.
   *
   * @see Requirements 7.2, 7.4, 11.1
   */
  async reactivate(id: string, ctx: AuditContext): Promise<StudentResponse> {
    const existing = await studentRepository.findByIdIncludingDeleted(id);
    if (!existing) {
      throw AppError.notFound(`Student with id ${id} not found`);
    }

    const updated = await Student.findByIdAndUpdate(
      id,
      { $set: { active: true, deletedAt: null } },
      { returnDocument: 'after' },
    )
      .lean()
      .exec();

    if (!updated) {
      throw AppError.notFound(`Student with id ${id} not found`);
    }

    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'account_reactivated',
      resource: 'Student',
      resourceId: id,
      correlationId: ctx.correlationId,
      metadata: redactSecrets({}),
    });

    return toStudentResponse(updated as IStudent);
  }

  /**
   * Admin-initiated password reset for an existing Student_Account.
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
    const existing = await Student.findById(id).exec();
    if (!existing) {
      throw AppError.notFound(`Student with id ${id} not found`);
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
      resource: 'Student',
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
