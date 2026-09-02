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
  postLoginPath,
  setSession,
  type AuthLocationState,
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
      const from = (location.state as AuthLocationState | null)?.from
      navigate(postLoginPath(from, nextRole), { replace: true })
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
