export const USER_ROLES = [
  'admin',
  'superadmin',
  'customer',
  'seller',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export type AuthLocationState = {
  from?: string
}

const TOKEN_KEY = 'sag.token'
const ROLE_KEY = 'sag.role'

/** Areas that belong to a single role — never send another role into them. */
const ROLE_AREAS: Record<string, UserRole[]> = {
  '/admin': ['admin', 'superadmin'],
  '/seller': ['seller'],
  '/account': ['customer'],
  '/checkout': ['customer'],
}

const AUTH_PAGES = [
  '/login',
  '/register',
  '/seller/login',
  '/seller/register',
  '/admin/login',
  '/admin/register',
]

export function isUserRole(value: string | null): value is UserRole {
  return value !== null && (USER_ROLES as readonly string[]).includes(value)
}

function isAuthPage(path: string): boolean {
  return AUTH_PAGES.some((page) => path === page)
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
  if (role === 'seller') return '/seller'
  if (isAdminRole(role)) return '/admin'
  // Customers land in the catalog so they can keep shopping after sign-in.
  return '/products'
}
export function postLoginPath(from: string | undefined, role: UserRole): string {
  const home = homePathForRole(role)
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
    return home
  }
  const path = from.split('?')[0]
  if (isAuthPage(path) || path === '/') return home
  for (const [area, allowed] of Object.entries(ROLE_AREAS)) {
    if (path === area || path.startsWith(`${area}/`)) {
      return allowed.includes(role) ? from : home
    }
  }
  // Public storefront paths are fine for any role, but only customers browse them.
  return role === 'customer' ? from : home
}

export function returnToState(pathname: string, search = ''): AuthLocationState {
  if (!pathname || pathname === '/') return {}
  return { from: `${pathname}${search}` }
}
