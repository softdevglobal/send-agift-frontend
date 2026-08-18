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

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true } = options
  const token = getToken()

  const requestHeaders = new Headers(headers)
  requestHeaders.set('Accept', 'application/json')

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
