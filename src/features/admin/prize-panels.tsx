import { useState, type ReactNode } from 'react'
import { Activity, Download, LoaderCircle, RefreshCw, Scale, ShieldAlert, Undo2 } from 'lucide-react'

import {
  adjustPrize,
  settleWinners,
  voidPlay,
  type AdminCompetition,
  type AdminPlay,
  type CompetitionAnalytics,
  type PrizeDraw,
  type PrizeLedgerEntry,
  type PrizeLedgerView,
} from '@/api/competitions'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
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
import { adminPanelClass } from '@/features/admin/admin-styles'
import { formatDate } from '@/features/admin/admin-utils'
import { StatusPill } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { prizeMoney, type LivePrize } from '@/features/admin/prize-live'
import { textareaClassName } from '@/lib/form-styles'
import { majorToMinor } from '@/lib/money'
import { cn } from '@/lib/utils'

function signed(cents: number, currency: string | undefined): string {
  const text = prizeMoney(Math.abs(cents), currency)
  return cents < 0 ? `−${text}` : `+${text}`
}

function Card({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-2xl bg-muted/40 px-4 py-3 ring-1 ring-border/50">
      <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          'mt-1 font-poster text-xl tabular-nums',
          tone === 'good' && 'text-emerald-700',
          tone === 'bad' && 'text-red-700',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Section({ title, icon, action, children }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={cn(adminPanelClass, 'p-5')}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** The Super Admin dashboard cards (spec §10.1). */
export function PrizeDashboard({
  comp,
  analytics,
  live,
}: {
  comp: AdminCompetition
  analytics: CompetitionAnalytics | null
  live: LivePrize | null
}) {
  const cur = comp.prize_currency
  const current = live?.current_prize_cents ?? comp.current_prize_cents
  const plays = live?.eligible_play_count ?? comp.eligible_play_count
  const recon = analytics?.reconciliation_status ?? 'not_run'
  const capped = comp.prize_growth_enabled && comp.max_prize_cents !== undefined && current >= comp.max_prize_cents
  return (
    <Section
      title={comp.prize_growth_enabled ? 'Growing prize' : 'Prize'}
      icon={<Activity className="size-5 text-primary" />}
      action={live ? <StatusPill tone="good">Live</StatusPill> : null}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          label={comp.final_prize_cents !== undefined ? 'Final prize' : 'Current prize'}
          value={
            comp.prize_type === 'points'
              ? `${(comp.prize_points ?? 0).toLocaleString()} pts each`
              : prizeMoney(comp.final_prize_cents ?? current, cur)
          }
          hint={capped ? 'Maximum reached' : comp.prize_growth_enabled ? `+${prizeMoney(comp.increment_per_play_cents, cur)} a play` : 'Fixed'}
        />
        <Card label="Starting prize" value={prizeMoney(comp.start_prize_cents, cur)} />
        <Card label="Prize growth" value={signed(analytics?.prize_growth_cents ?? current - comp.start_prize_cents, cur)} />
        <Card label="Max prize" value={comp.prize_growth_enabled ? prizeMoney(comp.max_prize_cents, cur) : '-'} />
        <Card label="Valid plays" value={plays.toLocaleString()} hint={analytics?.voided_plays ? `${analytics.voided_plays} voided` : undefined} />
        <Card
          label="Unique players"
          value={(analytics?.unique_players ?? comp.unique_player_count).toLocaleString()}
          hint={analytics ? `${Math.round(analytics.repeat_play_rate * 100)}% played again` : undefined}
        />
        <Card
          label="Points consumed"
          value={(analytics?.net_points_consumed ?? 0).toLocaleString()}
          hint={analytics?.points_refunded ? `${analytics.points_refunded.toLocaleString()} refunded` : undefined}
        />
        <Card
          label="Reconciliation"
          value={recon === 'ok' ? 'OK' : recon === 'discrepancy' ? 'Discrepancy' : 'Not run'}
          tone={recon === 'ok' ? 'good' : recon === 'discrepancy' ? 'bad' : undefined}
          hint={analytics?.reconciliation_checked_at ? formatDate(analytics.reconciliation_checked_at) : undefined}
        />
      </div>
      {analytics ? (
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <p className="text-muted-foreground">
            Liability now <span className="font-medium text-foreground">{prizeMoney(current, cur)}</span>
            {analytics.max_possible_liability_cents !== undefined ? (
              <>
                {' '}· at most <span className="font-medium text-foreground">{prizeMoney(analytics.max_possible_liability_cents, cur)}</span>
              </>
            ) : null}
          </p>
          <p className="text-muted-foreground">
            Adjustments {signed(analytics.adjustments_cents, cur)} · reversals {signed(analytics.reversals_cents, cur)}
            {analytics.settled_cents ? ` · paid out ${prizeMoney(analytics.settled_cents, cur)}` : ''}
          </p>
          <p className="text-muted-foreground">
            {analytics.unique_viewers.toLocaleString()} viewers · {Math.round(analytics.view_to_play_rate * 100)}% went on to play
          </p>
        </div>
      ) : null}
    </Section>
  )
}

const REJECTION_LABEL: Record<string, string> = {
  INSUFFICIENT_POINTS: 'Not enough points',
  PLAY_LIMIT_REACHED: 'Play limit reached',
  GAME_NOT_ACTIVE: 'Round not active',
  OUTSIDE_GAME_WINDOW: 'Outside the window',
  PRIZE_CAP_REACHED: 'Cap reached',
  NOT_ELIGIBLE: 'Not eligible',
  IDEMPOTENCY_CONFLICT: 'Reused request key',
  PLAY_BUSY: 'Busy, retried',
}

/** Rejected plays by reason, and fraud signals: concentration and velocity. */
export function RiskPanel({ analytics }: { analytics: CompetitionAnalytics }) {
  const reasons = Object.entries(analytics.rejected_by_reason).sort((a, b) => b[1] - a[1])
  const shared = [
    ...(analytics.shared_devices ?? []).map((s) => ({ ...s, kind: 'Device' })),
    ...(analytics.shared_networks ?? []).map((s) => ({ ...s, kind: 'Network' })),
  ]
  if (reasons.length === 0 && analytics.top_players.length === 0) return null
  return (
    <Section title="Rejections & risk" icon={<ShieldAlert className="size-5 text-amber-600" />}>
      <div className="grid gap-5 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Plays turned away</p>
          {reasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {reasons.map(([code, n]) => (
                <li key={code} className="flex justify-between gap-3">
                  <span>{REJECTION_LABEL[code] ?? code}</span>
                  <span className="font-medium tabular-nums">{n.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Most plays</p>
          <ul className="space-y-1 text-sm">
            {analytics.top_players.map((p) => (
              <li key={p.customer_id} className="flex justify-between gap-3">
                <span className="truncate">{p.display_name || p.customer_id.slice(0, 8)}</span>
                <span className="font-medium tabular-nums">
                  {p.plays}
                  {analytics.valid_plays ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({Math.round((p.plays / analytics.valid_plays) * 100)}%)
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Fast play (last hour)</p>
          {analytics.velocity_alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing unusual.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {analytics.velocity_alerts.map((p) => (
                <li key={p.customer_id} className="flex justify-between gap-3 text-red-700">
                  <span className="truncate">{p.display_name || p.customer_id.slice(0, 8)}</span>
                  <span className="font-medium tabular-nums">{p.last_hour} plays</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {shared.length > 0 ? (
        <div className="mt-5 border-t border-border/50 pt-4">
          <p className="mb-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Several accounts, one source
          </p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {shared.map((s) => (
              <li key={s.kind + s.source} className="flex justify-between gap-3 text-amber-800">
                <span className="truncate">
                  {s.kind} <span className="font-mono text-xs">{s.source.slice(0, 18)}</span>
                </span>
                <span className="font-medium tabular-nums">
                  {s.accounts} accounts · {s.plays} plays
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  )
}

const ENTRY_LABEL: Record<PrizeLedgerEntry['entry_type'], string> = {
  seed: 'Seed',
  play_increment: 'Play',
  admin_adjustment: 'Adjustment',
  play_reversal: 'Reversal',
  winner_settlement: 'Payout',
  correction: 'Correction',
}

function ledgerCsv(entries: PrizeLedgerEntry[]): string {
  const cell = (v: unknown) => {
    const text = v === undefined || v === null ? '' : String(v)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const rows = [
    ['seq', 'created_at', 'entry_type', 'amount_delta_cents', 'balance_after_cents', 'reason', 'actor_type', 'actor_id', 'play_id', 'winner_id'],
    ...entries.map((e) => [
      e.seq, e.created_at, e.entry_type, e.amount_delta_cents, e.balance_after_cents, e.reason,
      e.actor_type, e.actor_id, e.attempt_id, e.winner_id,
    ]),
  ]
  return rows.map((r) => r.map(cell).join(',')).join('\n')
}

/** The immutable prize ledger with its reconciliation (spec §6 admin ledger). */
export function LedgerPanel({
  comp,
  ledger,
  onReconcile,
  onAdjust,
  busy,
}: {
  comp: AdminCompetition
  ledger: PrizeLedgerView | null
  onReconcile: () => void
  onAdjust?: () => void
  busy: boolean
}) {
  const cur = comp.prize_currency
  const entries = ledger?.entries ?? []
  const entryPages = usePagedList([...entries].reverse(), TABLE_PAGE_SIZE, comp.id)
  const rec = ledger?.reconciliation
  function exportCsv() {
    const blob = new Blob([ledgerCsv(entries)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prize-ledger-${comp.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <Section
      title="Prize ledger"
      icon={<Scale className="size-5 text-primary" />}
      action={
        <div className="flex flex-wrap gap-2">
          {onAdjust ? (
            <Button type="button" size="sm" className="h-8" disabled={busy} onClick={onAdjust}>
              Adjust prize
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" className="h-8" disabled={busy} onClick={onReconcile}>
            <RefreshCw className="size-3.5" />
            Reconcile
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8" disabled={entries.length === 0} onClick={exportCsv}>
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      }
    >
      {rec ? (
        <div
          className={cn(
            'mb-4 rounded-xl px-4 py-3 text-sm ring-1',
            rec.status === 'ok' ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-red-50 text-red-900 ring-red-200',
          )}
        >
          <p className="font-medium">
            {rec.status === 'ok'
              ? `Reconciled: the ledger adds up to ${prizeMoney(rec.ledger_total_cents, cur)}, matching the prize shown.`
              : 'Discrepancy. Nothing has been corrected automatically. Investigate before paying out.'}
          </p>
          {rec.status !== 'ok' ? (
            <ul className="mt-2 list-disc pl-5">
              {rec.checks
                .filter((c) => !c.ok)
                .map((c) => (
                  <li key={c.name}>
                    {c.name}: expected {c.expected}, found {c.actual}
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">The ledger starts when the round is published.</p>
      ) : (
        <>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border/60 text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Entry</th>
                <th className="py-2 pr-3 text-right font-medium">Change</th>
                <th className="py-2 pr-3 text-right font-medium">Prize after</th>
                <th className="py-2 pr-3 font-medium">Reason</th>
                <th className="py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {entryPages.visible.map((e) => (
                <tr key={e.id} className="border-b border-border/30 last:border-0">
                  <td className="py-2 pr-3 text-muted-foreground tabular-nums">{e.seq}</td>
                  <td className="py-2 pr-3">
                    {ENTRY_LABEL[e.entry_type]}
                    <span className="block text-xs text-muted-foreground">{e.actor_type}</span>
                  </td>
                  <td
                    className={cn(
                      'py-2 pr-3 text-right font-medium tabular-nums',
                      e.amount_delta_cents < 0 ? 'text-red-700' : 'text-emerald-700',
                    )}
                  >
                    {signed(e.amount_delta_cents, cur)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{prizeMoney(e.balance_after_cents, cur)}</td>
                  <td className="max-w-[240px] truncate py-2 pr-3 text-muted-foreground" title={e.reason}>
                    {e.reason || ''}
                  </td>
                  <td className="py-2 whitespace-nowrap text-muted-foreground">{formatDate(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PageNav
          page={entryPages.page}
          pageCount={entryPages.pageCount}
          onPage={entryPages.setPage}
          label="Ledger pages"
          scroll={false}
        />
        </>
      )}
    </Section>
  )
}

/** A play's score, or a chance play's outcome. */
function playOutcome(p: AdminPlay): string {
  const r = p.result
  if (!r) return p.score === undefined ? '-' : String(p.score)
  if (r.mechanic === 'draw') return `Entry #${r.entry_number ?? '?'}`
  return r.won ? `WON (draw ${r.draw} of ${r.odds})` : `No win (${r.draw} of ${r.odds})`
}

/**
 * A stored prize draw: the entry list's fingerprint, every random value and
 * every pick, so anyone can check who won and why.
 */
export function DrawPanel({ draw }: { draw: PrizeDraw }) {
  const label = { winner: 'Winner', skipped_repeat: 'Already drawn', skipped_ineligible: 'Not eligible' } as const
  return (
    <Section title="Prize draw record" icon={<Scale className="size-5 text-primary" />}>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <p>
          <span className="text-muted-foreground">Entries</span>
          <br />
          <span className="font-medium">{draw.entry_count.toLocaleString()}</span>
        </p>
        <p className="sm:col-span-2">
          <span className="text-muted-foreground">Entry list SHA-256</span>
          <br />
          <span className="font-mono text-xs break-all">{draw.entries_sha256}</span>
        </p>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {draw.algorithm} · drawn {formatDate(draw.created_at)}
      </p>
      <ol className="mt-4 space-y-1 text-sm">
        {draw.picks.map((p, i) => (
          <li key={p.order} className="flex flex-wrap items-center gap-2">
            <span className="w-8 text-muted-foreground tabular-nums">#{p.order}</span>
            <span className="font-mono text-xs">entry {p.entry_index + 1}</span>
            <span className="text-xs text-muted-foreground">random value {draw.random_values[i]}</span>
            <StatusPill tone={p.outcome === 'winner' ? 'good' : 'warn'}>{label[p.outcome]}</StatusPill>
            {p.reason ? <span className="text-xs text-muted-foreground">{p.reason}</span> : null}
          </li>
        ))}
      </ol>
    </Section>
  )
}

/** Recent plays, with the void tool for Super Admins. */
export function PlaysPanel({
  comp,
  plays,
  onVoid,
}: {
  comp: AdminCompetition
  plays: AdminPlay[]
  onVoid?: (play: AdminPlay) => void
}) {
  const playPages = usePagedList(plays, TABLE_PAGE_SIZE, comp.id)
  if (plays.length === 0) return null
  const cur = comp.prize_currency
  const canVoid = ['live', 'paused', 'closed', 'frozen'].includes(comp.effective_status)
  return (
    <Section title={`Plays (${comp.attempts})`} icon={<Activity className="size-5 text-primary" />}>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border/60 text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
              <th className="py-2 pr-3 font-medium">Player</th>
              <th className="py-2 pr-3 text-right font-medium">Points</th>
              <th className="py-2 pr-3 text-right font-medium">Added</th>
              <th className="py-2 pr-3 text-right font-medium">Result</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">When</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {playPages.visible.map((p) => (
              <tr key={p.id} className="border-b border-border/30 last:border-0">
                <td className="py-2 pr-3">
                  {p.display_name || p.customer_id.slice(0, 8)}
                  <span className="block text-xs text-muted-foreground">play #{p.attempt_number}</span>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{p.points_spent}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {p.prize_increment_cents ? prizeMoney(p.prize_increment_cents, cur) : '-'}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{playOutcome(p)}</td>
                <td className="py-2 pr-3">
                  <StatusPill tone={p.status === 'voided' ? 'bad' : p.status === 'accepted' ? 'good' : 'info'}>
                    {p.status}
                    {p.refunded_at ? ' · refunded' : ''}
                  </StatusPill>
                  {p.void_reason ? <span className="block text-xs text-muted-foreground">{p.void_reason}</span> : null}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{formatDate(p.started_at)}</td>
                <td className="py-2 text-right">
                  {onVoid && canVoid && p.status !== 'voided' ? (
                    <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => onVoid(p)}>
                      <Undo2 className="size-3.5" />
                      Void
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PageNav
        page={playPages.page}
        pageCount={playPages.pageCount}
        onPage={playPages.setPage}
        label="Play pages"
        scroll={false}
      />
    </Section>
  )
}

function useAsyncDialog(onOpenChange: (open: boolean) => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, submit }
}

/** A ledger adjustment: never an edit of the seed or earlier entries (spec §8). */
export function AdjustPrizeDialog({
  comp,
  open,
  onOpenChange,
  onDone,
}: {
  comp: AdminCompetition
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: (message: string) => Promise<void>
}) {
  const [direction, setDirection] = useState<'add' | 'remove'>('add')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const { busy, error, setError, submit } = useAsyncDialog(onOpenChange)
  const cur = comp.prize_currency ?? ''
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust the prize</DialogTitle>
          <DialogDescription>
            Posted as a new ledger entry with your reason. The prize is {prizeMoney(comp.current_prize_cents, cur)}
            {comp.max_prize_cents !== undefined ? ` and cannot go above ${prizeMoney(comp.max_prize_cents, cur)}` : ''}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[130px_1fr] gap-3">
            <select
              aria-label="Direction"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'add' | 'remove')}
            >
              <option value="add">Add</option>
              <option value="remove">Take off</option>
            </select>
            <Input
              type="number"
              min={0}
              step="0.01"
              aria-label={`Amount in ${cur}`}
              placeholder={`Amount (${cur})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10"
            />
          </div>
          <textarea
            className={textareaClassName}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason. Kept on the ledger for good"
            aria-label="Reason"
          />
          <FormAlert error={error} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-10">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            className="h-10"
            disabled={busy}
            onClick={() => {
              const major = Number(amount)
              if (!cur || !(major > 0)) return setError('Enter an amount above zero.')
              if (!reason.trim()) return setError('A reason is required.')
              const cents = majorToMinor(major, cur) * (direction === 'add' ? 1 : -1)
              return submit(async () => {
                await adjustPrize(comp.id, cents, reason.trim())
                setAmount('')
                setReason('')
                await onDone('Prize adjusted. The change is on the ledger.')
              })
            }}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Post adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function VoidPlayDialog({
  comp,
  play,
  onOpenChange,
  onDone,
}: {
  comp: AdminCompetition
  play: AdminPlay | null
  onOpenChange: (open: boolean) => void
  onDone: (message: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [refund, setRefund] = useState(true)
  const [reverse, setReverse] = useState(true)
  const { busy, error, setError, submit } = useAsyncDialog(onOpenChange)
  return (
    <Dialog open={play !== null} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void this play?</DialogTitle>
          <DialogDescription>
            Its score leaves the leaderboard. Each part below is posted as its own ledger entry.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
            Refund its {play?.points_spent ?? 0} points
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={reverse} onChange={(e) => setReverse(e.target.checked)} />
            Take its {prizeMoney(play?.prize_increment_cents ?? 0, comp.prize_currency)} back off the prize
          </label>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason</Label>
            <textarea
              id="void-reason"
              className={textareaClassName}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Recorded in the audit log"
            />
          </div>
          <FormAlert error={error} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-10">
              Keep it
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            className="h-10"
            disabled={busy}
            onClick={() => {
              if (!play) return
              if (!reason.trim()) return setError('A reason is required.')
              return submit(async () => {
                await voidPlay(comp.id, play.id, { reason: reason.trim(), refund_points: refund, reverse_prize: reverse })
                setReason('')
                await onDone('Play voided.')
              })
            }}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Void play
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SettleDialog({
  comp,
  open,
  onOpenChange,
  onDone,
}: {
  comp: AdminCompetition
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: (message: string) => Promise<void>
}) {
  const [reference, setReference] = useState('')
  const { busy, error, submit } = useAsyncDialog(onOpenChange)
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record the payout</DialogTitle>
          <DialogDescription>
            Posts a payout entry for every validated winner not yet paid, taking their share off the prize. Running it
            again only pays who is still pending.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="settle-ref">Payment reference (optional)</Label>
          <Input
            id="settle-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Bank transfer or voucher batch"
            className="h-10"
          />
          <FormAlert error={error} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-10">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            className="h-10"
            disabled={busy}
            onClick={() =>
              submit(async () => {
                const winners = await settleWinners(comp.id, reference.trim())
                const paid = winners.filter((w) => w.settlement_status === 'settled').length
                await onDone(`Payout recorded. ${paid} ${paid === 1 ? 'winner is' : 'winners are'} settled.`)
              })
            }
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Record payout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
