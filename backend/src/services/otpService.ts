/**
 * Verified parent OTP login service (Req 4, 5, 6).
 *
 * This HTTP-agnostic service owns the security-critical OTP lifecycle for the
 * parent login flow. A prospective parent submits a student ID and a phone
 * number; access proceeds only when that phone is stored and linked to that
 * specific student through an active {@link ParentStudentRelation}.
 *
 * Key guarantees implemented here:
 *
 *  - **Anti-enumeration (Req 4.3, 4.4):** `request` ALWAYS returns the same
 *    generic acknowledgement, whether or not the `(studentId, phone)` pair
 *    matched a linkage. No challenge is created and no SMS is sent on a
 *    non-match, and no caller-visible field reveals whether the student, phone,
 *    or linkage exists.
 *  - **Cryptographic OTP (Req 5.1):** codes are generated with
 *    `crypto.randomInt`, a cryptographically secure source.
 *  - **Hash-only storage (Req 5.2):** only a SHA-256 hash of the code is
 *    persisted; the plaintext is never stored, logged, or returned.
 *  - **Short-lived + single latest (Req 5.3, 5.6):** challenges expire 5 minutes
 *    after creation, and issuing a new challenge invalidates any prior
 *    unconsumed challenge for the same linkage.
 *  - **Resend throttling (Req 6.4, 6.5):** a minimum 60-second interval is
 *    enforced between successive deliveries to the same linkage; the service
 *    signals the throttle so the controller can respond 429.
 *  - **Hidden delivery failures (Req 4.5):** SMS failures are recorded
 *    server-side and never surfaced to the caller.
 *
 * Phone matching is formatting-invariant: both the submitted phone and the
 * stored `linkagePhone` are reduced to canonical form via {@link normalizePhone}
 * before comparison (Req 4.6).
 *
 * @see Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.6, 6.4, 6.5
 */

import crypto from 'node:crypto';
import mongoose from 'mongoose';

import OtpChallenge from '../models/OtpChallenge.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import type { IParentStudentRelation } from '../models/ParentStudentRelation.js';
import { AppError } from '../middleware/errorHandler.js';
import { normalizePhone } from '../utils/phone.js';
import { logger } from '../utils/logger.js';
import { redactSecrets } from '../utils/auditContext.js';
import { smsService, type ISmsTransport } from './smsService.js';
import { auditService, type IAuditService } from './auditService.js';
import { authTokenService, type AuthTokenService, type TokenPair } from './authTokenService.js';

/**
 * Centralized OTP parameters (Req 5.1, 5.3, 6.3, 6.4).
 *
 * Defaults match the requirements and are overridable via environment variables
 * so institutional policy can be tuned without code changes (resolved Open
 * Question 6). Values are resolved lazily per use so tests can adjust the
 * environment between cases.
 */
export const OTP_DIGITS = 6;

/** Exclusive upper bound for a `OTP_DIGITS`-digit code (e.g. 1_000_000 for 6). */
const OTP_RANDOM_UPPER_BOUND = 10 ** OTP_DIGITS;

/** Resend interval in milliseconds; default 60s, via `OTP_RESEND_INTERVAL_SECONDS`. */
export function getResendIntervalMs(): number {
  const seconds = Number(process.env.OTP_RESEND_INTERVAL_SECONDS);
  const resolved = Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
  return resolved * 1000;
}

/** Challenge time-to-live in milliseconds; default 5 min, via `OTP_EXPIRY_MINUTES`. */
export function getExpiryMs(): number {
  const minutes = Number(process.env.OTP_EXPIRY_MINUTES);
  const resolved = Number.isFinite(minutes) && minutes > 0 ? minutes : 5;
  return resolved * 60 * 1000;
}

/** Maximum incorrect verification attempts before invalidation; default 5. */
export function getMaxAttempts(): number {
  const attempts = Number(process.env.OTP_MAX_ATTEMPTS);
  return Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 5;
}

/**
 * Minimal request context forwarded from the controller.
 *
 * The OTP request endpoint is reached by an unauthenticated caller, so identity
 * fields are not assumed here; only the source IP and correlation id are
 * carried for server-side recording.
 */
