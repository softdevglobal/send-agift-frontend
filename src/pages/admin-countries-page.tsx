import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Coins,
  Eye,
  Globe2,
  LoaderCircle,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'

import { createCountry, deleteCountry, updateCountry } from '@/api/admin'
import { listCountries, type Country, type CountryInput } from '@/api/countries'
import { KNOWN_CURRENCIES } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AdminPageHeader, adminPanelClass, formatDate } from '@/features/admin'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

const emptyCountry: CountryInput = {
  iso_code: '',
  name: '',
  default_currency: '',
  default_timezone: '',
  status: 'active',
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

const wizardSteps = [
  { key: 'details', label: 'Details' },
  { key: 'preview', label: 'Preview' },
] as const

type WizardStep = (typeof wizardSteps)[number]['key']

function toInput(country: Country): CountryInput {
  return {
    iso_code: country.iso_code,
    name: country.name,
    default_currency: country.default_currency,
    default_timezone: country.default_timezone,
    status: country.status,
  }
}

function flagEmoji(iso: string): string {
  const code = iso.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return '🌐'
  const points = [...code].map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...points)
}

function statusTone(status: string): string {
  const normalized = status.trim().toLowerCase()
  if (normalized === 'active') return 'bg-accent text-primary'
  if (normalized === 'inactive') return 'bg-muted text-muted-foreground'
  return 'bg-muted text-muted-foreground'
}

