import { injectable } from 'inversify'
import { spawn } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import { Config } from '@/config/app.config'
import { logger } from '@/utils/logger.util'

// Untrusted content (resumes, HR assistant questions) flows into these
// prompts, so every filesystem/shell/network tool is blocked — the CLI is
// used purely as a text/JSON completion backend, never as an agent.
const DISALLOWED_TOOLS = 'Bash,Read,Write,Edit,NotebookEdit,Glob,Grep,WebSearch,WebFetch'

const CLI_TIMEOUT_MS = 120_000
const IS_WINDOWS = process.platform === 'win32'

interface ClaudeCliResponse {
  result?: string
  is_error?: boolean
}

/**
 * Thin wrapper around the Claude Code CLI running in headless print mode
 * (`claude -p`). Centralises process invocation, JSON-mode prompting and
 * error handling so feature services never shell out directly. All methods
 * return typed, already-parsed objects.
 *
 * Authentication comes from the CLI's own logged-in session (`claude auth
 * login`) by default; ANTHROPIC_API_KEY is only forwarded when explicitly
 * configured. The system prompt is passed via a temp file and the user
 * prompt via stdin, so untrusted content never reaches the command line.
 */
@injectable()
export class ClaudeCliService {
  private readonly enabled: boolean
  private readonly model: string
  private readonly cliPath: string

  constructor() {
    this.model = Config.CLAUDE_MODEL
    this.cliPath = Config.CLAUDE_CLI_PATH
    this.enabled = Config.CLAUDE_ENABLED

    if (!this.enabled) {
      logger.warn(
        'CLAUDE_ENABLED is false — AI features will fall back to deterministic behaviour.',
      )
    } else if (!Config.ANTHROPIC_API_KEY) {
      logger.info(
        `Claude CLI uses the logged-in session (no ANTHROPIC_API_KEY set); ensure "${this.cliPath}" is installed and authenticated via "claude auth login".`,
      )
    }
  }

  get isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Sends a system+user prompt and returns the parsed JSON object. Throws
   * when disabled or on CLI failure; callers decide whether to fall back to
   * a deterministic implementation.
   */
  async completeJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    const content = await this.run(systemPrompt, userPrompt)
    return JSON.parse(stripCodeFence(content)) as T
  }

  /**
   * Free-form text completion used for narrative summaries (assistant answers).
   */
  async completeText(systemPrompt: string, userPrompt: string): Promise<string> {
    const content = await this.run(systemPrompt, userPrompt)
    return content.trim()
  }

  private async run(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.enabled) {
      throw new Error('Claude CLI is disabled')
    }

    // The system prompt is written to a temp file (never the command line) so
    // special characters can't break shell parsing on Windows.
    const systemPromptFile = join(tmpdir(), `claude-sys-${randomUUID()}.txt`)
    await writeFile(systemPromptFile, systemPrompt, 'utf8')

    try {
      const stdout = await this.spawnCli(systemPromptFile, userPrompt)
      const response = JSON.parse(stdout) as ClaudeCliResponse
      if (response.is_error || !response.result) {
        throw new Error('Claude CLI returned an empty or error response')
      }
      return response.result
    } finally {
      await unlink(systemPromptFile).catch(() => undefined)
    }
  }

  private spawnCli(systemPromptFile: string, userPrompt: string): Promise<string> {
    // On Windows the CLI is typically a `.cmd` shim that Node can only launch
    // through a shell; value args are quoted so paths with spaces survive.
    const quote = (value: string): string => (IS_WINDOWS ? `"${value}"` : value)

    const args = [
      '--model',
      quote(this.model),
      '--system-prompt-file',
      quote(systemPromptFile),
      '--disallowedTools',
      quote(DISALLOWED_TOOLS),
      '--output-format',
      'json',
      '--no-session-persistence',
      '-p',
    ]

    // Only forward a real API key; when absent, leave it unset so the CLI uses
    // its own logged-in (OAuth) session instead of failing on an empty key.
    const env = { ...process.env }
    if (Config.ANTHROPIC_API_KEY) {
      env.ANTHROPIC_API_KEY = Config.ANTHROPIC_API_KEY
    } else {
      delete env.ANTHROPIC_API_KEY
    }

    return new Promise<string>((resolve, reject) => {
      // cwd is a neutral temp dir so the project's CLAUDE.md and other local
      // context are not auto-loaded into the completion.
      const child = spawn(this.cliPath, args, {
        env,
        cwd: tmpdir(),
        shell: IS_WINDOWS,
        timeout: CLI_TIMEOUT_MS,
        windowsHide: true,
      })

      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => {
        stdout += chunk
      })
      child.stderr.on('data', (chunk) => {
        stderr += chunk
      })
      child.on('error', reject)
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(
            new Error(`Claude CLI exited with code ${code ?? 'null'}: ${stderr.trim()}`),
          )
        }
      })

      // The user prompt goes through stdin so untrusted content never touches
      // the command line.
      child.stdin.on('error', () => undefined)
      child.stdin.write(userPrompt)
      child.stdin.end()
    })
  }
}

/** Strips a ```json ... ``` (or bare ``` ... ```) fence Claude sometimes wraps JSON answers in. */
const stripCodeFence = (text: string): string => {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1] : trimmed
}
