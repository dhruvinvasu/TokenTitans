import { inject, injectable } from 'inversify'
import {
  ISalaryRange,
} from '@/modules/job/models/job.model'
import {
  ISalaryMatch,
  ISkillMatch,
} from '@/modules/candidate/models/candidate.model'
import { ClaudeCliService } from '@/modules/ai/services/claude-cli.service'
import { TYPES } from '@/types/di.types'
import { logger } from '@/utils/logger.util'

export interface SkillMatchInput {
  requiredSkills: string[]
  candidateSkills: string[]
  threshold: number
  jobTitle: string
}

export interface SalaryMatchInput {
  salaryRange: ISalaryRange
  currentCtc: number
  expectedCtc: number
  threshold: number
}

/**
 * Computes skill and salary matching. Percentages are always calculated
 * deterministically (business rule), while the human-readable analysis and
 * rejection reasons are enriched by the Claude CLI with a template fallback.
 */
@injectable()
export class MatchingService {
  constructor(
    @inject(TYPES.ClaudeCliService)
    private readonly claudeCliService: ClaudeCliService,
  ) {}

  async matchSkills(input: SkillMatchInput): Promise<ISkillMatch> {
    const required = this.normalize(input.requiredSkills)
    const candidate = this.normalize(input.candidateSkills)
    const candidateSet = new Set(candidate.map((skill) => skill.toLowerCase()))

    const matchedSkills = required.filter((skill) =>
      candidateSet.has(skill.toLowerCase()),
    )
    const missingSkills = required.filter(
      (skill) => !candidateSet.has(skill.toLowerCase()),
    )

    const percentage =
      required.length === 0
        ? 0
        : Math.round((matchedSkills.length / required.length) * 100)

    const passed = percentage >= input.threshold

    const analysis = await this.buildSkillAnalysis(
      input.jobTitle,
      matchedSkills,
      missingSkills,
      percentage,
      passed,
    )

    return {
      percentage,
      matchedSkills,
      missingSkills,
      strongSkills: matchedSkills,
      analysis,
      passed,
    }
  }

  async matchSalary(input: SalaryMatchInput): Promise<ISalaryMatch> {
    const { salaryRange, expectedCtc, threshold } = input
    const expectedWithinRange =
      expectedCtc >= salaryRange.min && expectedCtc <= salaryRange.max

    let percentage: number
    if (expectedCtc <= salaryRange.max) {
      percentage = 100
    } else {
      const overage = (expectedCtc - salaryRange.max) / salaryRange.max
      percentage = Math.max(0, Math.round(100 - overage * 100))
    }

    const passed = percentage >= threshold

    const analysis = this.buildSalaryAnalysis(
      salaryRange,
      input.currentCtc,
      expectedCtc,
      percentage,
      passed,
    )

    return { percentage, expectedWithinRange, analysis, passed }
  }

  async generateRejectionReason(
    stage: 'skill' | 'salary',
    context: Record<string, unknown>,
  ): Promise<string> {
    if (this.claudeCliService.isEnabled) {
      try {
        const systemPrompt =
          'You are a professional, empathetic HR communicator. Write a concise ' +
          '(2-3 sentence) rejection reason for a candidate. Be respectful, ' +
          'specific and constructive. Respond with JSON: { "reason": string }.'
        const result = await this.claudeCliService.completeJson<{ reason: string }>(
          systemPrompt,
          `Rejection stage: ${stage}. Context: ${JSON.stringify(context)}`,
        )
        if (result.reason) return result.reason
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`AI rejection reason failed, using template: ${message}`)
      }
    }

    return this.templateRejection(stage, context)
  }

  private async buildSkillAnalysis(
    jobTitle: string,
    matched: string[],
    missing: string[],
    percentage: number,
    passed: boolean,
  ): Promise<string> {
    const fallback =
      `Skill match for ${jobTitle}: ${percentage}%. ` +
      `Strong in ${matched.join(', ') || 'none of the required skills'}. ` +
      (missing.length
        ? `Missing: ${missing.join(', ')}.`
        : 'No missing required skills.') +
      ` Outcome: ${passed ? 'passed' : 'rejected'}.`

    if (!this.claudeCliService.isEnabled) return fallback

    try {
      const systemPrompt =
        'You are a technical recruiter. Summarise a candidate skill match in ' +
        '2 sentences. Respond with JSON: { "analysis": string }.'
      const result = await this.claudeCliService.completeJson<{ analysis: string }>(
        systemPrompt,
        JSON.stringify({ jobTitle, matched, missing, percentage, passed }),
      )
      return result.analysis || fallback
    } catch {
      return fallback
    }
  }

  private buildSalaryAnalysis(
    range: ISalaryRange,
    currentCtc: number,
    expectedCtc: number,
    percentage: number,
    passed: boolean,
  ): string {
    return (
      `Expected CTC ${expectedCtc} ${range.currency} against budget ` +
      `${range.min}-${range.max} ${range.currency} (current ${currentCtc}). ` +
      `Salary match: ${percentage}%. Outcome: ${passed ? 'passed' : 'rejected'}.`
    )
  }

  private templateRejection(
    stage: 'skill' | 'salary',
    context: Record<string, unknown>,
  ): string {
    if (stage === 'skill') {
      const missing = (context.missingSkills as string[] | undefined) ?? []
      return (
        'Thank you for applying. Based on our assessment, your current skill ' +
        'set did not meet the minimum match required for this role' +
        (missing.length
          ? `, particularly in ${missing.join(', ')}.`
          : '.') +
        ' We encourage you to apply again in the future.'
      )
    }

    return (
      'Thank you for your interest. Unfortunately, your salary expectation ' +
      'falls outside the approved budget range for this position, so we are ' +
      'unable to proceed at this time. We wish you the best in your search.'
    )
  }

  private normalize(skills: string[]): string[] {
    const seen = new Set<string>()
    const result: string[] = []
    for (const skill of skills) {
      const trimmed = skill.trim()
      const key = trimmed.toLowerCase()
      if (trimmed && !seen.has(key)) {
        seen.add(key)
        result.push(trimmed)
      }
    }
    return result
  }
}
