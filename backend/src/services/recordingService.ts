import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Types } from 'mongoose';
import PTM from '../models/PTM.js';
import type { IPTM } from '../models/PTM.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// ─── Configuration ────────────────────────────────────────────────────────────

export interface RecordingConfig {
  /** S3 bucket name for the Recording_Store */
  bucket: string;
  /** AWS region */
  region: string;
  /** Signed URL expiration time in seconds (default: 3600 = 1 hour) */
  signedUrlExpiresIn: number;
  /** Optional S3 endpoint override (useful for testing with LocalStack, MinIO, etc.) */
  endpoint?: string;
}

function loadConfig(): RecordingConfig {
  return {
    bucket: process.env.RECORDING_S3_BUCKET || 'gurukul-recordings',
    region: process.env.RECORDING_S3_REGION || process.env.AWS_REGION || 'us-east-1',
    signedUrlExpiresIn: parseInt(
      process.env.RECORDING_SIGNED_URL_EXPIRES_IN || '3600',
      10,
    ),
    endpoint: process.env.RECORDING_S3_ENDPOINT || undefined,
  };
}

// ─── S3 Client Factory ────────────────────────────────────────────────────────

function createS3Client(config: RecordingConfig): S3Client {
  return new S3Client({
    region: config.region,
    ...(config.endpoint && {
      endpoint: config.endpoint,
      forcePathStyle: true,
    }),
  });
}

// ─── DTOs / Types ─────────────────────────────────────────────────────────────

export interface RecordingUser {
  id: string;
  role?: string;
}

export interface CaptureSessionResult {
  s3Key: string;
  ptmId: string;
  bucket: string;
}

export interface RecordingUrlResult {
  url: string;
  expiresIn: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class RecordingService {
  private readonly s3Client: S3Client;
  private readonly config: RecordingConfig;

  constructor(config?: RecordingConfig, s3Client?: S3Client) {
    this.config = config ?? loadConfig();
    this.s3Client = s3Client ?? createS3Client(this.config);
  }

  /**
   * Capture and store a PTM recording session to the Recording_Store (S3).
   *
   * When recording is enabled for a PTM, this method stores the session data
   * in S3 and associates the recording reference (S3 key) with the PTM.
   *
   * Requirement 19.1: Capture the session and store in Recording_Store.
   * Requirement 19.2: Associate the recording reference with the PTM.
   *
   * @param ptmId       - The PTM to record
   * @param sessionData - The raw recording data (Buffer or stream content)
   * @param contentType - MIME type of the recording (default: 'video/webm')
   * @returns           The capture result with S3 key and PTM reference
   * @throws AppError 404 if PTM not found
   * @throws AppError 400 if recording is not enabled for the PTM
   */
  async captureSession(
    ptmId: string,
    sessionData: Buffer,
    contentType: string = 'video/webm',
  ): Promise<CaptureSessionResult> {
    // Validate the PTM exists
    const ptm = await PTM.findById(ptmId).exec();
    if (!ptm) {
      throw AppError.notFound(`PTM with id '${ptmId}' not found`);
    }

    // Verify recording is enabled for this PTM
    if (!ptm.recordingEnabled) {
      throw AppError.badRequest(
        'Recording is not enabled for this PTM. Enable recording before capturing.',
        [{ field: 'recordingEnabled', reason: 'Must be true to capture a session' }],
      );
    }

    // Generate an S3 key for the recording
    const timestamp = Date.now();
    const s3Key = `recordings/${ptmId}/${timestamp}.webm`;

    // Upload the recording to S3 (Recording_Store)
    const putCommand = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: s3Key,
      Body: sessionData,
      ContentType: contentType,
      Metadata: {
        ptmId,
        capturedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(putCommand);

    // Associate the recording reference with the PTM (Requirement 19.2)
    await PTM.findByIdAndUpdate(ptmId, { recordingRef: s3Key }).exec();

    logger.info('PTM recording captured and stored', {
      ptmId,
      s3Key,
      bucket: this.config.bucket,
      contentType,
      size: sessionData.length,
    });

    return {
      s3Key,
      ptmId,
      bucket: this.config.bucket,
    };
  }

  /**
   * Get a time-limited signed URL for an authorized participant to access a PTM recording.
   *
   * Requirement 19.3: Provide time-limited access to the recording.
   * Requirement 19.4: Deny access with 403 for unauthorized users.
   *
   * @param ptmId - The PTM whose recording to access
   * @param user  - The user requesting access (must be a participant)
   * @returns     A time-limited signed URL and its expiry duration
   * @throws AppError 404 if PTM not found or no recording exists
   * @throws AppError 403 if user is not an authorized participant
   */
  async getRecordingUrl(
    ptmId: string,
    user: RecordingUser,
  ): Promise<RecordingUrlResult> {
    // Fetch the PTM
    const ptm = await PTM.findById(ptmId).exec();
    if (!ptm) {
      throw AppError.notFound(`PTM with id '${ptmId}' not found`);
    }

    // Authorization check: only PTM participants may access the recording
    const isParticipant = ptm.participants.some(
      (p: Types.ObjectId) => p.toString() === user.id,
    );

    if (!isParticipant) {
      throw AppError.forbidden(
        'You are not authorized to access this recording. Only PTM participants may view recordings.',
      );
    }

    // Verify a recording reference exists
    if (!ptm.recordingRef) {
      throw AppError.notFound(
        `No recording found for PTM '${ptmId}'. The session may not have been recorded.`,
      );
    }

    // Generate a time-limited signed URL for the recording
    const getCommand = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: ptm.recordingRef,
    });

    const url = await getSignedUrl(this.s3Client, getCommand, {
      expiresIn: this.config.signedUrlExpiresIn,
    });

    logger.info('Recording signed URL generated', {
      ptmId,
      userId: user.id,
      s3Key: ptm.recordingRef,
      expiresIn: this.config.signedUrlExpiresIn,
    });

    return {
      url,
      expiresIn: this.config.signedUrlExpiresIn,
    };
  }

  /**
   * Check if a recording exists for a given PTM.
   *
   * @param ptmId - The PTM ID to check
   * @returns     True if a recording reference exists, false otherwise
   */
  async hasRecording(ptmId: string): Promise<boolean> {
    const ptm = await PTM.findById(ptmId).select('recordingRef').lean().exec();
    if (!ptm) {
      return false;
    }
    return !!(ptm as unknown as IPTM).recordingRef;
  }
}

export const recordingService = new RecordingService();
