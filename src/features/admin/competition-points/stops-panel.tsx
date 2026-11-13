import { useCallback, useEffect, useState } from 'react'
import { Activity, LoaderCircle, OctagonX } from 'lucide-react'

import { activateStop, liftStop, listStops, type EmergencyStop, type StopScope } from '@/api/competition-points'
import type { Country } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminEmptyState } from '@/features/admin'
import { formatDateTime } from '@/features/competition-points/format'
import { getErrorMessage } from '@/lib/api'
import { isSuperAdmin } from '@/lib/auth'
import { selectClassName } from '@/lib/form-styles'

import { STOP_LABEL } from './labels'
import { Field, StatusPill } from './shared'
import { askText } from '@/components/common/ask-dialog'

// ─── Emergency stops ──────────────────────────────────────────────────────

export function StopsPanel({ countries }: { countries: Country[] }) {
  const [items, setItems] = useState<EmergencyStop[] | null>(null)
  const [scope, setScope] = useState<StopScope>('membership_sales')
  const [countryId, setCountryId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const canEdit = isSuperAdmin()

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
    const why =
      (await askText({
        title: `Lift the ${STOP_LABEL[s.scope].toLowerCase()} stop?`,
        description: 'What it stopped can start again straight away.',
        confirmLabel: 'Lift stop',
        label: 'Reason',
        placeholder: 'Say briefly why',
        hint: 'Recorded in the audit log with your name.',
      })) ?? ''
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
      {canEdit ? (
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
      ) : null}
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
                  {STOP_LABEL[s.scope] ?? s.scope} · {s.country_name ?? 'everywhere'}{' '}
                  <StatusPill status={s.lifted_at ? 'resolved' : 'revoked'} label={s.lifted_at ? 'lifted' : 'active'} />
                </p>
                <p className="text-muted-foreground">
                  {s.reason} · {formatDateTime(s.activated_at)}
                  {s.lifted_at ? ` · lifted ${formatDateTime(s.lifted_at)}: ${s.lift_reason}` : ''}
                </p>
              </div>
              {!s.lifted_at && canEdit ? (
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
