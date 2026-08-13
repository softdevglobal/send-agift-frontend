import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAuth } from '@/features/auth/auth-context'
import { homePathForRole, isAdminRole, type UserRole } from '@/lib/auth'

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

    return <Navigate to={loginTo} replace state={{ from: location.pathname }} />
  }

  const allowed =
    roles.includes(role) || (roles.includes('admin') && isAdminRole(role))

  if (!allowed) {
    return <Navigate to={homePathForRole(role)} replace />
  }

  return children
}

type GuestRouteProps = {
  children: ReactNode
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, role } = useAuth()

  if (isAuthenticated && role) {
    return <Navigate to={homePathForRole(role)} replace />
  }

  return children
}
