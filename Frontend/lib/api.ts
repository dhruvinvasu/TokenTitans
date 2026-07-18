const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3026/v1'

const TOKEN_KEY = 'hr_token'

export const auth = {
  get token(): string | null {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(TOKEN_KEY)
  },
  set(token: string) {
    window.localStorage.setItem(TOKEN_KEY, token)
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY)
  },
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public validationErrors?: Array<{ field: string; message: string }>,
  ) {
    super(message)
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  authorized?: boolean
  isForm?: boolean
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, authorized = false, isForm = false } = options

  const headers: Record<string, string> = {}
  if (authorized && auth.token) headers.Authorization = `Bearer ${auth.token}`
  if (body && !isForm) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : {}

  if (!res.ok) {
    throw new ApiError(res.status, data.message ?? 'Request failed', data.validationErrors)
  }

  return data as T
}

export const apiBase = API_BASE
