'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useProctoring } from '@/lib/useProctoring'
import type { AptitudeTestView, SecuritySnapshot } from '@/lib/types'

type Phase = 'loading' | 'intro' | 'active' | 'submitting' | 'result' | 'failed' | 'closed' | 'error'

interface SubmitResult {
  score: number
  percentage: number
  correctCount: number
  wrongCount: number
  timeTakenSeconds: number
  violationCount: number
  riskScore: number
  recommendation?: string
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AptitudePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [phase, setPhase] = useState<Phase>('loading')
  const [test, setTest] = useState<AptitudeTestView | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [remaining, setRemaining] = useState(0)
  const [snapshot, setSnapshot] = useState<SecuritySnapshot | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState('')
  const submittedRef = useRef(false)

  const onFail = useCallback((snap: SecuritySnapshot) => {
    setSnapshot(snap)
    setPhase('failed')
  }, [])

  const { flush } = useProctoring({
    token,
    active: phase === 'active',
    onSnapshot: setSnapshot,
    onFail,
  })

  useEffect(() => {
    api<{ test: AptitudeTestView }>(`/aptitude/${token}`)
      .then((res) => {
        setTest(res.test)
        if (['SUBMITTED', 'FAILED', 'EXPIRED'].includes(res.test.status)) {
          setPhase('closed')
        } else {
          setPhase('intro')
        }
      })
      .catch((e) => {
        setError(e.message)
        setPhase('error')
      })
  }, [token])

  const submit = useCallback(
    async (autoSubmitted: boolean) => {
      if (submittedRef.current) return
      submittedRef.current = true
      setPhase('submitting')
      await flush()
      try {
        const payload = Object.entries(answers).map(([qi, si]) => ({
          questionIndex: Number(qi),
          selectedIndex: si,
        }))
        const res = await api<{ result: SubmitResult }>(`/aptitude/${token}/submit`, {
          method: 'POST',
          body: { answers: payload, autoSubmitted },
        })
        setResult(res.result)
        setPhase('result')
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Submission failed')
        setPhase('error')
      }
    },
    [answers, flush, token],
  )

  // Countdown timer with auto-submit.
  useEffect(() => {
    if (phase !== 'active') return
    if (remaining <= 0) {
      void submit(true)
      return
    }
    const id = window.setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => window.clearTimeout(id)
  }, [phase, remaining, submit])

  async function startTest() {
    try {
      await document.documentElement.requestFullscreen().catch(() => {})
      const res = await api<{ test: AptitudeTestView }>(`/aptitude/${token}/start`, {
        method: 'POST',
      })
      setTest(res.test)
      setRemaining(res.test.remainingSeconds || res.test.durationMinutes * 60)
      setPhase('active')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start test')
      setPhase('error')
    }
  }

  if (phase === 'loading') return <Centered>Loading test…</Centered>
  if (phase === 'error') return <Centered><p className="error">{error}</p></Centered>
  if (phase === 'closed')
    return (
      <Centered>
        <h1>Test Unavailable</h1>
        <p className="muted">
          This test has already been completed or is no longer available. If you
          experienced a technical issue, please contact HR.
        </p>
      </Centered>
    )

  if (phase === 'failed')
    return (
      <Centered>
        <div className="badge badge-danger" style={{ fontSize: 15, padding: '6px 16px' }}>
          Test Failed
        </div>
        <h1 style={{ marginTop: 16 }}>Disqualified</h1>
        <p>
          You exceeded the maximum number of security violations
          {snapshot ? ` (${snapshot.violationCount}/${snapshot.maxViolations})` : ''}.
          The test has been ended automatically.
        </p>
        <p className="muted">If you believe this is an error, please contact HR.</p>
      </Centered>
    )

  if (phase === 'submitting') return <Centered>Submitting your answers…</Centered>

  if (phase === 'result' && result)
    return (
      <Centered>
        <h1>Test Completed</h1>
        <div className="grid grid-4" style={{ marginTop: 16 }}>
          <Stat label="Score" value={`${result.correctCount}/${result.correctCount + result.wrongCount}`} />
          <Stat label="Percentage" value={`${result.percentage}%`} />
          <Stat label="Time" value={formatTime(result.timeTakenSeconds)} />
          <Stat label="Risk Score" value={String(result.riskScore)} />
        </div>
        <p className="muted" style={{ marginTop: 16 }}>
          Your responses have been recorded. HR will review your results and get back
          to you. You may close this window.
        </p>
      </Centered>
    )

  if (phase === 'intro' && test)
    return (
      <Centered>
        <h1>Aptitude Test</h1>
        <p className="muted">
          {test.totalQuestions} questions · {test.durationMinutes} minutes · auto-submit
          on timeout
        </p>
        <div className="card" style={{ textAlign: 'left' }}>
          <h3>Before you begin</h3>
          <ul className="muted">
            <li>The test opens in fullscreen and is actively monitored.</li>
            <li>Do not switch tabs, leave the window, copy/paste, or open DevTools.</li>
            <li>
              Exceeding {test.maxViolations} security violations will automatically fail
              the test.
            </li>
            <li>The timer cannot be paused. Ensure a stable internet connection.</li>
            <li>If you face internet/power/system failure, contact HR to reset the test.</li>
          </ul>
        </div>
        <button onClick={startTest}>Start Test</button>
      </Centered>
    )

  // Active test.
  if (phase === 'active' && test) {
    const answered = Object.keys(answers).length
    const timerWarning = remaining <= 60
    return (
      <div className="container" style={{ maxWidth: 780 }}>
        <div
          className="navbar"
          style={{ margin: '-24px -24px 20px', borderRadius: 0, position: 'sticky', top: 0, zIndex: 10 }}
        >
          <strong>Aptitude Test</strong>
          <div className="spacer" />
          <span className="muted">
            {answered}/{test.totalQuestions} answered
          </span>
          <span className={`timer ${timerWarning ? 'warning' : ''}`}>
            {formatTime(remaining)}
          </span>
        </div>

        {snapshot && snapshot.violationCount > 0 && (
          <div className="violation-banner">
            ⚠ Security warning: {snapshot.violationCount}/{snapshot.maxViolations}{' '}
            violations recorded. {snapshot.remainingViolations} remaining before automatic
            failure.
          </div>
        )}

        {test.questions.map((q) => (
          <div className="card" key={q.index}>
            <div className="muted" style={{ fontSize: 12 }}>
              Question {q.index + 1}
              {q.skillTag ? ` · ${q.skillTag}` : ''}
            </div>
            <h3>{q.question}</h3>
            {q.options.map((opt, oi) => (
              <label
                key={oi}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  fontWeight: 400,
                  cursor: 'pointer',
                  padding: '6px 0',
                }}
              >
                <input
                  type="radio"
                  name={`q-${q.index}`}
                  style={{ width: 'auto' }}
                  checked={answers[q.index] === oi}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.index]: oi }))}
                />
                {opt}
              </label>
            ))}
          </div>
        ))}

        <button onClick={() => submit(false)}>Submit Test</button>
      </div>
    )
  }

  return null
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="container" style={{ maxWidth: 620 }}>
      <div className="card center">{children}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}
