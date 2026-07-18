/**
 * End-to-end smoke test for the HR Automation API.
 *
 * Exercises the full pipeline against a running server:
 *   auth -> job -> apply (reject + pass paths) -> aptitude test
 *   (start, security violations, auto-fail) -> dashboard -> AI assistant.
 *
 * Usage:
 *   1. Start MongoDB and the API:  npm run dev   (or npm run build && npm start)
 *   2. In another terminal:        node scripts/smoke-test.mjs
 *
 * Override the base URL with:       API_BASE=http://host:port/v1 node scripts/smoke-test.mjs
 */

const BASE = process.env.API_BASE ?? 'http://localhost:3026/v1'

let passed = 0
let failed = 0

function check(label, condition, extra = '') {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${label}${extra ? ` — ${extra}` : ''}`)
  } else {
    failed += 1
    console.log(`  ✗ ${label}${extra ? ` — ${extra}` : ''}`)
  }
}

async function json(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { _raw: text }
  }
}

// A tiny placeholder file; text extraction is not required for these paths.
const resumeBuffer = Buffer.from('%PDF-1.4\n1 0 obj<< >>endobj\n%%EOF', 'binary')

function resumeForm(fields) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.append(key, String(value))
  fd.append('resume', new Blob([resumeBuffer], { type: 'application/pdf' }), 'resume.pdf')
  return fd
}

async function main() {
  console.log(`\nHR Automation smoke test → ${BASE}\n`)

  // --- Auth ---
  console.log('Auth')
  const email = `hr${Date.now()}@smoke.test`
  const password = 'Passw0rd!'
  await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName: 'Smoke', lastName: 'Tester', email, password, role: 'HR' }),
  })
  const login = await json(
    await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  )
  const token = login.token
  check('HR register + login returns JWT', Boolean(token))
  const auth = { Authorization: `Bearer ${token}` }

  check('HR-only route rejects missing token', (await fetch(`${BASE}/jobs`)).status === 401)

  // --- Job ---
  console.log('\nJobs')
  const strictJob = await json(
    await fetch(`${BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({
        title: 'Frontend Developer',
        role: 'Frontend Developer',
        description: 'Build modern React and Next.js interfaces.',
        requiredSkills: ['React', 'Next.js', 'TypeScript'],
        experienceRequired: 2,
        salaryRange: { min: 600000, max: 1200000, currency: 'INR' },
        location: 'Ahmedabad',
      }),
    }),
  )
  check('Create job (HR)', Boolean(strictJob.job?._id))

  const easyJob = await json(
    await fetch(`${BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({
        title: 'QA Engineer',
        role: 'QA Engineer',
        description: 'Quality assurance role.',
        requiredSkills: ['Selenium'],
        salaryRange: { min: 500000, max: 1500000, currency: 'INR' },
        skillMatchThreshold: 0,
        salaryMatchThreshold: 0,
      }),
    }),
  )
  const active = await json(await fetch(`${BASE}/jobs/active`))
  check('List active jobs (public)', Array.isArray(active.jobs) && active.jobs.length >= 2)

  // --- Reject path ---
  console.log('\nCandidate intake — reject path')
  const rejected = await json(
    await fetch(`${BASE}/candidates/apply`, {
      method: 'POST',
      body: resumeForm({
        fullName: 'Rick Reject',
        email: `reject${Date.now()}@smoke.test`,
        currentCtc: 800000,
        expectedCtc: 1000000,
        jobId: strictJob.job._id,
      }),
    }),
  )
  check('Apply returns a rejection', rejected.outcome === 'REJECTED', rejected.status)
  check('Rejection includes an AI/template reason', Boolean(rejected.rejectionReason))

  // --- Pass path + aptitude ---
  console.log('\nCandidate intake — pass path + aptitude')
  const passedApply = await json(
    await fetch(`${BASE}/candidates/apply`, {
      method: 'POST',
      body: resumeForm({
        fullName: 'Pat Passer',
        email: `pass${Date.now()}@smoke.test`,
        currentCtc: 800000,
        expectedCtc: 1000000,
        jobId: easyJob.job._id,
      }),
    }),
  )
  check('Apply passes screening', passedApply.outcome === 'PASSED', passedApply.status)
  const candidateId = passedApply.candidateId

  const report = await json(await fetch(`${BASE}/aptitude/hr/report/${candidateId}`, { headers: auth }))
  const testToken = report.test?.token
  check('Aptitude test created with token', Boolean(testToken))
  check('Test has 15 questions', report.test?.questions?.length === 15, `got ${report.test?.questions?.length}`)

  const view = await json(await fetch(`${BASE}/aptitude/${testToken}`))
  check('Candidate view hides correct answers', view.test?.questions?.[0]?.correctIndex === undefined)

  await fetch(`${BASE}/aptitude/${testToken}/start`, { method: 'POST' })
  const snapshot = await json(
    await fetch(`${BASE}/aptitude/${testToken}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          { category: 'VIOLATION', type: 'TAB_SWITCH' },
          { category: 'VIOLATION', type: 'PASTE' },
          { category: 'VIOLATION', type: 'DEVTOOLS' },
          { category: 'VIOLATION', type: 'WINDOW_BLUR' },
          { category: 'VIOLATION', type: 'FULLSCREEN_EXIT' },
        ],
      }),
    }),
  )
  check('Security limit auto-fails the candidate', snapshot.failed === true, `risk ${snapshot.riskScore}`)

  // --- Dashboard + assistant ---
  console.log('\nDashboard & AI assistant')
  const dash = await json(await fetch(`${BASE}/dashboard/overview`, { headers: auth }))
  check('Dashboard overview aggregates candidates', typeof dash.totals?.totalCandidates === 'number', `total ${dash.totals?.totalCandidates}`)

  const ask = await json(
    await fetch(`${BASE}/assistant/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ question: 'Candidates having React skill' }),
    }),
  )
  check('Assistant translates NL to a safe query', ask.filter && 'profile.skills' in (ask.filter ?? {}))

  // --- Result ---
  console.log(`\n${failed === 0 ? '✅ ALL PASSED' : '❌ SOME FAILED'} — ${passed} passed, ${failed} failed\n`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('\nSmoke test crashed:', err.message)
  console.error('Is the server running at ' + BASE + ' with MongoDB available?')
  process.exit(1)
})
