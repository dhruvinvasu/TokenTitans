'use client'

import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import type { Candidate } from '@/lib/types'

interface AssistantResponse {
  intent: string
  count: number
  answer: string
  candidates?: Candidate[]
}

const SUGGESTIONS = [
  'List all passed candidates',
  'Show rejected candidates',
  'Candidates having React skill',
  'Candidates with expected CTC less than 1000000',
  'Candidates with skill match greater than 90%',
  'Candidates having more than 5 years experience',
  'Candidates waiting for interview',
  'How many candidates applied today',
]

export default function AssistantPage() {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<AssistantResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function ask(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api<AssistantResponse>('/assistant/ask', {
        method: 'POST',
        body: { question: q },
        authorized: true,
      })
      setResponse(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>AI HR Assistant</h1>
      <p className="muted">
        Ask about candidates in plain English. Questions are translated into safe
        database queries.
      </p>

      <div className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(question)
          }}
          className="row"
          style={{ alignItems: 'flex-end' }}
        >
          <div style={{ flex: 1 }}>
            <label>Your question</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Candidates with skill match greater than 90%"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Thinking…' : 'Ask'}
          </button>
        </form>

        <div style={{ marginTop: 12 }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="btn-ghost"
              style={{ margin: '4px 6px 0 0', fontSize: 12, padding: '6px 10px' }}
              onClick={() => {
                setQuestion(s)
                ask(s)
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {response && (
        <div className="card">
          <p>
            <strong>{response.answer}</strong>
          </p>
          <p className="muted">
            Intent: {response.intent} · {response.count} match(es)
          </p>
          {response.candidates && response.candidates.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Job</th>
                  <th>Skill %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {response.candidates.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <Link href={`/hr/candidates/${c._id}`}>{c.fullName}</Link>
                    </td>
                    <td>{c.job?.title ?? '—'}</td>
                    <td>{c.skillMatch?.percentage ?? '—'}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
