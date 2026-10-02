import { Check, Wallet } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { fundPrizeReserve, setPrizeReserve, type AdminCompetition } from '@/api/competitions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminPanelClass, formatDate } from '@/features/admin'
import { StatusPill } from '@/features/admin/games-ui'
import { selectClassName } from '@/lib/form-styles'
import { formatPriceAmount, majorToMinor, minorToMajor } from '@/lib/money'
import { cn } from '@/lib/utils'

/** A titled card, used on the competition page and in its side drawer. */
export function Panel({ title, icon, children, action }: { title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className={cn(adminPanelClass, 'p-5')}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 font-display text-lg tracking-tight">
          {icon ? (
            <span className="grid size-9 place-items-center rounded-xl bg-muted/70 ring-1 ring-border/50">{icon}</span>
          ) : null}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/**
 * Sets and funds a competition's prize reserve in one step: how much is
 * held, who funds it, and the escrow or receipt reference that proves it.
 * The currency is always the prize's own.
 */
export function ReserveCard({
  comp,
  editable,
  run,
}: {
  comp: AdminCompetition
  editable: boolean
  run: (label: string, action: () => Promise<unknown>, success: string) => Promise<void>
}) {
  const reserve = comp.prize_reserve
  const currency = (comp.prize_currency ?? reserve?.currency ?? '').toUpperCase()
  // The most the prize can reach: the fixed prize, or a growing one's cap.
  const liability = comp.prize_growth_enabled ? comp.max_prize_cents : comp.start_prize_cents
  const [amount, setAmount] = useState(() => {
    if (reserve) return String(minorToMajor(reserve.reserve_amount, reserve.currency))
    return liability !== undefined && currency ? String(minorToMajor(liability, currency)) : ''
  })
  const [source, setSource] = useState<'sendagift' | 'approved_sponsor'>(reserve?.funding_source ?? 'sendagift')
  const [evidence, setEvidence] = useState('')

  if (reserve?.status === 'funded') {
    return (
      <Panel title="Prize reserve" icon={<Wallet className="size-5 text-emerald-600" />}>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone="good">Funded</StatusPill>
          <p className="font-medium">{formatPriceAmount(reserve.reserve_amount, reserve.currency)}</p>
          <p className="text-sm text-muted-foreground">
            by {reserve.funding_source === 'sendagift' ? 'SendAgift' : 'an approved sponsor'} ·{' '}
            {formatDate(reserve.funded_at)}
          </p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Evidence: {reserve.evidence_reference}</p>
      </Panel>
    )
  }

  if (comp.prize_type === 'points') {
    return (
      <Panel title="Prize reserve" icon={<Wallet className="size-5 text-emerald-600" />}>
        <p className="text-sm text-muted-foreground">
          Points prizes are credited by the platform, so no money reserve is needed.
        </p>
      </Panel>
    )
  }

  const value = Number(amount)
  const minor = currency && amount ? majorToMinor(value, currency) : 0
  const short = liability !== undefined && minor > 0 && minor < liability
  const ready = editable && !!currency && minor > 0 && !short && evidence.trim().length > 0

  async function fund() {
    // Saving the amount is skipped when it is already what is on file.
    if (!reserve || reserve.reserve_amount !== minor || reserve.funding_source !== source) {
      await setPrizeReserve(comp.id, { reserve_amount: minor, currency, funding_source: source })
    }
    await fundPrizeReserve(comp.id, evidence.trim())
  }

  return (
    <Panel title="Prize reserve" icon={<Wallet className="size-5 text-primary" />}>
      <p className="mb-4 text-sm text-muted-foreground">
        Before it opens, the most the prize can reach must be held
        {liability !== undefined && currency ? (
          <>
            {' '}
            — <span className="font-medium text-foreground">{formatPriceAmount(liability, currency)}</span>
          </>
        ) : null}
        . Record where it is held to fund the reserve.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="r-amount">Amount held ({currency || '—'})</Label>
          <Input
            id="r-amount"
            inputMode="decimal"
            value={amount}
            disabled={!editable}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="r-source">Funded by</Label>
          <select
            id="r-source"
            className={cn(selectClassName, 'h-10')}
            value={source}
            disabled={!editable}
            onChange={(e) => setSource(e.target.value as 'sendagift' | 'approved_sponsor')}
          >
            <option value="sendagift">SendAgift</option>
            <option value="approved_sponsor">Approved sponsor</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="r-evidence">Evidence</Label>
          <Input
            id="r-evidence"
            value={evidence}
            disabled={!editable}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Escrow, bank transfer or receipt reference"
            className="h-10"
          />
        </div>
      </div>
      {short ? (
        <p className="mt-2 text-xs text-red-700">
          It must cover at least {formatPriceAmount(liability!, currency)}.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {editable ? 'Only funded reserves let a competition be published.' : 'Only a super admin can fund the reserve.'}
        </p>
        <Button
          type="button"
          className="h-10"
          disabled={!ready}
          onClick={() => run('fund', fund, 'Prize reserve funded.')}
        >
          <Check className="size-4" />
          Fund reserve
        </Button>
      </div>
    </Panel>
  )
}
