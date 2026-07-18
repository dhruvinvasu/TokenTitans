'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { api, apiBase, auth } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import type { Candidate, EmailLog, TimelineEntry } from '@/lib/types'

interface Details {
  candidate: Candidate
  timeline: TimelineEntry[]
  emails: EmailLog[]
}

interface ResumeAnalysis {
  skills: string[]
  experienceYears: number
  education: Array<{ degree?: string; institution?: string; year?: string }>
  certifications: string[]
  projects: Array<{ name?: string; description?: string }>
  previousCompanies: string[]
  summary: string
}

interface AptitudeReport {
  test: {
    status: string
    percentage: number
    correctCount: number
    wrongCount: number
    timeTakenSeconds: number
    violationCount: number
    riskScore: number
    recommendation?: string
  }
  violations: Array<{ _id: string; type: string; occurredAt: string }>
}

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [details, setDetails] = useState<Details | null>(null)
  const [resume, setResume] = useState<ResumeAnalysis | null>(null)
  const [report, setReport] = useState<AptitudeReport | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api<Details>(`/candidates/${id}`, { authorized: true })
      .then(setDetails)
      .catch((e) => setError(e.message))
    api<{ resume: { analysis: ResumeAnalysis } }>(`/resumes/${id}`, { authorized: true })
      .then((r) => setResume(r.resume.analysis))
      .catch(() => setResume(null))
    api<AptitudeReport>(`/aptitude/hr/report/${id}`, { authorized: true })
      .then(setReport)
      .catch(() => setReport(null))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function action(fn: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await fn()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  if (error && !details) return <p className="error">{error}</p>
  if (!details) return <p className="muted">Loading candidate…</p>

  const c = details.candidate

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{c.fullName}</h1>
          <p className="muted">
            {c.email} · {c.phoneNumber ?? 'no phone'} · {c.job?.title ?? '—'}
          </p>
        </div>
        <StatusBadge status={c.status} />
      </div>

      {error && <p className="error">{error}</p>}

      <div className="grid grid-2">
        <div className="card">
          <h2>Screening</h2>
          <p>
            Current CTC: <strong>{c.currentCtc.toLocaleString()}</strong> · Expected:{' '}
            <strong>{c.expectedCtc.toLocaleString()}</strong>
          </p>
          {c.skillMatch && (
            <p>
              Skill match: <strong>{c.skillMatch.percentage}%</strong>{' '}
              {c.skillMatch.passed ? '✓' : '✗'} — {c.skillMatch.analysis}
              {c.skillMatch.missingSkills.length > 0 && (
                <>
                  <br />
                  <span className="muted">
                    Missing: {c.skillMatch.missingSkills.join(', ')}
                  </span>
                </>
              )}
            </p>
          )}
          {c.salaryMatch && (
            <p>
              Salary match: <strong>{c.salaryMatch.percentage}%</strong>{' '}
              {c.salaryMatch.passed ? '✓' : '✗'} — {c.salaryMatch.analysis}
            </p>
          )}
          {c.rejectionReason && (
            <p className="error">Rejection reason: {c.rejectionReason}</p>
          )}
          <a
            className="btn btn-ghost"
            href={`${apiBase}/resumes/${id}/download`}
            onClick={(e) => {
              // Download requires the auth header; open via fetch blob.
              e.preventDefault()
              void downloadResume(id)
            }}
          >
            Download Resume
          </a>
        </div>

        <div className="card">
          <h2>Resume Analysis</h2>
          {!resume && <p className="muted">No analysis available.</p>}
          {resume && (
            <>
              <p className="muted">{resume.summary || 'No summary extracted.'}</p>
              <p>
                <strong>Experience:</strong> {resume.experienceYears} years
              </p>
              <div>
                {resume.skills.map((s) => (
                  <span className="pill" key={s} style={{ marginRight: 6, marginBottom: 6, display: 'inline-block' }}>
                    {s}
                  </span>
                ))}
              </div>
              {resume.previousCompanies.length > 0 && (
                <p className="muted">
                  Companies: {resume.previousCompanies.join(', ')}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {report && (
        <div className="card">
          <h2>Aptitude Report</h2>
          <div className="grid grid-4">
            <Mini label="Status" value={report.test.status} />
            <Mini label="Score" value={`${report.test.percentage}%`} />
            <Mini label="Correct" value={`${report.test.correctCount}/${report.test.correctCount + report.test.wrongCount}`} />
            <Mini label="Risk" value={String(report.test.riskScore)} />
          </div>
          <p style={{ marginTop: 12 }}>
            Recommendation: <span className="badge">{report.test.recommendation ?? 'N/A'}</span>{' '}
            · Violations: {report.test.violationCount}
          </p>
          {report.violations.length > 0 && (
            <details>
              <summary className="muted">View {report.violations.length} violations</summary>
              <ul className="muted">
                {report.violations.map((v) => (
                  <li key={v._id}>
                    {v.type} — {new Date(v.occurredAt).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={() =>
                action(() =>
                  api(`/aptitude/hr/reset/${id}`, { method: 'POST', authorized: true }),
                )
              }
            >
              Reset Test
            </button>
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={() =>
                action(() =>
                  api(`/aptitude/hr/extend/${id}`, {
                    method: 'POST',
                    body: { days: 2 },
                    authorized: true,
                  }),
                )
              }
            >
              Extend 2 Days
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h2>Actions</h2>
          <div className="row">
            <button
              disabled={busy}
              onClick={() => {
                const at = prompt('Interview date/time (ISO, e.g. 2026-08-01T10:00:00Z)')
                if (!at) return
                action(() =>
                  api(`/candidates/${id}/interview`, {
                    method: 'POST',
                    body: { scheduledAt: new Date(at).toISOString(), mode: 'Video' },
                    authorized: true,
                  }),
                )
              }}
            >
              Schedule Interview
            </button>
            <button
              disabled={busy}
              onClick={() => {
                const ctc = prompt('Offer CTC')
                if (!ctc) return
                action(() =>
                  api(`/candidates/${id}/offer`, {
                    method: 'POST',
                    body: { ctc: Number(ctc) },
                    authorized: true,
                  }),
                )
              }}
            >
              Send Offer
            </button>
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={() =>
                action(() =>
                  api(`/candidates/${id}/joined`, { method: 'PATCH', authorized: true }),
                )
              }
            >
              Mark Joined
            </button>
            <button
              className="btn-danger"
              disabled={busy}
              onClick={() => {
                const reason = prompt('Rejection reason')
                if (!reason) return
                action(() =>
                  api(`/candidates/${id}/reject`, {
                    method: 'PATCH',
                    body: { reason },
                    authorized: true,
                  }),
                )
              }}
            >
              Reject
            </button>
          </div>

          <label>Add Internal Note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          <button
            style={{ marginTop: 8 }}
            disabled={busy || !note.trim()}
            onClick={() =>
              action(async () => {
                await api(`/candidates/${id}/notes`, {
                  method: 'POST',
                  body: { text: note },
                  authorized: true,
                })
                setNote('')
              })
            }
          >
            Add Note
          </button>

          {c.notes.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {c.notes.map((n, i) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  {n.text}
                  <div className="muted" style={{ fontSize: 12 }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Timeline</h2>
          {details.timeline.map((tItem) => (
            <div key={tItem._id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div>{tItem.message}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {tItem.actorType} · {new Date(tItem.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="value" style={{ fontSize: 20 }}>
        {value}
      </div>
      <div className="label">{label}</div>
    </div>
  )
}

async function downloadResume(id: string) {
  const res = await fetch(`${apiBase}/resumes/${id}/download`, {
    headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
  })
  if (!res.ok) return
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'resume'
  a.click()
  URL.revokeObjectURL(url)
}
