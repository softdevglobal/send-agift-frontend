import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAuth } from '@/features/auth/auth-context'
import {
  homePathForRole,
  isAdminRole,
  postLoginPath,
  returnToState,
  type AuthLocationState,
  type UserRole,
} from '@/lib/auth'

type ProtectedRouteProps = {
  roles: UserRole[]
  children: ReactNode
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (!isAuthenticated || !role) {
    const loginTo =
      roles.includes('seller') && roles.length === 1
        ? '/seller/login'
        : roles.some((item) => item === 'admin' || item === 'superadmin') &&
            !roles.includes('customer') &&
            !roles.includes('seller')
          ? '/admin/login'
          : '/login'

    return (
      <Navigate
        to={loginTo}
        replace
        state={returnToState(location.pathname, location.search)}
      />
    )
  }

  const allowed =
    roles.includes(role) || (roles.includes('admin') && isAdminRole(role))

  if (!allowed) {
    return <Navigate to={homePathForRole(role)} replace />
  }

  return children
}

type GuestRouteProps = {
  /** Only bounce users already signed in as this role so they can switch accounts. */
  forRole: UserRole
  children: ReactNode
}

function alreadyHasGuestRole(role: UserRole, forRole: UserRole): boolean {
  if (forRole === 'admin') return isAdminRole(role)
  return role === forRole
}

export function GuestRoute({ forRole, children }: GuestRouteProps) {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (isAuthenticated && role && alreadyHasGuestRole(role, forRole)) {
    const from = (location.state as AuthLocationState | null)?.from
    return <Navigate to={postLoginPath(from, role)} replace />
  }

  return children
}