export interface OtpRequestContext {
  ip: string;
  correlationId: string;
}

/**
 * The single, constant acknowledgement returned for every OTP request.
 *
 * The wording is deliberately neutral and identical for matches and non-matches
 * so the response body never reveals whether the student, phone, or linkage
 * exists (Req 4.3, 4.4).
 */
export interface GenericAck {
  success: true;
  message: string;
}

/**
 * Result of {@link OtpService.request}.
 *
 * `acknowledgement` is always the same generic value. `throttled` is an
 * internal signal (never leaked in the acknowledgement body) that lets the
 * controller respond 429 when a resend was requested inside the minimum
 * interval (Req 6.5) while keeping the acknowledgement message constant.
 */
export interface OtpRequestResult {
  acknowledgement: GenericAck;
  throttled: boolean;
}

/** The frozen generic acknowledgement value (Req 4.3, 4.4). */
const GENERIC_ACK: GenericAck = Object.freeze({
  success: true,
  message:
    'If the details match our records, a verification code has been sent to the registered phone number.',
});

/**
 * Hash an OTP code for storage. Only this hash is ever persisted (Req 5.2).
 *
 * SHA-256 is appropriate here because the input is a freshly generated,
 * high-entropy-per-attempt secret guarded by a strict attempt limit and short
 * expiry; the hash exists to avoid storing the plaintext, not to resist offline
 * cracking of a low-entropy user password.
 */
function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Generate a zero-padded numeric OTP using a cryptographically secure source
 * (Req 5.1). `crypto.randomInt` draws uniformly from `[0, upperBound)`; the
 * result is left-padded so it always has exactly `OTP_DIGITS` digits.
 */
function generateOtpCode(): string {
  const n = crypto.randomInt(0, OTP_RANDOM_UPPER_BOUND);
  return n.toString().padStart(OTP_DIGITS, '0');
}

export class OtpService {
  private readonly sms: ISmsTransport;
  private readonly tokens: AuthTokenService;
  private readonly audit: IAuditService;

  /**
   * @param sms - SMS transport used for delivery; defaults to the env-selected
   *   shared transport. Injectable so tests can supply an in-memory spy.
   * @param tokens - Token service used by {@link OtpService.verify} (task 5.2)
   *   to issue the parent session; injectable for testing.
   * @param audit - Audit sink used to record `otp_delivered` and
   *   `parent_otp_login` events; injectable so tests can assert emissions.
   */
  constructor(
    sms: ISmsTransport = smsService,
    tokens: AuthTokenService = authTokenService,
    audit: IAuditService = auditService,
  ) {
    this.sms = sms;
    this.tokens = tokens;
    this.audit = audit;
  }

