import { useCallback, useEffect, useState } from 'react'
import { Clock, Gift, Hourglass, LoaderCircle, Lock, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  cancelEntry,
  getCompetitionPoints,
  getEligibility,
  refusalOf,
  type CPWallet,
  type Decision,
  type LotSource,
} from '@/api/competition-points'
import { FormAlert } from '@/components/common/form-alert'
import { Sparkle } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import { AvailabilityNotice } from '@/features/competition-points/availability-notice'
import { formatDate, formatDateTime, SOURCE_LABEL } from '@/features/competition-points/format'
import { CustomerPageHeader } from '@/features/customer-commerce'
import { customerPanelClass } from '@/features/customer-commerce/customer-styles'
import { formatPoints } from '@/features/points/format'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Competition points: what can be spent now, what is held for an entry,
 * what is pending on gifts not yet delivered, and where each point came
 * from. Separate from "My points".
 */
export function CustomerCompetitionPointsPage() {
  const [wallet, setWallet] = useState<CPWallet | null>(null)
  const [entry, setEntry] = useState<Decision | null>(null)
  const [earning, setEarning] = useState<Decision | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [w, e] = await Promise.all([getCompetitionPoints(), getEligibility()])
      setWallet(w)
      setEntry(e.decisions.find((d) => d.operation === 'competition_entry') ?? null)
      setEarning(e.decisions.find((d) => d.operation === 'gift_points_earning') ?? null)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your competition points.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function release(competitionId: string, entryId: string) {
    setBusy(entryId)
    setError(null)
    try {
      await cancelEntry(competitionId, entryId)
      setNotice('Your entry was cancelled and its points returned.')
      await load()
    } catch (err) {
      setError(refusalOf(err)?.message ?? getErrorMessage(err, 'Could not cancel the entry.'))
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sources = Object.entries(wallet?.by_source ?? {}).filter(([, n]) => (n ?? 0) > 0) as [LotSource, number][]

  return (
    <>
      <CustomerPageHeader
        title="Competition points"
        description="Earned from completed gifts and your member bonus, and spent on skill competitions. These are separate from My points."
        action={
          <Button asChild className="h-10 px-4">
            <Link to="/competitions">
              <Trophy className="size-4" />
              Competitions
            </Link>
          </Button>
        }
      />
      <FormAlert error={error} notice={notice} className="mb-4" />

      {earning && !earning.allowed ? (
        <AvailabilityNotice
          className="mb-4"
          code={earning.reason_code}
          message={`Gifts don't earn competition points in your country yet. ${earning.message}`}
          nextAction="shop"
        />
      ) : null}

      {wallet ? (
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-ink px-6 py-7 text-white sm:px-8">
            <Sparkle className="absolute top-6 right-[22%] size-6 text-brand-teal" />
            <p className="text-[11px] font-semibold tracking-[0.18em] text-white/55 uppercase">Available now</p>
            <p className="mt-2 flex items-baseline gap-3 font-poster text-6xl">
              {formatPoints(wallet.available)}
              <span className="font-sans text-sm font-bold tracking-[0.16em] text-white/60 uppercase">
                competition points
              </span>
            </p>
            <p className="mt-2 text-sm text-white/60">
              Each competition says which kinds of points it accepts, so not every point may be usable for every
              competition.
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <Tile icon={Lock} label="Held for entries" value={wallet.reserved} hint="Returned if an attempt doesn't start" />
            <Tile icon={Hourglass} label="Pending" value={wallet.pending} hint="Unlocks when your gifts are delivered" />
            <Tile icon={Clock} label="Expiring in 30 days" value={wallet.expiring_soon} hint="Used first when you enter" />
          </section>

          {sources.length > 0 ? (
            <section className={cn(customerPanelClass, 'px-5 py-4')}>
              <h2 className="font-poster text-xl">Where your points came from</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {sources.map(([source, n]) => (
                  <span key={source} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold">
                    {SOURCE_LABEL[source]}: {formatPoints(n)}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {entry && !entry.allowed ? (
            <AvailabilityNotice code={entry.reason_code} message={entry.message} nextAction={entry.next_action} />
          ) : null}

          {wallet.open_entries.length > 0 ? (
            <section className={cn(customerPanelClass, 'divide-y divide-brand-ink/10')}>
              <h2 className="px-5 py-4 font-poster text-xl">Held entries</h2>
              {wallet.open_entries.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{e.competition_title}</p>
                    <p className="text-muted-foreground">
                      {formatPoints(e.cost)} points ·{' '}
                      {e.state === 'uncertain'
                        ? 'We are confirming whether this attempt started. Your points stay reserved meanwhile.'
                        : `held until ${formatDateTime(e.hold_expires_at)}`}
                    </p>
                  </div>
                  {e.state === 'reserved' ? (
                    <div className="flex gap-2">
                      <Button asChild className="h-9 px-3">
                        <Link to={`/competitions/${e.competition_id}`}>Play</Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 px-3"
                        disabled={busy === e.id}
                        onClick={() => release(e.competition_id, e.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}

          {wallet.pending_gifts.length > 0 ? (
            <section className={cn(customerPanelClass, 'divide-y divide-brand-ink/10')}>
              <h2 className="px-5 py-4 font-poster text-xl">Gifts on their way</h2>
              {wallet.pending_gifts.map((g) => (
                <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="flex items-center gap-2">
                    <Gift className="size-4 text-brand-teal" />
                    Order {g.order_number}
                  </span>
                  <span className="text-muted-foreground">
                    {g.status === 'review'
                      ? 'Being reviewed by our team'
                      : `${formatPoints(g.base_points)} points when delivered`}
                  </span>
                </div>
              ))}
            </section>
          ) : null}

          <section className={cn(customerPanelClass, 'divide-y divide-brand-ink/10')}>
            <h2 className="px-5 py-4 font-poster text-xl">Activity</h2>
            {wallet.activity.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No activity yet. Send a gift: once it's delivered, its points appear here.
              </p>
            ) : (
              wallet.activity.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{a.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(a.created_at)}
                      {a.source ? ` · ${SOURCE_LABEL[a.source]}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'font-poster text-lg',
                      a.delta > 0 ? 'text-emerald-600' : a.delta < 0 ? 'text-brand-ink' : 'text-muted-foreground',
                    )}
                  >
                    {a.delta > 0 ? '+' : a.delta < 0 ? '−' : ''}
                    {formatPoints(Math.abs(a.delta || a.amount))}
                  </span>
                </div>
              ))
            )}
          </section>

          {wallet.lots.some((l) => l.expires_at) ? (
            <p className="text-xs text-muted-foreground">
              Points expire on the date shown when they were granted, for example{' '}
              {formatDate(wallet.lots.find((l) => l.expires_at)?.expires_at)}. Expiring points are used first.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

function Tile({ icon: Icon, label, value, hint }: { icon: typeof Lock; label: string; value: number; hint: string }) {
  return (
    <div className={cn(customerPanelClass, 'px-4 py-4')}>
      <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-2 font-poster text-3xl">{formatPoints(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
