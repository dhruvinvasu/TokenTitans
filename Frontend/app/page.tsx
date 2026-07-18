'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Job } from '@/lib/types'

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ jobs: Job[] }>('/jobs/active')
      .then((res) => setJobs(res.jobs))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container">
      <div className="navbar" style={{ margin: '-24px -24px 24px', borderRadius: 0 }}>
        <strong>HR Automation</strong>
        <div className="spacer" />
        <Link href="/hr/login">HR Login</Link>
      </div>

      <h1>Open Positions</h1>
      <p className="muted">
        Apply below. Your resume is analysed instantly and you will immediately see
        whether you have progressed to the aptitude test round.
      </p>

      {loading && <p className="muted">Loading positions…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && jobs.length === 0 && <p className="muted">No open positions right now.</p>}

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        {jobs.map((job) => (
          <div className="card" key={job._id}>
            <h2>{job.title}</h2>
            <p className="muted">
              {job.location ?? 'Remote'} · {job.experienceRequired}+ yrs ·{' '}
              {job.salaryRange.currency} {job.salaryRange.min.toLocaleString()}–
              {job.salaryRange.max.toLocaleString()}
            </p>
            <p>{job.description}</p>
            <div style={{ margin: '12px 0' }}>
              {job.requiredSkills.map((s) => (
                <span className="pill" key={s} style={{ marginRight: 6 }}>
                  {s}
                </span>
              ))}
            </div>
            <Link className="btn" href={`/apply/${job._id}`}>
              Apply Now
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
