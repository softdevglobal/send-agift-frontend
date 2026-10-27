import { useCallback, useEffect, useState } from 'react'
import { Crown, LoaderCircle, Pencil, Plus, Trash2, Wallet } from 'lucide-react'

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
            <Plus className="size-4" /> New offer
          </Button>
        ) : null}
      </div>
      <FormAlert error={error} notice={notice} />
      {items === null ? (
        <div className="flex justify-center py-10">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState icon={Crown} title="No membership offers" description="Create a draft, submit it, and have another admin approve it." />
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

  async function save() {
    const major = Number(price)
    if (!(major > 0) || !currency) {
      setError('Set a price above zero.')
      return
    }
    setBusy(true)
    setError(null)
    const body = {
      tier_code: tier.trim().toLowerCase(),
      country_id: countryId,
      name: name.trim(),
      description: description.trim() || null,
      currency,
      price_minor: majorToMinor(major, currency),
      interval_unit: unit,
      interval_count: Number(count) || 1,
      member_bonus_points: Number(bonus) || 0,
      gift_benefits: benefits.split('\n').map((b) => b.trim()).filter(Boolean),
      terms_version: terms.trim(),
    }
    try {
      if (existing) await updateOffer(existing.id, body)
      else await createOffer(body)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the offer.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? `Edit ${existing.name} v${existing.version}` : 'New membership offer'}</DialogTitle>
          <DialogDescription>A draft. Nothing is sold until it is submitted and another admin approves it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tier code" htmlFor="of-tier" hint="Same code across versions of one tier.">
            <Input id="of-tier" value={tier} disabled={!!existing} onChange={(e) => setTier(e.target.value)} placeholder="plus" />
          </Field>
          <Field label="Country" htmlFor="of-country">
            <select id="of-country" className={selectClassName} value={countryId} disabled={!!existing} onChange={(e) => setCountryId(e.target.value)}>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name" htmlFor="of-name" className="sm:col-span-2">
            <Input id="of-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="SendAGift Plus" />
          </Field>
          <Field label={`Price (${currency || 'currency'})`} htmlFor="of-price">
            <Input id="of-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Renews every" htmlFor="of-count" hint="The true interval is shown to customers.">
            <div className="flex gap-2">
              <Input id="of-count" inputMode="numeric" className="w-20" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} />
              <select className={selectClassName} value={unit} onChange={(e) => setUnit(e.target.value as IntervalUnit)}>
                <option value="day">day(s)</option>
                <option value="week">week(s)</option>
                <option value="month">month(s)</option>
                <option value="year">year(s)</option>
              </select>
            </div>
          </Field>
          <Field label="Extra member bonus (points)" htmlFor="of-bonus" hint="Above ordinary gift points, not the combined total." className="sm:col-span-2">
            <Input id="of-bonus" inputMode="numeric" value={bonus} onChange={(e) => setBonus(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label="Gift benefits (one per line)" htmlFor="of-benefits" className="sm:col-span-2">
            <textarea id="of-benefits" className={textareaClassName} value={benefits} onChange={(e) => setBenefits(e.target.value)} />
          </Field>
          <Field label="Description" htmlFor="of-desc" className="sm:col-span-2">
            <textarea id="of-desc" className={textareaClassName} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Terms version" htmlFor="of-terms">
            <Input id="of-terms" value={terms} onChange={(e) => setTerms(e.target.value)} />
          </Field>
        </div>
        <FormAlert error={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
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
