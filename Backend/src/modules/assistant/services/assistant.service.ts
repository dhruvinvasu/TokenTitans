import { inject, injectable } from 'inversify'
import { FilterQuery } from 'mongoose'
import ValidationError from '@/errors/validation.error'
import { ClaudeCliService } from '@/modules/ai/services/claude-cli.service'
import {
  ASSISTANT_DEFAULT_LIMIT,
  ASSISTANT_FIELDS,
  ASSISTANT_MAX_LIMIT,
  AssistantFilter,
  AssistantQueryPlan,
} from '@/modules/assistant/constants/assistant.constants'
import { CandidateStatus } from '@/modules/candidate/constants/candidate.constants'
import { ICandidate } from '@/modules/candidate/models/candidate.model'
import { CandidateRepository } from '@/modules/candidate/repositories/candidate.repository'
import { TYPES } from '@/types/di.types'
import { logger } from '@/utils/logger.util'

@injectable()
export class AssistantService {
  constructor(
    @inject(TYPES.ClaudeCliService)
    private readonly claudeCliService: ClaudeCliService,
    @inject(TYPES.CandidateRepository)
    private readonly candidateRepository: CandidateRepository,
  ) {}

  /**
   * Answers a natural-language HR question. The LLM produces a structured query
   * plan restricted to a field whitelist; this service translates it into a
   * safe Mongoose filter, executes it and returns data plus a narrative answer.
   */
  async ask(question: string) {
    const plan = await this.buildPlan(question)
    const filter = this.translate(plan.filters)
    const limit = this.clampLimit(plan.limit)
    const sort = this.buildSort(plan.sort)

    if (plan.intent === 'count') {
      const count = await this.candidateRepository.countBy(filter)
      const answer = await this.narrate(question, plan, { count })
      return { intent: plan.intent, filter, count, answer, plan }
    }

    const candidates = await this.candidateRepository.runReadOnlyQuery(
      filter,
      limit,
      sort,
    )
    const answer = await this.narrate(question, plan, {
      count: candidates.length,
      sample: candidates.slice(0, 10),
    })

    return {
      intent: plan.intent,
      filter,
      count: candidates.length,
      candidates,
      answer,
      plan,
    }
  }

