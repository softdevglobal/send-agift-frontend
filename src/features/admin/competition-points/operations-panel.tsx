import { useCallback, useEffect, useState } from 'react'
import { Activity, ClipboardCheck, LoaderCircle, OctagonX, Play, Search } from 'lucide-react'

import {
  activateStop,
  getCPSettings,
  getCustomerCP,
  liftStop,
  listCases,
  listStops,
  reconcileCP,
  resolveCase,
  runCPJob,
  type CPReconciliation,
  type CPRunResult,
  type CustomerCPOverview,
  type EmergencyStop,
  type ReleaseSettings,
  type ReviewCase,
  type StopScope,
} from '@/api/competition-points'
import type { Country } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminEmptyState } from '@/features/admin'
import { formatDateTime } from '@/features/competition-points/format'
import { formatPoints } from '@/features/points/format'
import { getErrorMessage } from '@/lib/api'
import { selectClassName } from '@/lib/form-styles'

import { STOP_LABEL } from './labels'
import { Field, StatusPill } from './shared'

// ─── Overview ─────────────────────────────────────────────────────────────

export function OverviewPanel() {
  const [settings, setSettings] = useState<ReleaseSettings | null>(null)
  const [recon, setRecon] = useState<CPReconciliation | null>(null)
  const [run, setRun] = useState<CPRunResult | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [customer, setCustomer] = useState<CustomerCPOverview | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCPSettings()
      .then(setSettings)
      .catch((err) => setError(getErrorMessage(err, 'Could not load settings.')))
  }, [])

  async function act(kind: string, fn: () => Promise<void>) {
    setBusy(kind)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(getErrorMessage(err, 'That did not work.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <FormAlert error={error} />
      {settings ? (
        <section className="rounded-xl border border-brand-ink/15 bg-card p-5">
          <h3 className="font-poster text-xl">Release configuration</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
            <Fact label="Membership provider" value={settings.membership_provider || 'none'} />
            <Fact label="Test payments" value={settings.test_payments ? 'ON (sandbox)' : 'off'} />
            <Fact label="Entry hold" value={`${settings.hold_minutes} min`} />
            <Fact label="Restoration window" value={`${settings.restore_window_hours} h`} />
          </dl>
          <h4 className="mt-5 text-sm font-semibold">Owner decisions to record before production</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {settings.open_decisions.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-brand-ink/15 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-poster text-xl">Reconciliation</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => act('recon', async () => setRecon(await reconcileCP()))}>
              <ClipboardCheck className="size-3.5" /> Check now
            </Button>
            <Button size="sm" disabled={busy !== null} onClick={() => act('run', async () => setRun(await runCPJob()))}>
              <Play className="size-3.5" /> Run the job once
            </Button>
          </div>
        </div>
        {recon ? (
          <p className="mt-3 text-sm">
            {recon.lots_checked} lots checked ·{' '}
            <strong className={recon.mismatches.length ? 'text-destructive' : ''}>{recon.mismatches.length} mismatched</strong> ·{' '}
            <strong className={recon.orphaned_holds ? 'text-destructive' : ''}>{recon.orphaned_holds} orphaned holds</strong> ·{' '}
            {recon.uncertain_starts} uncertain starts
            {recon.oldest_pending_at ? ` · oldest pending gift ${formatDateTime(recon.oldest_pending_at)}` : ''}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Compares every lot with its postings and every hold with its entry. It reports; it never repairs a balance.
          </p>
        )}
        {run ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Job: {run.qualified} qualified, {run.gifts_awarded} awarded ({formatPoints(run.base_points)} pts),{' '}
            {run.bonuses_awarded} bonuses ({formatPoints(run.bonus_points)} pts), {run.gifts_reversed} reversed,{' '}
            {run.lots_expired} lots expired, {run.entries_released} holds released.
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-brand-ink/15 bg-card p-5">
        <h3 className="font-poster text-xl">Look up a customer</h3>
        <div className="mt-3 flex gap-2">
          <Input value={customerId} onChange={(e) => setCustomerId(e.target.value.trim())} placeholder="Customer ID" />
          <Button
            variant="outline"
            disabled={!customerId || busy !== null}
            onClick={() => act('customer', async () => setCustomer(await getCustomerCP(customerId)))}
          >
            <Search className="size-4" />
          </Button>
        </div>
        {customer ? (
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <Fact label="Available" value={formatPoints(customer.wallet.available)} />
            <Fact label="Held" value={formatPoints(customer.wallet.reserved)} />
            <Fact label="Membership" value={customer.membership.state.replaceAll('_', ' ')} />
            {customer.eligibility.decisions.map((d) => (
              <Fact key={d.operation} label={d.operation.replaceAll('_', ' ')} value={d.allowed ? 'allowed' : (d.reason_code ?? 'no')} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  )
}

// ─── Emergency stops ──────────────────────────────────────────────────────

export function StopsPanel({ countries }: { countries: Country[] }) {
  const [items, setItems] = useState<EmergencyStop[] | null>(null)
  const [scope, setScope] = useState<StopScope>('competition_entries')
  const [countryId, setCountryId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setItems(await listStops())
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load stops.'))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function activate() {
    if (!reason.trim()) {
      setError('Give a reason: it is recorded with the stop.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await activateStop(scope, countryId || null, reason.trim())
      setReason('')
      setNotice(`${STOP_LABEL[scope]} stopped. It takes effect for the next request.`)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not activate the stop.'))
    } finally {
      setBusy(false)
    }
  }

  async function lift(s: EmergencyStop) {
    const why = window.prompt('Why is this stop being lifted?') ?? ''
    if (!why.trim()) return
    setBusy(true)
    setError(null)
    try {
      await liftStop(s.id, why.trim())
      setNotice(`${STOP_LABEL[s.scope]} resumed.`)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not lift the stop.'))
    } finally {
      setBusy(false)
    }
  }

  const active = items?.filter((s) => !s.lifted_at) ?? []
  const past = items?.filter((s) => s.lifted_at) ?? []

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        A stop refuses new affected actions on the server at once. Refunds and existing obligations carry on.
      </p>
      <FormAlert error={error} notice={notice} />
      <section className="grid gap-3 rounded-xl border-2 border-destructive/25 bg-card p-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
        <Field label="Stop" htmlFor="st-scope">
          <select id="st-scope" className={selectClassName} value={scope} onChange={(e) => setScope(e.target.value as StopScope)}>
            {Object.entries(STOP_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Where" htmlFor="st-country">
          <select id="st-country" className={selectClassName} value={countryId} onChange={(e) => setCountryId(e.target.value)}>
            <option value="">Everywhere</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reason" htmlFor="st-reason">
          <Input id="st-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened" />
        </Field>
        <Button variant="destructive" className="h-11" disabled={busy} onClick={activate}>
          <OctagonX className="size-4" /> Stop now
        </Button>
      </section>
      {items === null ? (
        <div className="flex justify-center py-10">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : active.length === 0 && past.length === 0 ? (
        <AdminEmptyState icon={Activity} title="No stops" description="Nothing has been stopped." />
      ) : (
        <div className="space-y-2">
          {[...active, ...past].map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-ink/15 bg-card px-4 py-3 text-sm">
              <div>
                <p className="font-semibold">
                  {STOP_LABEL[s.scope]} · {s.country_name ?? 'everywhere'}{' '}
                  <StatusPill status={s.lifted_at ? 'resolved' : 'revoked'} label={s.lifted_at ? 'lifted' : 'active'} />
                </p>
                <p className="text-muted-foreground">
                  {s.reason} · {formatDateTime(s.activated_at)}
                  {s.lifted_at ? ` · lifted ${formatDateTime(s.lifted_at)}: ${s.lift_reason}` : ''}
                </p>
              </div>
              {!s.lifted_at ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => lift(s)}>
                  Lift
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Review cases ─────────────────────────────────────────────────────────

const CASE_LABEL: Record<ReviewCase['kind'], string> = {
  refund_after_spend: 'Refund after the points were spent',
  bonus_restoration: 'Bonus restoration',
  membership_dispute: 'Membership payment refunded or disputed',
  uncertain_start: 'Uncertain attempt start',
  reconciliation: 'Reconciliation',
}

export function CasesPanel() {
  const [items, setItems] = useState<ReviewCase[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setItems(await listCases())
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load cases.'))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function resolve(c: ReviewCase) {
    const resolution = window.prompt(
      'Record the decision. Any change to points is a separately approved grant, never an edit here.',
    )
    if (!resolution?.trim()) return
    setBusy(c.id)
    try {
      await resolveCase(c.id, resolution.trim())
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not resolve the case.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <FormAlert error={error} />
      {items === null ? (
        <div className="flex justify-center py-10">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState icon={ClipboardCheck} title="No cases" description="Refunds after spending, disputed membership payments and overlaps appear here." />
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-brand-ink/15 bg-card px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold">
                  {CASE_LABEL[c.kind]} <StatusPill status={c.status} />
                </p>
                <p className="text-muted-foreground">
                  Customer {c.customer_id} · {c.subject_type} {c.subject_id} · {formatDateTime(c.created_at)}
                </p>
                <pre className="mt-1 max-w-full overflow-x-auto text-xs text-muted-foreground">{JSON.stringify(c.detail)}</pre>
                {c.resolution ? <p className="mt-1">Decision: {c.resolution}</p> : null}
              </div>
              {c.status === 'open' ? (
                <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => resolve(c)}>
                  Resolve
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
