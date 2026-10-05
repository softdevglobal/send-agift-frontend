import { CalendarClock, ExternalLink, LoaderCircle, Pencil, Send, Trophy, Users, X } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import {
  getAdminCompetition,
  scheduleCompetition,
  updateCompetition,
  type AdminCompetition,
  type CompetitionInput,
} from '@/api/competitions'
import type { AdminGameSummary } from '@/api/games'
import type { Country } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { formatDate } from '@/features/admin'
import { CompetitionForm } from '@/features/admin/competition-form'
import { ReserveCard } from '@/features/admin/competition-panels'
import {
  competitionStatusLabel,
  competitionStatusTone,
  gameGradient,
  gameLook,
} from '@/features/admin/games-format'
import { Loading, StatusPill } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { flagOf } from '@/lib/country-options'
import { isSuperAdmin } from '@/lib/auth'
import { formatPriceAmount } from '@/lib/money'

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{children}</div>
    </div>
  )
}

type CompetitionSheetProps = {
  /** The competition to show; null keeps the drawer closed. */
  id: string | null
  onClose: () => void
  /** Called after anything changes, so the list behind it can refresh. */
  onChanged: () => void
  games: AdminGameSummary[]
  countries: Country[]
}

/**
 * A competition's details in a drawer from the right, so the list stays in
 * view. It covers what is needed to get a draft out the door. The details,
 * the prize reserve, what is still blocking it, edit and publish. And links
 * to the full page for the ledger, plays, winners and payouts.
 */
