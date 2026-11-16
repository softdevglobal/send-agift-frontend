import { useState, type ReactNode } from 'react'
import {
  Activity,
  CircleCheck,
  Download,
  Gamepad2,
  LoaderCircle,
  RefreshCw,
  Scale,
  ShieldAlert,
  SlidersHorizontal,
  Sprout,
  Ticket,
  TriangleAlert,
  Trophy,
  Undo2,
  Wrench,
} from 'lucide-react'

import {
  adjustPrize,
  settleWinners,
  voidPlay,
  type AdminCompetition,
  type AdminPlay,
  type CompetitionAnalytics,
  type PrizeDraw,
  type PrizeLedgerEntry,
  type PrizeLedgerEntryType,
  type PrizeLedgerView,
} from '@/api/competitions'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
          value={prizeMoney(comp.final_prize_cents ?? current, cur)}
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
          label="Game entries used"
          value={(analytics?.net_entries_consumed ?? 0).toLocaleString()}
          hint={analytics?.entries_refunded ? `${analytics.entries_refunded.toLocaleString()} refunded` : undefined}
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
  INSUFFICIENT_ENTRIES: 'Not enough game entries',
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
      {entries.length ? <LedgerSummary entries={entries} cur={cur} /> : null}
      {rec ? (
        <div
          className={cn(
            'mb-4 rounded-xl px-4 py-3 text-sm ring-1',
            rec.status === 'ok' ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-red-50 text-red-900 ring-red-200',
          )}
        >
          <p className="flex items-start gap-2 font-medium">
            {rec.status === 'ok' ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0" />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            )}
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
        <ol className="relative space-y-2 before:absolute before:top-3 before:bottom-3 before:left-[21px] before:w-0.5 before:bg-border/70">
          {entryPages.visible.map((e) => {
            const look = ENTRY_LOOK[e.entry_type]
            const Icon = look.icon
            const down = e.amount_delta_cents < 0
            return (
              <li key={e.id} className="relative flex items-start gap-3">
                <span
                  className={cn(
                    'relative z-10 flex size-11 shrink-0 items-center justify-center rounded-xl ring-4 ring-card',
                    look.tone,
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:border-border">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{ENTRY_LABEL[e.entry_type]}</span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground tabular-nums">
                        #{e.seq}
                      </span>
                      <span className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                        {e.actor_type}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground" title={e.reason}>
                      {e.reason ? `${e.reason} · ` : ''}
                      <span title={formatDate(e.created_at)}>{ago(e.created_at)}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        'font-poster text-lg leading-none tabular-nums',
                        down ? 'text-red-700' : 'text-emerald-700',
                      )}
                    >
                      {signed(e.amount_delta_cents, cur)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      prize {prizeMoney(e.balance_after_cents, cur)}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
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

/** How each kind of ledger entry looks on the timeline. */
const ENTRY_LOOK: Record<PrizeLedgerEntryType, { icon: typeof Sprout; tone: string }> = {
  seed: { icon: Sprout, tone: 'bg-brand-violet text-white' },
  play_increment: { icon: Gamepad2, tone: 'bg-emerald-500 text-white' },
  admin_adjustment: { icon: SlidersHorizontal, tone: 'bg-sky-500 text-white' },
  play_reversal: { icon: Undo2, tone: 'bg-amber-400 text-amber-950' },
  winner_settlement: { icon: Trophy, tone: 'bg-amber-300 text-amber-950' },
  correction: { icon: Wrench, tone: 'bg-rose-500 text-white' },
}

/** The prize now, where it came from, and a line of how it moved. */
function LedgerSummary({ entries, cur }: { entries: PrizeLedgerEntry[]; cur?: string }) {
  const sum = (types: PrizeLedgerEntryType[]) =>
    entries.filter((e) => types.includes(e.entry_type)).reduce((t, e) => t + e.amount_delta_cents, 0)
  const now = entries[entries.length - 1]?.balance_after_cents ?? 0
  const tiles = [
    ['Prize now', prizeMoney(now, cur), 'bg-brand-ink text-white'],
    ['Started at', prizeMoney(sum(['seed']), cur), 'bg-brand-violet/10 text-brand-violet'],
    ['Added by plays', prizeMoney(sum(['play_increment', 'play_reversal']), cur), 'bg-emerald-100 text-emerald-900'],
    ['Adjusted', prizeMoney(sum(['admin_adjustment', 'correction']), cur), 'bg-sky-100 text-sky-900'],
  ] as const

  // A small line of the prize after each entry.
  const points = entries.map((e) => e.balance_after_cents)
  const max = Math.max(...points, 1)
  const w = 240
  const h = 56
  const step = points.length > 1 ? w / (points.length - 1) : 0
  const xy = points.map((v, i) => [points.length > 1 ? i * step : w / 2, h - 4 - (v / max) * (h - 8)] as const)
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  return (
    <div className="mb-4 grid gap-2 lg:grid-cols-[1fr_auto]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(([label, value, tone]) => (
          <div key={label} className={cn('rounded-xl px-4 py-3', tone)}>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-80">{label}</p>
            <p className="mt-0.5 truncate font-poster text-lg tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center rounded-xl bg-muted/40 px-3">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full lg:w-60" role="img" aria-label="The prize after each entry">
          {points.length > 1 ? (
            <>
              <polygon points={`0,${h} ${line} ${w},${h}`} className="fill-emerald-500/15" />
              <polyline points={line} fill="none" className="stroke-emerald-600" strokeWidth={2} strokeLinejoin="round" />
            </>
          ) : null}
          {xy.length ? (
            <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r={3.5} className="fill-emerald-600" />
          ) : null}
        </svg>
      </div>
    </div>
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

/** Colours for player avatars, picked by id so a player keeps theirs. */
const AVATAR_TONES = [
  'bg-brand-violet text-white',
  'bg-brand-teal text-brand-ink',
  'bg-amber-300 text-amber-950',
  'bg-sky-500 text-white',
  'bg-rose-500 text-white',
  'bg-emerald-500 text-white',
]

function avatarTone(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]
}

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  )
}

/** "just now", "4 min ago", "3 h ago", or the date beyond a day. */
function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms)) return ''
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ago`
  return formatDate(iso)
}

type PlayFilter = 'all' | 'accepted' | 'pending' | 'voided'

const PLAY_TONE: Record<AdminPlay['status'], string> = {
  accepted: 'bg-emerald-100 text-emerald-900',
  started: 'bg-sky-100 text-sky-900',
  submitted: 'bg-sky-100 text-sky-900',
  rejected: 'bg-amber-100 text-amber-950',
  voided: 'bg-red-100 text-red-900',
}

/** Recent plays as cards, with the void tool for Super Admins. */
export function PlaysPanel({
  comp,
  plays,
  onVoid,
}: {
  comp: AdminCompetition
  plays: AdminPlay[]
  onVoid?: (play: AdminPlay) => void
}) {
  const [filter, setFilter] = useState<PlayFilter>('all')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = plays.filter((p) => {
    if (filter === 'accepted' && p.status !== 'accepted') return false
    if (filter === 'voided' && p.status !== 'voided') return false
    if (filter === 'pending' && !['started', 'submitted'].includes(p.status)) return false
    return !q || (p.display_name ?? p.customer_id).toLowerCase().includes(q)
  })
  const playPages = usePagedList(shown, TABLE_PAGE_SIZE, `${comp.id}:${filter}:${q}`)
  if (plays.length === 0) return null

  const cur = comp.prize_currency
  const canVoid = ['live', 'paused', 'closed', 'frozen'].includes(comp.effective_status)
  const scored = plays.filter((p) => p.status === 'accepted' && p.score !== undefined && !p.result)
  const best = scored.reduce((max, p) => Math.max(max, p.score ?? 0), 0)
  const players = new Set(plays.map((p) => p.customer_id)).size
  const entries = plays.filter((p) => !p.refunded_at).reduce((sum, p) => sum + p.entries_spent, 0)
  const added = plays.reduce((sum, p) => sum + (p.prize_increment_cents || 0), 0)
  const counts: Record<PlayFilter, number> = {
    all: plays.length,
    accepted: plays.filter((p) => p.status === 'accepted').length,
    pending: plays.filter((p) => p.status === 'started' || p.status === 'submitted').length,
    voided: plays.filter((p) => p.status === 'voided').length,
  }

  return (
    <Section title={`Plays (${comp.attempts})`} icon={<Activity className="size-5 text-primary" />}>
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        {(
          [
            ['Players', players.toLocaleString(), 'bg-brand-violet/10 text-brand-violet'],
            ['Best score', best ? best.toLocaleString() : '-', 'bg-amber-100 text-amber-950'],
            ['Entries spent', entries.toLocaleString(), 'bg-brand-teal/15 text-brand-ink'],
            ['Added to prize', added ? prizeMoney(added, cur) : '-', 'bg-emerald-100 text-emerald-900'],
          ] as const
        ).map(([label, value, tone]) => (
          <div key={label} className={cn('rounded-xl px-4 py-3', tone)}>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-80">{label}</p>
            <p className="mt-0.5 font-poster text-xl tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'accepted', 'pending', 'voided'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors',
                filter === f
                  ? 'border-brand-ink bg-brand-ink text-white'
                  : 'border-border text-muted-foreground hover:border-brand-ink/40 hover:text-foreground',
              )}
            >
              {f === 'pending' ? 'In progress' : f} · {counts[f]}
            </button>
          ))}
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a player"
          aria-label="Find a player"
          className="h-9 sm:max-w-56"
        />
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">No plays match.</p>
      ) : (
        <ul className="space-y-2">
          {playPages.visible.map((p) => {
            const name = p.display_name || p.customer_id.slice(0, 8)
            const isBest = best > 0 && p.status === 'accepted' && !p.result && p.score === best
            const share = best > 0 && p.score !== undefined && !p.result ? Math.max(0.04, p.score / best) : 0
            const voided = p.status === 'voided'
            return (
              <li
                key={p.id}
                className={cn(
                  'flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border-2 p-3 transition-colors sm:flex-nowrap',
                  isBest ? 'border-amber-300 bg-amber-50/60 dark:bg-amber-950/20' : 'border-border/60 hover:border-border',
                  voided && 'opacity-70',
                )}
              >
                <span
                  className={cn(
                    'relative flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold',
                    avatarTone(p.customer_id),
                  )}
                >
                  {initialsOf(name)}
                  {isBest ? (
                    <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow">
                      <Trophy className="size-3.5" />
                    </span>
                  ) : null}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate font-semibold">{name}</span>
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      PLAY #{p.attempt_number}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground" title={formatDate(p.started_at)}>
                    {ago(p.started_at)}
                    {p.void_reason ? ` · ${p.void_reason}` : ''}
                  </p>
                  {share > 0 ? (
                    <div className="mt-2 h-1.5 max-w-64 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', isBest ? 'bg-amber-400' : 'bg-brand-violet/70')}
                        style={{ width: `${share * 100}%` }}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-teal/15 px-2.5 py-1 text-xs font-semibold text-brand-ink tabular-nums">
                    <Ticket className="size-3.5" />−{p.entries_spent}
                  </span>
                  {p.prize_increment_cents ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 tabular-nums">
                      +{prizeMoney(p.prize_increment_cents, cur)}
                    </span>
                  ) : null}
                </div>

                <div className="w-28 shrink-0 text-right">
                  <p className={cn('font-poster tabular-nums', p.result ? 'text-sm' : 'text-2xl leading-none')}>
                    {playOutcome(p)}
                  </p>
                  <span
                    className={cn(
                      'mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                      PLAY_TONE[p.status],
                    )}
                  >
                    {p.status}
                    {p.refunded_at ? ' · refunded' : ''}
                  </span>
                </div>

                {onVoid && canVoid ? (
                  <div className="w-20 shrink-0 text-right">
                    {!voided ? (
                      <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => onVoid(p)}>
                        <Undo2 className="size-3.5" />
                        Void
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
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
            <Checkbox checked={refund} onCheckedChange={(value) => setRefund(value === true)} />
            Refund its {play?.entries_spent ?? 0} game entries
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={reverse} onCheckedChange={(value) => setReverse(value === true)} />
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
                await voidPlay(comp.id, play.id, { reason: reason.trim(), refund_entries: refund, reverse_prize: reverse })
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
