import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, LogIn, ScrollText, ShieldCheck, Ticket, Trophy } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'

import {
  cancelEntry,
  getCompetitionPoints,
  getEntryQuote,
  getPublicCompetition,
  refusalOf,
  reserveEntry,
  startEntry,
  submitMoves,
  type AttemptStart,
  type CPEntry,
  type EntryQuote,
  type PublicCompetition,
  type Refusal,
  type ScoreResult,
} from '@/api/competition-points'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/features/auth/auth-context'
import { AvailabilityNotice } from '@/features/competition-points/availability-notice'
import { Board2048 } from '@/features/competition-points/board-2048'
import { formatDateTime, formatMoney, newRequestKey, SOURCE_LABEL } from '@/features/competition-points/format'
import type { Direction } from '@/features/competition-points/game-2048'
import { customerPanelClass } from '@/features/customer-commerce/customer-styles'
import { formatPoints } from '@/features/points/format'
import { getErrorMessage } from '@/lib/api'
import { returnToState } from '@/lib/auth'
import { cn } from '@/lib/utils'

type Stage =
  | { kind: 'review' }
  | { kind: 'held'; entry: CPEntry }
  | { kind: 'playing'; attempt: AttemptStart }
  | { kind: 'done'; result: ScoreResult }

/**
 * One competition: its rules and committed prize, then the entry. The
 * customer sees the server's quote, explicitly confirms the cost, and the
 * points are reserved; starting the attempt captures them. If the attempt
 * never starts, the hold is released.
 */
export function CompetitionEntryPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const { isAuthenticated, role } = useAuth()
  const signedIn = isAuthenticated && role === 'customer'
  const [competition, setCompetition] = useState<PublicCompetition | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPublicCompetition(id)
      .then(setCompetition)
      .catch((err) => setError(getErrorMessage(err, 'Could not load the competition.')))
  }, [id])

  if (error) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <FormAlert error={error} />
      </main>
    )
  }
  if (!competition) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-10 sm:px-6">
      <Link to="/competitions" className="text-sm font-semibold text-muted-foreground hover:text-brand-ink">
        ← All competitions
      </Link>
      <section className="rounded-[1.75rem] bg-brand-ink px-6 py-7 text-white sm:px-8">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-white/55 uppercase">
          {competition.game_name} · skill competition
        </p>
        <h1 className="mt-2 font-poster text-4xl">{competition.title}</h1>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Stat label="Committed prize now" value={formatMoney(competition.current_prize_cents, competition.prize_currency)} />
          <Stat
            label="Maximum possible prize"
            value={competition.max_prize_cents ? formatMoney(competition.max_prize_cents, competition.prize_currency) : 'Fixed'}
          />
          <Stat label="Closes" value={formatDateTime(competition.ends_at)} />
        </div>
        <p className="mt-4 text-sm text-white/70">{competition.prize_description}</p>
      </section>

      <section className={cn(customerPanelClass, 'grid gap-4 px-5 py-5 text-sm sm:grid-cols-2')}>
        <Rule icon={Ticket} label="Entry" value={`${formatPoints(competition.points_per_attempt)} competition points`} />
        <Rule
          icon={Trophy}
          label="How the winner is decided"
          value={`The highest verified score wins${competition.number_of_winners > 1 ? ` (${competition.number_of_winners} winners)` : ''}. Every entrant plays the same board.`}
        />
        <Rule
          icon={ShieldCheck}
          label="Entry limit"
          value={
            competition.max_attempts_per_customer > 0
              ? `${competition.max_attempts_per_customer} entries per person`
              : 'No limit beyond your points'
          }
        />
        <Rule icon={ScrollText} label="Open to" value={competition.countries.map((c) => c.name).join(', ')} />
        {competition.official_rules ? (
          <details className="sm:col-span-2">
            <summary className="cursor-pointer font-semibold">Official rules</summary>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{competition.official_rules}</p>
          </details>
        ) : null}
      </section>

      {signedIn ? (
        <Entry competition={competition} />
      ) : (
        <section className={cn(customerPanelClass, 'flex flex-wrap items-center justify-between gap-4 px-5 py-5')}>
          <p className="text-sm">Sign in to check whether you can enter and how many eligible points you have.</p>
          <Button asChild className="h-10 px-4">
            <Link to="/login" state={returnToState(location.pathname, location.search)}>
              <LogIn className="size-4" />
              Sign in
            </Link>
          </Button>
        </section>
      )}
    </main>
  )
}

