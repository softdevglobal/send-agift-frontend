import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  Check,
  CopyPlus,
  Pause,
  Play,
  Square,
  Crown,
  Gavel,
  LoaderCircle,
  Pencil,
  ShieldAlert,
  Snowflake,
  Trophy,
  Wallet,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  CANCEL_REASONS,
  cancelCompetition,
  closeCompetition,
  disqualifyWinner,
  getCompetitionAnalytics,
  getDraw,
  getPrizeLedger,
  listPlays,
  pauseCompetition,
  reconcilePrize,
  resumeCompetition,
  runDraw,
  finaliseCompetition,
  freezeCompetition,
  fulfilClaim,
  fundPrizeReserve,
  getAdminCompetition,
  getCompetitionLeaderboard,
  getReviewQueue,
  listWinners,
  markWinnerUnclaimed,
  reviewSubmission,
  scheduleCompetition,
  setPrizeReserve,
  updateCompetition,
  validateWinner,
  verifyClaim,
  type AdminCompetition,
  type AdminPlay,
  type CancelReason,
  type CompetitionAnalytics,
  type CompetitionInput,
  type CompetitionLeaderRow,
  type CompetitionStatus,
  type CompetitionWinner,
  type PrizeDraw,
  type PrizeLedgerView,
  type ScoreSubmission,
} from '@/api/competitions'
import { listCountries } from '@/api/countries'
import { listAdminGames, type AdminGameSummary } from '@/api/games'
import type { Country } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
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
import { AdminPageHeader, adminPanelClass, formatDate } from '@/features/admin'
import { CompetitionDialog } from '@/features/admin/competition-dialog'
import { CompetitionForm } from '@/features/admin/competition-form'
import {
  competitionStatusLabel,
  competitionStatusTone,
  formatPlayTime,
  formatScore,
  scoreStatusLabel,
  scoreStatusTone,
} from '@/features/admin/games-format'
import { GameBadge, Loading, ReasonDialog, StatusPill } from '@/features/admin/games-ui'
import {
  AdjustPrizeDialog,
  DrawPanel,
  DuplicateDialog,
  LedgerPanel,
  PlaysPanel,
  PrizeDashboard,
  RiskPanel,
  SettleDialog,
  VoidPlayDialog,
} from '@/features/admin/prize-panels'
import { prizeMoney, useLivePrize } from '@/features/admin/prize-live'
import { isSuperAdmin } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { formatPriceAmount, majorToMinor, minorToMajor } from '@/lib/money'
import { cn } from '@/lib/utils'

const lifecycle: CompetitionStatus[] = ['draft', 'scheduled', 'live', 'closed', 'frozen', 'finalised']

function Panel({ title, icon, children, action }: { title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
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

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  )
}

function Stepper({ status }: { status: CompetitionStatus }) {
  const current = lifecycle.indexOf(status === 'paused' ? 'live' : status)
  return (
    <ol className="flex flex-wrap gap-2">
      {lifecycle.map((step, i) => (
        <li
          key={step}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1',
            i < current && 'bg-emerald-50 text-emerald-800 ring-emerald-200',
            i === current && 'bg-foreground text-background ring-foreground',
            i > current && 'text-muted-foreground ring-border',
          )}
        >
          {i < current ? <Check className="size-3" /> : <span className="text-[10px]">{i + 1}</span>}
          {competitionStatusLabel(step === 'live' && status === 'paused' ? 'paused' : step)}
        </li>
      ))}
    </ol>
  )
}

