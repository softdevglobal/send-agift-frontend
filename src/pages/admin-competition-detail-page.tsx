import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Ban,
  CalendarClock,
  Check,
  Pause,
  Play,
  Square,
  Crown,
  Gavel,
  LoaderCircle,
  ShieldAlert,
  Snowflake,
  Trophy,
  Wallet,
  X,
  Send,
} from 'lucide-react'
import { useParams } from 'react-router-dom'

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
  getAdminCompetition,
  getCompetitionLeaderboard,
  getReviewQueue,
  listWinners,
  markWinnerUnclaimed,
  reviewSubmission,
  scheduleCompetition,
  updateCompetition,
  validateWinner,
  verifyClaim,
  type AdminCompetition,
  type AdminPlay,
  type CancelReason,
  type CompetitionAnalytics,
  type CompetitionInput,
  type CompetitionLeaderRow,
  type CompetitionWinner,
  type PrizeDraw,
  type PrizeLedgerView,
  type ScoreSubmission,
} from '@/api/competitions'
import { listCountries } from '@/api/countries'
import { listAdminGames, type AdminGameSummary } from '@/api/games'
import type { Country } from '@/api/types'
import { BackLink } from '@/components/common/back-link'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
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
import { formatDate } from '@/features/admin'
import { CompetitionForm } from '@/features/admin/competition-form'
import { CompetitionHero, CompetitionStats, LeaderPodium, LifecycleTrack } from '@/features/admin/competition-hero'
import { Panel, ReserveCard } from '@/features/admin/competition-panels'
import {
  formatPlayTime,
  formatScore,
  scoreStatusLabel,
  scoreStatusTone,
} from '@/features/admin/games-format'
import { Loading, ReasonDialog, StatusPill } from '@/features/admin/games-ui'
import {
  AdjustPrizeDialog,
  DrawPanel,
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

import { cn } from '@/lib/utils'

type DetailTab = 'leaderboard' | 'winners' | 'setup' | 'money' | 'plays'

const detailTabs: { id: DetailTab; label: string }[] = [
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'winners', label: 'Winners & review' },
  { id: 'setup', label: 'Setup & actions' },
  { id: 'money', label: 'Prize & money' },
  { id: 'plays', label: 'Plays' },
]

