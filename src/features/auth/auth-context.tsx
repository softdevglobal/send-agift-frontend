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
      const safeFrom =
        typeof from === 'string' &&
        from.startsWith('/') &&
        !from.startsWith('//') &&
        (from === home || from.startsWith(`${home}/`) || from.startsWith(`${home}?`))
          ? from
          : home
      navigate(safeFrom, { replace: true })
    },
    [location.state, navigate],
  )

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setRole(null)
    navigate('/login', { replace: true })
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
