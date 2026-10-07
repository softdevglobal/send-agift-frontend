import { useEffect, useState, type FormEvent } from 'react'
import { Calendar, KeyRound, LoaderCircle, Mail, ShieldCheck } from 'lucide-react'

import { getAdminMe, updateAdminMe, type Admin } from '@/api/admin'
import { FormAlert } from '@/components/common/form-alert'
import { Dot, Sparkle } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AdminPageHeader,
  adminDisplayName,
  adminInitials,
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
        image_url: imageUrl,
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
              {/* Who you are: the photo, with clear ways to change it. */}
              <section className="relative overflow-hidden rounded-xl bg-brand-violet px-6 py-7 text-white sm:px-8">
                <Sparkle className="absolute top-6 right-[14%] size-7 text-brand-teal" />
                <Dot className="absolute right-[30%] bottom-6 hidden size-3 bg-white/50 sm:block" />
                <div className="relative flex flex-wrap items-center gap-6">
                  <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-white ring-4 ring-white">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center font-poster text-4xl text-brand-ink">
                        {adminInitials(admin)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-teal px-2.5 py-1 text-[11px] font-bold text-brand-ink">
                      <ShieldCheck className="size-3.5" />
                      {adminRoleLabel(role)}
                    </span>
                    <h1 className="mt-3 font-poster text-4xl">{adminDisplayName(admin)}</h1>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-white/75">
                      <Mail className="size-4 shrink-0" />
                      {admin.email}
                    </p>
                  </div>
                </div>
              </section>

              {/* The account at a glance. */}
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { icon: Calendar, label: 'Member since', value: formatDate(admin.created_at), tone: 'bg-brand-ink text-white' },
                  { icon: Calendar, label: 'Last updated', value: formatDate(admin.updated_at), tone: 'bg-card border-2 border-brand-ink/10' },
                  { icon: ShieldCheck, label: 'Status', value: admin.status || '-', tone: 'bg-brand-teal text-brand-ink' },
                  { icon: KeyRound, label: 'Two-step sign-in', value: admin.mfa_required ? 'Required' : 'Not required', tone: 'bg-amber-300 text-amber-950' },
                ].map((item) => (
                  <div key={item.label} className={cn('rounded-xl p-4', item.tone)}>
                    <dt className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase opacity-75">
                      <item.icon className="size-3.5" />
                      {item.label}
                    </dt>
                    <dd className="mt-2 text-sm font-extrabold capitalize">{item.value}</dd>
                  </div>
                ))}
              </dl>

              <form
                onSubmit={handleSave}
                className="space-y-5 rounded-xl border-2 border-brand-ink/10 bg-card p-6 sm:p-8"
              >
                <div className="space-y-1">
                  <h2 className="font-poster text-2xl">
                    <span className="marker-underline">Profile</span>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    The name other admins and the audit log show for you.
                  </p>
                </div>
                <div className="max-w-md space-y-2">
                  <Label htmlFor="admin-display-name">Display name</Label>
                  <Input
                    id="admin-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-11 px-3"
                    placeholder="How you appear in the console"
                  />
                </div>
                <Button type="submit" disabled={saving} className="h-11 px-5">
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
