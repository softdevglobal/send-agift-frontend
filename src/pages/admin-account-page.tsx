import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { getAdminMe, type Admin } from '@/api/admin'
import { FormAlert } from '@/components/common/form-alert'
import { AdminPageHeader, adminPanelClass } from '@/features/admin'
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

  const fields = admin
    ? [
        ['ID', admin.id],
        ['Email', admin.email],
        ['Display name', admin.display_name],
        ['Role', role],
        ['Created', admin.created_at],
        ['Updated', admin.updated_at],
      ].filter(([, value]) => Boolean(value))
    : []

  return (
    <>
      <AdminPageHeader
        title="Your account"
        description="Signed-in admin profile from GET /admin/me."
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <FormAlert error={error} />
          {admin ? (
            <dl className={cn(adminPanelClass, 'grid gap-4 p-6 sm:grid-cols-2')}>
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="mt-1 break-all text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      )}
    </>
  )
}
