import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, Crown, Eye, Gift, LoaderCircle, Pencil, Plus, Trash2, Wallet } from 'lucide-react'

import {
  createOffer,
  createPolicy,
  deleteOffer,
  deletePolicy,
  listAdminOffers,
  listAdminPolicies,
  offerAction,
  policyAction,
  previewPolicy,
  updateOffer,
  updatePolicy,
  type IntervalUnit,
  type PlanOffer,
  type PolicyInput,
  type PolicyPreview,
  type RewardPolicy,
  type VersionAction,
} from '@/api/competition-points'
import type { Country } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  WizardDialog,
  WizardField,
  WizardFields,
  WizardPreviewFrame,
  type WizardStep,
} from '@/features/seller/wizard-dialog'
import { cn } from '@/lib/utils'
import { AdminEmptyState } from '@/features/admin'
import { formatDate, formatMoney } from '@/features/competition-points/format'
import { getErrorMessage } from '@/lib/api'
import { getTokenSubject, isSuperAdmin } from '@/lib/auth'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { majorToMinor, minorToMajor } from '@/lib/money'

import { versionActions } from './labels'
import { ActionButtons, Field, StatusPill, UnapprovedNote } from './shared'

function useVersionActions(load: () => Promise<void>) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  async function run(id: string, label: string, fn: () => Promise<unknown>) {
    setBusy(id)
    setError(null)
    setNotice(null)
    try {
      await fn()
      setNotice(label)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'That change was refused.'))
    } finally {
      setBusy(null)
    }
  }
  return { busy, error, notice, run, setError }
}

// ─── Membership offers ────────────────────────────────────────────────────

export function OffersPanel({ countries }: { countries: Country[] }) {
  const [items, setItems] = useState<PlanOffer[] | null>(null)
  const [editing, setEditing] = useState<PlanOffer | 'new' | null>(null)
  const me = getTokenSubject()
  const canEdit = isSuperAdmin()
  const load = useCallback(async () => setItems(await listAdminOffers()), [])
  const { busy, error, notice, run, setError } = useVersionActions(load)

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err, 'Could not load offers.')))
  }, [load, setError])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <UnapprovedNote>
          Prices, intervals and bonus quantities are owner decisions. A published version never changes; changing a
          price creates a new version, and existing paid periods keep the version they were sold under.
        </UnapprovedNote>
        {canEdit ? (
          <Button onClick={() => setEditing('new')} className="h-10 px-4">
            <Plus className="size-4" /> New membership package
          </Button>
        ) : null}
      </div>
      <FormAlert error={error} notice={notice} />
      {items === null ? (
        <div className="flex justify-center py-10">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState icon={Crown} title="No membership packages" description="Create a draft, submit it, and have another admin approve it." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((o) => (
            <article key={o.id} className="rounded-xl border-2 border-brand-ink/15 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                    {o.country_name} · {o.tier_code} v{o.version}
                  </p>
                  <h3 className="mt-1 font-poster text-2xl">{o.name}</h3>
                </div>
                <StatusPill status={o.status} />
              </div>
              <p className="mt-2 text-sm">
                <strong>{formatMoney(o.price_minor, o.currency)}</strong> {o.billing_label} · extra bonus{' '}
                <strong>{o.member_bonus_points.toLocaleString()}</strong> points after the first qualifying gift of each
                paid period
              </p>
              {o.gift_benefits.length ? (
                <p className="mt-1 text-xs text-muted-foreground">Benefits: {o.gift_benefits.join(' · ')}</p>
              ) : null}
              {o.published_at ? <p className="mt-1 text-xs text-muted-foreground">Published {formatDate(o.published_at)}</p> : null}
              {canEdit ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {o.status === 'draft' ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing(o)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy === o.id}
                        onClick={() => run(o.id, 'Draft deleted.', () => deleteOffer(o.id))}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  ) : null}
                  <ActionButtons
                    actions={versionActions(o.status).filter(
                      (a) => !(a.action === 'approve' && o.submitted_by_admin_id === me),
                    )}
                    busy={busy === o.id}
                    onAction={(a) => run(o.id, `${o.name}: ${a.replaceAll('_', ' ')} done.`, () => offerAction(o.id, a as VersionAction))}
                  />
                  {o.status === 'awaiting_approval' && o.submitted_by_admin_id === me ? (
                    <span className="text-xs text-muted-foreground">Another admin must approve it.</span>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
      <OfferDialog
        offer={editing}
        countries={countries}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null)
          await load()
        }}
      />
    </div>
  )
}

