import { Types } from 'mongoose';
import Assessment from '../models/Assessment.js';
import type { IAssessment, IQuestion } from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import type { ISubmission, IAnswer } from '../models/Submission.js';
import Course from '../models/Course.js';
import GradingJob from '../models/GradingJob.js';
import { gradingQueue } from '../jobs/gradingQueue.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// ─── DTOs ───────────────────────────────────────────────────────────────────────

export interface CreateAssessmentDto {
  courseId: string;
  title: string;
  questions: IQuestion[];
  opensAt: Date;
  closesAt: Date;
}

export interface SubmitAnswersDto {
  answers: IAnswer[];
}

export interface AssessmentResult {
  assessmentId: string;
  courseId: string;
  teacherId: string;
  title: string;
  questions: IQuestion[];
  opensAt: Date;
  closesAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionResult {
  submissionId: string;
  assessmentId: string;
  studentId: string;
  answers: IAnswer[];
  submittedAt: Date;
  gradingStatus: ISubmission['gradingStatus'];
  gradingJobId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Map a Mongoose Assessment document to a plain result object.
 */
function toAssessmentResult(doc: IAssessment): AssessmentResult {
  const obj = doc as unknown as Record<string, unknown>;
  return {
    assessmentId: (obj['_id'] as Types.ObjectId).toString(),
    courseId: (doc.courseId as Types.ObjectId).toString(),
    teacherId: (doc.teacherId as Types.ObjectId).toString(),
    title: doc.title,
    questions: doc.questions,
    opensAt: doc.opensAt,
    closesAt: doc.closesAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Map a Mongoose Submission document to a plain result object.
 */
function toSubmissionResult(doc: ISubmission): SubmissionResult {
  const obj = doc as unknown as Record<string, unknown>;
  return {
    submissionId: (obj['_id'] as Types.ObjectId).toString(),
    assessmentId: (doc.assessmentId as Types.ObjectId).toString(),
    studentId: (doc.studentId as Types.ObjectId).toString(),
    answers: doc.answers,
    submittedAt: doc.submittedAt,
    gradingStatus: doc.gradingStatus,
    ...(doc.gradingJobId && {
      gradingJobId: (doc.gradingJobId as Types.ObjectId).toString(),
    }),
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────────

export class AssessmentService {
  /**
   * Create a new Assessment authored by a teacher.
   *
   * Persists the Assessment with its questions and associates it with the
   * specified Course (Requirement 12.1). Subjective questions are stored
   * with type 'subjective' and accept free-text answers at submission time
   * (Requirement 12.2).
   *
   * @param teacherId - ID of the teacher creating the assessment
   * @param dto       - Assessment data transfer object
   * @returns         The persisted assessment
   * @throws AppError 404 if the course is not found
   * @throws AppError 400 if closesAt is not after opensAt
   */
  async createAssessment(
    teacherId: string,
    dto: CreateAssessmentDto,
  ): Promise<AssessmentResult> {
    // Validate the course exists
    const course = await Course.findById(dto.courseId).lean().exec();
    if (!course) {
      throw AppError.notFound(`Course with id '${dto.courseId}' not found`);
    }

    // Validate the submission window is logically consistent
    if (dto.closesAt <= dto.opensAt) {
      throw AppError.badRequest('closesAt must be after opensAt', [
        {
          field: 'closesAt',
          reason: 'Closing time must be strictly after opening time',
        },
      ]);
    }

    const assessment = await Assessment.create({
      courseId: new Types.ObjectId(dto.courseId),
      teacherId: new Types.ObjectId(teacherId),
      title: dto.title,
      questions: dto.questions,
      opensAt: dto.opensAt,
      closesAt: dto.closesAt,
    });

    logger.info('Assessment created', {
      assessmentId: assessment._id.toString(),
      courseId: dto.courseId,
      teacherId,
      questionCount: dto.questions.length,
    });

    return toAssessmentResult(assessment);
  }

  /**
   * Submit answers for an assessment.
   *
   * Accepts submissions only within the [opensAt, closesAt] window
   * (Requirement 12.3). Rejects submissions after the window closes with an
   * AppError that maps to an Error_Envelope with status 400
   * (Requirement 12.4). Supports free-text answers for subjective questions
   * (Requirement 12.2).
   *
   * @param studentId    - ID of the student submitting answers
   * @param assessmentId - ID of the assessment being answered
   * @param dto          - Answers DTO containing the list of answers
   * @returns            The persisted submission
   * @throws AppError 404 if the assessment is not found
   * @throws AppError 400 if the submission window has not opened yet or has closed
   * @throws AppError 400 if a submitted questionId does not exist on the assessment
   */
  async submitAnswers(
    studentId: string,
    assessmentId: string,
    dto: SubmitAnswersDto,
  ): Promise<SubmissionResult> {
    // Load the assessment
    const assessment = await Assessment.findById(assessmentId).lean().exec();
    if (!assessment) {
      throw AppError.notFound(`Assessment with id '${assessmentId}' not found`);
    }

    const now = new Date();

    // Enforce submission window: reject if before opensAt
    if (now < assessment.opensAt) {
      throw AppError.badRequest(
        `Assessment submission window has not opened yet. Opens at ${assessment.opensAt.toISOString()}.`,
        [
          {
            field: 'submittedAt',
            reason: `Submission is before the opening time (${assessment.opensAt.toISOString()})`,
          },
        ],
      );
    }

    // Enforce submission window: reject if after closesAt (Requirement 12.4)
    if (now > assessment.closesAt) {
      throw AppError.badRequest(
        `Assessment submission window has closed. Closed at ${assessment.closesAt.toISOString()}.`,
        [
          {
            field: 'submittedAt',
            reason: `Submission is after the closing time (${assessment.closesAt.toISOString()})`,
          },
        ],
      );
    }

    // Validate that every submitted questionId exists on the assessment
    const validQuestionIds = new Set(
      assessment.questions.map((q: IQuestion) => q.questionId),
    );
    const invalidAnswers = dto.answers.filter(
      (a: IAnswer) => !validQuestionIds.has(a.questionId),
    );
    if (invalidAnswers.length > 0) {
      throw AppError.badRequest('One or more submitted question IDs are invalid', [
        ...invalidAnswers.map((a: IAnswer) => ({
          field: 'answers',
          reason: `Question ID '${a.questionId}' does not exist on this assessment`,
        })),
      ]);
    }

    // Determine whether the submission contains subjective answers
    const questionTypeMap = new Map<string, IQuestion['type']>(
      assessment.questions.map((q: IQuestion) => [q.questionId, q.type]),
    );
    const hasSubjectiveAnswer = dto.answers.some(
      (a: IAnswer) => questionTypeMap.get(a.questionId) === 'subjective',
    );

    // Persist the submission.
    // If subjective answers are present, gradingStatus starts as 'queued';
    // otherwise no grading is needed so we mark it 'completed' immediately.
    const submission = await Submission.create({
      assessmentId: new Types.ObjectId(assessmentId),
      studentId: new Types.ObjectId(studentId),
      answers: dto.answers,
      submittedAt: now,
      gradingStatus: hasSubjectiveAnswer ? 'queued' : 'completed',
      finalized: !hasSubjectiveAnswer,
    });

    // Enqueue a GradingJob only when subjective answers are present
    // (Requirement 13.1, 14.1). The response is returned immediately — grading
    // happens asynchronously and does NOT block the student's response.
    if (hasSubjectiveAnswer) {
      const subjectiveQuestionIds = dto.answers
        .filter((a: IAnswer) => questionTypeMap.get(a.questionId) === 'subjective')
        .map((a: IAnswer) => a.questionId);

      const gradingJob = await GradingJob.create({
        batchId: `assessment-${assessmentId}-${submission._id.toString()}`,
        teacherId: assessment.teacherId,
        status: 'pending',
        totalSubmissions: 1,
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        concurrency: 1,
        submissions: [
          {
            submissionId: submission._id.toString(),
            fileUrl: `submission://${submission._id.toString()}`,
            fileSize: 0,
            mimeType: 'application/pdf', // placeholder — worker will handle text-based grading
            status: 'pending',
            retryCount: 0,
          },
        ],
      });

      // Link the grading job to the submission
      submission.gradingJobId = gradingJob._id as Types.ObjectId;
      await submission.save();

      // Enqueue on BullMQ — fire-and-forget (non-blocking)
      gradingQueue
        .add('grade-submission', {
          gradingJobId: gradingJob._id.toString(),
          submissionId: submission._id.toString(),
          assessmentId,
          subjectiveQuestionIds,
        })
        .catch((err: unknown) => {
          logger.error('Failed to enqueue grading job', {
            gradingJobId: gradingJob._id.toString(),
            submissionId: submission._id.toString(),
            error: err instanceof Error ? err.message : String(err),
          });
        });

      logger.info('Grading job enqueued for subjective submission', {
        submissionId: submission._id.toString(),
        gradingJobId: gradingJob._id.toString(),
        assessmentId,
        subjectiveQuestionCount: subjectiveQuestionIds.length,
      });
    }

    logger.info('Assessment submission received', {
      submissionId: submission._id.toString(),
      assessmentId,
      studentId,
      answerCount: dto.answers.length,
      hasSubjectiveAnswer,
    });

    return toSubmissionResult(submission);
  }

  /**
   * Retrieve an assessment by ID.
   *
   * @param assessmentId - The assessment ID
   * @returns            The assessment result
   * @throws AppError 404 if the assessment is not found
   */
  async getAssessmentById(assessmentId: string): Promise<AssessmentResult> {
    const assessment = await Assessment.findById(assessmentId).lean().exec();
    if (!assessment) {
      throw AppError.notFound(`Assessment with id '${assessmentId}' not found`);
    }
    return toAssessmentResult(assessment as unknown as IAssessment);
  }

  /**
   * List all assessments for a given course.
   *
   * @param courseId - The course ID to filter by
   * @returns        Array of assessments for the course
   */
  async getAssessmentsByCourse(courseId: string): Promise<AssessmentResult[]> {
    const assessments = await Assessment.find({
      courseId: new Types.ObjectId(courseId),
    })
      .lean()
      .exec();

    return assessments.map((a) =>
      toAssessmentResult(a as unknown as IAssessment),
    );
  }
}

export const assessmentService = new AssessmentService();
