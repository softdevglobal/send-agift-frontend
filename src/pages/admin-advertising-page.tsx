import { useCallback, useEffect, useState } from 'react'
import {
  Award,
  BellRing,
  ClipboardCheck,
  Crown,
  Gift,
  Globe2,
  ListOrdered,
  LoaderCircle,
  Medal,
  Megaphone,
  Minus,
  Pencil,
  Plus,
  Ticket,
  Timer,
  Trash2,
} from 'lucide-react'
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
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'
import { askText } from '@/components/common/ask-dialog'

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
              {pkg.description ? <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{pkg.description}</p> : null}
              <ul className="mt-3 space-y-1 text-sm">
                {pkg.level_entries.map((n, i) => (
                  <li key={i} className="flex justify-between gap-3 text-muted-foreground">
                    <span>{levelName(i + 1, pkg.product_slots, pkg.level_names)}</span>
                    <span className="font-semibold text-foreground">{entriesLabel(n)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                {pkg.product_slots} {pkg.product_slots === 1 ? 'product' : 'products'} · budget{' '}
                {number.format(pkg.entries_pool)} entries · {pkg.validity_days ? `${pkg.validity_days} days` : 'until used'} · bought {number.format(pkg.purchases)}{' '}
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
  /** The admin's names for the levels; a blank one uses the default name. */
  const [levelNames, setLevelNames] = useState<string[]>(() =>
    pkg ? pkg.level_entries.map((_, i) => pkg.level_names?.[i] ?? '') : ['', '', ''],
  )
  const [pool, setPool] = useState(pkg ? String(pkg.entries_pool) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const country = countries.find((c) => c.id === countryId)
  const currency = pkg && pkg.country_id === countryId ? pkg.currency : (country?.default_currency ?? '')
  const levelNumbers = levels.map((l) => Math.floor(Number(l)) || 0)
  const top = Math.max(0, ...levelNumbers)
  const priceMinor = Math.round(Number(price) * 100)
  const poolNumber = Math.floor(Number(pool))
  const priceLabel = priceMinor > 0 && currency ? formatCents(priceMinor, currency) : '-'

  function setSlots(n: number) {
    const count = Math.max(1, Math.min(20, n || 1))
    setLevels((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? prev[prev.length - 1] ?? '1'))
    setLevelNames((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? ''))
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
      // Names only when at least one was given; the server fills blanks.
      level_names: levelNames.some((n) => n.trim()) ? levelNames.map((n) => n.trim()) : [],
      entries_pool: poolNumber,
      // No time limit: a package runs until its budget is used up.
      validity_days: null,
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
            <textarea
              id="ad-desc"
              rows={3}
              value={description}
              maxLength={600}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Promote your three best sellers"
              className={textareaClassName}
            />
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
        <LevelsEditor
          levels={levels}
          onLevels={setLevels}
          names={levelNames}
          onNames={setLevelNames}
          onSlots={setSlots}
          error={levelsBlocked}
        />
      ),
    },
    {
      id: 'limits',
      title: 'Budget',
      description: 'The package runs until its budget of game entries is used up. It never expires by date.',
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
          <p className="text-xs text-muted-foreground sm:col-span-2">
            No end date: the package keeps promoting until customers have earned the whole budget. Sellers are reminded
            at 80, 85, 90, 95 and 100% used, and nothing renews by itself.
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
        <div className="space-y-3">
          <dl className="divide-y divide-border/60 rounded-xl border-2 border-brand-ink/10 text-sm">
          {[
            ['Country', country?.name ?? '-'],
            ['Name', name.trim() || '-'],
            ['Price', priceLabel],
            ['Products', `${levels.length}`],
            ...levelNumbers.map((n, i) => [`${levelName(i + 1, levels.length, levelNames)} priority`, entriesLabel(n)]),
            ['Budget', `${number.format(poolNumber || 0)} game entries`],
            ['Runs', 'Until the budget is used'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
          </dl>
          {description.trim() ? (
            <div className="rounded-xl border-2 border-brand-ink/10 px-4 py-3 text-sm">
              <p className="mb-1 text-muted-foreground">Description</p>
              <p className="whitespace-pre-line">{description.trim()}</p>
            </div>
          ) : null}
        </div>
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
                    {p.expires_at ? `runs until ${day(p.expires_at)}` : 'runs until the budget is used'}
                  </p>
                  {(p.promotions ?? []).filter((pr) => pr.level > 0).length > 0 ? (
                    <ul className="mt-3 space-y-1 border-t border-border/60 pt-3 text-sm">
                      {(p.promotions ?? [])
                        .filter((pr) => pr.level > 0)
                        .map((pr) => (
                          <li key={pr.product_id} className="flex justify-between gap-3">
                            <span className="truncate">
                              <span className="text-muted-foreground">{levelName(pr.level, p.product_slots, p.level_names)}:</span> {pr.product_name}
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
                      onClick={async () => {
                        const reference = await askText({
                          title: 'Confirm payment received',
                          description: 'The package goes live as soon as you confirm. Only do this once the money has arrived.',
                          confirmLabel: 'Confirm payment',
                          label: 'Payment reference',
                          placeholder: 'As it appears on the payment you received',
                          singleLine: true,
                        })
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

// ─── Products & levels ─────────────────────────────────────────────────────

/** Rank looks: a crown, a medal and a ribbon for the top three. */
const RANKS = [
  { icon: Crown, badge: 'bg-amber-400 text-brand-ink', bar: 'from-amber-300 to-amber-500' },
  { icon: Medal, badge: 'bg-slate-300 text-brand-ink', bar: 'from-slate-200 to-slate-400' },
  { icon: Award, badge: 'bg-orange-300 text-brand-ink', bar: 'from-orange-200 to-orange-400' },
]
const OTHER_RANK = { icon: Ticket, badge: 'bg-brand-violet/15 text-brand-violet', bar: 'from-brand-violet/40 to-brand-violet' }

/** A round − / + button. */
function StepButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-brand-ink/15 bg-surface text-brand-ink transition hover:border-brand-violet hover:text-brand-violet disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}

/**
 * How many products a package promotes and what each priority level earns,
 * as a ladder: the top product wears the crown, every level shows its share
 * of entries as a bar, and the totals read back in plain words.
 */
function LevelsEditor({
  levels,
  onLevels,
  names,
  onNames,
  onSlots,
  error,
}: {
  levels: string[]
  onLevels: (next: string[]) => void
  names: string[]
  onNames: (next: string[]) => void
  onSlots: (count: number) => void
  error: string | null
}) {
  const numbers = levels.map((l) => Math.max(0, Math.floor(Number(l)) || 0))
  const top = Math.max(1, ...numbers)
  const total = numbers.reduce((a, b) => a + b, 0)
  const count = levels.length

  const setLevel = (i: number, value: number | string) =>
    onLevels(levels.map((l, k) => (k === i ? String(value) : l)))

  const patterns: { label: string; make: (n: number, high: number) => number[] }[] = [
    { label: 'Stepped', make: (n) => Array.from({ length: n }, (_, i) => n - i) },
    { label: 'Equal', make: (n, high) => Array.from({ length: n }, () => Math.max(1, high)) },
    { label: 'Top heavy', make: (n) => Array.from({ length: n }, (_, i) => (i === 0 ? n * 2 : Math.max(1, n - i))) },
  ]

  return (
    <div className="space-y-6">
      {/* How many products */}
      <section className="rounded-2xl bg-brand-ink p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-white/60 uppercase">Products it promotes</p>
            <p className="mt-1 text-sm text-white/70">One priority level each, highest first.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="One product fewer"
              disabled={count <= 1}
              onClick={() => onSlots(count - 1)}
              className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-30"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-14 text-center font-poster text-4xl tabular-nums" aria-live="polite">
              {count}
            </span>
            <button
              type="button"
              aria-label="One product more"
              disabled={count >= 20}
              onClick={() => onSlots(count + 1)}
              className="grid size-10 place-items-center rounded-full bg-brand-teal text-brand-ink transition hover:bg-brand-teal/85 disabled:opacity-30"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5" aria-hidden>
          {levels.map((_, i) => (
            <span
              key={i}
              className={cn(
                'grid size-9 place-items-center rounded-lg transition',
                i === 0 ? 'bg-amber-400 text-brand-ink' : 'bg-white/10 text-white/80',
              )}
            >
              <Gift className="size-4" />
            </span>
          ))}
        </div>
      </section>

      {/* What each level earns */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Levels and game entries</p>
            <p className="text-xs text-muted-foreground">
              Name each level the way sellers will see it, and set what a customer earns for buying its product.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {patterns.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onLevels(p.make(count, top).map(String))}
                className="rounded-full border border-brand-ink/15 px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-brand-violet hover:text-brand-violet"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <ol className="space-y-2">
          {levels.map((value, i) => {
            const rank = RANKS[i] ?? OTHER_RANK
            const Icon = rank.icon
            const n = numbers[i]
            const outOfOrder = (i > 0 && n > numbers[i - 1]) || n < 1
            return (
              <li
                key={i}
                className={cn(
                  'rounded-2xl border-2 bg-surface p-3 transition',
                  outOfOrder ? 'border-amber-400/70' : 'border-brand-ink/10',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', rank.badge)}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 text-sm font-bold text-muted-foreground">#{i + 1}</span>
                      <label htmlFor={`ad-level-name-${i}`} className="sr-only">
                        Name of level {i + 1}
                      </label>
                      <input
                        id={`ad-level-name-${i}`}
                        value={names[i] ?? ''}
                        maxLength={40}
                        onChange={(e) => onNames(names.map((n, k) => (k === i ? e.target.value : n)))}
                        placeholder={levelName(i + 1, count)}
                        className="h-8 w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 text-sm font-bold outline-none transition placeholder:text-brand-ink/40 hover:border-brand-ink/15 focus-visible:border-ring focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-300', rank.bar)}
                        style={{ width: `${Math.min(100, (n / top) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StepButton label={`Fewer entries for level ${i + 1}`} disabled={n <= 1} onClick={() => setLevel(i, Math.max(1, n - 1))}>
                      <Minus className="size-3.5" />
                    </StepButton>
                    <label htmlFor={`ad-level-${i}`} className="sr-only">
                      Entries for level {i + 1}
                    </label>
                    <input
                      id={`ad-level-${i}`}
                      inputMode="numeric"
                      value={value}
                      onChange={(e) => setLevel(i, e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="h-9 w-14 rounded-lg border border-input bg-surface text-center text-base font-bold tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <StepButton label={`More entries for level ${i + 1}`} disabled={n >= 1000} onClick={() => setLevel(i, n + 1)}>
                      <Plus className="size-3.5" />
                    </StepButton>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        {/* The wizard says what is wrong; the card in question is outlined. */}
        {error ? null : (
          <p className="flex items-start gap-2 rounded-xl bg-brand-teal/15 px-3 py-2.5 text-sm">
            <Ticket className="mt-0.5 size-4 shrink-0 text-brand-ink" />
            <span>
              A customer earns <strong>{entriesLabel(numbers[0] ?? 0)}</strong> for the top product
              {count > 1 ? (
                <>
                  {' '}down to <strong>{entriesLabel(numbers[count - 1] ?? 0)}</strong> for the last
                </>
              ) : null}
              . Buying one of each earns <strong>{entriesLabel(total)}</strong>.
            </span>
          </p>
        )}
      </section>
    </div>
  )
}