const INTERVAL_PRESETS: { label: string; unit: IntervalUnit; count: number }[] = [
  { label: 'Every month', unit: 'month', count: 1 },
  { label: 'Every 28 days', unit: 'day', count: 28 },
  { label: 'Every 3 months', unit: 'month', count: 3 },
  { label: 'Every year', unit: 'year', count: 1 },
]

function billingLabel(unit: IntervalUnit, count: number): string {
  return count === 1 ? `every ${unit}` : `every ${count} ${unit}s`
}

/** A membership package, created in four steps and saved as a draft. */
function OfferDialog({
  offer,
  countries,
  onClose,
  onSaved,
}: {
  offer: PlanOffer | 'new' | null
  countries: Country[]
  onClose: () => void
  onSaved: () => void
}) {
  const open = offer !== null
  const existing = offer && offer !== 'new' ? offer : null
  const [tier, setTier] = useState('')
  const [countryId, setCountryId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState<IntervalUnit>('month')
  const [count, setCount] = useState('1')
  const [bonus, setBonus] = useState('')
  const [benefits, setBenefits] = useState('')
  const [terms, setTerms] = useState('v1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const country = countries.find((c) => c.id === countryId)
  const currency = existing?.currency ?? country?.default_currency ?? ''

  useEffect(() => {
    if (!open) return
    setError(null)
    setTier(existing?.tier_code ?? '')
    setCountryId(existing?.country_id ?? countries[0]?.id ?? '')
    setName(existing?.name ?? '')
    setDescription(existing?.description ?? '')
    setPrice(existing ? String(minorToMajor(existing.price_minor, existing.currency)) : '')
    setUnit(existing?.interval_unit ?? 'month')
    setCount(String(existing?.interval_count ?? 1))
    setBonus(existing ? String(existing.member_bonus_points) : '')
    setBenefits((existing?.gift_benefits ?? []).join('\n'))
    setTerms(existing?.terms_version ?? 'v1')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const intervalCount = Number(count) || 0
  const priceNumber = Number(price)
  const benefitList = benefits.split('\n').map((b) => b.trim()).filter(Boolean)
  const bonusPoints = Number(bonus) || 0
  const tierValid = /^[a-z0-9_-]{2,40}$/.test(tier.trim().toLowerCase())
  const priceLine = priceNumber > 0 && currency ? formatMoney(majorToMinor(priceNumber, currency), currency) : '-'

  async function save() {
    setBusy(true)
    setError(null)
    const body = {
      tier_code: tier.trim().toLowerCase(),
      country_id: countryId,
      name: name.trim(),
      description: description.trim() || null,
      currency,
      price_minor: majorToMinor(priceNumber, currency),
      interval_unit: unit,
      interval_count: intervalCount || 1,
      member_bonus_points: bonusPoints,
      gift_benefits: benefitList,
      terms_version: terms.trim(),
    }
    try {
      if (existing) await updateOffer(existing.id, body)
      else await createOffer(body)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the package.'))
    } finally {
      setBusy(false)
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'package',
      title: 'The package',
      description: 'Where it is sold, and what it is called.',
      icon: Crown,
      blockedReason: !countryId
        ? 'Choose a country to continue.'
        : !tierValid
          ? 'Give it a tier code of 2 to 40 letters, digits, - or _ (for example plus).'
          : name.trim().length < 2
            ? 'Give the package a name to continue.'
            : null,
      content: (
        <WizardFields>
          <WizardField
            label="Country"
            htmlFor="of-country"
            hint="One package per country: it is sold only where membership sales are approved."
            full
          >
            <select
              id="of-country"
              className={selectClassName}
              value={countryId}
              disabled={!!existing}
              onChange={(e) => setCountryId(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.default_currency})
                </option>
              ))}
            </select>
          </WizardField>
          <WizardField label="Name" htmlFor="of-name" hint="What customers see." full>
            <Input
              id="of-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="SendAGift Plus"
              className="h-12 bg-surface text-base font-medium"
            />
          </WizardField>
          <WizardField
            label="Tier code"
            htmlFor="of-tier"
            hint="A short internal code, kept the same across later versions of this package."
          >
            <Input
              id="of-tier"
              value={tier}
              disabled={!!existing}
              onChange={(e) => setTier(e.target.value.toLowerCase())}
              placeholder="plus"
              className="h-11 bg-surface"
            />
          </WizardField>
          <WizardField label="Terms version" htmlFor="of-terms" hint="Recorded with every sale.">
            <Input id="of-terms" value={terms} onChange={(e) => setTerms(e.target.value)} className="h-11 bg-surface" />
          </WizardField>
          <WizardField label="Short description" htmlFor="of-desc" hint="Optional. One or two sentences." full>
            <textarea
              id="of-desc"
              className={textareaClassName}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </WizardField>
        </WizardFields>
      ),
    },
    {
      id: 'price',
      title: 'Price & renewal',
      description: 'What it costs and how often it renews.',
      icon: CalendarClock,
      blockedReason: !(priceNumber > 0)
        ? 'Set a price above zero to continue.'
        : !(intervalCount >= 1 && intervalCount <= 365)
          ? 'Set how often it renews (1 to 365).'
          : null,
      content: (
        <div className="space-y-6">
          <WizardFields>
            <WizardField label={`Price (${currency || 'currency'})`} htmlFor="of-price">
              <Input
                id="of-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="9.99"
                className="h-12 bg-surface text-lg font-semibold"
              />
            </WizardField>
            <WizardField
              label="Renews every"
              htmlFor="of-count"
              hint="Customers see exactly this interval, so a 28-day plan is never called monthly."
            >
              <div className="flex gap-2">
                <Input
                  id="of-count"
                  inputMode="numeric"
                  className="h-12 w-24 bg-surface"
                  value={count}
                  onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))}
                />
                <select
                  className={selectClassName}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as IntervalUnit)}
                  aria-label="Interval unit"
                >
                  <option value="day">day(s)</option>
                  <option value="week">week(s)</option>
                  <option value="month">month(s)</option>
                  <option value="year">year(s)</option>
                </select>
              </div>
            </WizardField>
          </WizardFields>
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Quick picks</p>
            <div className="flex flex-wrap gap-2">
              {INTERVAL_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setUnit(p.unit)
                    setCount(String(p.count))
                  }}
                  className={cn(
                    'rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors',
                    unit === p.unit && intervalCount === p.count
                      ? 'border-brand-ink bg-brand-ink text-white'
                      : 'border-brand-ink/15 hover:border-brand-ink',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <p className="rounded-xl bg-accent/60 px-4 py-3 text-sm">
            Customers will see: <strong>{priceLine}</strong> {intervalCount ? billingLabel(unit, intervalCount) : '-'}
          </p>
        </div>
      ),
    },
    {
      id: 'benefits',
      title: 'Benefits & bonus',
      description: 'What members get.',
      icon: Gift,
      blockedReason: null,
      content: (
        <div className="space-y-7">
          <section className="rounded-2xl border-2 border-brand-violet/25 bg-brand-violet/5 p-5">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-violet text-white">
                <Crown className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <label htmlFor="of-bonus" className="text-base font-semibold">
                  Extra member bonus
                </label>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Competition points added once per paid period, after the member&apos;s first qualifying delivered gift.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      id="of-bonus"
                      inputMode="numeric"
                      value={bonus}
                      onChange={(e) => setBonus(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className="h-14 w-36 bg-background text-center font-poster text-3xl"
                    />
                    <span className="text-sm font-semibold text-muted-foreground">points</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[0, 50, 100, 250, 500].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setBonus(String(n))}
                        className={cn(
                          'rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors',
                          bonusPoints === n
                            ? 'border-brand-ink bg-brand-ink text-white'
                            : 'border-brand-ink/15 bg-background hover:border-brand-ink',
                        )}
                      >
                        {n === 0 ? 'No bonus' : n}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-4 rounded-lg bg-background px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {bonusPoints > 0 ? (
                    <>
                      A member who sends their first gift of a period earns that gift&apos;s ordinary points{' '}
                      <strong className="text-foreground">plus {bonusPoints.toLocaleString()}</strong>. Every other gift
                      in the period earns ordinary points only. This is the extra amount, not the combined total.
                    </>
                  ) : (
                    'No bonus: members get the gift benefits below, and gifts earn ordinary points like anyone else.'
                  )}
                </p>
              </div>
            </div>
          </section>

          <BenefitsEditor
            benefits={benefitList}
            onChange={(list) => setBenefits(list.join('\n'))}
          />
        </div>
      ),
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Check it before saving. It is saved as a draft.',
      icon: Eye,
      content: (
        <WizardPreviewFrame caption="This is how customers will see it, once it is approved and published.">
          <div className="-mx-5 -mt-5 mb-5 flex items-center justify-between gap-4 rounded-t-2xl bg-brand-ink px-5 py-5 text-white">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.18em] text-white/55 uppercase">
                {country?.name ?? 'Country'}
              </p>
              <p className="font-poster text-2xl leading-tight">{name.trim() || 'Untitled package'}</p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-violet">
              <Crown className="size-5" />
            </span>
          </div>
          <p className="flex items-baseline gap-2">
            <span className="font-poster text-3xl">{priceLine}</span>
            <span className="text-sm font-semibold text-muted-foreground">
              {intervalCount ? billingLabel(unit, intervalCount) : ''}
            </span>
          </p>
          {description.trim() ? <p className="mt-2 text-sm text-muted-foreground">{description.trim()}</p> : null}
          <ul className="mt-4 space-y-1.5 text-sm">
            {benefitList.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Gift className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                {b}
              </li>
            ))}
            {bonusPoints > 0 ? (
              <li className="flex items-start gap-2">
                <Crown className="mt-0.5 size-4 shrink-0 text-brand-violet" />
                An additional {bonusPoints.toLocaleString()} competition points after the first qualifying completed
                gift in each paid membership period.
              </li>
            ) : null}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Tier {tier || '-'} · terms {terms || '-'} · nothing is sold until it is submitted and a different admin
            approves it, and membership sales are approved for {country?.name ?? 'the country'}.
          </p>
        </WizardPreviewFrame>
      ),
    },
  ]

  return (
    <WizardDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={existing ? `Edit ${existing.name} v${existing.version}` : 'New membership package'}
      description="Price, renewal and what members get. Saved as a draft."
      steps={steps}
      onComplete={save}
      completeLabel="Save draft"
      completing={busy}
      error={<FormAlert error={error} />}
    />
  )
}

