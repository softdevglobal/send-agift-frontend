import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import {
  clearSession,
  getRole,
  getToken,
  homePathForRole,
  setSession,
  type UserRole,
} from '@/lib/auth'

type AuthContextValue = {
  token: string | null
  role: UserRole | null
  isAuthenticated: boolean
  login: (token: string, role: UserRole, persist?: boolean) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

/** Areas that belong to a single role — never send another role into them. */
const ROLE_AREAS: Record<string, UserRole[]> = {
  '/admin': ['admin', 'superadmin'],
  '/seller': ['seller'],
  '/account': ['customer'],
  '/checkout': ['customer'],
}

/**
 * Resolve where to land after signing in. Honours the path the user was
 * bounced from, but only when their role is allowed there — customers own the
 * whole storefront, so a simple "starts with home" check is not enough now
 * that their home is '/'.
 */
function safeRedirect(
  from: string | undefined,
  role: UserRole,
  home: string,
): string {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
    return home
  }
  const path = from.split('?')[0]
  for (const [area, allowed] of Object.entries(ROLE_AREAS)) {
    if (path === area || path.startsWith(`${area}/`)) {
      return allowed.includes(role) ? from : home
    }
  }
  // Public storefront paths are fine for any role, but only customers browse them.
  return role === 'customer' ? from : home
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [token, setToken] = useState<string | null>(() => getToken())
  const [role, setRole] = useState<UserRole | null>(() => getRole())

  const login = useCallback(
    (nextToken: string, nextRole: UserRole, persist = true) => {
      setSession(nextToken, nextRole, persist)
      setToken(nextToken)
      setRole(nextRole)
      const from = (location.state as { from?: string } | null)?.from
      const home = homePathForRole(nextRole)
      navigate(safeRedirect(from, nextRole, home), { replace: true })
    },
    [location.state, navigate],
  )

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setRole(null)
    // Signing out drops you back on the public storefront, not a login wall.
    navigate('/', { replace: true })
  }, [navigate])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role,
      isAuthenticated: Boolean(token && role),
      login,
      logout,
    }),
    [token, role, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
