'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { ApplyResult, Job } from '@/lib/types'

export default function ApplyPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = use(params)
  const [job, setJob] = useState<Job | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ApplyResult | null>(null)

  useEffect(() => {
    api<{ job: Job }>(`/jobs/${jobId}`)
      .then((res) => setJob(res.job))
      .catch((e) => setError(e.message))
  }, [jobId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const form = new FormData(e.currentTarget)
      form.append('jobId', jobId)
      const res = await api<ApplyResult>('/candidates/apply', {
        method: 'POST',
        body: form,
        isForm: true,
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    const passed = result.outcome === 'PASSED'
    return (
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card center">
          <div
            className={`badge ${passed ? 'badge-success' : 'badge-danger'}`}
            style={{ fontSize: 15, padding: '6px 16px' }}
          >
            {passed ? 'Screening Passed' : 'Application Rejected'}
          </div>
          <h1 style={{ marginTop: 16 }}>
            {passed ? 'Congratulations!' : 'Thank you for applying'}
          </h1>
          <p>{result.message}</p>

          {result.skillMatch && (
            <div className="card" style={{ textAlign: 'left' }}>
              <h3>Skill Match: {result.skillMatch.percentage}%</h3>
              <p className="muted">{result.skillMatch.analysis}</p>
              {result.skillMatch.missingSkills.length > 0 && (
                <p>
                  <strong>Missing skills:</strong>{' '}
                  {result.skillMatch.missingSkills.join(', ')}
                </p>
              )}
            </div>
          )}
          {result.salaryMatch && (
            <div className="card" style={{ textAlign: 'left' }}>
              <h3>Salary Match: {result.salaryMatch.percentage}%</h3>
              <p className="muted">{result.salaryMatch.analysis}</p>
            </div>
          )}
          {passed && (
            <p className="muted">
              Please check your email for the secure aptitude test link (valid for 2 days).
            </p>
          )}
          <Link className="btn-ghost btn" href="/">
            Back to Positions
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <Link href="/" className="muted">
        ← Back to positions
      </Link>
      <h1 style={{ marginTop: 12 }}>Apply{job ? ` — ${job.title}` : ''}</h1>
      {job && (
        <p className="muted">
          Required: {job.requiredSkills.join(', ')} · Budget {job.salaryRange.currency}{' '}
          {job.salaryRange.min.toLocaleString()}–{job.salaryRange.max.toLocaleString()}
        </p>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <label>Full Name *</label>
        <input name="fullName" required minLength={2} />

        <label>Email *</label>
        <input name="email" type="email" required />

        <label>Phone Number</label>
        <input name="phoneNumber" placeholder="+919999999999" />

        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Current CTC *</label>
            <input name="currentCtc" type="number" min={0} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>Expected CTC *</label>
            <input name="expectedCtc" type="number" min={0} required />
          </div>
        </div>

        <label>Location</label>
        <input name="location" placeholder="City" />

        <label>Resume (PDF or DOCX) *</label>
        <input name="resume" type="file" accept=".pdf,.docx" required />

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Analysing resume…' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  )
}