function EmptyTab({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-brand-ink/20 px-6 py-12 text-center">
      <p className="font-poster text-xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
    </div>
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

function winnerTone(status: CompetitionWinner['status']) {
  if (status === 'validated') return 'good' as const
  if (status === 'pending_validation') return 'warn' as const
  return 'bad' as const
}

/** Superadmin: one competition end to end. Setup, operations, review, winners. */
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
  const [tabChoice, setTab] = useState<DetailTab | null>(null)
  const [editing, setEditing] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState<CancelReason>('technical_failure')
  const [cancelNote, setCancelNote] = useState('')
  const [rejecting, setRejecting] = useState<ScoreSubmission | null>(null)
  /** The lifecycle step waiting on "are you sure". */
  const [confirming, setConfirming] = useState<{
    key: string
    title: string
    description: string
    confirmLabel: string
    tone: 'danger' | 'default'
    action: () => Promise<unknown>
    success: string
  } | null>(null)
  const [disqualifying, setDisqualifying] = useState<CompetitionWinner | null>(null)
  const [analytics, setAnalytics] = useState<CompetitionAnalytics | null>(null)
  const [ledger, setLedger] = useState<PrizeLedgerView | null>(null)
  const [plays, setPlays] = useState<AdminPlay[]>([])
  const [draw, setDraw] = useState<PrizeDraw | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [settleOpen, setSettleOpen] = useState(false)
  const [voiding, setVoiding] = useState<AdminPlay | null>(null)
  const superadmin = isSuperAdmin()
  const queuePages = usePagedList(queue, TABLE_PAGE_SIZE, id)
  const winnerPages = usePagedList(winners, TABLE_PAGE_SIZE, id)
  const boardPages = usePagedList(board.slice(3), TABLE_PAGE_SIZE, id)

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
    setNotice('Saved. The competition is back in draft. Schedule it again when ready.')
    await load()
  }

  const tab: DetailTab = tabChoice ?? (comp.status === 'draft' || chance ? 'setup' : 'leaderboard')

  return (
    <>
      <BackLink to="/admin/competitions" label="All competitions" className="mb-4" />

      <CompetitionHero
        comp={comp}
        status={status}
        livePrizeCents={live?.current_prize_cents}
        // Any admin edits a draft; a published one is a superadmin's call.
        onEdit={editable && (superadmin || comp.status === 'draft') ? () => setEditing(true) : undefined}
        editNote={editable ? 'Only a superadmin can edit it now' : 'Rules are locked once it starts'}
      />

      <FormAlert error={error} notice={notice} className="mb-5" />

      {status === 'cancelled' ? (
        <div className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-800 ring-1 ring-red-200">
          Cancelled {formatDate(comp.cancelled_at)} , {' '}
          {CANCEL_REASONS.find((r) => r.value === comp.cancel_reason)?.label ?? comp.cancel_reason}.
          {comp.cancel_note ? ` ${comp.cancel_note}` : ''} Every attempt was voided and no winner will be declared.
        </div>
      ) : (
        <LifecycleTrack status={status} />
      )}

      <CompetitionStats comp={comp} livePlays={live?.eligible_play_count} />

      {/* One area at a time, so the page reads as sections, not one long scroll. */}
      <div className="sticky top-16 z-20 -mx-1 mb-5 overflow-x-auto bg-background/95 px-1 py-2 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-fit gap-1 rounded-lg bg-accent p-1">
          {detailTabs
            .filter((item) => !(chance && item.id === 'leaderboard'))
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-bold tracking-[0.08em] whitespace-nowrap uppercase transition-colors',
                  tab === item.id ? 'bg-brand-ink text-white' : 'text-brand-ink/60 hover:text-brand-ink',
                )}
              >
                {item.label}
                {item.id === 'winners' && queue.length > 0 ? (
                  <span className="rounded-sm bg-amber-300 px-1 text-[10px] text-amber-950">{queue.length}</span>
                ) : null}
              </button>
            ))}
        </div>
      </div>

      <div className="grid gap-4">
        {tab === 'setup' ? (
          <>
        <Panel title="Setup" icon={<CalendarClock className="size-5 text-sky-600" />}>
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
                  {comp.max_attempts_per_customer ? `${comp.max_attempts_per_customer} plays` : 'No play limit'} ·{' '}
                  {comp.points_per_attempt} pts each
                  <span className="block text-xs font-normal text-muted-foreground">
                    {comp.daily_play_limit ? `${comp.daily_play_limit}/day · ` : ''}
                    {comp.min_plays_to_win ? `${comp.min_plays_to_win} to win · ` : ''}
                    {comp.timezone}
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
            <Fact label="Game version" value={`${comp.game_name} v${comp.game_version}`} />
          </div>
          {comp.official_rules ? (
            <details className="mt-5 rounded-xl bg-muted/40 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium">Official rules</summary>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{comp.official_rules}</p>
            </details>
          ) : (
            <p className="mt-5 text-sm text-amber-700">No official rules yet. They must be published before scheduling.</p>
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
                onClick={() =>
                  setConfirming({
                    key: 'pause',
                    title: 'Pause this competition?',
                    description: 'New plays are refused until you resume it. Plays already started can finish.',
                    confirmLabel: 'Pause',
                    tone: 'default',
                    action: () => pauseCompetition(comp.id),
                    success: 'Paused. New plays are refused; plays already started can finish.',
                  })
                }
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
                onClick={() =>
                  setConfirming({
                    key: 'close',
                    title: 'Close this round now?',
                    description: 'No new plays will be accepted, and the prize is fixed at its current amount. This cannot be undone.',
                    confirmLabel: 'Close now',
                    tone: 'danger',
                    action: () => closeCompetition(comp.id),
                    success: 'Closed. The prize is fixed at its current amount.',
                  })
                }
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
            {comp.status === 'draft' ? (
              <Button
                type="button"
                className="h-10"
                title={
                  !superadmin
                    ? 'Only a super admin can publish'
                    : comp.schedule_blockers.length > 0
                      ? 'Finish the steps listed below first'
                      : undefined
                }
                disabled={!superadmin || busy !== null || comp.schedule_blockers.length > 0}
                onClick={() =>
                  setConfirming({
                    key: 'schedule',
                    title: 'Publish this competition?',
                    description: `Players in ${comp.countries.length === 1 ? comp.countries[0].name : `${comp.countries.length} countries`} get a push notification straight away, and it goes live at its start time.`,
                    confirmLabel: 'Publish',
                    tone: 'default',
                    action: () => scheduleCompetition(comp.id),
                    success: `Published. Players in ${comp.countries.length === 1 ? comp.countries[0].name : `${comp.countries.length} countries`} are being sent a push notification, and it goes live at its start time.`,
                  })
                }
              >
                {spinner('schedule')}
                <Send className="size-4" />
                Publish
              </Button>
            ) : null}
            {status === 'closed' && !chance ? (
              <Button
                type="button"
                className="h-10"
                disabled={busy !== null}
                onClick={() =>
                  setConfirming({
                    key: 'freeze',
                    title: 'Freeze the leaderboard?',
                    description: 'The leaderboard is locked and snapshotted. Scores can no longer change after this.',
                    confirmLabel: 'Freeze',
                    tone: 'danger',
                    action: () => freezeCompetition(comp.id),
                    success: 'Frozen. The leaderboard is locked and snapshotted.',
                  })
                }
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
                onClick={() =>
                  setConfirming({
                    key: 'draw',
                    title: 'Run the draw now?',
                    description: 'Winners are picked at random from every entry. The draw cannot be run again.',
                    confirmLabel: 'Run the draw',
                    tone: 'danger',
                    action: () => runDraw(comp.id),
                    success: 'Draw complete. Validate the winners below.',
                  })
                }
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
                  setConfirming({
                    key: 'finalise',
                    title: 'Finalise and declare winners?',
                    description: 'The results become final and winners are declared. You will validate each winner next.',
                    confirmLabel: 'Finalise',
                    tone: 'danger',
                    action: () => finaliseCompetition(comp.id),
                    success: 'Finalised. Validate the winners below.',
                  })
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
              <li className="list-none -ml-5 font-medium">Before it can be published:</li>
              {comp.schedule_blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            {status === 'draft' &&
              'Publishing checks that competitions are enabled in every chosen country, the rules are written and the funded reserve covers the most the prize can reach. It then sends a push notification to every player in those countries.'}
            {status === 'draft' && !superadmin && ' A super admin funds the reserve and publishes it.'}
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

          </>
        ) : null}

        {tab === 'money' ? (
          <>
        {status === 'draft' ? (
          <EmptyTab
            title="No money moves yet"
            text="The prize ledger starts once the competition is published. Fund the reserve under Setup & actions."
          />
        ) : null}
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
              run('reconcile', () => reconcilePrize(comp.id), 'Reconciliation finished. See the ledger for the result.')
            }
          />
        ) : null}

          </>
        ) : null}

        {tab === 'plays' ? (
          <>
        <PlaysPanel comp={comp} plays={plays} onVoid={superadmin ? setVoiding : undefined} />

        {draw ? <DrawPanel draw={draw} /> : null}

          </>
        ) : null}

        {tab === 'winners' ? (
          <>
        {queue.length === 0 && winners.length === 0 ? (
          <EmptyTab
            title="No winners yet"
            text="Winners appear here once the round is finalised or the draw is run. Scores waiting for review show here too."
          />
        ) : null}
        {queue.length > 0 ? (
          <Panel title={`Review queue (${queue.length})`} icon={<ShieldAlert className="size-5 text-amber-600" />}>
            <div className="space-y-2">
              {queuePages.visible.map((s) => (
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
            <PageNav
              page={queuePages.page}
              pageCount={queuePages.pageCount}
              onPage={queuePages.setPage}
              label="Review queue pages"
              scroll={false}
            />
          </Panel>
        ) : null}

        {winners.length > 0 ? (
          <Panel title="Winners" icon={<Crown className="size-5 text-amber-500" />}>
            <div className="space-y-2">
              {winnerPages.visible.map((w) => {
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
            <PageNav
              page={winnerPages.page}
              pageCount={winnerPages.pageCount}
              onPage={winnerPages.setPage}
              label="Winner pages"
              scroll={false}
            />
          </Panel>
        ) : null}

          </>
        ) : null}

        {tab === 'leaderboard' && !chance ? (
        <Panel
          title="Leaderboard"
          icon={<Trophy className="size-5 text-amber-500" />}
          action={board.length ? <span className="text-xs text-muted-foreground">{board.length} ranked</span> : undefined}
        >
          {board.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-orange-500 text-white shadow-md">
                <Trophy className="size-7" />
              </span>
              <p className="font-medium">No scores yet</p>
              <p className="text-sm text-muted-foreground">The first verified score takes the top spot.</p>
            </div>
          ) : (
            <>
            <LeaderPodium rows={board.slice(0, 3)} />
            {board.length > 3 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
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
                  {boardPages.visible.map((row) => (
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
            ) : null}
            <PageNav
              page={boardPages.page}
              pageCount={boardPages.pageCount}
              onPage={boardPages.setPage}
              label="Leaderboard pages"
              scroll={false}
            />
            </>
          )}
        </Panel>
        ) : null}
      </div>

      <CompetitionForm
        open={editing}
        onOpenChange={setEditing}
        title="Edit competition"
        description="Saving returns it to draft, so every publishing check runs again."
        initial={comp}
        games={games}
        countries={countries}
        submitLabel="Save changes"
        onSubmit={saveEdit}
      />

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

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null)
        }}
        title={confirming?.title ?? ''}
        description={confirming?.description ?? ''}
        confirmLabel={confirming?.confirmLabel ?? 'Confirm'}
        tone={confirming?.tone}
        busy={confirming !== null && busy === confirming.key}
        onConfirm={() => {
          if (!confirming) return
          const step = confirming
          void run(step.key, step.action, step.success).then(() => setConfirming(null))
        }}
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
        description="The prize passes to the next eligible player on the final leaderboard. Never a random pick."
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
