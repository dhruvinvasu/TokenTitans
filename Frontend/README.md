# HR Automation — Frontend

Next.js (App Router, TypeScript) client for the HR Automation System backend.

## Setup

```bash
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_BASE if backend isn't on :3026
npm install
npm run dev                        # http://localhost:3000
```

The backend must be running (default `http://localhost:3026/v1`).

## Routes

### Candidate (public)
| Route | Purpose |
|-------|---------|
| `/` | Browse open positions. |
| `/apply/[jobId]` | Application form (name, email, CTC, resume upload) → instant screening result. |
| `/aptitude/[token]` | Secure aptitude test runner (opened from the email link). |

### HR (JWT-protected)
| Route | Purpose |
|-------|---------|
| `/hr/login` | HR sign-in (token stored in `localStorage`). |
| `/hr/dashboard` | KPIs, match/test/email stats, recent activity. |
| `/hr/candidates` | Filterable candidate list. |
| `/hr/candidates/[id]` | Full profile: resume analysis, aptitude report, timeline, actions. |
| `/hr/assistant` | Natural-language AI HR assistant. |

## Aptitude test proctoring

`lib/useProctoring.ts` attaches client-side monitoring while the test is active and
batches events to `POST /aptitude/:token/events`:

- **Violations** (weighted, count toward auto-fail): tab switch, window blur, visibility
  change, fullscreen exit, copy, paste, right-click, keyboard shortcuts, DevTools
  (best-effort), refresh attempt, browser resize, multiple monitors.
- **Telemetry** (recorded only): keystrokes, mouse clicks/movement, idle time.
- **Resilience**: events are buffered locally and re-synced after brief internet loss;
  the timer auto-submits on expiry; the backend auto-fails on violation-limit breach.

## Notes

- Data fetching is client-side against the REST API via `lib/api.ts`.
- Auth is a JWT bearer token in `localStorage`; `app/hr/layout.tsx` guards HR routes.
