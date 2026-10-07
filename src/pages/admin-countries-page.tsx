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

import { createCountry, deleteCountry, listCountryCapabilities, updateCountry } from '@/api/admin'
import { listCountries, type Country, type CountryInput } from '@/api/countries'
import { KNOWN_CURRENCIES, type CountryCapability } from '@/api/types'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FormAlert } from '@/components/common/form-alert'
import { Sparkle } from '@/components/common/storefront-decor'
import { PageNav, usePagedList } from '@/components/common/page-nav'
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
import {
  AdminPageHeader,
  CountryCapabilitiesPanel,
  adminPanelClass,
  formatDate,
} from '@/features/admin'
import { ApiError, getErrorMessage } from '@/lib/api'
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
  const [countryToDelete, setCountryToDelete] = useState<Country | null>(null)
  const [deleting, setDeleting] = useState(false)
  const countryPages = usePagedList(countries, 9)
  const [capabilities, setCapabilities] = useState<Record<string, CountryCapability>>({})
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
    try {
      const entries = await listCountryCapabilities()
      const map: Record<string, CountryCapability> = {}
      for (const entry of Array.isArray(entries) ? entries : []) {
        const countryId = entry.capability?.country_id || entry.country?.id
        if (countryId && entry.capability) map[countryId] = entry.capability
      }
      setCapabilities(map)
    } catch {
      setCapabilities({})
    }
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
    setDeleting(true)
    try {
      await deleteCountry(id)
      if (viewCountry?.id === id) setViewOpen(false)
      await load()
      setNotice('Country deleted.')
    } catch (err) {
      const message = getErrorMessage(err, 'Could not delete country.')
      setError(
        err instanceof ApiError && err.status === 500
          ? 'This country cannot be deleted while customers, sellers, or other records still use it.'
          : message,
      )
    } finally {
      setDeleting(false)
      setCountryToDelete(null)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Countries"
        description="Create markets customers and sellers can register into, then toggle what each country allows."
        action={
          <Button type="button" className="h-11 px-5" onClick={openCreate}>
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
            <>
            {/* Four numbers first: how many markets, and who can sign up. */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'Countries', value: countries.length, tone: 'bg-brand-ink text-white' },
                {
                  label: 'Active',
                  value: countries.filter((c) => c.status?.toLowerCase() === 'active').length,
                  tone: 'bg-brand-violet text-white',
                },
                {
                  label: 'Customer sign-up on',
                  value: countries.filter((c) => capabilities[c.id]?.customer_registration_enabled).length,
                  tone: 'bg-brand-teal text-brand-ink',
                },
                {
                  label: 'Seller sign-up on',
                  value: countries.filter((c) => capabilities[c.id]?.seller_registration_enabled).length,
                  tone: 'bg-amber-300 text-amber-950',
                },
              ].map((item) => (
                <div key={item.label} className={cn('rounded-xl p-4', item.tone)}>
                  <p className="font-poster text-4xl">{item.value}</p>
                  <p className="mt-1 text-[11px] font-bold tracking-[0.12em] uppercase opacity-80">
                    {item.label}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {countryPages.visible.map((country) => {
                const active = country.status?.toLowerCase() === 'active'
                const gates = capabilities[country.id]
                return (
                  <div
                    key={country.id}
                    className="group flex flex-col overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card transition-colors hover:border-brand-ink"
                  >
                    {/* Passport-style band: flag, code and name. */}
                    <button
                      type="button"
                      onClick={() => openView(country)}
                      className={cn(
                        'relative flex items-center gap-3 px-4 py-4 text-left',
                        active ? 'bg-brand-violet text-white' : 'bg-brand-ink text-white',
                      )}
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white text-3xl">
                        {flagEmoji(country.iso_code)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-poster text-3xl leading-none">{country.iso_code}</span>
                        <span className="mt-1 block truncate text-sm font-bold text-white/85">
                          {country.name}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] uppercase',
                          active ? 'bg-brand-teal text-brand-ink' : 'bg-white/15 text-white',
                        )}
                      >
                        {country.status || 'unknown'}
                      </span>
                    </button>

                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-accent px-2 py-1 text-[11px] font-bold text-brand-ink">
                          {country.default_currency}
                        </span>
                        <span className="truncate rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-brand-ink">
                          {country.default_timezone}
                        </span>
                      </div>

                      {gates ? (
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Customers', on: gates.customer_registration_enabled },
                            { label: 'Sellers', on: gates.seller_registration_enabled },
                          ].map((gate) => (
                            <span
                              key={gate.label}
                              className={cn(
                                'flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[11px] font-bold',
                                gate.on ? 'bg-brand-teal/20 text-brand-ink' : 'bg-muted text-muted-foreground',
                              )}
                            >
                              <span
                                className={cn(
                                  'size-2 rounded-sm',
                                  gate.on ? 'bg-brand-teal' : 'bg-muted-foreground/40',
                                )}
                              />
                              {gate.label} {gate.on ? 'on' : 'off'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-md bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-900">
                          Sign-up gates not set yet
                        </p>
                      )}

                      <div className="mt-auto flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => openView(country)}
                          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border-2 border-brand-ink/15 text-[11px] font-bold tracking-[0.08em] text-brand-ink uppercase transition-colors hover:border-brand-ink hover:bg-brand-ink hover:text-white"
                        >
                          <Eye className="size-4" />
                          View
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit ${country.name}`}
                          onClick={() => openEdit(country)}
                          className="flex size-9 items-center justify-center rounded-md border-2 border-brand-ink/15 text-brand-ink transition-colors hover:border-brand-ink hover:bg-brand-ink hover:text-white"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${country.name}`}
                          onClick={() => setCountryToDelete(country)}
                          className="flex size-9 items-center justify-center rounded-md border-2 border-destructive/35 text-destructive transition-colors hover:border-destructive hover:bg-destructive hover:text-white"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>
            <PageNav
              page={countryPages.page}
              pageCount={countryPages.pageCount}
              onPage={countryPages.setPage}
              label="Country pages"
            />
            </>
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
        <DialogContent className="account-box gap-0 overflow-hidden border-2 border-brand-ink p-0 sm:max-w-xl [&>[data-slot=dialog-close]]:text-white">
          <div className="relative overflow-hidden bg-brand-ink px-6 pt-6 pb-5 text-white">
            <Sparkle className="absolute top-5 right-14 size-5 text-brand-teal" />

            <DialogHeader className="relative">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-teal text-brand-ink">
                  <Sparkles className="size-5" />
                </div>
                <DialogTitle className="font-poster text-2xl text-white">
                  {editingId ? 'Edit country' : 'Add country'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-white/65">
                {editingId
                  ? 'Update this market. Changes apply to registration forms immediately.'
                  : 'A quick two-step setup. Fill in the details, then confirm before it goes live.'}
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
                          'flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold transition-colors',
                          isActive
                            ? 'bg-brand-teal text-brand-ink'
                            : isDone
                              ? 'bg-brand-violet text-white'
                              : 'bg-white/12 text-white/60',
                        )}
                      >
                        {isDone ? <Check className="size-3.5" /> : index + 1}
                      </div>
                      <span
                        className={cn(
                          'text-[11px] font-bold tracking-[0.1em] whitespace-nowrap uppercase',
                          isActive ? 'text-white' : 'text-white/55',
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                    {index < wizardSteps.length - 1 ? (
                      <div
                        className={cn(
                          'mx-3 h-0.5 w-10 shrink-0 transition-colors',
                          isDone ? 'bg-brand-violet' : 'bg-white/15',
                        )}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <form onSubmit={handleFormSubmit}>
            <div className="bg-card px-6 py-6">
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
                      className="relative inline-flex rounded-lg bg-accent p-1"
                    >
                      <div
                        aria-hidden
                        className="absolute inset-y-1 left-1 w-[5.25rem] rounded-md bg-brand-ink transition-transform duration-300 ease-out"
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
                            'relative z-10 w-[5.25rem] rounded-md py-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors duration-200 active:scale-95',
                            form.status === option.value
                              ? 'text-white'
                              : 'text-brand-ink/60 hover:text-brand-ink',
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
                  <div className="relative overflow-hidden rounded-xl bg-brand-violet px-6 py-6 text-white">
                    <div className="relative flex items-center gap-4">
                      <span className="text-5xl leading-none drop-shadow-sm">
                        {flagEmoji(form.iso_code)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-poster text-2xl">
                          {form.name.trim() || 'Unnamed market'}
                        </p>
                        <p className="text-sm text-white/75">
                          {form.iso_code.trim().toUpperCase()}
                          {form.status?.trim() ? ` · ${form.status.trim()}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-5 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 text-xs font-bold">
                        <Coins className="size-3.5" />
                        {form.default_currency.trim().toUpperCase() || '-'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 text-xs font-bold">
                        <Clock className="size-3.5" />
                        {form.default_timezone.trim() || '-'}
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

            <DialogFooter className="flex-row items-center justify-between border-t-2 border-brand-ink/10 bg-accent/60 px-6 py-4 sm:justify-between">
              <span className="hidden text-[11px] font-bold tracking-[0.12em] text-brand-ink/60 uppercase sm:inline">
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
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                      <span className="font-poster text-2xl">
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

                <CountryCapabilitiesPanel
                  key={viewCountry.id}
                  countryId={viewCountry.id}
                  existing={capabilities[viewCountry.id] ?? null}
                  onChanged={(capability) => {
                    setCapabilities((current) => ({
                      ...current,
                      [viewCountry.id]: capability,
                    }))
                  }}
                />
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
                  onClick={() => setCountryToDelete(viewCountry)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={countryToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setCountryToDelete(null)
        }}
        title={`Delete ${countryToDelete?.name ?? 'this country'}?`}
        description="It disappears from the registration forms straight away. A country still used by customers, sellers or orders cannot be deleted."
        confirmLabel="Delete country"
        busy={deleting}
        onConfirm={() => {
          if (countryToDelete) void handleDelete(countryToDelete.id)
        }}
      />
    </>
  )
}
