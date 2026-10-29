import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, Plus, ShieldCheck } from 'lucide-react'

import {
  decideApproval,
  listApprovals,
  requestApproval,
  revokeApproval,
  type ApprovalChannel,
  type ApprovalOperation,
  type CapabilityApproval,
  type LotSource,
} from '@/api/competition-points'
import type { Country } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
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
import { formatDate } from '@/features/competition-points/format'
import { getErrorMessage } from '@/lib/api'
import { selectClassName, textareaClassName } from '@/lib/form-styles'

import { OPERATION_LABEL } from './labels'
import { Field, StatusPill } from './shared'

const NEEDS_PROVIDER: ApprovalOperation[] = [
  'membership_sale',
  'membership_renewal',
  'winner_payout',
  'seller_campaign_funding',
]

/**
 * Approval records: the evidence that one operation is permitted in one
 * country, channel and (where money moves) provider. Nothing is offered
 * without a current one. One admin records it, a different one approves it.
 */
export function ApprovalsPanel({ countries }: { countries: Country[] }) {
  const [items, setItems] = useState<CapabilityApproval[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      setItems(await listApprovals())
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load approvals.'))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function act(a: CapabilityApproval, action: 'approve' | 'reject' | 'revoke') {
    let reason = ''
    if (action === 'revoke') {
      reason = window.prompt('Why is this approval being revoked? New affected operations stop at once.') ?? ''
      if (!reason.trim()) return
    }
    setBusy(a.id)
    setError(null)
    setNotice(null)
    try {
      if (action === 'revoke') await revokeApproval(a.id, reason)
      else await decideApproval(a.id, action)
      setNotice(`${OPERATION_LABEL[a.operation]} in ${a.country_name}: ${action}d.`)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change the approval.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Missing, expired or revoked approval means unavailable: there is no global default. A connected payment
          account does not by itself approve every operation on it.
        </p>
        <Button onClick={() => setCreating(true)} className="h-10 px-4">
          <Plus className="size-4" />
          Record approval
        </Button>
      </div>
      <FormAlert error={error} notice={notice} />
      {items === null ? (
        <div className="flex justify-center py-10">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={ShieldCheck}
          title="No approvals recorded"
          description="Every competition points operation is unavailable everywhere until one is recorded and approved."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-ink/15">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-accent/50 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2">Operation</th>
                <th className="px-3 py-2">Where</th>
                <th className="px-3 py-2">Evidence</th>
                <th className="px-3 py-2">Window</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-ink/10">
              {items.map((a) => (
                <tr key={a.id}>
                  <td className="px-3 py-2.5 font-semibold">
                    {OPERATION_LABEL[a.operation]}
                    {a.point_source ? <span className="block text-xs text-muted-foreground">{a.point_source} only</span> : null}
                  </td>
                  <td className="px-3 py-2.5">
                    {a.country_name} · {a.channel}
                    {a.provider ? ` · ${a.provider}` : ''}
                    {a.min_age ? ` · ${a.min_age}+` : ''}
                  </td>
                  <td className="max-w-[16rem] truncate px-3 py-2.5" title={a.evidence_ref}>
                    {a.evidence_ref}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatDate(a.effective_from)} – {formatDate(a.expires_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill status={a.status} label={a.status === 'active' && !a.current ? 'not in window' : a.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {a.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" disabled={busy === a.id} onClick={() => act(a, 'approve')}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => act(a, 'reject')}>
                          Reject
                        </Button>
                      </div>
                    ) : a.status === 'active' ? (
                      <Button size="sm" variant="destructive" disabled={busy === a.id} onClick={() => act(a, 'revoke')}>
                        Revoke
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ApprovalDialog
        open={creating}
        onOpenChange={setCreating}
        countries={countries}
        onSaved={async (approvedNow) => {
          setCreating(false)
          setNotice(approvedNow ? 'Approved. It takes effect now.' : 'Approval recorded. It takes effect once it is approved.')
          await load()
        }}
      />
    </div>
  )
}

function ApprovalDialog({
  open,
  onOpenChange,
  countries,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  countries: Country[]
  onSaved: (approvedNow: boolean) => void
}) {
  const [operation, setOperation] = useState<ApprovalOperation>('gift_points_earning')
  const [countryId, setCountryId] = useState('')
  const [channel, setChannel] = useState<ApprovalChannel>('any')
  const [provider, setProvider] = useState('stripe')
  const [source, setSource] = useState<'' | LotSource>('')
  const [minAge, setMinAge] = useState('')
  const [evidence, setEvidence] = useState('')
  const [notes, setNotes] = useState('')
  const [expires, setExpires] = useState('')
  // Approved as it is recorded; untick to leave it pending.
  const [approveNow, setApproveNow] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const needsProvider = NEEDS_PROVIDER.includes(operation)

  useEffect(() => {
    if (!open) return
    setError(null)
    setCountryId((prev) => prev || countries[0]?.id || '')
  }, [open, countries])

  // Earning runs on the server; it is approved for any channel.
  useEffect(() => {
    if (operation === 'gift_points_earning' || operation === 'membership_renewal') setChannel('any')
    else if (channel === 'any') setChannel('web')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation])

  async function save() {
    if (!countryId || !evidence.trim() || !expires) {
      setError('Choose a country, give the evidence reference and an expiry date.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await requestApproval({
        operation,
        country_id: countryId,
        channel,
        provider: needsProvider ? provider : null,
        point_source: source || null,
        min_age: minAge ? Number(minAge) : null,
        evidence_ref: evidence.trim(),
        notes: notes.trim() || null,
        effective_from: null,
        expires_at: new Date(`${expires}T23:59:59`).toISOString(),
        approve_now: approveNow,
      })
      onSaved(approveNow)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record the approval.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record an approval</DialogTitle>
          <DialogDescription>
            Reference the advice, provider acceptance or review that supports it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Operation" htmlFor="ap-op" className="sm:col-span-2">
            <select id="ap-op" className={selectClassName} value={operation} onChange={(e) => setOperation(e.target.value as ApprovalOperation)}>
              {Object.entries(OPERATION_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Country" htmlFor="ap-country">
            <select id="ap-country" className={selectClassName} value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Channel" htmlFor="ap-channel" hint="The website first: native apps stay off until accepted.">
            <select id="ap-channel" className={selectClassName} value={channel} onChange={(e) => setChannel(e.target.value as ApprovalChannel)}>
              {(['any', 'web', 'ios', 'android', 'event'] as ApprovalChannel[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          {needsProvider ? (
            <Field label="Payment provider" htmlFor="ap-provider">
              <select id="ap-provider" className={selectClassName} value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="stripe">stripe</option>
                <option value="test">test (sandbox)</option>
              </select>
            </Field>
          ) : null}
          <Field label="Point source" htmlFor="ap-source" hint="Leave as all unless the approval is narrower.">
            <select id="ap-source" className={selectClassName} value={source} onChange={(e) => setSource(e.target.value as '' | LotSource)}>
              <option value="">All sources</option>
              <option value="gift">Gift points</option>
              <option value="member_bonus">Member bonus</option>
              <option value="sponsored">Sponsored</option>
              <option value="compensation">Compensation</option>
            </select>
          </Field>
          <Field label="Minimum age" htmlFor="ap-age">
            <Input id="ap-age" inputMode="numeric" value={minAge} onChange={(e) => setMinAge(e.target.value.replace(/\D/g, ''))} placeholder="None" />
          </Field>
          <Field label="Expires" htmlFor="ap-exp">
            <Input id="ap-exp" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </Field>
          <Field label="Evidence reference" htmlFor="ap-ev" className="sm:col-span-2">
            <Input id="ap-ev" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="e.g. Legal advice LA-2026-014, Stripe acceptance email 12 Nov" />
          </Field>
          <Field label="Notes" htmlFor="ap-notes" className="sm:col-span-2">
            <textarea id="ap-notes" className={textareaClassName} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <label className="flex items-start gap-3 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={approveNow}
              onChange={(e) => setApproveNow(e.target.checked)}
            />
            <span>
              <strong>Approve it now.</strong> It takes effect immediately. Untick to leave it pending for someone to
              approve later.
            </span>
          </label>
        </div>
        <FormAlert error={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {approveNow ? 'Record & approve' : 'Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
