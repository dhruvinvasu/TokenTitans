export enum AptitudeTestStatus {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  SUBMITTED = 'SUBMITTED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
  RESET = 'RESET',
}

export enum TestRecommendation {
  STRONG_PASS = 'STRONG_PASS',
  PASS = 'PASS',
  BORDERLINE = 'BORDERLINE',
  FAIL = 'FAIL',
  DISQUALIFIED = 'DISQUALIFIED',
}

// Violation events carry a severity weight used for the risk score.
export enum ViolationType {
  TAB_SWITCH = 'TAB_SWITCH',
  WINDOW_BLUR = 'WINDOW_BLUR',
  VISIBILITY_HIDDEN = 'VISIBILITY_HIDDEN',
  FULLSCREEN_EXIT = 'FULLSCREEN_EXIT',
  COPY = 'COPY',
  PASTE = 'PASTE',
  RIGHT_CLICK = 'RIGHT_CLICK',
  KEYBOARD_SHORTCUT = 'KEYBOARD_SHORTCUT',
  DEVTOOLS = 'DEVTOOLS',
  REFRESH_ATTEMPT = 'REFRESH_ATTEMPT',
  BROWSER_RESIZE = 'BROWSER_RESIZE',
  MULTIPLE_MONITORS = 'MULTIPLE_MONITORS',
}

// Non-violation telemetry (recorded but not penalised).
export enum TelemetryType {
  KEYSTROKE = 'KEYSTROKE',
  MOUSE_CLICK = 'MOUSE_CLICK',
  MOUSE_MOVE = 'MOUSE_MOVE',
  MOUSE_IDLE = 'MOUSE_IDLE',
  WEBCAM_PERMISSION = 'WEBCAM_PERMISSION',
  MIC_PERMISSION = 'MIC_PERMISSION',
  NETWORK_LOST = 'NETWORK_LOST',
  NETWORK_RESTORED = 'NETWORK_RESTORED',
}

// Severity weight per violation type (0-10) used to compute the risk score.
export const VIOLATION_WEIGHTS: Record<ViolationType, number> = {
  [ViolationType.TAB_SWITCH]: 8,
  [ViolationType.WINDOW_BLUR]: 6,
  [ViolationType.VISIBILITY_HIDDEN]: 6,
  [ViolationType.FULLSCREEN_EXIT]: 5,
  [ViolationType.COPY]: 4,
  [ViolationType.PASTE]: 7,
  [ViolationType.RIGHT_CLICK]: 2,
  [ViolationType.KEYBOARD_SHORTCUT]: 4,
  [ViolationType.DEVTOOLS]: 10,
  [ViolationType.REFRESH_ATTEMPT]: 6,
  [ViolationType.BROWSER_RESIZE]: 2,
  [ViolationType.MULTIPLE_MONITORS]: 5,
}