export function CompetitionSheet({ id, onClose, onChanged, games, countries }: CompetitionSheetProps) {
  const [comp, setComp] = useState<AdminCompetition | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const superadmin = isSuperAdmin()

  const load = useCallback(async (competitionId: string) => {
    setComp(await getAdminCompetition(competitionId))
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setComp(null)
    setError(null)
    setNotice(null)
    setLoading(true)
    load(id)
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load the competition.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, load])

  const run = useCallback(
    async (label: string, action: () => Promise<unknown>, success: string) => {
      if (!id) return
      setBusy(label)
      setError(null)
      setNotice(null)
      try {
        await action()
        setNotice(success)
        await load(id)
        onChanged()
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setBusy(null)
      }
    },
    [id, load, onChanged],
  )

  async function saveEdit(input: CompetitionInput) {
    if (!comp) return
    await updateCompetition(comp.id, input)
    setEditing(false)
    setNotice('Saved. It is back in draft. Publish it again when ready.')
    await load(comp.id)
    onChanged()
  }

  const GameIcon = gameLook(comp?.game_slug ?? '').icon
  const status = comp?.effective_status
  const editable =
    !!comp && (comp.status === 'draft' || (comp.status === 'scheduled' && new Date(comp.starts_at) > new Date()))
  const canEdit = editable && (superadmin || comp?.status === 'draft')
  const isDraft = comp?.status === 'draft'
  const blocked = (comp?.schedule_blockers.length ?? 0) > 0

  const prize = comp
    ? comp.prize_type === 'points'
      ? `${(comp.prize_points ?? 0).toLocaleString()} points each`
      : comp.prize_currency
        ? formatPriceAmount(
            comp.final_prize_cents ?? (comp.status === 'draft' ? comp.start_prize_cents : comp.current_prize_cents),
            comp.prize_currency,
          )
        : comp.prize_description
    : ''

  return (
    <>
      <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
        <SheetContent showCloseButton={false} className="w-full gap-0 overflow-hidden p-0 sm:max-w-xl">
          {loading || !comp ? (
            <>
              <SheetTitle className="sr-only">Competition</SheetTitle>
              <SheetDescription className="sr-only">Loading the competition details.</SheetDescription>
              {error ? <FormAlert error={error} className="m-6" /> : <Loading />}
            </>
          ) : (
            <>
              <header
                className="relative shrink-0 px-6 pt-6 pb-5 text-white"
                style={{ background: gameGradient(comp.game_slug) }}
              >
                <SheetClose
                  className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30 focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </SheetClose>
                <div className="flex items-start gap-3 pr-10">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
                    <GameIcon className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="text-2xl leading-tight text-white">{comp.title}</SheetTitle>
                    <SheetDescription className="mt-0.5 text-sm text-white/85">
                      {comp.game_name} · Round {comp.round_no}
                    </SheetDescription>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {status ? (
                    <StatusPill tone={competitionStatusTone[status]} className="px-3 py-1 text-xs">
                      {competitionStatusLabel(status)}
                    </StatusPill>
                  ) : null}
                  {comp.countries.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur"
                    >
                      <span aria-hidden>{flagOf(c.iso_code)}</span>
                      {c.name}
                    </span>
                  ))}
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <FormAlert error={error} notice={notice} />

                <div className="rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 p-5 text-white shadow-md">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-white/80 uppercase">
                    <Trophy className="size-3.5" />
                    Prize
                  </p>
                  <p className="mt-1 font-display text-3xl tracking-tight">{prize}</p>
                  <p className="mt-1 text-sm text-white/90">{comp.prize_description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded-full bg-white/20 px-2.5 py-1">
                      {comp.number_of_winners} {comp.number_of_winners === 1 ? 'winner' : 'winners'}
                    </span>
                    {comp.prize_growth_enabled ? (
                      <span className="rounded-full bg-white/20 px-2.5 py-1">Grows with every play</span>
                    ) : null}
                  </div>
                </div>

                <section className="space-y-3 rounded-2xl border border-border/60 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarClock className="size-4 text-primary" />
                    Schedule
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Fact label="Opens">{formatDate(comp.starts_at)}</Fact>
                    <Fact label="Closes">{formatDate(comp.ends_at)}</Fact>
                  </div>
                  <p className="text-xs text-muted-foreground">Runs on {comp.timezone}</p>
                </section>

                <section className="space-y-3 rounded-2xl border border-border/60 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="size-4 text-primary" />
                    Players
                  </h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Fact label="Entry">
                      {comp.points_per_attempt === 0 ? 'Free' : `${comp.points_per_attempt.toLocaleString()} pts a play`}
                    </Fact>
                    <Fact label="Plays each">{comp.max_attempts_per_customer || 'No limit'}</Fact>
                    <Fact label="Plays so far">{comp.eligible_play_count.toLocaleString()}</Fact>
                    <Fact label="Scores">{comp.submissions}</Fact>
                    <Fact label="To review">{comp.under_review}</Fact>
                  </div>
                  <div className="border-t border-border/50 pt-3">
                    <Fact label="Players notified">
                      {!comp.announcement?.queued ? (
                        <span className="font-normal text-muted-foreground">
                          {isDraft ? 'Sent when it is published' : 'No players in its countries'}
                        </span>
                      ) : (
                        <>
                          {comp.announcement.sent.toLocaleString()} of {comp.announcement.queued.toLocaleString()}
                          <span className="block text-xs font-normal text-muted-foreground">
                            {[
                              comp.announcement.pending ? `${comp.announcement.pending} sending` : '',
                              comp.announcement.skipped ? `${comp.announcement.skipped} not reached` : '',
                              comp.announcement.failed ? `${comp.announcement.failed} failed` : '',
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'push notification'}
                          </span>
                        </>
                      )}
                    </Fact>
                  </div>
                </section>

                {isDraft ? (
                  <ReserveCard
                    key={comp.updated_at}
                    comp={comp}
                    editable={superadmin}
                    run={run}
                  />
                ) : comp.prize_reserve ? (
                  <ReserveCard key={comp.updated_at} comp={comp} editable={false} run={run} />
                ) : null}

                {isDraft && blocked ? (
                  <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                    <h3 className="text-sm font-semibold text-amber-900">Before it can be published</h3>
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-amber-900">
                      {comp.schedule_blockers.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {comp.official_rules ? (
                  <details className="rounded-2xl border border-border/60 px-4 py-3 text-sm">
                    <summary className="cursor-pointer font-medium">Official rules</summary>
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{comp.official_rules}</p>
                  </details>
                ) : null}
              </div>

              <footer className="shrink-0 space-y-3 border-t border-border/60 bg-card px-6 py-4">
                {isDraft && !superadmin ? (
                  <p className="text-xs text-muted-foreground">A super admin funds the reserve and publishes it.</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="ghost" className="h-10 rounded-full px-3 text-muted-foreground">
                    <Link to={`/admin/competitions/${comp.id}`}>
                      <ExternalLink className="size-4" />
                      Full page
                    </Link>
                  </Button>
                  <div className="ml-auto flex gap-2">
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-full px-4"
                        disabled={busy !== null}
                        onClick={() => setEditing(true)}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                    ) : null}
                    {isDraft ? (
                      <Button
                        type="button"
                        className="h-10 rounded-full px-5"
                        title={
                          !superadmin
                            ? 'Only a super admin can publish'
                            : blocked
                              ? 'Finish the steps listed above first'
                              : undefined
                        }
                        disabled={!superadmin || busy !== null || blocked}
                        onClick={() =>
                          run(
                            'schedule',
                            () => scheduleCompetition(comp.id),
                            `Published. Players in ${
                              comp.countries.length === 1 ? comp.countries[0].name : `${comp.countries.length} countries`
                            } are being sent a push notification, and it goes live at its start time.`,
                          )
                        }
                      >
                        {busy === 'schedule' ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        Publish
                      </Button>
                    ) : null}
                  </div>
                </div>
              </footer>
            </>
          )}
        </SheetContent>
      </Sheet>

      {comp ? (
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
      ) : null}
    </>
  )
}
