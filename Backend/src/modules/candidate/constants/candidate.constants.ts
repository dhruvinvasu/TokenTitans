export enum CandidateStatus {
  APPLIED = 'APPLIED',
  RESUME_UPLOADED = 'RESUME_UPLOADED',
  RESUME_PARSED = 'RESUME_PARSED',
  SKILL_MATCHING = 'SKILL_MATCHING',
  SKILL_REJECTED = 'SKILL_REJECTED',
  SKILL_PASSED = 'SKILL_PASSED',
  SALARY_MATCHING = 'SALARY_MATCHING',
  SALARY_REJECTED = 'SALARY_REJECTED',
  SALARY_PASSED = 'SALARY_PASSED',
  EMAIL_SENT = 'EMAIL_SENT',
  TEST_PENDING = 'TEST_PENDING',
  TEST_STARTED = 'TEST_STARTED',
  TEST_COMPLETED = 'TEST_COMPLETED',
  TEST_FAILED = 'TEST_FAILED',
  UNDER_HR_REVIEW = 'UNDER_HR_REVIEW',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  OFFER_SENT = 'OFFER_SENT',
  JOINED = 'JOINED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum RejectionStage {
  SKILL_MATCH = 'SKILL_MATCH',
  SALARY_MATCH = 'SALARY_MATCH',
  APTITUDE_TEST = 'APTITUDE_TEST',
  HR_DECISION = 'HR_DECISION',
}

// Statuses that represent a terminal rejection/failure for the candidate.
export const REJECTED_STATUSES: CandidateStatus[] = [
  CandidateStatus.SKILL_REJECTED,
  CandidateStatus.SALARY_REJECTED,
  CandidateStatus.TEST_FAILED,
  CandidateStatus.REJECTED,
]

// Statuses that count as "passed / in-progress" for pipeline analytics.
export const ACTIVE_STATUSES: CandidateStatus[] = [
  CandidateStatus.SKILL_PASSED,
  CandidateStatus.SALARY_PASSED,
  CandidateStatus.EMAIL_SENT,
  CandidateStatus.TEST_PENDING,
  CandidateStatus.TEST_STARTED,
  CandidateStatus.TEST_COMPLETED,
  CandidateStatus.UNDER_HR_REVIEW,
  CandidateStatus.INTERVIEW_SCHEDULED,
  CandidateStatus.OFFER_SENT,
  CandidateStatus.JOINED,
]
