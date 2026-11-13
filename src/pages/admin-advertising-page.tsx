import { useCallback, useEffect, useState } from 'react'
import { BellRing, ClipboardCheck, Globe2, ListOrdered, LoaderCircle, Megaphone, Pencil, Plus, Timer, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { listCountries } from '@/api/countries'
import {
  AD_PURCHASE_LABEL,
  adPackageAction,
  confirmAdPurchase,
  createAdPackage,
  deleteAdPackage,
  entriesLabel,
  formatCents,
  levelName,
  listAdminAdPackages,
  listAdminAdPurchases,
  resendAdReminder,
  updateAdPackage,
  type AdPackage,
  type AdPackageInput,
  type AdPurchase,
} from '@/api/game-entries'
import type { Country } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminEmptyState, AdminPageHeader } from '@/features/admin'
import { WizardDialog, WizardField, WizardFields, type WizardStep } from '@/features/seller/wizard-dialog'
import { getErrorMessage } from '@/lib/api'
import { isSuperAdmin } from '@/lib/auth'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'packages', label: 'Packages' },
  { id: 'sellers', label: 'Sellers and budgets' },
] as const
type Tab = (typeof TABS)[number]['id']

const number = new Intl.NumberFormat()

const PACKAGE_TONE: Record<AdPackage['status'], string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-emerald-100 text-emerald-900',
  retired: 'bg-muted text-muted-foreground',
}

function day(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
}

/**
 * Advertising packages: what sellers can buy to promote products, and how
 * each seller's budget is being used. Every number on a package is set
 * here. A published package never changes; editing one makes a new version,
 * so sellers keep the terms they bought.
 */
export function AdminAdvertisingPage() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'packages') as Tab
  const [countries, setCountries] = useState<Country[]>([])

  useEffect(() => {
    listCountries()
      .then((list) => setCountries(Array.isArray(list) ? list : []))
      .catch(() => setCountries([]))
  }, [])

  return (
    <>
      <AdminPageHeader
        title="Advertising packages"
        description="Sellers buy a package to promote products. Customers who buy a promoted product earn game entries from the package's budget."
      />
      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-brand-ink/15">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
              tab === t.id ? 'border-brand-ink text-brand-ink' : 'border-transparent text-muted-foreground hover:text-brand-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'packages' ? <PackagesPanel countries={countries} /> : <PurchasesPanel />}
    </>
  )
}