  private async buildPlan(question: string): Promise<AssistantQueryPlan> {
    if (this.claudeCliService.isEnabled) {
      try {
        return await this.buildPlanWithAi(question)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Assistant AI planning failed, using fallback: ${message}`)
      }
    }
    return this.buildPlanDeterministic(question)
  }

  private async buildPlanWithAi(
    question: string,
  ): Promise<AssistantQueryPlan> {
    const fieldDocs = Object.entries(ASSISTANT_FIELDS)
      .map(([name, def]) => `${name} (${def.type})`)
      .join(', ')
    const statuses = Object.values(CandidateStatus).join(', ')

    const systemPrompt =
      'You translate an HR manager natural-language question about job ' +
      'candidates into a strict JSON query plan. ' +
      `Allowed fields: ${fieldDocs}. ` +
      `Allowed status enum values: ${statuses}. ` +
      'Allowed operators: eq, ne, gt, gte, lt, lte, in, contains, before, ' +
      'after, today. Use "contains" for skills/arrays and partial string ' +
      'matches. Respond ONLY with JSON: { "intent": "list"|"count"|"compare"|' +
      '"report", "filters": [{ "field": string, "operator": string, "value": ' +
      'any }], "sort": { "field": string, "direction": "asc"|"desc" }, ' +
      '"limit": number, "answerHint": string }. Never invent fields outside ' +
      'the allowed list.'

    const plan = await this.claudeCliService.completeJson<AssistantQueryPlan>(
      systemPrompt,
      question,
    )

    return {
      intent: plan.intent ?? 'list',
      filters: Array.isArray(plan.filters) ? plan.filters : [],
      sort: plan.sort,
      limit: plan.limit,
      answerHint: plan.answerHint,
    }
  }

  /**
   * Lightweight keyword-based planner used when the Claude CLI is unavailable. Covers
   * the most common HR queries (status, skills, CTC, experience).
   */
  private buildPlanDeterministic(question: string): AssistantQueryPlan {
    const text = question.toLowerCase()
    const filters: AssistantFilter[] = []

    if (text.includes('passed') || text.includes('shortlist')) {
      filters.push({
        field: 'status',
        operator: 'in',
        value: [
          CandidateStatus.SKILL_PASSED,
          CandidateStatus.SALARY_PASSED,
          CandidateStatus.TEST_COMPLETED,
          CandidateStatus.UNDER_HR_REVIEW,
        ],
      })
    }
    if (text.includes('rejected')) {
      filters.push({
        field: 'status',
        operator: 'in',
        value: [
          CandidateStatus.SKILL_REJECTED,
          CandidateStatus.SALARY_REJECTED,
          CandidateStatus.REJECTED,
        ],
      })
    }
    if (text.includes('interview')) {
      filters.push({
        field: 'status',
        operator: 'eq',
        value: CandidateStatus.INTERVIEW_SCHEDULED,
      })
    }

    const skillMatch = text.match(
      /(react|next\.?js|node|java|python|typescript|javascript|angular|vue|aws)/,
    )
    if (skillMatch) {
      filters.push({
        field: 'skills',
        operator: 'contains',
        value: skillMatch[1],
      })
    }

    const expMatch = text.match(/(\d+)\+?\s*years?/)
    if (expMatch) {
      filters.push({
        field: 'experienceYears',
        operator: 'gte',
        value: Number.parseInt(expMatch[1], 10),
      })
    }

    const intent = text.includes('how many') || text.includes('count')
      ? 'count'
      : 'list'

    return { intent, filters }
  }

  private translate(filters: AssistantFilter[]): FilterQuery<ICandidate> {
    const query: FilterQuery<ICandidate> = { deletedAt: null }

    for (const filter of filters) {
      const definition = ASSISTANT_FIELDS[filter.field]
      if (!definition) continue

      const condition = this.buildCondition(filter)
      if (condition === undefined) continue

      query[definition.path] = condition
    }

    return query
  }

  private buildCondition(filter: AssistantFilter): unknown {
    const { operator, value } = filter
    switch (operator) {
      case 'eq':
        return value
      case 'ne':
        return { $ne: value }
      case 'gt':
        return { $gt: value }
      case 'gte':
        return { $gte: value }
      case 'lt':
        return { $lt: value }
      case 'lte':
        return { $lte: value }
      case 'in':
        return { $in: Array.isArray(value) ? value : [value] }
      case 'contains':
        return { $regex: this.escapeRegex(String(value)), $options: 'i' }
      case 'before':
        return { $lt: new Date(String(value)) }
      case 'after':
        return { $gte: new Date(String(value)) }
      case 'today': {
        const start = new Date()
        start.setUTCHours(0, 0, 0, 0)
        return { $gte: start }
      }
      default:
        return undefined
    }
  }

  private buildSort(sort?: {
    field: string
    direction: 'asc' | 'desc'
  }): Record<string, 1 | -1> | undefined {
    if (!sort) return undefined
    const definition = ASSISTANT_FIELDS[sort.field]
    if (!definition) return undefined
    return { [definition.path]: sort.direction === 'asc' ? 1 : -1 }
  }

  private clampLimit(limit?: number): number {
    if (!limit || Number.isNaN(limit)) return ASSISTANT_DEFAULT_LIMIT
    return Math.min(Math.max(1, Math.floor(limit)), ASSISTANT_MAX_LIMIT)
  }

  private async narrate(
    question: string,
    plan: AssistantQueryPlan,
    data: Record<string, unknown>,
  ): Promise<string> {
    if (!this.claudeCliService.isEnabled) {
      return this.fallbackNarrative(plan, data)
    }

    try {
      const systemPrompt =
        'You are an HR analytics assistant. Given a question and the query ' +
        'result data, write a concise, professional answer (2-4 sentences). ' +
        'Reference concrete numbers. Do not fabricate data beyond what is given.'
      const userPrompt = JSON.stringify({ question, data })
      const answer = await this.claudeCliService.completeText(systemPrompt, userPrompt)
      return answer || this.fallbackNarrative(plan, data)
    } catch {
      return this.fallbackNarrative(plan, data)
    }
  }

  private fallbackNarrative(
    plan: AssistantQueryPlan,
    data: Record<string, unknown>,
  ): string {
    const count = (data.count as number | undefined) ?? 0
    if (plan.intent === 'count') {
      return `Found ${count} candidate(s) matching your query.`
    }
    return `Returning ${count} candidate(s) matching your query.`
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /** Guard used by the controller to reject empty questions early. */
  ensureQuestion(question: string): string {
    const trimmed = question?.trim()
    if (!trimmed) {
      throw new ValidationError([
        { field: 'question', message: 'Question is required' },
      ])
    }
    return trimmed
  }
}