  /**
   * Initiate the parent OTP login flow for a `(studentId, phone)` pair.
   *
   * Behavior:
   *  1. Normalize the submitted phone (Req 4.6).
   *  2. Resolve the student and look up an active linkage matching the
   *     normalized phone (Req 4.1).
   *  3. On NON-match: return the generic acknowledgement without creating a
   *     challenge or sending an SMS (Req 4.3, 4.4).
   *  4. On match: enforce the 60s resend interval (Req 6.4/6.5), invalidate any
   *     prior unconsumed challenge for the linkage (Req 5.6), generate + hash a
   *     6-digit code with a 5-minute expiry (Req 5.1, 5.2, 5.3), persist it,
   *     and dispatch it via the SMS transport — recording any delivery failure
   *     server-side without surfacing it (Req 4.5).
   *
   * ALWAYS resolves to the same generic acknowledgement regardless of outcome.
   *
   * @param studentId - The submitted student identifier (human-readable
   *   `Student.studentId` or a Mongo id string).
   * @param phone - The submitted phone number, in any formatting.
   * @param ctx - Source IP and correlation id for server-side recording.
   */
  async request(studentId: string, phone: string, ctx: OtpRequestContext): Promise<OtpRequestResult> {
    const normalizedPhone = normalizePhone(phone);

    const relation = await this.findActiveRelation(studentId, normalizedPhone);

    // Anti-enumeration: a non-match is indistinguishable from a match. No
    // challenge, no SMS, same acknowledgement (Req 4.3, 4.4).
    if (!relation) {
      return { acknowledgement: GENERIC_ACK, throttled: false };
    }

    // Resend throttle: if a challenge was issued for this linkage within the
    // minimum interval, do not dispatch another (Req 6.4, 6.5). Signal the
    // throttle for the controller while keeping the acknowledgement constant.
    const now = Date.now();
    const latest = await OtpChallenge.findOne({ relationId: relation._id })
      .sort({ lastSentAt: -1 })
      .select('+otpHash')
      .exec();

    if (
      latest &&
      !latest.consumedAt &&
      now - latest.lastSentAt.getTime() < getResendIntervalMs()
    ) {
      return { acknowledgement: GENERIC_ACK, throttled: true };
    }

    // Only the most recently issued OTP is valid per linkage: invalidate any
    // prior unconsumed challenges before creating the new one (Req 5.6).
    await OtpChallenge.updateMany(
      { relationId: relation._id, consumedAt: null },
      { $set: { consumedAt: new Date(now), expiresAt: new Date(now) } },
    );

    // Generate + hash a fresh code; persist only the hash (Req 5.1, 5.2).
    const code = generateOtpCode();
    const otpHash = hashOtp(code);
    const createdAt = new Date(now);
    const expiresAt = new Date(now + getExpiryMs());

    await OtpChallenge.create({
      relationId: relation._id,
      parentId: relation.parentId,
      studentId: relation.studentId,
      otpHash,
      expiresAt,
      attempts: 0,
      consumedAt: null,
      lastSentAt: createdAt,
    });

    // Dispatch the code. A delivery failure is recorded server-side and never
    // surfaced to the caller (Req 4.5). The OTP value is never logged.
    const delivered = await this.dispatchOtp(normalizedPhone, code, ctx);

    // On a confirmed delivery for a matched linkage, write an `otp_delivered`
    // audit entry recording ONLY the match-outcome category — never the OTP
    // value or the full linkage phone (Req 8.2).
    if (delivered) {
      await this.auditOtpDelivered(relation.parentId, relation.studentId, ctx);
    }

    return { acknowledgement: GENERIC_ACK, throttled: false };
  }

