# HR Automation System — Documentation

Production-ready HR automation backend built on the existing **Express + TypeScript + Inversify + Mongoose + Zod + JWT** architecture. It covers the full candidate lifecycle: application intake, resume parsing, AI skill/salary matching, secure aptitude testing with enterprise-grade proctoring, an HR dashboard, and a natural-language **AI HR Assistant**.

> This document complements [`PROJECT-STRUCTURE.md`](PROJECT-STRUCTURE.md) (base scaffold conventions). Every module here follows those conventions exactly (module = `models / repositories / services / controllers / routes / validations / dtos`, DI via `inversify.config.ts`, soft-delete via `BaseSchema`).

---

## 1. Architecture

```
HTTP → router.ts → v1Router.ts → <module>.routes
         → [authMiddleware] → [authorize(role)] → validate(ZodSchema) → asyncWrapper(controller)
             → Controller (thin) → Service (business logic) → Repository → Mongoose Model → MongoDB
         → error-handler.middleware (BaseError → JSON)
```

- **Controllers** are thin; they only translate HTTP ⇄ service calls (`BaseController.ok/created/noContent`).
- **Services** hold all business logic and are `@injectable()`; cross-module orchestration happens in `CandidateService` and `AptitudeService`.
- **Repositories** extend `IRepository<T>` and add entity-specific queries.
- **Shared infra services**: `OpenAiService`, `MailService`, `TimelineService`, `AuditService`, `NotificationService`.
- **AI** is provided by the Claude Code CLI with a **deterministic fallback** everywhere, so the system remains fully functional without an API key (resume extraction via keyword dictionary, template rejection reasons, a static aptitude bank, and a keyword-based assistant planner).

---

## 2. Roles & Authorization

Roles are seeded at boot (`HR`, `QA`, `Developer`, `Candidate`). Two roles are used by this system:

| Role | Capabilities |
|------|--------------|
| **HR** | Full management: jobs, candidates, dashboard, aptitude reports, AI assistant, notifications. |
| **Candidate** | Public endpoints only: browse jobs, apply, take the aptitude test (secured by a per-test token). |

- `authMiddleware()` verifies the JWT and stamps `req.userId / userEmail / userRole`.
- `authorize(...roles)` (`src/middlewares/authorize.middleware.ts`) guards HR-only routes and returns `403 INSUFFICIENT_PERMISSIONS` otherwise.
- Candidate-facing test endpoints are **not** JWT-guarded; they are authenticated by a cryptographically-random 32-char `nanoid` token delivered by email.

---

## 3. Candidate Status Pipeline

```
APPLIED → RESUME_UPLOADED → RESUME_PARSED → SKILL_MATCHING
   → SKILL_REJECTED  |  SKILL_PASSED → SALARY_MATCHING
   → SALARY_REJECTED |  SALARY_PASSED → EMAIL_SENT → TEST_PENDING
   → TEST_STARTED → TEST_COMPLETED | TEST_FAILED
   → UNDER_HR_REVIEW → INTERVIEW_SCHEDULED → OFFER_SENT → JOINED | REJECTED | ARCHIVED
```

Every transition is persisted to the **candidate timeline** (`candidate_timelines`) with `fromStatus`, `toStatus`, actor and message, giving a complete audit trail.

---

## 4. Intake Pipeline (automated, on apply)

`POST /v1/candidates/apply` (public, multipart) runs the entire funnel synchronously in `CandidateService.apply`:

```
apply → create Candidate (APPLIED)
      → store resume file (multer/local disk) + extract text (pdf-parse / mammoth)
      → AI resume analysis → Resume + denormalised Candidate.profile (RESUME_PARSED)
      → Skill match (deterministic %) vs Job.requiredSkills
            < threshold → AI/template rejection reason → SKILL_REJECTED (returns immediately)
      → Salary match (Expected CTC vs Job.salaryRange)
            < threshold → rejection reason → SALARY_REJECTED (returns immediately)
      → AptitudeService.createAndInvite → generate 15 role-specific questions,
        create secure test (2-day token), send invitation email (EMAIL_SENT → TEST_PENDING)
      → return { outcome: PASSED, skillMatch, salaryMatch, message }
```

**Business rules** (per-job overridable, defaults from env):
- Skill match **≥ 70%** to pass (`SKILL_MATCH_THRESHOLD` / `job.skillMatchThreshold`).
- Salary match **≥ 80%** to pass (`SALARY_MATCH_THRESHOLD` / `job.salaryMatchThreshold`).
- Salary match = `100` if `expectedCtc ≤ salaryRange.max`, else decays by the overage ratio.

The candidate immediately sees `REJECTED` + AI reason, or `PASSED` + "test invitation sent".

---

## 5. Secure Aptitude Test