function ReserveCard({
  comp,
  editable,
  run,
}: {
  comp: AdminCompetition
  editable: boolean
  run: (label: string, action: () => Promise<unknown>, success: string) => Promise<void>
}) {
  const reserve = comp.prize_reserve
  const [amount, setAmount] = useState(() => {
    if (reserve) return String(minorToMajor(reserve.reserve_amount, reserve.currency))
    const liability = comp.prize_growth_enabled ? comp.max_prize_cents : comp.start_prize_cents
    if (liability !== undefined && comp.prize_currency) {
      return String(minorToMajor(liability, comp.prize_currency))
    }
    return ''
  })
  const [currency, setCurrency] = useState(reserve?.currency ?? comp.prize_currency ?? '')
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

  const cur = currency.trim().toUpperCase()
  return (
    <Panel title="Prize reserve" icon={<Wallet className="size-5 text-primary" />}>
      <p className="mb-4 text-sm text-muted-foreground">
        The most the prize can reach must be held before the round opens — the fixed prize, or the maximum of a growing
        one — funded by SendAgift or an approved sponsor.
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="r-amount">Amount</Label>
          <Input
            id="r-amount"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            disabled={!editable}
            onChange={(e) => setAmount(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="r-currency">Currency</Label>
          <Input
            id="r-currency"
            maxLength={3}
            value={currency}
            disabled={!editable}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="h-10 uppercase"
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
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={!editable || !amount || cur.length !== 3}
          onClick={() =>
            run(
              'reserve',
              () =>
                setPrizeReserve(comp.id, {
                  reserve_amount: majorToMinor(Number(amount), cur),
                  currency: cur,
                  funding_source: source,
                }),
              'Prize reserve saved.',
            )
          }
        >
          {reserve ? 'Update' : 'Set reserve'}
        </Button>
      </div>

      {reserve ? (
        <div className="mt-5 grid gap-3 border-t border-border/50 pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="r-evidence">Funding evidence</Label>
            <Input
              id="r-evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Escrow, purchase or insurance reference"
              className="h-10"
            />
          </div>
          <Button
            type="button"
            className="h-10"
            disabled={!evidence.trim()}
            onClick={() =>
              run('fund', () => fundPrizeReserve(comp.id, evidence.trim()), 'Prize reserve marked as funded.')
            }
          >
            <Check className="size-4" />
            Mark funded
          </Button>
        </div>
      ) : null}
    </Panel>
  )
}

function winnerTone(status: CompetitionWinner['status']) {
  if (status === 'validated') return 'good' as const
  if (status === 'pending_validation') return 'warn' as const
  return 'bad' as const
}

/** Superadmin: one competition end to end — setup, operations, review, winners. */
export function AdminCompetitionDetailPage() {
  const { id = '' } = useParams()
  const [comp, setComp] = useState<AdminCompetition | null>(null)
  const [board, setBoard] = useState<CompetitionLeaderRow[]>([])
  const [queue, setQueue] = useState<ScoreSubmission[]>([])
  const [winners, setWinners] = useState<CompetitionWinner[]>([])
  const [games, setGames] = useState<AdminGameSummary[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState<CancelReason>('technical_failure')
  const [cancelNote, setCancelNote] = useState('')
  const [rejecting, setRejecting] = useState<ScoreSubmission | null>(null)
  const [disqualifying, setDisqualifying] = useState<CompetitionWinner | null>(null)
  const [analytics, setAnalytics] = useState<CompetitionAnalytics | null>(null)
  const [ledger, setLedger] = useState<PrizeLedgerView | null>(null)
  const [plays, setPlays] = useState<AdminPlay[]>([])
  const [draw, setDraw] = useState<PrizeDraw | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [settleOpen, setSettleOpen] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [voiding, setVoiding] = useState<AdminPlay | null>(null)
  const navigate = useNavigate()
  const superadmin = isSuperAdmin()

  const load = useCallback(async () => {
    const c = await getAdminCompetition(id)
    setComp(c)
    const [b, q, w, a, l, p] = await Promise.all([
      getCompetitionLeaderboard(id),
      getReviewQueue(id),
      listWinners(id),
      getCompetitionAnalytics(id),
      getPrizeLedger(id),
      listPlays(id),
    ])
    setBoard(b)
    setQueue(q)
    setWinners(w)
    setAnalytics(a)
    setLedger(l)
    setPlays(p)
    setDraw(c.winner_method === 'draw' ? await getDraw(id) : null)
  }, [id])

  const running = comp?.effective_status === 'live' || comp?.effective_status === 'paused'
  const live = useLivePrize(id, running)

  useEffect(() => {
    Promise.all([load(), listAdminGames().then(setGames), listCountries().then((l) => setCountries(Array.isArray(l) ? l : []))])
      .catch((err) => setError(getErrorMessage(err, 'Could not load the competition.')))
      .finally(() => setLoading(false))
  }, [load])

  const run = useCallback(
    async (label: string, action: () => Promise<unknown>, success: string) => {
      setBusy(label)
      setError(null)
      setNotice(null)
      try {
        await action()
        setNotice(success)
        await load()
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setBusy(null)
      }
    },
    [load],
  )

  if (loading) return <Loading />
  if (!comp) {
    return <FormAlert error={error ?? 'Competition not found.'} />
  }

  const status = comp.effective_status
  const editable = comp.status === 'draft' || (comp.status === 'scheduled' && new Date(comp.starts_at) > new Date())
  const canCancel = superadmin && status !== 'finalised' && status !== 'cancelled'
  const unpaid = winners.some((w) => w.status === 'validated' && w.settlement_status === 'pending')
  const chance = comp.game_type === 'chance'
  const closedish = status === 'closed' || status === 'frozen'
  const done = async (message: string) => {
    setNotice(message)
    setError(null)
    await load()
  }
  const spinner = (label: string) => (busy === label ? <LoaderCircle className="size-4 animate-spin" /> : null)

  async function saveEdit(input: CompetitionInput) {
    await updateCompetition(comp!.id, input)
    setEditing(false)
    setNotice('Saved. The competition is back in draft — schedule it again when ready.')
    await load()
  }

  return (
    <>
      <Link
        to="/admin/competitions"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All competitions
      </Link>

      <AdminPageHeader
        eyebrow={`${comp.game_name} · ${comp.country_name}`}
        title={comp.title}
        action={
          <div className="flex items-center gap-3">
            <StatusPill tone={competitionStatusTone[status]} className="px-3 py-1 text-xs">
              {competitionStatusLabel(status)}
            </StatusPill>
            <GameBadge slug={comp.game_slug} />
          </div>
        }
      />

      <FormAlert error={error} notice={notice} className="mb-6" />

      {status === 'cancelled' ? (
        <div className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-800 ring-1 ring-red-200">
          Cancelled {formatDate(comp.cancelled_at)} —{' '}
          {CANCEL_REASONS.find((r) => r.value === comp.cancel_reason)?.label ?? comp.cancel_reason}.
          {comp.cancel_note ? ` ${comp.cancel_note}` : ''} Every attempt was voided and no winner will be declared.
        </div>
      ) : (
        <div className="mb-6">
          <Stepper status={status} />
        </div>
      )}

      <div className="grid gap-4">
        <Panel
          title="Details"
          icon={<CalendarClock className="size-5 text-primary" />}
          action={
            editable && superadmin ? (
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" />
                Edit
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {editable ? 'Only a superadmin can edit' : 'Rules are locked once it starts'}
              </span>
            )
          }
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Opens" value={formatDate(comp.starts_at)} />
            <Fact label="Closes" value={formatDate(comp.ends_at)} />
            <Fact
              label="Prize"
              value={
                <>
                  {comp.prize_description}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {comp.prize_type === 'points'
                      ? `${(comp.prize_points ?? 0).toLocaleString()} points each`
                      : comp.prize_growth_enabled
                        ? `${prizeMoney(comp.start_prize_cents, comp.prize_currency)} + ${prizeMoney(comp.increment_per_play_cents, comp.prize_currency)}/play, max ${prizeMoney(comp.max_prize_cents, comp.prize_currency)}`
                        : prizeMoney(comp.start_prize_cents, comp.prize_currency)}{' '}
                    · {comp.number_of_winners} {comp.number_of_winners === 1 ? 'winner' : 'winners'}
                  </span>
                </>
              }
            />
            <Fact
              label="Entry"
              value={
                <>
                  {comp.max_attempts_per_customer} plays · {comp.points_per_attempt} pts each
                  <span className="block text-xs font-normal text-muted-foreground">
                    {comp.daily_play_limit ? `${comp.daily_play_limit}/day · ` : ''}
                    {comp.min_plays_to_win ? `${comp.min_plays_to_win} to win · ` : ''}
                    {comp.min_age}+{comp.requires_identity_verification ? ', ID verified' : ''} · {comp.timezone}
                  </span>
                </>
              }
            />
            <Fact label="Round" value={`Round ${comp.round_no}`} />
            {comp.winner_method === 'instant' && comp.win_odds ? (
              <Fact label="Win odds" value={`1 in ${comp.win_odds.toLocaleString()} per play`} />
            ) : null}
            {comp.winner_method === 'draw' ? <Fact label="Winners" value="Drawn at random from all entries" /> : null}
            {comp.quiz_questions ? (
              <Fact label="Quiz" value={`${comp.quiz_questions.length} questions · answers kept on the server`} />
            ) : null}
            <Fact label="Scores" value={comp.submissions} />
            <Fact label="To review" value={comp.under_review} />
            <Fact label="Game version" value={`${comp.game_name} v${comp.game_version}`} />
          </div>
          {comp.official_rules ? (
            <details className="mt-5 rounded-xl bg-muted/40 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium">Official rules</summary>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{comp.official_rules}</p>
            </details>
          ) : (
            <p className="mt-5 text-sm text-amber-700">No official rules yet — they must be published before scheduling.</p>
          )}
        </Panel>

        {status !== 'draft' ? <PrizeDashboard comp={comp} analytics={analytics} live={live} /> : null}

        {status !== 'cancelled' && (editable || comp.prize_reserve) ? (
          <ReserveCard key={comp.updated_at} comp={comp} editable={editable && superadmin} run={run} />
        ) : null}

        <Panel title="Actions" icon={<Gavel className="size-5 text-primary" />}>
          <div className="flex flex-wrap gap-2">
            {superadmin && status === 'live' ? (
              <Button
                type="button"
                variant="outline"
                className="h-10"
                disabled={busy !== null}
                onClick={() => run('pause', () => pauseCompetition(comp.id), 'Paused. New plays are refused; plays already started can finish.')}
              >
                {spinner('pause')}
                <Pause className="size-4" />
                Pause
              </Button>
            ) : null}
            {superadmin && status === 'paused' ? (
              <Button
                type="button"
                className="h-10"
                disabled={busy !== null}
                onClick={() => run('resume', () => resumeCompetition(comp.id), 'Resumed. Plays are open again.')}
              >
                {spinner('resume')}
                <Play className="size-4" />
                Resume
              </Button>
            ) : null}
            {superadmin && (status === 'live' || status === 'paused') ? (
              <Button
                type="button"
                variant="outline"
                className="h-10"
                disabled={busy !== null}
                onClick={() => {
                  if (window.confirm('Close this round now? No new plays will be accepted.')) {
                    void run('close', () => closeCompetition(comp.id), 'Closed. The prize is fixed at its current amount.')
                  }
                }}
              >
                {spinner('close')}
                <Square className="size-4" />
                Close now
              </Button>
            ) : null}
            {superadmin && status === 'finalised' && unpaid ? (
              <Button type="button" className="h-10" disabled={busy !== null} onClick={() => setSettleOpen(true)}>
                <Wallet className="size-4" />
                Record payout
              </Button>
            ) : null}
            {superadmin ? (
              <Button type="button" variant="outline" className="h-10" disabled={busy !== null} onClick={() => setDuplicateOpen(true)}>
                <CopyPlus className="size-4" />
                New round
              </Button>
            ) : null}
            {superadmin && comp.status === 'draft' ? (
              <Button
                type="button"
                className="h-10"
                disabled={busy !== null || comp.schedule_blockers.length > 0}
                onClick={() => run('schedule', () => scheduleCompetition(comp.id), 'Scheduled. It goes live at its start time.')}
              >
                {spinner('schedule')}
                <CalendarClock className="size-4" />
                Schedule
              </Button>
            ) : null}
            {status === 'closed' && !chance ? (
              <Button
                type="button"
                className="h-10"
                disabled={busy !== null}
                onClick={() => run('freeze', () => freezeCompetition(comp.id), 'Frozen. The leaderboard is locked and snapshotted.')}
              >
                {spinner('freeze')}
                <Snowflake className="size-4" />
                Freeze leaderboard
              </Button>
            ) : null}
            {superadmin && closedish && comp.winner_method === 'draw' ? (
              <Button
                type="button"
                className="h-10"
                disabled={busy !== null}
                onClick={() => {
                  if (window.confirm('Run the draw now? Winners are picked at random from every entry, and it cannot be run again.')) {
                    void run('draw', () => runDraw(comp.id), 'Draw complete. Validate the winners below.')
                  }
                }}
              >
                {spinner('draw')}
                <Trophy className="size-4" />
                Run the draw
              </Button>
            ) : null}
            {superadmin && ((status === 'frozen' && !chance) || (closedish && comp.winner_method === 'instant')) ? (
              <Button
                type="button"
                className="h-10"
                disabled={busy !== null}
                onClick={() =>
                  run('finalise', () => finaliseCompetition(comp.id), 'Finalised. Validate the winners below.')
                }
              >
                {spinner('finalise')}
                <Trophy className="size-4" />
                Finalise &amp; declare winners
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                type="button"
                variant="destructive"
                className="h-10"
                disabled={busy !== null}
                onClick={() => setCancelOpen(true)}
              >
                <Ban className="size-4" />
                Cancel competition
              </Button>
            ) : null}
          </div>
          {status === 'draft' && comp.schedule_blockers.length > 0 ? (
            <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-amber-800">
              {comp.schedule_blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            {status === 'draft' &&
              'Scheduling checks that competitions are enabled in the country, the rules are published and the funded reserve covers the most the prize can reach. Publishing posts the starting prize to the ledger.'}
            {status === 'paused' && 'Paused: new plays are refused. Plays already started can still be finished and scored.'}
            {status === 'scheduled' && 'It opens automatically at its start time.'}
            {status === 'live' && 'Scores are coming in. It closes automatically at its end time.'}
            {status === 'closed' && !chance && 'Freeze to lock the board, then clear the review queue and finalise.'}
            {closedish && comp.winner_method === 'draw' && 'Run the draw to pick the winners at random from every entry.'}
            {closedish && comp.winner_method === 'instant' &&
              (winners.length > 0
                ? 'A play won the prize. Finalise, then validate the winner.'
                : 'No play won before the round closed. Finalising releases the prize.')}
            {status === 'frozen' &&
              'Finalising replays the leading scores again, skips ineligible players and refuses ties at the prize cutoff.'}
            {status === 'finalised' && 'Validate each winner to open their 14-day claim window, then record the payout.'}
          </p>
        </Panel>

        {analytics && status !== 'draft' ? <RiskPanel analytics={analytics} /> : null}

        {status !== 'draft' ? (
          <LedgerPanel
            comp={comp}
            ledger={ledger}
            busy={busy !== null}
            onAdjust={
              superadmin && ['scheduled', 'live', 'paused', 'closed', 'frozen'].includes(status)
                ? () => setAdjustOpen(true)
                : undefined
            }
            onReconcile={() =>
              run('reconcile', () => reconcilePrize(comp.id), 'Reconciliation finished — see the ledger for the result.')
            }
          />
        ) : null}

        <PlaysPanel comp={comp} plays={plays} onVoid={superadmin ? setVoiding : undefined} />

        {draw ? <DrawPanel draw={draw} /> : null}

        {queue.length > 0 ? (
          <Panel title={`Review queue (${queue.length})`} icon={<ShieldAlert className="size-5 text-amber-600" />}>
            <div className="space-y-2">
              {queue.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-medium">{s.display_name || s.customer_id}</p>
                    <p className="truncate text-xs text-muted-foreground" title={s.review_reason}>
                      {s.review_reason || 'Awaiting review'}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatScore(s.score)}</p>
                  <p className="text-xs text-muted-foreground">{formatPlayTime(s.duration_ms)}</p>
                  <div className="ml-auto flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8"
                      disabled={busy !== null}
                      onClick={() => run(`accept-${s.id}`, () => reviewSubmission(comp.id, s.id, 'accepted'), 'Score accepted.')}
                    >
                      <Check className="size-3.5" />
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="h-8"
                      disabled={busy !== null}
                      onClick={() => setRejecting(s)}
                    >
                      <X className="size-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {winners.length > 0 ? (
          <Panel title="Winners" icon={<Crown className="size-5 text-amber-500" />}>
            <div className="space-y-2">
              {winners.map((w) => {
                const claim = w.claim
                const expired = claim?.status === 'pending' && new Date(claim.claim_deadline_at) < new Date()
                return (
                  <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                      #{w.prize_position}
                    </span>
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate font-medium">
                        {w.display_name || w.customer_id}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          rank {w.rank} · {w.country_name}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatScore(w.score)} in {formatPlayTime(w.duration_ms)}
                        {w.status_reason ? ` · ${w.status_reason}` : ''}
                      </p>
                    </div>
                    <StatusPill tone={winnerTone(w.status)}>{scoreStatusLabel(w.status)}</StatusPill>
                    {comp.prize_type === 'points' ? (
                      <StatusPill tone={w.status === 'validated' ? 'good' : 'info'}>
                        {(comp.prize_points ?? 0).toLocaleString()} pts ·{' '}
                        {w.status === 'validated' ? 'credited' : 'on validation'}
                      </StatusPill>
                    ) : w.prize_value_cents !== undefined ? (
                      <StatusPill tone={w.settlement_status === 'settled' ? 'good' : 'info'}>
                        {prizeMoney(w.prize_value_cents, comp.prize_currency)} ·{' '}
                        {w.settlement_status === 'settled' ? 'paid' : w.settlement_status === 'pending' ? 'unpaid' : 'n/a'}
                      </StatusPill>
                    ) : null}
                    {claim ? (
                      <StatusPill tone={claim.status === 'fulfilled' ? 'good' : expired ? 'bad' : 'info'}>
                        Claim {expired ? 'expired' : claim.status} · due {formatDate(claim.claim_deadline_at)}
                      </StatusPill>
                    ) : null}
                    <div className={cn('ml-auto flex flex-wrap gap-2', !superadmin && 'hidden')}>
                      {w.status === 'pending_validation' ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          disabled={busy !== null}
                          onClick={() => run(`validate-${w.id}`, () => validateWinner(comp.id, w.id), 'Winner validated. Their 14-day claim window is open.')}
                        >
                          <Check className="size-3.5" />
                          Validate
                        </Button>
                      ) : null}
                      {claim?.status === 'claimed' ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          disabled={busy !== null}
                          onClick={() => run(`verify-${claim.id}`, () => verifyClaim(comp.id, claim.id), 'Claim verified.')}
                        >
                          Verify claim
                        </Button>
                      ) : null}
                      {claim?.status === 'verified' ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          disabled={busy !== null}
                          onClick={() => run(`fulfil-${claim.id}`, () => fulfilClaim(comp.id, claim.id), 'Prize marked as delivered.')}
                        >
                          Mark delivered
                        </Button>
                      ) : null}
                      {w.status === 'validated' && expired ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={busy !== null}
                          onClick={() =>
                            run(`unclaimed-${w.id}`, () => markWinnerUnclaimed(comp.id, w.id), 'Marked unclaimed. The prize passed to the next eligible player.')
                          }
                        >
                          Mark unclaimed
                        </Button>
                      ) : null}
                      {(w.status === 'pending_validation' || w.status === 'validated') && w.settlement_status !== 'settled' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="h-8"
                          disabled={busy !== null}
                          onClick={() => setDisqualifying(w)}
                        >
                          Disqualify
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
        ) : null}

        {chance ? null : (
        <Panel title="Leaderboard" icon={<Trophy className="size-5 text-primary" />}>
          {board.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No scores yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                    <th className="py-2 pr-4 font-medium">Rank</th>
                    <th className="py-2 pr-4 font-medium">Player</th>
                    <th className="py-2 pr-4 text-right font-medium">Score</th>
                    <th className="py-2 pr-4 text-right font-medium">Time</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Achieved</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((row) => (
                    <tr key={`${row.rank}-${row.customer_id}`} className="border-b border-border/30 last:border-0">
                      <td className="py-2.5 pr-4 font-semibold">{row.rank}</td>
                      <td className="py-2.5 pr-4">
                        <p className="font-medium">{row.display_name || 'Player'}</p>
                        <p className="text-xs text-muted-foreground">{row.country_name}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">{formatScore(row.score)}</td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground tabular-nums">
                        {formatPlayTime(row.duration_ms)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <StatusPill tone={scoreStatusTone(row.validation_status)}>
                          {scoreStatusLabel(row.validation_status)}
                        </StatusPill>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{formatDate(row.achieved_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        )}
      </div>

      <CompetitionDialog
        open={editing}
        onOpenChange={setEditing}
        title="Edit competition"
        description="Saving returns it to draft, so every publishing check runs again."
      >
        <CompetitionForm initial={comp} games={games} countries={countries} submitLabel="Save changes" onSubmit={saveEdit} />
      </CompetitionDialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this competition?</DialogTitle>
            <DialogDescription>
              Only the permitted reasons apply. Every attempt is voided and no winner is declared. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <select
              aria-label="Reason"
              className={selectClassName}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value as CancelReason)}
            >
              {CANCEL_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <textarea
              className={textareaClassName}
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder="Note for the record (optional)"
              aria-label="Note"
            />
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
              disabled={busy !== null}
              onClick={async () => {
                setCancelOpen(false)
                await run('cancel', () => cancelCompetition(comp.id, cancelReason, cancelNote.trim()), 'Competition cancelled.')
              }}
            >
              Cancel competition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdjustPrizeDialog comp={comp} open={adjustOpen} onOpenChange={setAdjustOpen} onDone={done} />
      <VoidPlayDialog comp={comp} play={voiding} onOpenChange={(open) => !open && setVoiding(null)} onDone={done} />
      <SettleDialog comp={comp} open={settleOpen} onOpenChange={setSettleOpen} onDone={done} />
      <DuplicateDialog
        comp={comp}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        onCreated={(created) => navigate(`/admin/competitions/${created.id}`)}
      />

      <ReasonDialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) setRejecting(null)
        }}
        title="Reject this score?"
        description={rejecting ? `${formatScore(rejecting.score)} by ${rejecting.display_name || 'this player'} will not count.` : ''}
        confirmLabel="Reject score"
        onConfirm={async (reason) => {
          const target = rejecting
          if (!target) return
          await reviewSubmission(comp.id, target.id, 'rejected', reason)
          setNotice('Score rejected.')
          await load()
        }}
      />

      <ReasonDialog
        open={disqualifying !== null}
        onOpenChange={(open) => {
          if (!open) setDisqualifying(null)
        }}
        title="Disqualify this winner?"
        description="The prize passes to the next eligible player on the final leaderboard — never a random pick."
        confirmLabel="Disqualify"
        onConfirm={async (reason) => {
          const target = disqualifying
          if (!target) return
          await disqualifyWinner(comp.id, target.id, reason)
          setNotice('Winner disqualified. The prize passed to the next eligible player.')
          await load()
        }}
      />
    </>
  )
}
