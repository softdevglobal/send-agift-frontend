import { useEffect, useState, type FormEvent } from 'react'
import { Calendar, LoaderCircle, Mail, ShieldCheck } from 'lucide-react'

import { getAdminMe, updateAdminMe, type Admin } from '@/api/admin'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { optionalString } from '@/lib/form'
import { cn } from '@/lib/utils'

export function AdminAccountPage() {
  const { role } = useAuth()
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAdminMe()
      .then((data) => {
        if (cancelled) return
        setAdmin(data)
        setDisplayName(data.display_name ?? '')
        setImageUrl(data.image_url ?? '')
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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setSaving(true)
    try {
      const updated = await updateAdminMe({
        display_name: optionalString(displayName),
        image_url: optionalString(imageUrl),
      })
      setAdmin(updated)
      setDisplayName(updated.display_name ?? '')
      setImageUrl(updated.image_url ?? '')
      setNotice('Profile saved.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save profile.'))
    } finally {
      setSaving(false)
    }
  }

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
          <FormAlert error={error} notice={notice} />

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
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="size-14 shrink-0 rounded-full object-cover ring-4 ring-background"
                    />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_24px_rgba(60,80,40,0.22)] ring-4 ring-background">
                      {adminInitials(admin)}
                    </div>
                  )}
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <div className={cn(adminPanelClass, 'p-4')}>
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    <ShieldCheck className="size-3.5" />
                    Status
                  </dt>
                  <dd className="mt-1 text-sm font-medium capitalize">
                    {admin.status || '—'}
                  </dd>
                </div>
                <div className={cn(adminPanelClass, 'p-4')}>
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    <ShieldCheck className="size-3.5" />
                    MFA required
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {admin.mfa_required ? 'Yes' : 'No'}
                  </dd>
                </div>
              </div>

              <form
                onSubmit={handleSave}
                className={cn(adminPanelClass, 'space-y-4 p-6 sm:p-8')}
              >
                <div className="space-y-1">
                  <h2 className="font-display text-xl tracking-tight">Profile</h2>
                  <p className="text-sm text-muted-foreground">
                    Update your display name and avatar.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-display-name">Display name</Label>
                  <Input
                    id="admin-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-11 bg-surface px-3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-image">Image URL</Label>
                  <Input
                    id="admin-image"
                    type="url"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    className="h-11 bg-surface px-3"
                    placeholder="https://"
                  />
                </div>
                <Button type="submit" disabled={saving} className="h-10">
                  {saving ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save profile'
                  )}
                </Button>
              </form>
            </>
          ) : null}
        </div>
      )}
    </>
  )
}