export function AdminCountriesPage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<CountryInput>(emptyCountry)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState<WizardStep>('details')
  const [viewCountry, setViewCountry] = useState<Country | null>(null)
  const [viewOpen, setViewOpen] = useState(false)

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

  function openCreate() {
    setEditingId(null)
    setForm(emptyCountry)
    setFormError(null)
    setNotice(null)
    setStep('details')
    setDialogOpen(true)
  }

  function openEdit(country: Country) {
    setViewOpen(false)
    setEditingId(country.id)
    setForm(toInput(country))
    setFormError(null)
    setNotice(null)
    setStep('details')
    setDialogOpen(true)
  }

  function openView(country: Country) {
    setViewCountry(country)
    setViewOpen(true)
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setEditingId(null)
      setForm(emptyCountry)
      setFormError(null)
      setStep('details')
    }
  }

  function buildBody(): CountryInput | null {
    const iso = form.iso_code.trim().toUpperCase()
    if (iso.length !== 2) {
      setFormError('ISO code must be 2 letters.')
      return null
    }
    if (!form.name.trim() || !form.default_currency.trim() || !form.default_timezone.trim()) {
      setFormError('Fill in every field before continuing.')
      return null
    }
    return {
      iso_code: iso,
      name: form.name.trim(),
      default_currency: form.default_currency.trim().toUpperCase(),
      default_timezone: form.default_timezone.trim(),
      status: optionalString(form.status ?? ''),
    }
  }

  function goToPreview() {
    setFormError(null)
    if (buildBody()) setStep('preview')
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (step === 'details') {
      goToPreview()
      return
    }

    setFormError(null)
    const body = buildBody()
    if (!body) {
      setStep('details')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateCountry(editingId, body)
        setNotice('Country updated.')
      } else {
        await createCountry(body)
        setNotice('Country created.')
      }
      await load()
      handleDialogChange(false)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save country.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    setNotice(null)
    try {
      await deleteCountry(id)
      if (viewCountry?.id === id) setViewOpen(false)
      await load()
      setNotice('Country deleted.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete country.'))
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Countries"
        description="Create the markets customers and sellers can register into. New countries appear on registration forms as soon as they're added."
        action={
          <Button type="button" className="h-11 rounded-full px-5" onClick={openCreate}>
            <Plus className="size-4" />
            Add country
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <FormAlert error={error} notice={notice} />

          {countries.length ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {countries.map((country) => (
                <div
                  key={country.id}
                  className={cn(
                    adminPanelClass,
                    'group flex flex-col gap-3 p-4 transition-shadow hover:shadow-[0_14px_44px_rgba(40,50,30,0.1)]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openView(country)}
                    className="flex min-w-0 items-start gap-3 text-left"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-2xl">
                      {flagEmoji(country.iso_code)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{country.name}</p>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
                          {country.iso_code}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {country.default_currency} · {country.default_timezone}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                        statusTone(country.status),
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {country.status || 'unknown'}
                    </span>

                    <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`View ${country.name}`}
                        onClick={() => openView(country)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${country.name}`}
                        onClick={() => openEdit(country)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${country.name}`}
                        onClick={() => handleDelete(country.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <section
              className={cn(
                adminPanelClass,
                'flex flex-col items-center px-6 py-16 text-center',
              )}
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Globe2 className="size-5" />
              </div>
              <p className="text-sm font-medium">No countries yet</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Registration forms load this list, so add at least one market
                before customers or sellers sign up.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-5 h-9 rounded-full"
                onClick={openCreate}
              >
                <Plus className="size-4" />
                Add country
              </Button>
            </section>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
          <div className="relative overflow-hidden bg-gradient-to-br from-accent/60 via-cream to-cream px-6 pt-6 pb-5">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-14 size-48 rounded-full bg-[oklch(0.92_0.04_125/0.6)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -left-16 size-40 rounded-full bg-[oklch(0.93_0.04_80/0.5)]"
            />

            <DialogHeader className="relative">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary">
                  <Sparkles className="size-4" />
                </div>
                <DialogTitle>{editingId ? 'Edit country' : 'Add country'}</DialogTitle>
              </div>
              <DialogDescription>
                {editingId
                  ? 'Update this market. Changes apply to registration forms immediately.'
                  : 'A quick two-step setup — fill in the details, then confirm before it goes live.'}
              </DialogDescription>
            </DialogHeader>

            <div className="relative mt-5 flex items-center">
              {wizardSteps.map((item, index) => {
                const currentIndex = wizardSteps.findIndex((s) => s.key === step)
                const isDone = index < currentIndex
                const isActive = item.key === step
                return (
                  <div key={item.key} className="flex items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                          isDone || isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {isDone ? <Check className="size-3.5" /> : index + 1}
                      </div>
                      <span
                        className={cn(
                          'text-xs font-medium whitespace-nowrap',
                          isActive ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                    {index < wizardSteps.length - 1 ? (
                      <div
                        className={cn(
                          'mx-3 h-px w-10 shrink-0 transition-colors',
                          isDone ? 'bg-primary' : 'bg-border',
                        )}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <form onSubmit={handleFormSubmit}>
            <div className="border-t border-border/60 bg-card px-6 py-6">
              {formError ? (
                <div className="mb-4">
                  <FormAlert error={formError} />
                </div>
              ) : null}

              {step === 'details' ? (
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
                    <Label>Status</Label>
                    <div
                      role="group"
                      aria-label="Status"
                      className="relative inline-flex rounded-full bg-muted p-1"
                    >
                      <div
                        aria-hidden
                        className="absolute inset-y-1 left-1 w-[5.25rem] rounded-full bg-card shadow-sm transition-transform duration-300 ease-out"
                        style={{
                          transform: `translateX(${Math.max(0, statusOptions.findIndex((option) => option.value === form.status)) * 5.25}rem)`,
                        }}
                      />
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateField('status', option.value)}
                          className={cn(
                            'relative z-10 w-[5.25rem] rounded-full py-1.5 text-sm font-medium transition-colors duration-200 active:scale-95',
                            form.status === option.value
                              ? 'text-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-6 text-primary-foreground shadow-[0_12px_32px_rgba(40,55,25,0.18)]">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -top-10 -right-6 size-32 rounded-full bg-white/10"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -bottom-12 -left-8 size-32 rounded-full bg-white/10"
                    />
                    <div className="relative flex items-center gap-4">
                      <span className="text-5xl leading-none drop-shadow-sm">
                        {flagEmoji(form.iso_code)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-display text-2xl tracking-tight">
                          {form.name.trim() || 'Unnamed market'}
                        </p>
                        <p className="text-sm text-primary-foreground/75">
                          {form.iso_code.trim().toUpperCase()}
                          {form.status?.trim() ? ` · ${form.status.trim()}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-5 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-medium">
                        <Coins className="size-3.5" />
                        {form.default_currency.trim().toUpperCase() || '—'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-medium">
                        <Clock className="size-3.5" />
                        {form.default_timezone.trim() || '—'}
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    This is how {form.name.trim() || 'this market'} will appear across
                    registration forms and the countries list.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex-row items-center justify-between border-t border-border/60 bg-muted/40 px-6 py-4 sm:justify-between">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Step {step === 'details' ? '1' : '2'} of {wizardSteps.length}
              </span>
              <div className="flex flex-1 justify-end gap-2 sm:flex-none">
                {step === 'details' ? (
                  <>
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className="h-10">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" className="h-10">
                      Next
                      <ArrowRight className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10"
                      onClick={() => setStep('details')}
                    >
                      <ArrowLeft className="size-4" />
                      Back
                    </Button>
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
                  </>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="gap-0 p-0">
          {viewCountry ? (
            <>
              <div className="relative overflow-hidden bg-primary px-6 pt-10 pb-7 text-primary-foreground">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/10"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full bg-white/10"
                />
                <SheetHeader className="relative">
                  <div className="flex items-center gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-white/25">
                      <span className="font-display text-2xl tracking-tight">
                        {viewCountry.iso_code}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <SheetTitle className="text-primary-foreground">
                        {viewCountry.name}
                      </SheetTitle>
                      <SheetDescription className="text-primary-foreground/75">
                        Market configuration
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                    statusTone(viewCountry.status),
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {viewCountry.status || 'unknown'}
                </span>

                <dl className="grid grid-cols-2 gap-4">
                  <div className={cn(adminPanelClass, 'p-4')}>
                    <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      <Coins className="size-3.5" />
                      Currency
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {viewCountry.default_currency}
                    </dd>
                  </div>
                  <div className={cn(adminPanelClass, 'p-4')}>
                    <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      <Clock className="size-3.5" />
                      Timezone
                    </dt>
                    <dd className="mt-1 truncate text-sm font-medium">
                      {viewCountry.default_timezone}
                    </dd>
                  </div>
                  <div className={cn(adminPanelClass, 'p-4')}>
                    <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      <Calendar className="size-3.5" />
                      Created
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatDate(viewCountry.created_at)}
                    </dd>
                  </div>
                  <div className={cn(adminPanelClass, 'p-4')}>
                    <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      <Calendar className="size-3.5" />
                      Updated
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatDate(viewCountry.updated_at)}
                    </dd>
                  </div>
                </dl>
              </div>

              <SheetFooter className="flex-row gap-2 border-t border-border/60 bg-muted/40 px-6 py-4">
                <SheetClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1"
                    onClick={() => openEdit(viewCountry)}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                </SheetClose>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDelete(viewCountry.id)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
