export interface Job {
  _id: string
  title: string
  role: string
  description: string
  requiredSkills: string[]
  experienceRequired: number
  salaryRange: { min: number; max: number; currency: string }
  location?: string
  isActive: boolean
}

export interface SkillMatch {
  percentage: number
  matchedSkills: string[]
  missingSkills: string[]
  strongSkills: string[]
  analysis: string
  passed: boolean
}

export interface SalaryMatch {
  percentage: number
  expectedWithinRange: boolean
  analysis: string
  passed: boolean
}

export interface ApplyResult {
  candidateId: string
  outcome: 'PASSED' | 'REJECTED'
  status: string
  rejectionStage?: string
  rejectionReason?: string
  skillMatch?: SkillMatch
  salaryMatch?: SalaryMatch
  message: string
}

export interface Candidate {
  _id: string
  fullName: string
  email: string
  phoneNumber?: string
  currentCtc: number
  expectedCtc: number
  status: string
  job?: { _id: string; title: string; role: string }
  profile?: { skills: string[]; experienceYears: number; location?: string }
  skillMatch?: SkillMatch
  salaryMatch?: SalaryMatch
  rejectionReason?: string
  riskScore: number
  notes: Array<{ text: string; createdAt: string }>
  interview?: { scheduledAt?: string; mode?: string; feedback?: string }
  offer?: { ctc?: number; sentAt?: string }
  createdAt: string
}

export interface TimelineEntry {
  _id: string
  event: string
  message: string
  fromStatus?: string
  toStatus?: string
  actorType: string
  createdAt: string
}

export interface EmailLog {
  _id: string
  to: string
  subject: string
  status: string
  createdAt: string
}

export interface AptitudeQuestionView {
  index: number
  question: string
  options: string[]
  skillTag?: string
}

export interface AptitudeTestView {
  token: string
  status: string
  durationMinutes: number
  totalQuestions: number
  maxViolations: number
  violationCount: number
  remainingSeconds: number
  questions: AptitudeQuestionView[]
}

export interface SecuritySnapshot {
  violationCount: number
  maxViolations: number
  riskScore: number
  remainingViolations: number
  failed: boolean
  status: string
}

export interface DashboardOverview {
  totals: {
    totalCandidates: number
    pending: number
    underReview: number
    rejected: number
    passed: number
    interview: number
    offer: number
    joined: number
  }
  candidatesByStatus: Record<string, number>
  candidatesByJob: Array<{ _id: string; title: string; count: number }>
  skillMatchStats: { average: number; passed: number; failed: number }
  salaryMatchStats: { average: number; passed: number; failed: number }
  testStatistics: {
    byStatus: Record<string, number>
    averagePercentage: number
    averageRiskScore: number
    totalViolations: number
  }
  emailStatistics: { sent: number; failed: number; pending: number; total: number }
  recentApplications: Candidate[]
  recentActivities: TimelineEntry[]
}