- **Generation**: `AptitudeService` asks the Claude CLI for `APTITUDE_QUESTION_COUNT` (15) role-specific MCQs (4 options, one correct). Falls back to a static bank if AI is unavailable, and pads partial AI output.
- **Security**: `correctIndex` is stored with `select: false`; the candidate view never receives it.
- **Timer**: `durationMinutes` (10) enforced server-side via `deadlineAt`; the client auto-submits on expiry, and `submitTest` caps `timeTakenSeconds` at the allowed duration.
- **Proctoring telemetry** (`test_events`): batched events, either `VIOLATION` (weighted) or `TELEMETRY` (recorded only). Violation types and weights live in `aptitude.constants.ts` (tab switch, window blur, visibility change, fullscreen exit, copy, paste, right-click, keyboard shortcut, DevTools, refresh, resize, multiple monitors).
- **Risk score** = `min(100, Σ violation weights)`. **Auto-fail** when `violationCount ≥ APTITUDE_MAX_VIOLATIONS` (5): status → `FAILED`, candidate → `TEST_FAILED`, recommendation → `DISQUALIFIED`, HR notified.
- **Resilience**: internet loss is handled client-side (events buffered locally and re-synced); a controlled **resume** is permitted (`resumeAllowed`) after accidental disconnect/close, tracked via `resumeCount`.
- **HR support actions**: `reset` (re-issue a fresh test) and `extend` (lengthen validity) — for candidates who hit power/system/internet failures.
- **Scoring**: `score`, `percentage`, `correctCount`, `wrongCount`, `timeTakenSeconds`, `riskScore`, `recommendation` (`STRONG_PASS | PASS | BORDERLINE | FAIL | DISQUALIFIED`).

---

## 6. AI HR Assistant (NL → MongoDB)

`POST /v1/assistant/ask` translates a natural-language HR question into a **safe** query:

1. The Claude CLI produces a **structured query plan** limited to a field whitelist (`assistant.constants.ts`) — never raw Mongo operators.
2. `AssistantService.translate` converts the plan to a Mongoose filter, **ignoring any field outside the whitelist** (blocks `$where`/`$function` injection) and escaping regex input.
3. The filter runs read-only (`limit` clamped to ≤ 200), and the Claude CLI writes a concise narrative answer over the results.
4. A **deterministic keyword planner** handles common questions (status, skills, CTC, experience) when AI is off.

Whitelisted fields: `status, fullName, email, currentCtc, expectedCtc, riskScore, skillMatchPercentage, salaryMatchPercentage, skills, experienceYears, location, previousCompanies, createdAt`. Operators: `eq, ne, gt, gte, lt, lte, in, contains, before, after, today`.

---

## 7. MongoDB Collections

| Collection | Model | Purpose |
|------------|-------|---------|
| `users` | `User` | HR / candidate auth users (existing). |
| `roles` | `Role` | Seeded roles (existing). |
| `jobs` | `Job` | Open positions: required skills, salary range, thresholds. |
| `candidates` | `Candidate` | Core entity: personal info, CTC, status, skill/salary match, profile snapshot, notes, interview, offer. |
| `resumes` | `Resume` | Uploaded file metadata, raw text, AI analysis (skills, experience, education, projects, certifications, companies, summary). |
| `aptitude_tests` | `AptitudeTest` | Test token, questions (answers hidden), answers, score, risk, recommendation. |
| `test_events` | `TestEvent` | Per-test proctoring telemetry + violations. |
| `email_logs` | `EmailLog` | Every outgoing email + delivery status. |
| `candidate_timelines` | `CandidateTimeline` | Full status/audit history per candidate. |
| `audit_logs` | `AuditLog` | HR action audit (notes, deletes, etc.). |
| `notifications` | `Notification` | HR notification feed. |

**Key indexes**: `users.email` (partial, unique when not deleted); `candidates.{status, job, email, skillMatch.percentage}`; `aptitude_tests.token` (unique); `test_events.{test, candidate, category, type}`; `email_logs.{candidate, status}`; `candidate_timelines.candidate`.

---

## 8. API Reference

Base URL: `http://localhost:{PORT}/v1`. All HR routes require `Authorization: Bearer <token>`.

### Auth
| Method | Route | Auth | Body |
|--------|-------|------|------|
| POST | `/auth/register` | Public | `{ firstName, lastName, email, password, role, phoneNumber? }` |
| POST | `/auth/login` | Public | `{ email, password }` → `{ token, user }` |

