import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Pencil, Trash2 } from 'lucide-react'

import { createCountry, deleteCountry, updateCountry } from '@/api/admin'
import { listCountries, type Country, type CountryInput } from '@/api/countries'
import { KNOWN_CURRENCIES } from '@/api/types'
import { AccountShell } from '@/components/common/account-shell'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { selectClassName } from '@/lib/form-styles'

const adminNav = [
  { to: '/admin', label: 'Account', end: true },
  { to: '/admin/countries', label: 'Countries' },
]

const emptyCountry: CountryInput = {
  iso_code: '',
  name: '',
  default_currency: '',
  default_timezone: '',
  status: '',
}

function toInput(country: Country): CountryInput {
  return {
    iso_code: country.iso_code,
    name: country.name,
    default_currency: country.default_currency,
    default_timezone: country.default_timezone,
    status: country.status,
  }
}

export function AdminCountriesPage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState<CountryInput>(emptyCountry)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const list = await listCountries()
    setCountries(Array.isArray(list) ? list : [])
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load countries.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  function updateField<K extends keyof CountryInput>(key: K, value: CountryInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    const iso = form.iso_code.trim().toUpperCase()
    if (iso.length !== 2) {
      setError('ISO code must be 2 letters.')
      return
    }

    const body: CountryInput = {
      iso_code: iso,
      name: form.name.trim(),
      default_currency: form.default_currency.trim().toUpperCase(),
      default_timezone: form.default_timezone.trim(),
      status: optionalString(form.status ?? ''),
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateCountry(editingId, body)
        setNotice('Country updated.')
      } else {
        await createCountry(body)
        setNotice('Country created. Copy its ID for registration forms.')
      }
      setForm(emptyCountry)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save country.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    setNotice(null)
    try {
      await deleteCountry(id)
      if (editingId === id) {
        setEditingId(null)
        setForm(emptyCountry)
      }
      await load()
      setNotice('Country deleted.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete country.'))
    }
  }

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      setError('Could not copy country ID.')
    }
  }

  return (
    <AccountShell
      eyebrow="Admin"
      title="Countries"
      description="Create markets used by customer and seller registration. Register forms load this list from GET /countries."
      nav={adminNav}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <FormAlert error={error} notice={notice} />

          <section className="overflow-x-auto rounded-2xl bg-card ring-1 ring-border/60">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-border/70 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">ISO</th>
                  <th className="px-4 py-3 font-medium">Currency</th>
                  <th className="px-4 py-3 font-medium">Timezone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {countries.map((country) => (
                  <tr key={country.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-medium">{country.name}</td>
                    <td className="px-4 py-3">{country.iso_code}</td>
                    <td className="px-4 py-3">{country.default_currency}</td>
                    <td className="px-4 py-3">{country.default_timezone}</td>
                    <td className="px-4 py-3">{country.status}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-mono text-xs text-primary hover:underline"
                        onClick={() => copyId(country.id)}
                      >
                        {copiedId === country.id ? 'Copied' : 'Copy ID'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Edit country"
                          onClick={() => {
                            setEditingId(country.id)
                            setForm(toInput(country))
                            setError(null)
                            setNotice(null)
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete country"
                          onClick={() => handleDelete(country.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {countries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No countries yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl bg-card p-6 ring-1 ring-border/60"
          >
            <h2 className="font-display text-xl">
              {editingId ? 'Edit country' : 'Add country'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="iso-code">ISO code</Label>
                <Input
                  id="iso-code"
                  value={form.iso_code}
                  onChange={(event) => updateField('iso_code', event.target.value)}
                  className="h-11 bg-surface px-3 uppercase"
                  maxLength={2}
                  required
                  placeholder="LK"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country-name">Name</Label>
                <Input
                  id="country-name"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                  placeholder="Sri Lanka"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Default currency</Label>
                <select
                  id="currency"
                  value={form.default_currency}
                  onChange={(event) =>
                    updateField('default_currency', event.target.value)
                  }
                  className={selectClassName}
                  required
                >
                  <option value="" disabled>
                    Select currency
                  </option>
                  {KNOWN_CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                  {form.default_currency &&
                  !KNOWN_CURRENCIES.includes(
                    form.default_currency as (typeof KNOWN_CURRENCIES)[number],
                  ) ? (
                    <option value={form.default_currency}>
                      {form.default_currency}
                    </option>
                  ) : null}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Default timezone</Label>
                <Input
                  id="timezone"
                  value={form.default_timezone}
                  onChange={(event) =>
                    updateField('default_timezone', event.target.value)
                  }
                  className="h-11 bg-surface px-3"
                  required
                  placeholder="Asia/Colombo"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="country-status">Status</Label>
                <Input
                  id="country-status"
                  value={form.status ?? ''}
                  onChange={(event) => updateField('status', event.target.value)}
                  className="h-11 bg-surface px-3"
                  placeholder="active"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving} className="h-10">
                {saving ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Saving…
                  </>
                ) : editingId ? (
                  'Update country'
                ) : (
                  'Create country'
                )}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyCountry)
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      )}
    </AccountShell>
  )
}