  /**
   * Verify a submitted OTP and, on success, issue a parent session.
   *
   * Verification is constant-bodied on every failure path: expired, consumed,
   * attempt-exhausted, and wrong-code outcomes all reject with the SAME generic
   * 401 message so the response never reveals remaining attempts or whether the
   * challenge exists (Req 6.2). Concretely:
   *
   *  1. Load the challenge by id WITH its (normally `select:false`) `otpHash`.
   *     A missing/unparseable challenge → 401.
   *  2. A consumed (single-use / superseded, Req 5.5) or expired (Req 5.4)
   *     challenge → 401 and issues no tokens.
   *  3. Once `attempts >= getMaxAttempts()` the challenge is invalid; it is
   *     hard-invalidated (consumed) so even a subsequently-correct code is
   *     rejected until a new code is requested (Req 6.3).
   *  4. A wrong code increments `attempts` (persisted) and, if that reaches the
   *     limit, invalidates the challenge; then rejects with the constant 401
   *     (Req 6.2).
   *  5. A correct code consumes the challenge (single-use, Req 5.5), issues a
   *     parent access/refresh token pair via {@link AuthTokenService.generateTokenPair}
   *     (Req 6.1), and audits the login via {@link OtpService.auditOtpLogin}
   *     (Req 8.1).
   *
   * @see Requirements 5.4, 5.5, 6.1, 6.2, 6.3
   */
  async verify(challengeId: string, code: string, ctx: OtpRequestContext): Promise<TokenPair> {
    // One constant rejection for EVERY failure path (Req 6.2): no field, status,
    // or message distinguishes expiry, exhaustion, a wrong code, or a missing
    // challenge, so the caller can never infer remaining attempts or existence.
    const reject = (): never => {
      throw AppError.unauthorized('Invalid or expired verification code.');
    };

    // An absent or unparseable id can never match a stored challenge; treat it
    // exactly like a verification failure.
    if (!challengeId || !mongoose.Types.ObjectId.isValid(challengeId)) {
      reject();
    }

    // Step 1: load the challenge WITH its otpHash (the field is `select:false`).
    const challenge = await OtpChallenge.findById(challengeId).select('+otpHash').exec();
    if (!challenge) {
      reject();
      return undefined as never;
    }

    const now = Date.now();

    // Step 2: a consumed (single-use / superseded, Req 5.5) or expired (Req 5.4)
    // challenge yields no tokens.
    if (challenge.consumedAt || challenge.expiresAt.getTime() <= now) {
      reject();
    }

    // Step 3: attempt limit already reached → the challenge is invalid. Persist
    // a hard invalidation so even a later correct code is rejected until a new
    // code is requested (Req 6.3).
    const maxAttempts = getMaxAttempts();
    if (challenge.attempts >= maxAttempts) {
      if (!challenge.consumedAt) {
        challenge.consumedAt = new Date(now);
        await challenge.save();
      }
      reject();
    }

    // Step 4: constant-body comparison. A freshly hashed candidate is compared
    // to the stored hash; the plaintext is never persisted (Req 5.2).
    const matches = code != null && challenge.otpHash === hashOtp(code);
    if (!matches) {
      challenge.attempts += 1;
      // Reaching the limit on this guess invalidates the challenge so subsequent
      // attempts — correct or not — are rejected until a new code (Req 6.3).
      if (challenge.attempts >= maxAttempts) {
        challenge.consumedAt = new Date(now);
      }
      await challenge.save();
      reject();
    }

    // Step 5: correct code. Consume the challenge first so it can never be
    // replayed (single-use, Req 5.5), then issue the parent session.
    challenge.consumedAt = new Date(now);
    await challenge.save();

    // Resolve the parent that owns this linkage to issue their session (Req 6.1).
    const parent = await Parent.findById(challenge.parentId).select('_id').lean().exec();
    if (!parent?._id) {
      reject();
    }
    const parentId = String(parent!._id);

    const tokenPair = await this.tokens.generateTokenPair(parentId, 'parent', 'Parent');

    // Record the successful authentication (Req 8.1). The OTP value is never
    // recorded; metadata is redacted as defense-in-depth.
    await this.auditOtpLogin(parentId, challenge.studentId, ctx);

    return tokenPair;
  }

  /**
   * Resolve an active linkage for the submitted student id and normalized phone.
   *
   * The submitted student id may be the human-readable `Student.studentId` or a
   * Mongo id string. Both resolution failures (no such student) and match
   * failures (no active linkage) return `null` so the caller produces the same
   * generic acknowledgement either way (anti-enumeration, Req 4.3).
   */
  private async findActiveRelation(
    studentId: string,
    normalizedPhone: string,
  ): Promise<IParentStudentRelation | null> {
    if (!normalizedPhone) {
      return null;
    }

    const studentObjectId = await this.resolveStudentObjectId(studentId);
    if (!studentObjectId) {
      return null;
    }

    return ParentStudentRelation.findOne({
      studentId: studentObjectId,
      linkagePhone: normalizedPhone,
      isActive: true,
    }).exec();
  }

  /**
   * Map a submitted student identifier to its `Student._id`.
   *
   * Tries the human-readable `studentId` field first (the value a parent would
   * be given), then falls back to interpreting the input as a Mongo id. Returns
   * `null` when no student matches.
   */
  private async resolveStudentObjectId(
    studentId: string,
  ): Promise<mongoose.Types.ObjectId | null> {
    const raw = (studentId ?? '').trim();
    if (raw === '') {
      return null;
    }

    const byStudentId = await Student.findOne({ studentId: raw })
      .select('_id')
      .lean()
      .exec();
    if (byStudentId?._id) {
      return new mongoose.Types.ObjectId(String(byStudentId._id));
    }

    if (mongoose.Types.ObjectId.isValid(raw)) {
      const byId = await Student.findById(raw).select('_id').lean().exec();
      if (byId?._id) {
        return new mongoose.Types.ObjectId(String(byId._id));
      }
    }

    return null;
  }