### Jobs
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/jobs/active` | Public | Open positions for candidates. |
| GET | `/jobs/:jobId` | Public | Job detail. |
| GET | `/jobs` | HR | All jobs. |
| POST | `/jobs` | HR | Create. |
| PUT | `/jobs/:jobId` | HR | Update. |
| DELETE | `/jobs/:jobId` | HR | Soft delete. |

### Candidates
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| POST | `/candidates/apply` | Public | Multipart: fields + `resume` file. Runs full pipeline. |
| GET | `/candidates` | HR | Filters: `status, jobId, search, page, limit`. |
| GET | `/candidates/:candidateId` | HR | Details + timeline + email history. |
| GET | `/candidates/:candidateId/export` | HR | Full JSON export. |
| POST | `/candidates/:candidateId/notes` | HR | `{ text }` |
| PATCH | `/candidates/:candidateId/recruiter` | HR | `{ recruiterId }` |
| POST | `/candidates/:candidateId/interview` | HR | `{ scheduledAt, mode, location? }` |
| POST | `/candidates/:candidateId/interview/feedback` | HR | `{ feedback }` |
| POST | `/candidates/:candidateId/offer` | HR | `{ ctc, joiningDate? }` |
| PATCH | `/candidates/:candidateId/joined` | HR | Mark joined. |
| PATCH | `/candidates/:candidateId/reject` | HR | `{ reason }` |
| PATCH | `/candidates/:candidateId/archive` | HR | Archive. |
| DELETE | `/candidates/:candidateId` | HR | Soft delete. |

### Resume
| Method | Route | Auth |
|--------|-------|------|
| GET | `/resumes/:candidateId` | HR |
| GET | `/resumes/:candidateId/download` | HR |

### Aptitude
| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/aptitude/:token` | Token | Candidate test view (answers hidden). |
| POST | `/aptitude/:token/start` | Token | Start / controlled resume. |
| POST | `/aptitude/:token/events` | Token | Batch telemetry + violations → security snapshot. |
| POST | `/aptitude/:token/submit` | Token | `{ answers[], autoSubmitted? }` → result. |
| GET | `/aptitude/hr/report/:candidateId` | HR | Full report + events + violations. |
| POST | `/aptitude/hr/reset/:candidateId` | HR | Reset test. |
| POST | `/aptitude/hr/extend/:candidateId` | HR | `{ days }` |

### Dashboard / Assistant / Notifications
| Method | Route | Auth |
|--------|-------|------|
| GET | `/dashboard/overview` | HR |
| POST | `/assistant/ask` | HR |
| GET | `/notifications` | HR |
| PATCH | `/notifications/read-all` | HR |

**Error shape** (`BaseError`): `{ error, message, validationErrors? }` with status 400/401/403/404/409/500.

---

## 9. Environment Variables

See `.env.example`. Added by this system:

| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_BASE_URL` | `http://localhost:3000` | Frontend base for the test link in emails. |
| `UPLOAD_DIR` | `uploads` | Local disk resume storage. |
| `MAX_UPLOAD_SIZE_MB` | `5` | Upload size limit. |
| `ANTHROPIC_API_KEY` | — | Optional. Empty → the CLI uses its logged-in session (`claude auth login`). Set only if you have an API key. |
| `CLAUDE_MODEL` | `claude-sonnet-5` | Claude model alias/ID. |
| `CLAUDE_CLI_PATH` | `claude` | Path to the Claude Code CLI executable. |
| `CLAUDE_ENABLED` | `true` | Master switch for AI features (`false` → deterministic fallback). |
| `SMTP_HOST/PORT/SECURE/USER/PASSWORD` | — | Nodemailer transport. |
| `MAIL_FROM_NAME/EMAIL` | — | Sender identity. |
| `APTITUDE_QUESTION_COUNT` | `15` | Questions per test. |
| `APTITUDE_DURATION_MINUTES` | `10` | Test duration. |
| `APTITUDE_LINK_VALID_DAYS` | `2` | Link validity. |
| `APTITUDE_MAX_VIOLATIONS` | `5` | Auto-fail threshold. |
| `SKILL_MATCH_THRESHOLD` | `70` | Default skill pass %. |
| `SALARY_MATCH_THRESHOLD` | `80` | Default salary pass %. |

---

## 10. Running

```bash
npm install
cp .env.example .env      # set DATABASE_URI, JWT_SECRET (32+ chars); optionally ANTHROPIC_API_KEY + SMTP
npm run dev               # ts-node-dev hot reload
# or
npm run build && npm start
```

Type-check / lint / build: `npm run type-check`, `npm run lint`, `npm run build`.

Import `postman/HR-Automation.postman_collection.json` + `postman/HR-Automation.postman_environment.json`, then run **Auth → Login** first to populate `{{token}}`.

---

## 11. Frontend

A Next.js (App Router, TypeScript) client lives in [`../frontend`](../frontend) with:
- **Candidate**: job listing, application form, aptitude test runner with full client-side security monitoring.
- **HR**: login, dashboard, candidate list & detail, AI assistant chat.

See `../frontend/README.md`.
