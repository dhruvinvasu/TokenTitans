'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import type { Candidate } from '@/lib/types'

interface ListResponse {
  candidates: Candidate[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

const STATUS_OPTIONS = [
  '',
  'APPLIED',
  'SKILL_REJECTED',
  'SALARY_REJECTED',
  'TEST_PENDING',
  'TEST_COMPLETED',
  'TEST_FAILED',
  'UNDER_HR_REVIEW',
  'INTERVIEW_SCHEDULED',
  'OFFER_SENT',
  'JOINED',
]

export default function CandidatesPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    api<ListResponse>(`/candidates?${params.toString()}`, { authorized: true })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [status, search, page])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <h1>Candidates</h1>

      <div className="card row" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: 2 }}>
          <label>Search</label>
          <input
            value={search}
            placeholder="Name or email"
            onChange={(e) => {
              setPage(1)
              setSearch(e.target.value)
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Status</label>
          <select
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s ? s.replace(/_/g, ' ') : 'All'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Job</th>
              <th>Skill %</th>
              <th>Salary %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.candidates.map((c) => (
              <tr key={c._id}>
                <td>
                  <Link href={`/hr/candidates/${c._id}`}>{c.fullName}</Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {c.email}
                  </div>
                </td>
                <td>{c.job?.title ?? '—'}</td>
                <td>{c.skillMatch?.percentage ?? '—'}</td>
                <td>{c.salaryMatch?.percentage ?? '—'}</td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
              </tr>
            ))}
            {data && data.candidates.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No candidates found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pagination.pages > 1 && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <button
            className="btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="muted" style={{ alignSelf: 'center' }}>
            Page {data.pagination.page} of {data.pagination.pages}
          </span>
          <button
            className="btn-ghost"
            disabled={page >= data.pagination.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
