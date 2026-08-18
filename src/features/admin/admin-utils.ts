import type { Admin } from '@/api/admin'
import type { UserRole } from '@/lib/auth'

export function adminRoleLabel(role: UserRole | null): string {
  if (role === 'superadmin') return 'Superadmin'
  if (role === 'admin') return 'Administrator'
  return 'Staff'
}

export function adminDisplayName(admin: Admin | null): string {
  if (!admin) return 'Admin'
  return admin.display_name?.trim() || admin.email || 'Admin'
}

export function adminInitials(admin: Admin | null): string {
  const source = admin?.display_name?.trim() || admin?.email || 'A'
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((part) => part[0] ?? '')
  return (letters.join('') || 'A').toUpperCase()
}

export function formatDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
