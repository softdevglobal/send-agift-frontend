export const USER_ROLES = [
  'admin',
  'superadmin',
  'customer',
  'seller',
] as const

export type UserRole = (typeof USER_ROLES)[number]

const TOKEN_KEY = 'sag.token'
const ROLE_KEY = 'sag.role'

function isUserRole(value: string | null): value is UserRole {
  return value !== null && (USER_ROLES as readonly string[]).includes(value)
}

function read(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key)
}

export function getToken(): string | null {
  return read(TOKEN_KEY)
}

export function getRole(): UserRole | null {
  const role = read(ROLE_KEY)
  return isUserRole(role) ? role : null
}

export function setSession(
  token: string,
  role: UserRole,
  persist = true,
): void {
  clearSession()
  const store = persist ? localStorage : sessionStorage
  store.setItem(TOKEN_KEY, token)
  store.setItem(ROLE_KEY, role)
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ROLE_KEY)
}

export function isAdminRole(role: UserRole | null): boolean {
  return role === 'admin' || role === 'superadmin'
}

export function homePathForRole(role: UserRole): string {
  if (role === 'seller') return '/seller/profile'
  if (isAdminRole(role)) return '/admin'
  return '/customer'
}