// ─── Reward policies ──────────────────────────────────────────────────────

function describePolicy(p: RewardPolicy) {
  const base =
    p.base_mode === 'fixed'
      ? `${p.base_fixed_points.toLocaleString()} points per qualifying gift`
      : `${p.base_points_per_unit} point(s) per whole ${p.currency ?? 'unit'} spent`
  const parts = [base]
  if (p.base_cap_points) parts.push(`capped at ${p.base_cap_points.toLocaleString()}`)
  if (p.min_eligible_minor > 0) parts.push(`minimum ${formatMoney(p.min_eligible_minor, p.currency)}`)
  parts.push(p.expiry_days ? `expire after ${p.expiry_days} days` : 'no expiry')
  if (p.exclude_free_gifts) parts.push('free gifts excluded')
  return parts.join(' · ')
}

export function PoliciesPanel({ countries }: { countries: Country[] }) {
  const [items, setItems] = useState<RewardPolicy[] | null>(null)
  const [editing, setEditing] = useState<RewardPolicy | 'new' | null>(null)
  const me = getTokenSubject()
  const canEdit = isSuperAdmin()
  const load = useCallback(async () => setItems(await listAdminPolicies()), [])
  const { busy, error, notice, run, setError } = useVersionActions(load)

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err, 'Could not load reward policies.')))
  }, [load, setError])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <UnapprovedNote>
          A gift earns under the version that was in force when it was paid for. Rewards are released when the gift is
          delivered. The point formula and expiry are owner decisions.
        </UnapprovedNote>
        {canEdit ? (
          <Button onClick={() => setEditing('new')} className="h-10 px-4">
            <Plus className="size-4" /> New policy
          </Button>
        ) : null}
      </div>
      <FormAlert error={error} notice={notice} />
      {items === null ? (
        <div className="flex justify-center py-10">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState icon={Wallet} title="No reward policies" description="Without a published policy, gifts earn no competition points." />
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <article key={p.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border-2 border-brand-ink/15 bg-card px-4 py-3">
              <div>
                <p className="font-semibold">
                  {p.country_name} · version {p.version} <StatusPill status={p.status} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{describePolicy(p)}</p>
              </div>
              {canEdit ? (
                <div className="flex flex-wrap items-center gap-2">
                  {p.status === 'draft' ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="destructive" disabled={busy === p.id} onClick={() => run(p.id, 'Draft deleted.', () => deletePolicy(p.id))}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  ) : null}
                  <ActionButtons
                    actions={versionActions(p.status).filter((a) => !(a.action === 'approve' && p.submitted_by_admin_id === me))}
                    busy={busy === p.id}
                    onAction={(a) => run(p.id, `Version ${p.version}: ${a.replaceAll('_', ' ')} done.`, () => policyAction(p.id, a as VersionAction))}
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
      <PolicyDialog
        policy={editing}
        countries={countries}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null)
          await load()
        }}
      />
    </div>
  )
}