  /**
   * Send the OTP via the SMS transport, swallowing and recording any failure.
   *
   * Delivery failures must never reach the caller (Req 4.5). The OTP value is
   * never written to logs (Req 8.4); only redacted, non-sensitive context is
   * recorded server-side.
   *
   * @returns `true` when the transport accepted the message for delivery,
   *   `false` when delivery failed. The caller uses this to decide whether to
   *   write the `otp_delivered` audit entry (Req 8.2) without ever surfacing
   *   the outcome to the caller.
   */
  private async dispatchOtp(
    toPhone: string,
    code: string,
    ctx: OtpRequestContext,
  ): Promise<boolean> {
    const body = `Your verification code is ${code}. It expires in ${getExpiryMs() / 60000} minutes.`;
    try {
      await this.sms.send(toPhone, body);
      return true;
    } catch (err) {
      // Record server-side only; never surface to the caller and never log the code.
      logger.error('OTP SMS delivery failed', {
        correlationId: ctx.correlationId,
        ip: ctx.ip,
        reason: err instanceof Error ? err.message : 'unknown',
      });
      return false;
    }
  }

  /**
   * Write an `otp_delivered` audit entry for a confirmed delivery on a matched
   * linkage (Req 8.2).
   *
   * Records ONLY a match-outcome category (`matched: true`) alongside the
   * parent and student identifiers, source IP, and correlation id. The OTP
   * value and the full linkage phone are NEVER recorded; metadata is routed
   * through {@link redactSecrets} as a defense-in-depth guard (Req 8.4).
   *
   * An audit-write failure is swallowed (recorded server-side) so it can never
   * affect the constant generic acknowledgement the caller receives.
   */
  private async auditOtpDelivered(
    parentId: mongoose.Types.ObjectId | string,
    studentId: mongoose.Types.ObjectId | string,
    ctx: OtpRequestContext,
  ): Promise<void> {
    try {
      await this.audit.logEvent({
        userId: String(parentId),
        role: 'parent',
        ip: ctx.ip,
        action: 'otp_delivered',
        resource: 'parent-otp',
        resourceId: String(studentId),
        correlationId: ctx.correlationId,
        // Match-outcome category ONLY — never the phone or OTP (Req 8.2).
        metadata: redactSecrets({ matched: true }),
      });
    } catch (err) {
      logger.error('Failed to write otp_delivered audit entry', {
        correlationId: ctx.correlationId,
        ip: ctx.ip,
        reason: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  /**
   * Emit the `parent_otp_login` audit entry on a successful OTP authentication
   * (Req 8.1).
   *
   * Records the parent (actor) identifier, the linked student identifier, the
   * action, a timestamp (stamped by `auditService.logEvent`), the source IP,
   * and the correlation id. The OTP value is NEVER recorded; metadata is routed
   * through {@link redactSecrets} as a defense-in-depth guard (Req 8.4).
   *
   * NOTE: This is the dedicated emission point for the login event. Full OTP
   * verification + token issuance lands in task 5.2; once {@link OtpService.verify}
   * confirms a code and consumes the challenge, it MUST call this helper with
   * the challenge's `parentId`/`studentId` and the request context so the login
   * is audited. It is intentionally factored out here so task 5.2 only needs to
   * invoke it.
   */
  private async auditOtpLogin(
    parentId: mongoose.Types.ObjectId | string,
    studentId: mongoose.Types.ObjectId | string,
    ctx: OtpRequestContext,
  ): Promise<void> {
    await this.audit.logEvent({
      userId: String(parentId),
      role: 'parent',
      ip: ctx.ip,
      action: 'parent_otp_login',
      resource: 'parent-otp',
      resourceId: String(studentId),
      correlationId: ctx.correlationId,
      // No OTP-bearing fields are recorded; redact as defense-in-depth (Req 8.1, 8.4).
      metadata: redactSecrets({}),
    });
  }
}

/** Shared singleton, matching the convention used by sibling services. */
export const otpService = new OtpService();
