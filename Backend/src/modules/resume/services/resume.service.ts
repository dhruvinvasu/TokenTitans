import { promises as fs } from 'fs'
import { inject, injectable } from 'inversify'
import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'
import NotFoundError from '@/errors/not-found.error'
import { ClaudeCliService } from '@/modules/ai/services/claude-cli.service'
import { KNOWN_SKILLS } from '@/modules/resume/constants/skills.constants'
import {
  IResume,
  IResumeAnalysis,
} from '@/modules/resume/models/resume.model'
import { ResumeRepository } from '@/modules/resume/repositories/resume.repository'
import { TYPES } from '@/types/di.types'
import { logger } from '@/utils/logger.util'

export interface StoredUpload {
  originalName: string
  storedName: string
  path: string
  mimeType: string
  size: number
}

@injectable()
export class ResumeService {
  constructor(
    @inject(TYPES.ResumeRepository)
    private readonly resumeRepository: ResumeRepository,
    @inject(TYPES.ClaudeCliService)
    private readonly claudeCliService: ClaudeCliService,
  ) {}

  /**
   * Persists the uploaded file metadata, extracts its text and runs analysis.
   * Returns the fully parsed resume document.
   */
  async processUpload(
    candidateId: string,
    upload: StoredUpload,
  ): Promise<IResume> {
    const rawText = await this.extractText(upload.path, upload.mimeType)
    const analysis = await this.analyze(rawText)

    const resume = await this.resumeRepository.create({
      candidate: candidateId as unknown as never,
      originalName: upload.originalName,
      storedName: upload.storedName,
      path: upload.path,
      mimeType: upload.mimeType,
      size: upload.size,
      rawText,
      analysis,
      parsedAt: new Date(),
    })

    return resume
  }

  async getByCandidate(candidateId: string) {
    const resume = await this.resumeRepository.findByCandidate(candidateId)
    if (!resume) {
      throw new NotFoundError({
        error: 'RESUME_NOT_FOUND',
        message: 'Resume not found for this candidate.',
      })
    }
    return resume
  }

  private async extractText(path: string, mimeType: string): Promise<string> {
    try {
      const buffer = await fs.readFile(path)

      if (mimeType === 'application/pdf') {
        const parsed = await pdfParse(buffer)
        return parsed.text.trim()
      }

      if (
        mimeType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        const result = await mammoth.extractRawText({ buffer })
        return result.value.trim()
      }

      return buffer.toString('utf-8').trim()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to extract resume text: ${message}`)
      return ''
    }
  }

  /**
   * Uses the Claude CLI to extract structured resume data, falling back to a
   * deterministic keyword-based extraction when AI is unavailable or errors.
   */
  private async analyze(rawText: string): Promise<IResumeAnalysis> {
    if (!rawText) return this.emptyAnalysis()

    if (this.claudeCliService.isEnabled) {
      try {
        return await this.analyzeWithAi(rawText)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        logger.error(
          `AI resume analysis failed, using deterministic fallback: ${message}`,
        )
      }
    }

    return this.analyzeDeterministic(rawText)
  }

  private async analyzeWithAi(rawText: string): Promise<IResumeAnalysis> {
    const systemPrompt =
      'You are an expert technical recruiter. Extract structured data from the ' +
      'resume text. Respond ONLY with JSON matching this exact shape: ' +
      '{ "skills": string[], "experienceYears": number, "education": ' +
      '[{ "degree": string, "institution": string, "year": string }], ' +
      '"certifications": string[], "projects": [{ "name": string, ' +
      '"description": string, "technologies": string[] }], "keywords": string[], ' +
      '"previousCompanies": string[], "summary": string }. Use concise skill ' +
      'names. experienceYears is total professional experience as a number.'

    const result = await this.claudeCliService.completeJson<Partial<IResumeAnalysis>>(
      systemPrompt,
      `Resume text:\n\n${rawText.slice(0, 12000)}`,
    )

    return this.normalizeAnalysis(result)
  }

  private analyzeDeterministic(rawText: string): IResumeAnalysis {
    const lower = rawText.toLowerCase()

    const skills = KNOWN_SKILLS.filter((skill) =>
      lower.includes(skill.toLowerCase()),
    )

    const experienceYears = this.extractExperienceYears(rawText)
    const summary = rawText.replace(/\s+/g, ' ').slice(0, 400)

    return {
      skills,
      experienceYears,
      education: [],
      certifications: [],
      projects: [],
      keywords: skills,
      previousCompanies: [],
      summary,
    }
  }

  private extractExperienceYears(text: string): number {
    const match = text.match(/(\d+)\+?\s*(?:years|yrs)/i)
    if (match) {
      const years = Number.parseInt(match[1], 10)
      return Number.isFinite(years) ? years : 0
    }
    return 0
  }

  private normalizeAnalysis(
    input: Partial<IResumeAnalysis>,
  ): IResumeAnalysis {
    const skills = (input.skills ?? [])
      .map((skill) => skill.trim())
      .filter(Boolean)

    return {
      skills,
      experienceYears: Number.isFinite(input.experienceYears)
        ? Number(input.experienceYears)
        : 0,
      education: input.education ?? [],
      certifications: input.certifications ?? [],
      projects: input.projects ?? [],
      keywords: input.keywords ?? skills,
      previousCompanies: input.previousCompanies ?? [],
      summary: input.summary ?? '',
    }
  }

  private emptyAnalysis(): IResumeAnalysis {
    return {
      skills: [],
      experienceYears: 0,
      education: [],
      certifications: [],
      projects: [],
      keywords: [],
      previousCompanies: [],
      summary: '',
    }
  }
}
