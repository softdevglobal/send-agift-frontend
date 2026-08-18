import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

import { getAdminMe, updateAdminMe, type Admin } from '@/api/admin'
import { AccountShell } from '@/components/common/account-shell'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'

const adminNav = [
  { to: '/admin', label: 'Account', end: true },
  { to: '/admin/countries', label: 'Countries' },
]

export function AdminPage() {
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

  const fields = admin
    ? [
        ['ID', admin.id],
        ['Email', admin.email],
        ['Role', admin.role || role],
        ['Status', admin.status],
        ['MFA required', admin.mfa_required ? 'Yes' : 'No'],
        ['Created', admin.created_at],
        ['Updated', admin.updated_at],
      ].filter(([, value]) => Boolean(value))
    : []

  return (
    <AccountShell
      eyebrow="Admin"
      title="Your account"
      description="Update your display name and avatar. Write access to countries requires admin or superadmin."
      nav={adminNav}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <FormAlert error={error} notice={notice} />
          {admin ? (
            <>
              <dl className="grid gap-4 rounded-2xl bg-card p-6 ring-1 ring-border/60 sm:grid-cols-2">
                {fields.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {label}
                    </dt>
                    <dd className="mt-1 break-all text-sm">{value}</dd>
                  </div>
                ))}
              </dl>

              <form
                onSubmit={handleSave}
                className="space-y-4 rounded-2xl bg-card p-6 ring-1 ring-border/60"
              >
                <h2 className="font-display text-xl">Profile</h2>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="size-16 rounded-full object-cover ring-1 ring-border"
                  />
                ) : null}
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
    </AccountShell>
  )
}
