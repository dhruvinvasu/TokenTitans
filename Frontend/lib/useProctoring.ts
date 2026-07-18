'use client'

import { useCallback, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import type { SecuritySnapshot } from '@/lib/types'

type Category = 'VIOLATION' | 'TELEMETRY'

interface BufferedEvent {
  category: Category
  type: string
  occurredAt: string
  meta?: Record<string, unknown>
}

interface ProctoringOptions {
  token: string
  active: boolean
  flushIntervalMs?: number
  onSnapshot?: (snapshot: SecuritySnapshot) => void
  onFail?: (snapshot: SecuritySnapshot) => void
}

/**
 * Attaches enterprise-grade proctoring listeners while `active` is true.
 * Events are buffered locally (surviving brief internet loss) and flushed to
 * the backend in batches; the backend enforces the violation limit and returns
 * a security snapshot, triggering `onFail` when the candidate is disqualified.
 */
export function useProctoring({
  token,
  active,
  flushIntervalMs = 4000,
  onSnapshot,
  onFail,
}: ProctoringOptions) {
  const buffer = useRef<BufferedEvent[]>([])
  const lastMove = useRef<number>(Date.now())
  const lastMoveRecorded = useRef<number>(0)
  const keystrokeCount = useRef<number>(0)
  const failed = useRef<boolean>(false)

  const push = useCallback(
    (category: Category, type: string, meta?: Record<string, unknown>) => {
      buffer.current.push({
        category,
        type,
        occurredAt: new Date().toISOString(),
        meta,
      })
    },
    [],
  )

  const flush = useCallback(async () => {
    if (failed.current || buffer.current.length === 0) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    const batch = buffer.current
    buffer.current = []
    try {
      const snapshot = await api<SecuritySnapshot>(`/aptitude/${token}/events`, {
        method: 'POST',
        body: { events: batch },
      })
      onSnapshot?.(snapshot)
      if (snapshot.failed) {
        failed.current = true
        onFail?.(snapshot)
      }
    } catch {
      // Network failure — re-queue events for the next sync attempt.
      buffer.current = [...batch, ...buffer.current]
    }
  }, [token, onSnapshot, onFail])

  useEffect(() => {
    if (!active) return

    const violation = (type: string, meta?: Record<string, unknown>) =>
      push('VIOLATION', type, meta)
    const telemetry = (type: string, meta?: Record<string, unknown>) =>
      push('TELEMETRY', type, meta)

    const onVisibility = () => {
      if (document.hidden) {
        violation('VISIBILITY_HIDDEN')
        violation('TAB_SWITCH')
      }
    }
    const onBlur = () => violation('WINDOW_BLUR')
    const onCopy = () => violation('COPY')
    const onPaste = () => violation('PASTE')
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      violation('RIGHT_CLICK')
    }
    const onResize = () => {
      violation('BROWSER_RESIZE')
      // Best-effort DevTools heuristic: large viewport/chrome gap.
      const wGap = window.outerWidth - window.innerWidth
      const hGap = window.outerHeight - window.innerHeight
      if (wGap > 200 || hGap > 200) violation('DEVTOOLS')
    }
    const onFullscreen = () => {
      if (!document.fullscreenElement) violation('FULLSCREEN_EXIT')
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      violation('REFRESH_ATTEMPT')
      e.preventDefault()
      e.returnValue = ''
    }
    const onKeyDown = (e: KeyboardEvent) => {
      keystrokeCount.current += 1
      const ctrl = e.ctrlKey || e.metaKey
      if (e.key === 'F12') violation('DEVTOOLS')
      else if (ctrl && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase()))
        violation('DEVTOOLS', { keys: `Ctrl+Shift+${e.key}` })
      else if (ctrl && ['r', 'R'].includes(e.key)) violation('REFRESH_ATTEMPT')
      else if (ctrl && ['c', 'v', 'x', 'a', 'p'].includes(e.key.toLowerCase()))
        violation('KEYBOARD_SHORTCUT', { keys: `Ctrl+${e.key}` })
    }
    const onMouseMove = () => {
      lastMove.current = Date.now()
      const now = Date.now()
      if (now - lastMoveRecorded.current > 3000) {
        lastMoveRecorded.current = now
        telemetry('MOUSE_MOVE')
      }
    }
    const onClick = (e: MouseEvent) =>
      telemetry('MOUSE_CLICK', { x: e.clientX, y: e.clientY })
    const onOffline = () => violation('WINDOW_BLUR', { reason: 'network_lost' })
    const onOnline = () => {
      telemetry('MOUSE_MOVE', { reason: 'network_restored' })
      void flush()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    document.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('resize', onResize)
    document.addEventListener('fullscreenchange', onFullscreen)
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('click', onClick)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    // Multiple-monitor detection (best effort).
    const extendedScreen = (window.screen as Screen & { isExtended?: boolean })
      .isExtended
    if (extendedScreen) violation('MULTIPLE_MONITORS')

    // Idle detection.
    const idleTimer = window.setInterval(() => {
      if (Date.now() - lastMove.current > 20000) {
        telemetry('MOUSE_IDLE', { idleMs: Date.now() - lastMove.current })
        lastMove.current = Date.now()
      }
      if (keystrokeCount.current > 0) {
        telemetry('KEYSTROKE', { count: keystrokeCount.current })
        keystrokeCount.current = 0
      }
    }, 10000)

    const flushTimer = window.setInterval(() => void flush(), flushIntervalMs)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('fullscreenchange', onFullscreen)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('click', onClick)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      window.clearInterval(idleTimer)
      window.clearInterval(flushTimer)
    }
  }, [active, push, flush, flushIntervalMs])

  return { flush }
}
