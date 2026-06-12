export { authTokenService, AuthTokenService } from './authTokenService.js';
export type { TokenPair, DecodedToken, IAuthTokenService, UserModelType } from './authTokenService.js';

export { passwordService, PasswordService } from './passwordService.js';
export type { IPasswordService, ModelName } from './passwordService.js';

export { emailService, EmailService } from './emailService.js';
export type { IEmailService } from './emailService.js';

export {
  smsService,
  selectSmsTransport,
  ConsoleSmsTransport,
  TwilioSmsTransport,
} from './smsService.js';
export type { ISmsTransport, SmsProvider } from './smsService.js';

export {
  otpService,
  OtpService,
  OTP_DIGITS,
  getResendIntervalMs,
  getExpiryMs,
  getMaxAttempts,
} from './otpService.js';
export type {
  OtpRequestContext,
  GenericAck,
  OtpRequestResult,
} from './otpService.js';

export { credentialService, CredentialService } from './credentialService.js';
export type {
  ICredentialService,
  CredentialResult,
  CredentialDeliveryMethod,
} from './credentialService.js';

export { accountSetupService, AccountSetupService } from './accountSetupService.js';
export type {
  IAccountSetupService,
  ConsumeSetupTokenResult,
  SetupTokenResource,
} from './accountSetupService.js';

export { studentService, StudentService } from './studentService.js';
export type {
  StudentFilters,
  CreateStudentInput,
  StudentResponse,
  CreateAccountResult,
  ResetResult,
} from './studentService.js';

export { courseService, CourseService } from './courseService.js';
export type { CourseFilters } from './courseService.js';

export { facultyService, FacultyService } from './facultyService.js';
export type {
  FacultyFilters,
  CreateFacultyInput,
  UpdateFacultyInput,
  FacultyResponse,
  CreateFacultyAccountResult,
} from './facultyService.js';

export { enrollmentService, EnrollmentService } from './enrollmentService.js';
export type { EnrollmentFilters } from './enrollmentService.js';

export { attendanceService, AttendanceService } from './attendanceService.js';

export { markService, MarkService } from './markService.js';
export type { MarkFilters } from './markService.js';

export { auditService, AuditService } from './auditService.js';
export type { AuditEventParams, AuditRecordEntry, IAuditService } from './auditService.js';

export { feedbackService, FeedbackService } from './feedbackService.js';
export type {
  SubmitFeedbackInput,
  FeedbackDTO,
  FeedbackReplyDTO,
} from './feedbackService.js';

export { adminOverrideService, AdminOverrideService } from './adminOverrideService.js';
export type { AdminOverrideParams } from './adminOverrideService.js';

export { assessmentService, AssessmentService } from './assessmentService.js';
export type {
  CreateAssessmentDto,
  SubmitAnswersDto,
  AssessmentResult,
  SubmissionResult,
} from './assessmentService.js';

export { analyticsService, AnalyticsService } from './analyticsService.js';
export type {
  TrendMetric,
  StudentTrendResult,
  CourseAnalyticsResult,
  PredictiveInsightResult,
} from './analyticsService.js';

export { ptmService, PTMService } from './ptmService.js';
export type {
  SchedulePTMDto,
  PTMResult,
} from './ptmService.js';

export { recordingService, RecordingService } from './recordingService.js';
export type {
  RecordingConfig,
  RecordingUser,
  CaptureSessionResult,
  RecordingUrlResult,
} from './recordingService.js';

export { parentLinkageService, ParentLinkageService } from './parentLinkageService.js';
export type { LinkageDTO } from './parentLinkageService.js';

export { quizAnalyticsService, QuizAnalyticsService } from './quizAnalyticsService.js';
export type { QuizAnalytics, AssessmentAnalytics } from './quizAnalyticsService.js';

export { facultyMeService, FacultyMeService } from './facultyMeService.js';
export type {
  Weekday,
  FacultyProfileDTO,
  CourseDTO,
  StudentSummaryDTO,
  ScheduleSlotDTO,
} from './facultyMeService.js';

export { dashboardService, DashboardService } from './dashboardService.js';
export type {
  StudentDashboardDTO,
  StudentDashboardProfileDTO,
  RecentGradeDTO,
  FacultyDashboardDTO,
  ParentDashboardDTO,
  ChildSummaryDTO,
  AdminDashboardDTO,
  AuditHighlightDTO,
} from './dashboardService.js';
