import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  Check,
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
import { Link, useParams } from 'react-router-dom'

import {
  CANCEL_REASONS,
  cancelCompetition,
  disqualifyWinner,
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
  type CancelReason,
  type CompetitionInput,
  type CompetitionLeaderRow,
  type CompetitionStatus,
  type CompetitionWinner,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AdminPageHeader, adminPanelClass, formatDate } from '@/features/admin'
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
  const current = lifecycle.indexOf(status)
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
          {competitionStatusLabel(step)}
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
    if (comp.prize_value_amount !== undefined && comp.prize_currency) {
      return String(minorToMajor(comp.prize_value_amount, comp.prize_currency))
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
        The prize must be held before the competition opens — funded by SendAgift or an approved sponsor, never by
        points or entries.
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

  const load = useCallback(async () => {
    const c = await getAdminCompetition(id)
    setComp(c)
    const [b, q, w] = await Promise.all([getCompetitionLeaderboard(id), getReviewQueue(id), listWinners(id)])
    setBoard(b)
    setQueue(q)
    setWinners(w)
  }, [id])

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
  const canCancel = status !== 'finalised' && status !== 'cancelled'
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
            editable ? (
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" />
                Edit
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Rules are locked once it starts</span>
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
                  {comp.prize_value_amount !== undefined && comp.prize_currency ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {formatPriceAmount(comp.prize_value_amount, comp.prize_currency)} ·{' '}
                      {comp.number_of_winners} {comp.number_of_winners === 1 ? 'winner' : 'winners'}
                    </span>
                  ) : null}
                </>
              }
            />
            <Fact
              label="Entry"
              value={
                <>
                  {comp.max_attempts_per_customer} attempts · {comp.points_per_attempt} pts each
                  <span className="block text-xs font-normal text-muted-foreground">
                    {comp.min_age}+{comp.requires_identity_verification ? ', ID verified' : ''} · {comp.timezone}
                  </span>
                </>
              }
            />
            <Fact label="Attempts" value={comp.attempts} />
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

        {status !== 'cancelled' && (editable || comp.prize_reserve) ? (
          <ReserveCard key={comp.updated_at} comp={comp} editable={editable} run={run} />
        ) : null}

        <Panel title="Actions" icon={<Gavel className="size-5 text-primary" />}>
          <div className="flex flex-wrap gap-2">
            {comp.status === 'draft' ? (
              <Button
                type="button"
                className="h-10"
                disabled={busy !== null}
                onClick={() => run('schedule', () => scheduleCompetition(comp.id), 'Scheduled. It goes live at its start time.')}
              >
                {spinner('schedule')}
                <CalendarClock className="size-4" />
                Schedule
              </Button>
            ) : null}
            {status === 'closed' ? (
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
            {status === 'frozen' ? (
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
          <p className="mt-3 text-xs text-muted-foreground">
            {status === 'draft' &&
              'Scheduling checks that competitions are enabled in the country, the rules are published and the funded reserve covers the prize.'}
            {status === 'scheduled' && 'It opens automatically at its start time.'}
            {status === 'live' && 'Scores are coming in. It closes automatically at its end time.'}
            {status === 'closed' && 'Freeze to lock the board, then clear the review queue and finalise.'}
            {status === 'frozen' &&
              'Finalising replays the leading scores again, skips ineligible players and refuses ties at the prize cutoff.'}
            {status === 'finalised' && 'Validate each winner to open their 14-day claim window.'}
          </p>
        </Panel>

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
                    {claim ? (
                      <StatusPill tone={claim.status === 'fulfilled' ? 'good' : expired ? 'bad' : 'info'}>
                        Claim {expired ? 'expired' : claim.status} · due {formatDate(claim.claim_deadline_at)}
                      </StatusPill>
                    ) : null}
                    <div className="ml-auto flex flex-wrap gap-2">
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
                      {w.status === 'pending_validation' || w.status === 'validated' ? (
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
      </div>

      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Edit competition</SheetTitle>
            <SheetDescription>Saving returns it to draft, so every publishing check runs again.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <CompetitionForm initial={comp} games={games} countries={countries} submitLabel="Save changes" onSubmit={saveEdit} />
          </div>
        </SheetContent>
      </Sheet>

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