function PackagesPanel({ countries }: { countries: Country[] }) {
  const [items, setItems] = useState<AdPackage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdPackage | 'new' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const canEdit = isSuperAdmin()

  const load = useCallback(async () => {
    try {
      setItems(await listAdminAdPackages())
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the packages.'))
      setItems([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function run(id: string, done: string, fn: () => Promise<unknown>) {
    setBusy(id)
    setError(null)
    setNotice(null)
    try {
      const out = await fn()
      await load()
      setNotice(done)
      return out
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change the package.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          One package per country and price. Publish it to put it on sale; retire it to take it off.
        </p>
        {canEdit ? (
          <Button onClick={() => setEditing('new')} className="h-11 px-5">
            <Plus className="size-4" />
            New package
          </Button>
        ) : null}
      </div>
      <FormAlert error={error} notice={notice} className="mb-4" />

      {items === null ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={Megaphone}
          title="No packages yet"
          description="Create a package, for example a 3-product one and a 5-product one, then publish it for sellers to buy."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((pkg) => (
            <article
              key={pkg.id}
              className={cn(
                'flex flex-col rounded-xl border-2 bg-card p-5',
                pkg.status === 'published' ? 'border-brand-ink/15' : 'border-dashed border-brand-ink/15',
                pkg.status === 'retired' && 'opacity-70',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                    {pkg.country_name} · v{pkg.version}
                  </p>
                  <p className="mt-1 truncate font-poster text-2xl">{pkg.name}</p>
                </div>
                <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] uppercase', PACKAGE_TONE[pkg.status])}>
                  {pkg.status === 'published' ? 'On sale' : pkg.status}
                </span>
              </div>
              <p className="mt-2 text-lg font-bold">{formatCents(pkg.price_minor, pkg.currency)}</p>
              {pkg.description ? <p className="mt-1 text-sm text-muted-foreground">{pkg.description}</p> : null}
              <ul className="mt-3 space-y-1 text-sm">
                {pkg.level_entries.map((n, i) => (
                  <li key={i} className="flex justify-between gap-3 text-muted-foreground">
                    <span>{levelName(i + 1, pkg.product_slots)}</span>
                    <span className="font-semibold text-foreground">{entriesLabel(n)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                {pkg.product_slots} {pkg.product_slots === 1 ? 'product' : 'products'} · budget{' '}
                {number.format(pkg.entries_pool)} entries · {pkg.validity_days} days · bought {number.format(pkg.purchases)}{' '}
                {pkg.purchases === 1 ? 'time' : 'times'}
              </p>
              {canEdit ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {pkg.status === 'draft' ? (
                    <>
                      <Button size="sm" disabled={busy === pkg.id} onClick={() => void run(pkg.id, `${pkg.name} is on sale.`, () => adPackageAction(pkg.id, 'publish'))}>
                        Publish
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(pkg)}>
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === pkg.id}
                        onClick={() => void run(pkg.id, 'Draft deleted.', () => deleteAdPackage(pkg.id))}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === pkg.id}
                        onClick={async () => {
                          const draft = (await run(pkg.id, 'New version started as a draft. Edit it, then publish.', () =>
                            adPackageAction(pkg.id, 'new-version'),
                          )) as AdPackage | undefined
                          if (draft) setEditing(draft)
                        }}
                      >
                        <Pencil className="size-3.5" />
                        Change (new version)
                      </Button>
                      {pkg.status === 'published' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === pkg.id}
                          onClick={() => void run(pkg.id, `${pkg.name} is no longer on sale.`, () => adPackageAction(pkg.id, 'retire'))}
                        >
                          Retire
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {editing ? (
        <PackageDialog
          pkg={editing === 'new' ? null : editing}
          countries={countries}
          onClose={() => setEditing(null)}
          onSaved={async (saved, created) => {
            setEditing(null)
            await load()
            setNotice(created ? `${saved.name} saved as a draft. Publish it to put it on sale.` : `${saved.name} saved.`)
          }}
        />
      ) : null}
    </>
  )
}

function PackageDialog({
  pkg,
  countries,
  onClose,
  onSaved,
}: {
  pkg: AdPackage | null
  countries: Country[]
  onClose: () => void
  onSaved: (saved: AdPackage, created: boolean) => void | Promise<void>
}) {
  const [countryId, setCountryId] = useState(pkg?.country_id ?? countries[0]?.id ?? '')
  const [name, setName] = useState(pkg?.name ?? '')
  const [description, setDescription] = useState(pkg?.description ?? '')
  const [price, setPrice] = useState(pkg ? String(pkg.price_minor / 100) : '')
  const [levels, setLevels] = useState<string[]>(pkg ? pkg.level_entries.map(String) : ['3', '2', '1'])
  const [pool, setPool] = useState(pkg ? String(pkg.entries_pool) : '')
  const [days, setDays] = useState(pkg ? String(pkg.validity_days) : '30')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const country = countries.find((c) => c.id === countryId)
  const currency = pkg && pkg.country_id === countryId ? pkg.currency : (country?.default_currency ?? '')
  const levelNumbers = levels.map((l) => Math.floor(Number(l)) || 0)
  const top = Math.max(0, ...levelNumbers)
  const priceMinor = Math.round(Number(price) * 100)
  const poolNumber = Math.floor(Number(pool))
  const dayNumber = Math.floor(Number(days))
  const priceLabel = priceMinor > 0 && currency ? formatCents(priceMinor, currency) : '-'

  function setSlots(n: number) {
    const count = Math.max(1, Math.min(20, n || 1))
    setLevels((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? prev[prev.length - 1] ?? '1'))
  }

  const marketBlocked = !countryId
    ? 'Choose a country.'
    : !name.trim()
      ? 'Give the package a name.'
      : !(priceMinor > 0)
        ? 'Set a price above zero.'
        : null
  const levelsBlocked = levelNumbers.some((n) => n < 1)
    ? 'Every level must give at least 1 game entry.'
    : levelNumbers.some((n, i) => i > 0 && n > levelNumbers[i - 1])
      ? 'A lower level cannot give more entries than the level above it.'
      : null
  const limitsBlocked = !(poolNumber >= top && poolNumber > 0)
    ? `The budget must be at least ${top}, enough for one purchase at the top level.`
    : !(dayNumber >= 1 && dayNumber <= 365)
      ? 'The package must run for 1 to 365 days.'
      : null

  async function save() {
    setError(null)
    const body: AdPackageInput = {
      country_id: countryId,
      name: name.trim(),
      description: description.trim() || null,
      currency,
      price_minor: priceMinor,
      level_entries: levelNumbers,
      entries_pool: poolNumber,
      validity_days: dayNumber,
    }
    setBusy(true)
    try {
      const saved = pkg ? await updateAdPackage(pkg.id, body) : await createAdPackage(body)
      await onSaved(saved, !pkg)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the package.'))
      setBusy(false)
      throw err
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'market',
      title: 'Market & price',
      description: 'Where it is sold, what it is called and what it costs.',
      icon: Globe2,
      blockedReason: marketBlocked,
      content: (
        <WizardFields>
          <WizardField label="Country" htmlFor="ad-country" hint="Sold only to sellers in this country.">
            <select id="ad-country" className={selectClassName} value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              <option value="">Choose a country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </WizardField>
          <WizardField label={`Price${currency ? ` (${currency})` : ''}`} htmlFor="ad-price">
            <Input id="ad-price" type="number" inputMode="decimal" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50.00" />
          </WizardField>
          <WizardField label="Name" htmlFor="ad-name" hint="What sellers see." full>
            <Input id="ad-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Starter" />
          </WizardField>
          <WizardField label="Description" htmlFor="ad-desc" hint="Optional." full>
            <Input id="ad-desc" value={description} maxLength={600} onChange={(e) => setDescription(e.target.value)} placeholder="Promote your three best sellers" />
          </WizardField>
        </WizardFields>
      ),
    },
    {
      id: 'levels',
      title: 'Products & levels',
      description: 'How many products it promotes, and what each priority level earns a customer.',
      icon: ListOrdered,
      blockedReason: levelsBlocked,
      content: (
        <div className="space-y-5">
          <WizardField label="Products it promotes" htmlFor="ad-slots" hint="One priority level per product, highest first.">
            <Input id="ad-slots" type="number" inputMode="numeric" min={1} max={20} value={levels.length} onChange={(e) => setSlots(Number(e.target.value))} className="sm:w-40" />
          </WizardField>
          <div className="space-y-2">
            <p className="text-sm font-medium">Game entries a customer earns per purchase</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {levels.map((value, i) => (
                <label key={i} htmlFor={`ad-level-${i}`} className="flex items-center gap-3 rounded-xl border-2 border-brand-ink/10 px-3 py-2">
                  <span className="w-24 shrink-0 text-sm font-semibold">{levelName(i + 1, levels.length)}</span>
                  <Input
                    id={`ad-level-${i}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    value={value}
                    onChange={(e) => setLevels(levels.map((l, k) => (k === i ? e.target.value : l)))}
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">entries</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'limits',
      title: 'Budget & time',
      description: 'The package ends when its budget is used up or its days run out, whichever comes first.',
      icon: Timer,
      blockedReason: limitsBlocked,
      content: (
        <WizardFields>
          <WizardField
            label="Budget: total game entries"
            htmlFor="ad-pool"
            hint={
              top > 0 && poolNumber >= top
                ? `Enough for ${number.format(Math.floor(poolNumber / top))} purchases at the top level.`
                : 'The most entries customers can earn from this package.'
            }
          >
            <Input id="ad-pool" type="number" inputMode="numeric" min={1} value={pool} onChange={(e) => setPool(e.target.value)} placeholder="60" />
          </WizardField>
          <WizardField label="Runs for (days)" htmlFor="ad-days" hint="From the day the seller pays.">
            <Input id="ad-days" type="number" inputMode="numeric" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
          </WizardField>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Unused budget or days are not refunded. Sellers are reminded at 80, 85, 90, 95 and 100% used, and nothing
            renews by itself.
          </p>
        </WizardFields>
      ),
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Check the package, then save it as a draft. Publish it from the list.',
      icon: ClipboardCheck,
      content: (
        <dl className="divide-y divide-border/60 rounded-xl border-2 border-brand-ink/10 text-sm">
          {[
            ['Country', country?.name ?? '-'],
            ['Name', name.trim() || '-'],
            ['Price', priceLabel],
            ['Products', `${levels.length}`],
            ...levelNumbers.map((n, i) => [`${levelName(i + 1, levels.length)} priority`, entriesLabel(n)]),
            ['Budget', `${number.format(poolNumber || 0)} game entries`],
            ['Runs for', `${dayNumber || 0} days`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      ),
    },
  ]

  return (
    <WizardDialog
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      title={pkg ? `Edit ${pkg.name} v${pkg.version}` : 'New advertising package'}
      description="Saved as a draft. Sellers see it once you publish it, and what they buy keeps these terms."
      steps={steps}
      onComplete={save}
      completeLabel="Save draft"
      completing={busy}
      error={<FormAlert error={error} />}
    />
  )
}

function PurchasesPanel() {
  const [items, setItems] = useState<AdPurchase[] | null>(null)
  const [status, setStatus] = useState<AdPurchase['status'] | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const canEdit = isSuperAdmin()

  const load = useCallback(async () => {
    try {
      setItems(await listAdminAdPurchases(status))
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the purchases.'))
      setItems([])
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  async function run(id: string, done: string, fn: () => Promise<unknown>) {
    setBusy(id)
    setError(null)
    setNotice(null)
    try {
      await fn()
      await load()
      setNotice(done)
    } catch (err) {
      setError(getErrorMessage(err, 'That did not work.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by status"
          className={cn(selectClassName, 'w-auto')}
          value={status}
          onChange={(e) => setStatus(e.target.value as AdPurchase['status'] | '')}
        >
          <option value="">All purchases</option>
          {Object.entries(AD_PURCHASE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          Sellers are told at 80, 85, 90, 95 and 100% of the budget, once each. You can send the current notice again.
        </p>
      </div>
      <FormAlert error={error} notice={notice} className="mb-4" />

      {items === null ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState icon={Megaphone} title="No purchases" description="No seller has bought a package yet." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((p) => (
            <article key={p.id} className="rounded-xl border-2 border-brand-ink/15 bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.seller_name || p.seller_email}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.seller_email}</p>
                  <p className="mt-1 text-sm">
                    {p.package_name} · {formatCents(p.price_minor, p.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] uppercase">
                    {AD_PURCHASE_LABEL[p.status]}
                  </span>
                  {p.paid_at ? <p className="mt-2 font-poster text-3xl">{p.usage_percent}%</p> : null}
                </div>
              </div>
              {p.paid_at ? (
                <>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${p.usage_percent}% of the budget used`}>
                    <div className="h-full bg-brand-violet" style={{ width: `${Math.min(100, p.usage_percent)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {number.format(p.entries_used)} of {number.format(p.entries_pool)} entries given
                    {p.entries_held > 0 ? ` · ${number.format(p.entries_held)} on unpaid orders` : ''} · paid {day(p.paid_at)} ·
                    runs until {day(p.expires_at)}
                  </p>
                  {(p.promotions ?? []).filter((pr) => pr.level > 0).length > 0 ? (
                    <ul className="mt-3 space-y-1 border-t border-border/60 pt-3 text-sm">
                      {(p.promotions ?? [])
                        .filter((pr) => pr.level > 0)
                        .map((pr) => (
                          <li key={pr.product_id} className="flex justify-between gap-3">
                            <span className="truncate">
                              <span className="text-muted-foreground">{levelName(pr.level, p.product_slots)}:</span> {pr.product_name}
                            </span>
                            <span className="shrink-0 text-muted-foreground">{number.format(pr.entries_granted)} given</span>
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Started {day(p.created_at)} · {p.provider}
                  {p.failure_reason ? ` · ${p.failure_reason}` : ''}
                </p>
              )}
              {canEdit ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.usage_percent >= 80 && p.paid_at ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === p.id}
                      onClick={() => void run(p.id, 'Reminder sent to the seller.', () => resendAdReminder(p.id))}
                    >
                      <BellRing className="size-3.5" />
                      Resend reminder
                    </Button>
                  ) : null}
                  {p.status === 'pending' && p.provider === 'manual' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === p.id}
                      onClick={() => {
                        const reference = window.prompt('Payment reference for this purchase (as it appears on the payment you received):')
                        if (reference?.trim()) void run(p.id, 'Payment confirmed. The package is active.', () => confirmAdPurchase(p.id, reference.trim()))
                      }}
                    >
                      Confirm payment received
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </>
  )
}