function PolicyDialog({
  policy,
  countries,
  onClose,
  onSaved,
}: {
  policy: RewardPolicy | 'new' | null
  countries: Country[]
  onClose: () => void
  onSaved: () => void
}) {
  const open = policy !== null
  const existing = policy && policy !== 'new' ? policy : null
  const [countryId, setCountryId] = useState('')
  const [mode, setMode] = useState<'fixed' | 'per_currency_unit'>('fixed')
  const [fixed, setFixed] = useState('')
  const [perUnit, setPerUnit] = useState('')
  const [min, setMin] = useState('')
  const [cap, setCap] = useState('')
  const [expiry, setExpiry] = useState('')
  const [exclude, setExclude] = useState(true)
  const [preview, setPreview] = useState<PolicyPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currency = countries.find((c) => c.id === countryId)?.default_currency ?? ''

  useEffect(() => {
    if (!open) return
    setError(null)
    setPreview(null)
    setCountryId(existing?.country_id ?? countries[0]?.id ?? '')
    setMode(existing?.base_mode ?? 'fixed')
    setFixed(existing?.base_fixed_points ? String(existing.base_fixed_points) : '')
    setPerUnit(existing?.base_points_per_unit ? String(existing.base_points_per_unit) : '')
    setMin(existing?.min_eligible_minor ? String(minorToMajor(existing.min_eligible_minor, existing.currency ?? 'USD')) : '')
    setCap(existing?.base_cap_points ? String(existing.base_cap_points) : '')
    setExpiry(existing?.expiry_days ? String(existing.expiry_days) : '')
    setExclude(existing?.exclude_free_gifts ?? true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function body(): PolicyInput {
    return {
      country_id: countryId,
      base_mode: mode,
      base_fixed_points: Number(fixed) || 0,
      base_points_per_unit: Number(perUnit) || 0,
      min_eligible_minor: min && currency ? majorToMinor(Number(min), currency) : 0,
      base_cap_points: cap ? Number(cap) : null,
      expiry_days: expiry ? Number(expiry) : null,
      exclude_free_gifts: exclude,
    }
  }

  async function runPreview() {
    try {
      setPreview(await previewPolicy(body(), currency ? majorToMinor(50, currency) : 5000, 100, currency || 'USD'))
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not preview.'))
    }
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      if (existing) await updatePolicy(existing.id, body())
      else await createPolicy(body())
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the policy.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? `Edit version ${existing.version}` : 'New reward policy'}</DialogTitle>
          <DialogDescription>How one qualifying gift earns ordinary competition points in a country.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country" htmlFor="rp-country" className="sm:col-span-2">
            <select id="rp-country" className={selectClassName} value={countryId} disabled={!!existing} onChange={(e) => setCountryId(e.target.value)}>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Award" htmlFor="rp-mode">
            <select id="rp-mode" className={selectClassName} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="fixed">Fixed per gift</option>
              <option value="per_currency_unit">Per whole currency unit</option>
            </select>
          </Field>
          {mode === 'fixed' ? (
            <Field label="Points per gift" htmlFor="rp-fixed">
              <Input id="rp-fixed" inputMode="numeric" value={fixed} onChange={(e) => setFixed(e.target.value.replace(/\D/g, ''))} />
            </Field>
          ) : (
            <Field label={`Points per ${currency || 'unit'}`} htmlFor="rp-unit">
              <Input id="rp-unit" inputMode="numeric" value={perUnit} onChange={(e) => setPerUnit(e.target.value.replace(/\D/g, ''))} />
            </Field>
          )}
          <Field label={`Minimum spend (${currency || 'currency'})`} htmlFor="rp-min" hint="Items only, delivery excluded.">
            <Input id="rp-min" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Cap per gift (points)" htmlFor="rp-cap">
            <Input id="rp-cap" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/\D/g, ''))} placeholder="None" />
          </Field>
          <Field label="Points expire after (days)" htmlFor="rp-exp" hint="Disclosed before purchase.">
            <Input id="rp-exp" inputMode="numeric" value={expiry} onChange={(e) => setExpiry(e.target.value.replace(/\D/g, ''))} placeholder="Never" />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={exclude} onCheckedChange={(v) => setExclude(v === true)} />
            Free gifts don&apos;t qualify
          </label>
        </div>
        {preview ? (
          <p className="rounded-lg bg-accent/60 px-3 py-2 text-sm">
            A {formatMoney(preview.eligible_minor, currency || 'USD')} gift{' '}
            {preview.qualifies
              ? `earns ${preview.base_points} points; a member's first gift of a period with a 100-point bonus earns ${preview.member_first_gift_total}.`
              : 'does not qualify.'}
          </p>
        ) : null}
        <FormAlert error={error} />
        <DialogFooter>
          <Button variant="outline" onClick={runPreview}>
            Preview
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Save draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const BENEFIT_SUGGESTIONS = [
  'Free delivery on every gift',
  'Priority support',
  'Early access to new sellers',
  'Birthday gift reminders',
  'Exclusive member offers',
]

/** Benefits added one at a time, each on its own removable row. */
function BenefitsEditor({ benefits, onChange }: { benefits: string[]; onChange: (list: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const MAX = 10

  function add(text: string) {
    const clean = text.trim()
    if (!clean || benefits.length >= MAX || benefits.some((b) => b.toLowerCase() === clean.toLowerCase())) return
    onChange([...benefits, clean.slice(0, 160)])
    setDraft('')
  }

  const unused = BENEFIT_SUGGESTIONS.filter((x) => !benefits.some((b) => b.toLowerCase() === x.toLowerCase()))

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="of-benefit-new" className="text-base font-semibold">
          Gift benefits
        </label>
        <span className="text-xs text-muted-foreground">
          {benefits.length} of {MAX}
        </span>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">Short lines shown on the membership page.</p>

      {benefits.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {benefits.map((b, i) => (
            <li
              key={`${b}-${i}`}
              className="flex items-center gap-3 rounded-xl border-2 border-brand-ink/10 bg-card px-3.5 py-2.5 text-sm"
            >
              <Gift className="size-4 shrink-0 text-brand-teal" />
              <span className="min-w-0 flex-1 break-words">{b}</span>
              <button
                type="button"
                aria-label={`Remove ${b}`}
                onClick={() => onChange(benefits.filter((_, j) => j !== i))}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border-2 border-dashed border-brand-ink/15 px-4 py-5 text-center text-sm text-muted-foreground">
          No benefits yet. Add one below, or tap a suggestion.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <Input
          id="of-benefit-new"
          value={draft}
          maxLength={160}
          disabled={benefits.length >= MAX}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            }
          }}
          placeholder="e.g. Free delivery on every gift"
          className="h-11 bg-surface"
        />
        <Button type="button" variant="outline" className="h-11 px-4" disabled={!draft.trim() || benefits.length >= MAX} onClick={() => add(draft)}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {unused.length > 0 && benefits.length < MAX ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {unused.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => add(x)}
              className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-teal/40"
            >
              + {x}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
