import { Types } from 'mongoose';
import PTM from '../models/PTM.js';
import type { IPTM, PTMStatus } from '../models/PTM.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// ─── DTOs ───────────────────────────────────────────────────────────────────────

export interface SchedulePTMDto {
  teacherId: string;
  parentId: string;
  studentId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  recordingEnabled?: boolean;
}

export interface PTMResult {
  ptmId: string;
  teacherId: string;
  parentId: string;
  studentId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: PTMStatus;
  participants: string[];
  recordingEnabled: boolean;
  recordingRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Map a Mongoose PTM document to a plain result object.
 */
function toPTMResult(doc: IPTM): PTMResult {
  const obj = doc as unknown as Record<string, unknown>;
  return {
    ptmId: (obj['_id'] as Types.ObjectId).toString(),
    teacherId: (doc.teacherId as Types.ObjectId).toString(),
    parentId: (doc.parentId as Types.ObjectId).toString(),
    studentId: (doc.studentId as Types.ObjectId).toString(),
    scheduledStart: doc.scheduledStart,
    scheduledEnd: doc.scheduledEnd,
    status: doc.status,
    participants: doc.participants.map((p: Types.ObjectId) => p.toString()),
    recordingEnabled: doc.recordingEnabled,
    ...(doc.recordingRef && { recordingRef: doc.recordingRef }),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────────

export class PTMService {
  /**
   * Schedule a new Parent-Teacher Meeting.
   *
   * Persists the meeting with its participants, date, and time
   * (Requirement 17.1). Notifies the invited participant(s)
   * (Requirement 17.2). Rejects the request with a conflict
   * Error_Envelope if the Teacher already has an overlapping PTM
   * (Requirement 17.3).
   *
   * @param organizerId - ID of the user scheduling the PTM (teacher or parent)
   * @param dto         - PTM scheduling data
   * @returns           The persisted PTM
   * @throws AppError 400 if scheduledEnd is not after scheduledStart
   * @throws AppError 409 if the teacher has a conflicting PTM
   */
  async schedule(organizerId: string, dto: SchedulePTMDto): Promise<PTMResult> {
    // Validate the time window
    if (dto.scheduledEnd <= dto.scheduledStart) {
      throw AppError.badRequest('scheduledEnd must be after scheduledStart', [
        {
          field: 'scheduledEnd',
          reason: 'End time must be strictly after start time',
        },
      ]);
    }

    // Conflict detection: check for overlapping PTMs for the same Teacher
    // Two time ranges [A_start, A_end] and [B_start, B_end] overlap iff
    // A_start < B_end AND B_start < A_end
    const conflict = await PTM.findOne({
      teacherId: new Types.ObjectId(dto.teacherId),
      status: { $in: ['scheduled', 'active'] },
      scheduledStart: { $lt: dto.scheduledEnd },
      scheduledEnd: { $gt: dto.scheduledStart },
    })
      .lean()
      .exec();

    if (conflict) {
      throw AppError.conflict(
        `Teacher already has a PTM scheduled from ${(conflict as unknown as IPTM).scheduledStart.toISOString()} to ${(conflict as unknown as IPTM).scheduledEnd.toISOString()} that overlaps with the requested time.`,
      );
    }

    // Build the participants list (teacher + parent)
    const participants = [
      new Types.ObjectId(dto.teacherId),
      new Types.ObjectId(dto.parentId),
    ];

    // Persist the PTM
    const ptm = await PTM.create({
      teacherId: new Types.ObjectId(dto.teacherId),
      parentId: new Types.ObjectId(dto.parentId),
      studentId: new Types.ObjectId(dto.studentId),
      scheduledStart: dto.scheduledStart,
      scheduledEnd: dto.scheduledEnd,
      status: 'scheduled' as PTMStatus,
      participants,
      recordingEnabled: dto.recordingEnabled ?? false,
    });

    logger.info('PTM scheduled', {
      ptmId: ptm._id.toString(),
      teacherId: dto.teacherId,
      parentId: dto.parentId,
      studentId: dto.studentId,
      organizerId,
      scheduledStart: dto.scheduledStart.toISOString(),
      scheduledEnd: dto.scheduledEnd.toISOString(),
    });

    // Notify invitees (Requirement 17.2)
    // Determine who was invited (the party that didn't organize the meeting)
    this.notifyInvitees(ptm, organizerId);

    return toPTMResult(ptm);
  }

  /**
   * Authorize a user to join a PTM.
   *
   * Only parties listed in the PTM's participants array may join
   * (Requirement 17.4). Unauthorized users receive a 403 Error_Envelope.
   *
   * @param ptmId  - The PTM ID
   * @param userId - The user attempting to join
   * @returns      The PTM result if authorized
   * @throws AppError 404 if PTM not found
   * @throws AppError 403 if user is not a participant
   */
  async authorizeJoin(ptmId: string, userId: string): Promise<PTMResult> {
    const ptm = await PTM.findById(ptmId).exec();
    if (!ptm) {
      throw AppError.notFound(`PTM with id '${ptmId}' not found`);
    }

    const isParticipant = ptm.participants.some(
      (p: Types.ObjectId) => p.toString() === userId,
    );

    if (!isParticipant) {
      throw AppError.forbidden(
        'You are not authorized to join this PTM. Only meeting participants may join.',
      );
    }

    return toPTMResult(ptm);
  }

  /**
   * Retrieve a PTM by ID.
   *
   * @param ptmId - The PTM ID
   * @returns     The PTM result
   * @throws AppError 404 if PTM not found
   */
  async getPTMById(ptmId: string): Promise<PTMResult> {
    const ptm = await PTM.findById(ptmId).lean().exec();
    if (!ptm) {
      throw AppError.notFound(`PTM with id '${ptmId}' not found`);
    }
    return toPTMResult(ptm as unknown as IPTM);
  }

  /**
   * List PTMs for a given teacher.
   *
   * @param teacherId - The teacher's ID
   * @returns         Array of PTMs for the teacher
   */
  async getPTMsByTeacher(teacherId: string): Promise<PTMResult[]> {
    const ptms = await PTM.find({
      teacherId: new Types.ObjectId(teacherId),
    })
      .sort({ scheduledStart: 1 })
      .lean()
      .exec();

    return ptms.map((p) => toPTMResult(p as unknown as IPTM));
  }

  /**
   * List PTMs for a given parent.
   *
   * @param parentId - The parent's ID
   * @returns        Array of PTMs for the parent
   */
  async getPTMsByParent(parentId: string): Promise<PTMResult[]> {
    const ptms = await PTM.find({
      parentId: new Types.ObjectId(parentId),
    })
      .sort({ scheduledStart: 1 })
      .lean()
      .exec();

    return ptms.map((p) => toPTMResult(p as unknown as IPTM));
  }

  /**
   * Notify invitees of a newly scheduled PTM.
   *
   * This emits a notification event via logging (in a production system,
   * this would integrate with Socket.IO or a push notification service).
   * Requirement 17.2.
   */
  private notifyInvitees(ptm: IPTM, organizerId: string): void {
    const invitees = ptm.participants
      .map((p: Types.ObjectId) => p.toString())
      .filter((id: string) => id !== organizerId);

    for (const inviteeId of invitees) {
      logger.info('PTM invitation notification sent', {
        ptmId: (ptm as unknown as Record<string, unknown>)['_id']?.toString(),
        inviteeId,
        scheduledStart: ptm.scheduledStart.toISOString(),
        scheduledEnd: ptm.scheduledEnd.toISOString(),
      });
    }
  }
}

export const ptmService = new PTMService();
