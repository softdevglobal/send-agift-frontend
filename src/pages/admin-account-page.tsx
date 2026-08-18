import { useEffect, useState } from 'react'
import { Calendar, LoaderCircle, Mail } from 'lucide-react'

import { getAdminMe, type Admin } from '@/api/admin'
import { FormAlert } from '@/components/common/form-alert'
import {
  AdminPageHeader,
  adminDisplayName,
  adminInitials,
  adminPanelClass,
  adminRoleLabel,
  formatDate,
} from '@/features/admin'
import { useAuth } from '@/features/auth/auth-context'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

export function AdminAccountPage() {
  const { role } = useAuth()
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAdminMe()
      .then((data) => {
        if (!cancelled) setAdmin(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load admin.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <AdminPageHeader
        title="Your account"
        description="Your admin identity and role, as the console currently sees them."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <FormAlert error={error} />

          {admin ? (
            <>
              <section
                className={cn(
                  adminPanelClass,
                  'relative overflow-hidden px-6 py-7 sm:px-8',
                )}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-[oklch(0.92_0.04_125/0.45)]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-20 left-10 size-48 rounded-full bg-[oklch(0.93_0.04_80/0.35)]"
                />
                <div className="relative flex flex-wrap items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_24px_rgba(60,80,40,0.22)] ring-4 ring-background">
                    {adminInitials(admin)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="font-display text-2xl tracking-tight">
                      {adminDisplayName(admin)}
                    </h1>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" />
                      {admin.email}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                    {adminRoleLabel(role)}
                  </span>
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cn(adminPanelClass, 'p-4')}>
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    <Calendar className="size-3.5" />
                    Member since
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {formatDate(admin.created_at)}
                  </dd>
                </div>
                <div className={cn(adminPanelClass, 'p-4')}>
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    <Calendar className="size-3.5" />
                    Last updated
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {formatDate(admin.updated_at)}
                  </dd>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  )
}
