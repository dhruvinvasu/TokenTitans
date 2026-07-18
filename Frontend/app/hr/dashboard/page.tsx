'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import type { DashboardOverview } from '@/lib/types'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<DashboardOverview>('/dashboard/overview', { authorized: true })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="muted">Loading dashboard…</p>

  const t = data.totals
  return (
    <div>
      <h1>Dashboard</h1>

      <div className="grid grid-4">
        <Stat label="Total Candidates" value={t.totalCandidates} />
        <Stat label="Test Pending" value={t.pending} />
        <Stat label="Passed / Active" value={t.passed} />
        <Stat label="Rejected" value={t.rejected} />
        <Stat label="Interviews" value={t.interview} />
        <Stat label="Offers" value={t.offer} />
        <Stat label="Joined" value={t.joined} />
        <Stat label="Under Review" value={t.underReview} />
      </div>

      <div className="grid grid-2" style={{ marginTop: 8 }}>
        <div className="card">
          <h2>Skill Match</h2>
          <p>
            Average <strong>{data.skillMatchStats.average}%</strong> · Passed{' '}
            {data.skillMatchStats.passed} · Failed {data.skillMatchStats.failed}
          </p>
          <h2 style={{ marginTop: 16 }}>Salary Match</h2>
          <p>
            Average <strong>{data.salaryMatchStats.average}%</strong> · Passed{' '}
            {data.salaryMatchStats.passed} · Failed {data.salaryMatchStats.failed}
          </p>
        </div>
        <div className="card">
          <h2>Aptitude Tests</h2>
          <p>
            Average score <strong>{data.testStatistics.averagePercentage}%</strong> ·
            Average risk {data.testStatistics.averageRiskScore} · Total violations{' '}
            {data.testStatistics.totalViolations}
          </p>
          <h2 style={{ marginTop: 16 }}>Email Delivery</h2>
          <p>
            Sent {data.emailStatistics.sent} · Failed {data.emailStatistics.failed} ·
            Pending {data.emailStatistics.pending}
          </p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Recent Applications</h2>
          <table>
            <tbody>
              {data.recentApplications.map((c) => (
                <tr key={c._id}>
                  <td>
                    <Link href={`/hr/candidates/${c._id}`}>{c.fullName}</Link>
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
              {data.recentApplications.length === 0 && (
                <tr>
                  <td className="muted">No applications yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Recent Activity</h2>
          {data.recentActivities.map((a) => (
            <div key={a._id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div>{a.message}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {data.recentActivities.length === 0 && (
            <p className="muted">No activity yet.</p>
          )}
        </div>
      </div>

      {data.candidatesByJob.length > 0 && (
        <div className="card">
          <h2>Candidates by Job</h2>
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Candidates</th>
              </tr>
            </thead>
            <tbody>
              {data.candidatesByJob.map((j) => (
                <tr key={j._id}>
                  <td>{j.title}</td>
                  <td>{j.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}