function Entry({ competition }: { competition: PublicCompetition }) {
  const [quote, setQuote] = useState<EntryQuote | null>(null)
  const [stage, setStage] = useState<Stage>({ kind: 'review' })
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reserveKey, setReserveKey] = useState(() => newRequestKey('entry'))
  // The finished game's move log, kept until the server accepts it.
  const [unsent, setUnsent] = useState<{ sessionId: string; moves: Direction[]; score: number } | null>(null)

  const load = useCallback(async () => {
    try {
      const [q, wallet] = await Promise.all([getEntryQuote(competition.id), getCompetitionPoints()])
      setQuote(q)
      const held = wallet.open_entries.find((e) => e.competition_id === competition.id && e.state === 'reserved')
      if (held) setStage({ kind: 'held', entry: held })
    } catch (err) {
      const r = refusalOf(err)
      if (r) setRefusal(r)
      else setError(getErrorMessage(err, 'Could not check your entry.'))
    }
  }, [competition.id])

  useEffect(() => {
    void load()
  }, [load])

  function fail(err: unknown, fallback: string) {
    const r = refusalOf(err)
    if (r) setRefusal(r)
    else setError(getErrorMessage(err, fallback))
  }

  async function reserve() {
    if (!quote?.reference) return
    setBusy(true)
    setRefusal(null)
    setError(null)
    try {
      const entry = await reserveEntry(competition.id, quote.reference, reserveKey)
      setStage({ kind: 'held', entry })
    } catch (err) {
      fail(err, 'Could not reserve your entry.')
      // A refused request may be retried with a fresh quote and key.
      setReserveKey(newRequestKey('entry'))
      void load()
    } finally {
      setBusy(false)
    }
  }

  async function start(entry: CPEntry) {
    setBusy(true)
    setRefusal(null)
    setError(null)
    try {
      // The same key for every retry of this entry's start: a lost
      // response returns the attempt that already began.
      const attempt = await startEntry(competition.id, entry.id, `start-${entry.id}`)
      setStage({ kind: 'playing', attempt })
    } catch (err) {
      fail(err, 'Could not start your attempt.')
      void load()
      setStage({ kind: 'review' })
    } finally {
      setBusy(false)
    }
  }

  async function release(entry: CPEntry) {
    setBusy(true)
    try {
      await cancelEntry(competition.id, entry.id)
      setStage({ kind: 'review' })
      setConsent(false)
      await load()
    } catch (err) {
      fail(err, 'Could not cancel your entry.')
    } finally {
      setBusy(false)
    }
  }

  async function submit(sessionId: string, moves: Direction[], score: number) {
    setUnsent({ sessionId, moves, score })
    setBusy(true)
    setError(null)
    try {
      const result = await submitMoves(sessionId, moves, score)
      setUnsent(null)
      setStage({ kind: 'done', result })
    } catch (err) {
      fail(err, 'Could not submit your score. Your moves are kept; try again.')
    } finally {
      setBusy(false)
    }
  }

  if (stage.kind === 'playing') {
    const s = stage.attempt.session
    return (
      <section className={cn(customerPanelClass, 'px-5 py-6')}>
        <FormAlert error={error} className="mb-4" />
        {unsent && !busy ? (
          <div className="mb-4 flex justify-center">
            <Button className="h-10 px-4" onClick={() => void submit(unsent.sessionId, unsent.moves, unsent.score)}>
              Send my score again
            </Button>
          </div>
        ) : null}
        <Board2048
          seed={s.seed}
          config={s.config}
          expiresAt={s.expires_at}
          disabled={busy}
          onFinish={(moves, score) => void submit(s.session_id, moves, score)}
        />
      </section>
    )
  }

  if (stage.kind === 'done') {
    const r = stage.result
    return (
      <section className={cn(customerPanelClass, 'px-5 py-6 text-center')}>
        <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">Your verified score</p>
        <p className="mt-2 font-poster text-6xl">{r.score.toLocaleString()}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {r.accepted
            ? `Recorded${r.rank ? `, currently ranked ${r.rank}` : ''}. Scores are provisional until the competition closes and results are checked.`
            : 'Held for review. We check scores like this before they count.'}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button asChild variant="outline" className="h-10 px-4">
            <Link to="/account/points">My points</Link>
          </Button>
          <Button
            className="h-10 px-4"
            onClick={() => {
              setStage({ kind: 'review' })
              setConsent(false)
              setReserveKey(newRequestKey('entry'))
              void load()
            }}
          >
            Enter again
          </Button>
        </div>
      </section>
    )
  }

  if (stage.kind === 'held') {
    const e = stage.entry
    return (
      <section className={cn(customerPanelClass, 'space-y-4 px-5 py-6')}>
        {refusal ? <AvailabilityNotice code={refusal.code} message={refusal.message} nextAction={refusal.nextAction} /> : null}
        <FormAlert error={error} />
        <p className="text-sm">
          <strong>{formatPoints(e.cost)} points are reserved</strong> for this entry until{' '}
          {formatDateTime(e.hold_expires_at)}. They are spent when your attempt starts, and returned if it doesn&apos;t.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button className="h-11 px-5" disabled={busy} onClick={() => start(e)}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Trophy className="size-4" />}
            Start my attempt
          </Button>
          <Button variant="outline" className="h-11 px-5" disabled={busy} onClick={() => release(e)}>
            Cancel and return my points
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className={cn(customerPanelClass, 'space-y-4 px-5 py-6')}>
      {refusal ? <AvailabilityNotice code={refusal.code} message={refusal.message} nextAction={refusal.nextAction} /> : null}
      <FormAlert error={error} />
      {!quote ? (
        <div className="flex justify-center py-6">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Small label="Entry costs" value={`${formatPoints(quote.cost)} points`} />
            <Small label="Your eligible points" value={formatPoints(quote.eligible_balance)} />
            <Small
              label="Not usable here"
              value={quote.ineligible_balance > 0 ? formatPoints(quote.ineligible_balance) : 'None'}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This competition accepts: {quote.allowed_sources.map((s) => SOURCE_LABEL[s]).join(', ') || 'no point sources'}.
          </p>

          {!quote.can_enter ? (
            <AvailabilityNotice
              code={quote.reason_code}
              message={quote.message ?? 'You can’t enter right now.'}
              nextAction={quote.reason_code === 'INSUFFICIENT_ELIGIBLE_POINTS' ? 'send_gift' : 'view_competitions'}
            />
          ) : (
            <>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <span>
                  I agree to the official rules and to using <strong>{formatPoints(quote.cost)} competition points</strong>{' '}
                  for one entry. Points are not refunded once my attempt starts.
                </span>
              </label>
              <Button className="h-11 px-5" disabled={!consent || busy} onClick={reserve}>
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Ticket className="size-4" />}
                Reserve my entry
              </Button>
            </>
          )}
        </>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.18em] text-white/55 uppercase">{label}</p>
      <p className="mt-1 font-poster text-2xl">{value}</p>
    </div>
  )
}

function Rule({ icon: Icon, label, value }: { icon: typeof Ticket; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-violet" />
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-muted-foreground">{value}</p>
      </div>
    </div>
  )
}

function Small({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-accent/60 px-4 py-3">
      <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-poster text-xl">{value}</p>
    </div>
  )
}
