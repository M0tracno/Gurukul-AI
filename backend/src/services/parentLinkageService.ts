import { AppError } from '../middleware/errorHandler.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import type { IParentStudentRelation } from '../models/ParentStudentRelation.js';
import type { UserRole } from '../types/common.js';
import { normalizePhone } from '../utils/phone.js';
import { auditService } from './auditService.js';
import { redactSecrets } from '../utils/auditContext.js';
import type { AuditContext } from '../utils/auditContext.js';

/**
 * Outward-facing parent-child linkage shape (non-persisted).
 *
 * Phone exposure is role-gated (Requirement 7.5): admin viewers receive the
 * full `linkagePhone`, while non-admin viewers receive only a `maskedPhone`
 * (e.g. `•••• ••1234`) and never the full value.
 */
export interface LinkageDTO {
  _id: string;
  parentId: string;
  studentId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Full canonical phone — present ONLY for admin viewers (Req 7.5). */
  linkagePhone?: string;
  /** Masked phone — present for non-admin viewers (Req 7.5). */
  maskedPhone?: string;
}

/**
 * Mask a canonical phone for non-admin viewers, revealing only the final four
 * digits (Requirement 7.5). Produces the design's `•••• ••1234` style.
 */
function maskPhone(phone: string): string {
  const last4 = phone.slice(-4);
  return `•••• ••${last4}`;
}

/**
 * Map a persisted linkage to the outward-facing {@link LinkageDTO}, gating the
 * phone exposure on the viewer's role (Requirement 7.5).
 */
function toLinkageDTO(
  relation: IParentStudentRelation,
  viewerRole: UserRole,
): LinkageDTO {
  const dto: LinkageDTO = {
    _id: String(relation._id),
    parentId: String(relation.parentId),
    studentId: String(relation.studentId),
    isActive: relation.isActive,
    createdAt: relation.createdAt,
    updatedAt: relation.updatedAt,
  };

  if (viewerRole === 'admin') {
    dto.linkagePhone = relation.linkagePhone;
  } else {
    dto.maskedPhone = maskPhone(relation.linkagePhone);
  }

  return dto;
}

/**
 * Parent-child linkage service — admin-only business logic layer (Requirement 7).
 *
 * Never references HTTP Request/Response objects; controllers build an
 * {@link AuditContext} and forward it here. RBAC (`admin` role, Req 7.4) is
 * enforced at the route layer per the design.
 */
export class ParentLinkageService {
  /**
   * Establish a Parent_Child_Linkage between a Parent and a specific Student.
   *
   * The supplied phone is stored in canonical form via {@link normalizePhone}
   * (Requirement 7.1). The operation is idempotent on `(studentId, normalized
   * phone)` (Requirement 7.3): if an active linkage already exists for that
   * pair, the existing record is returned and no duplicate is created.
   *
   * @see Requirements 7.1, 7.3
   */
  async link(
    parentId: string,
    studentId: string,
    phone: string,
    ctx: AuditContext,
  ): Promise<LinkageDTO> {
    const linkagePhone = normalizePhone(phone);

    // Idempotency on (studentId, normalized phone): reuse any active linkage
    // for the pair rather than creating a duplicate (Req 7.3).
    const existing = await ParentStudentRelation.findOne({
      studentId,
      linkagePhone,
      isActive: true,
    }).exec();

    if (existing) {
      return toLinkageDTO(existing, 'admin');
    }

    const created = await ParentStudentRelation.create({
      parentId,
      studentId,
      linkagePhone,
      isActive: true,
    });

    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'account_created',
      resource: 'ParentStudentRelation',
      resourceId: String(created._id),
      correlationId: ctx.correlationId,
      // Phone is sensitive; only the masked value is recorded.
      metadata: redactSecrets({ studentId, parentId, maskedPhone: maskPhone(linkagePhone) }),
    });

    return toLinkageDTO(created, 'admin');
  }

  /**
   * Deactivate a Parent_Child_Linkage by id.
   *
   * Sets `isActive=false` so subsequent OTP_Requests for the `(student id,
   * phone)` pair are treated as non-matching (Requirement 7.2). Idempotent:
   * deactivating an already-inactive linkage succeeds. Returns 404 only when
   * the linkage never existed.
   *
   * @see Requirement 7.2
   */
  async unlink(relationId: string, ctx: AuditContext): Promise<void> {
    const existing = await ParentStudentRelation.findById(relationId).exec();
    if (!existing) {
      throw AppError.notFound(`Linkage with id ${relationId} not found`);
    }

    existing.isActive = false;
    await existing.save();

    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'account_deactivated',
      resource: 'ParentStudentRelation',
      resourceId: relationId,
      correlationId: ctx.correlationId,
      metadata: redactSecrets({
        studentId: String(existing.studentId),
        parentId: String(existing.parentId),
      }),
    });
  }

  /**
   * List the linkages for a given student.
   *
   * Full `linkagePhone` values are restricted to the `admin` role; non-admin
   * viewers receive a `maskedPhone` only and never the full value
   * (Requirement 7.5).
   *
   * @see Requirement 7.5
   */
  async listForStudent(
    studentId: string,
    viewerRole: UserRole,
  ): Promise<LinkageDTO[]> {
    const relations = await ParentStudentRelation.find({ studentId })
      .sort({ createdAt: -1 })
      .exec();

    return relations.map((relation) => toLinkageDTO(relation, viewerRole));
  }
}

export const parentLinkageService = new ParentLinkageService();
