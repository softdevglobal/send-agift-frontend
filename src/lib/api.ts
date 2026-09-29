import { clearSession, getToken } from '@/lib/auth'

const rawBase = import.meta.env.VITE_API_BASE_URL
const API_BASE = (rawBase === undefined || rawBase === '' ? '/api/v1' : rawBase).replace(
  /\/$/,
  '',
)

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/** The full URL of an API path, for things fetch() does not cover (EventSource). */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  /** When false, skip the Authorization header (login/register). Default true. */
  auth?: boolean
  /** Aborts the request — used to drop stale as-you-type lookups. */
  signal?: AbortSignal
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function errorMessageFromBody(body: unknown, fallback: string): string {
  if (isRecord(body) && typeof body.error === 'string' && body.error.trim()) {
    return body.error
  }
  return fallback
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function loginPathForLocation(pathname: string): string {
  if (pathname.startsWith('/seller')) return '/seller/login'
  if (pathname.startsWith('/admin')) return '/admin/login'
  return '/login'
}

function redirectToLogin(): void {
  const { pathname } = window.location
  const loginPath = loginPathForLocation(pathname)
  if (pathname === loginPath) return
  window.location.assign(loginPath)
}

// ─── Re-authentication ─────────────────────────────────────────────────────
// Money-moving admin actions need the admin's password confirmed in the last
// few minutes. The server answers 403 REAUTH_REQUIRED; api() then asks the
// registered prompt (the admin shell's password dialog) for a confirmation,
// keeps it in memory until it expires, and retries the request once.

type Reauth = { token: string; expiresAt: number }
let reauth: Reauth | null = null
let reauthPrompt: (() => Promise<Reauth | null>) | null = null
let pendingPrompt: Promise<Reauth | null> | null = null

/** The admin shell registers the password dialog here. */
export function setReauthPrompt(prompt: (() => Promise<Reauth | null>) | null): void {
  reauthPrompt = prompt
}

/** Confirms the signed-in admin's password; used by the prompt. */
export async function confirmPassword(password: string): Promise<Reauth> {
  const res = await api<{ reauth_token: string; expires_at: string }>('/admin/reauth', {
    method: 'POST',
    body: { password },
  })
  return { token: res.reauth_token, expiresAt: new Date(res.expires_at).getTime() }
}

function currentReauth(): string | null {
  if (reauth && reauth.expiresAt - 10_000 > Date.now()) return reauth.token
  reauth = null
  return null
}

function isReauthRequired(status: number, body: unknown): boolean {
  return status === 403 && isRecord(body) && body.code === 'REAUTH_REQUIRED'
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  try {
    return await request<T>(path, options)
  } catch (err) {
    if (!(err instanceof ApiError) || !isReauthRequired(err.status, err.body) || !reauthPrompt) throw err
    // One dialog for however many requests are waiting on it.
    pendingPrompt ??= reauthPrompt().finally(() => {
      pendingPrompt = null
    })
    const confirmed = await pendingPrompt
    if (!confirmed) throw new ApiError('Password confirmation was cancelled.', 403, err.body)
    reauth = confirmed
    return request<T>(path, options)
  }
}

async function request<T>(path: string, options: ApiOptions): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true, signal } = options
  const token = getToken()

  const requestHeaders = new Headers(headers)
  requestHeaders.set('Accept', 'application/json')
  const confirmed = currentReauth()
  if (auth && confirmed) requestHeaders.set('X-Reauth-Token', confirmed)

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (auth && token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  const parsed = await parseBody(response)

  if (response.status === 401) {
    if (auth && token) {
      clearSession()
      redirectToLogin()
    }
    throw new ApiError(
      errorMessageFromBody(parsed, 'Unauthorized'),
      response.status,
      parsed,
    )
  }

  if (!response.ok) {
    throw new ApiError(
      errorMessageFromBody(parsed, response.statusText || 'Request failed'),
      response.status,
      parsed,
    )
  }

  return parsed as T
}
