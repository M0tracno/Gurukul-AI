export { default as Student } from './Student.js';
export { default as Faculty } from './Faculty.js';
export { default as Parent } from './Parent.js';
export { default as Course } from './Course.js';
export { default as Enrollment } from './Enrollment.js';
export { default as Attendance } from './Attendance.js';
export { default as Mark } from './Mark.js';
export { default as Message } from './Message.js';
export { default as RefreshToken } from './RefreshToken.js';
export { default as GradingJob } from './GradingJob.js';
export { default as AuditLog } from './AuditLog.js';
export { default as Assessment } from './Assessment.js';
export { default as Submission } from './Submission.js';
export { default as PTM } from './PTM.js';
export { default as OtpChallenge } from './OtpChallenge.js';
export { default as ParentStudentRelation } from './ParentStudentRelation.js';
export { default as Feedback } from './Feedback.js';

export type { IStudent } from './Student.js';
export type { IFaculty } from './Faculty.js';
export type { IParent } from './Parent.js';
export type { ICourse, IScheduleItem } from './Course.js';
export type { IEnrollment } from './Enrollment.js';
export type { IAttendance } from './Attendance.js';
export type { IMark, IAttachment } from './Mark.js';
export type {
  IMessage,
  IMessageModel,
  IMessageAttachment,
  IMessageMetadata,
} from './Message.js';
export type { IRefreshToken } from './RefreshToken.js';
export type { IGradingJob, IGradingSubmission } from './GradingJob.js';
export type {
  IAuditLog,
  IAuditLogActor,
  IAuditLogTarget,
  AuditAction,
} from './AuditLog.js';
export type { IAssessment, IQuestion } from './Assessment.js';
export type {
  ISubmission,
  IAnswer,
  IGradedAnswer,
  GradingStatus,
} from './Submission.js';
export type { IPTM, PTMStatus } from './PTM.js';
export type { IOtpChallenge } from './OtpChallenge.js';
export type { IParentStudentRelation } from './ParentStudentRelation.js';
export type {
  IFeedback,
  IFeedbackModel,
  IFeedbackReply,
} from './Feedback.js';
export { RATING_MIN, RATING_MAX, COMMENT_MAX_LENGTH } from './Feedback.js';
