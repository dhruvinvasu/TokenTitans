/**
 * Whitelist that maps assistant-facing field names to safe candidate document
 * paths. The LLM may only reference these fields; anything else is ignored,
 * which prevents raw operator injection ($where, $function, etc.).
 */
export type FieldType = 'string' | 'number' | 'enum' | 'stringArray' | 'date'

export interface FieldDefinition {
  path: string
  type: FieldType
}

export const ASSISTANT_FIELDS: Record<string, FieldDefinition> = {
  status: { path: 'status', type: 'enum' },
  fullName: { path: 'fullName', type: 'string' },
  email: { path: 'email', type: 'string' },
  currentCtc: { path: 'currentCtc', type: 'number' },
  expectedCtc: { path: 'expectedCtc', type: 'number' },
  riskScore: { path: 'riskScore', type: 'number' },
  skillMatchPercentage: { path: 'skillMatch.percentage', type: 'number' },
  salaryMatchPercentage: { path: 'salaryMatch.percentage', type: 'number' },
  skills: { path: 'profile.skills', type: 'stringArray' },
  experienceYears: { path: 'profile.experienceYears', type: 'number' },
  location: { path: 'profile.location', type: 'string' },
  previousCompanies: { path: 'profile.previousCompanies', type: 'stringArray' },
  createdAt: { path: 'createdAt', type: 'date' },
}

export type AssistantOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'contains'
  | 'before'
  | 'after'
  | 'today'

export type AssistantIntent = 'list' | 'count' | 'compare' | 'report'

export interface AssistantFilter {
  field: string
  operator: AssistantOperator
  value?: string | number | Array<string | number>
}

export interface AssistantQueryPlan {
  intent: AssistantIntent
  filters: AssistantFilter[]
  sort?: { field: string; direction: 'asc' | 'desc' }
  limit?: number
  answerHint?: string
}

export const ASSISTANT_DEFAULT_LIMIT = 50
export const ASSISTANT_MAX_LIMIT = 200
