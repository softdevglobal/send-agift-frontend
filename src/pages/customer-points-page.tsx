import { useEffect, useMemo, useState } from 'react'
import { Coins, Gamepad2, Gift, LoaderCircle, Send, ShoppingBag, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getMyPoints, type PointsWallet } from '@/api/points'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { CustomerEmptyState, CustomerPageHeader } from '@/features/customer-commerce'
import { customerPanelClass } from '@/features/customer-commerce/customer-styles'
import { formatPoints } from '@/features/points/format'
import { PointsLedger } from '@/features/points/points-ledger'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'earned' | 'spent'

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'earned', label: 'Earned' },
  { id: 'spent', label: 'Spent' },
]

export function CustomerPointsPage() {
  const [wallet, setWallet] = useState<PointsWallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    let cancelled = false
    getMyPoints()
      .then((w) => {
        if (!cancelled) setWallet(w)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load your points.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const entries = useMemo(() => {
    const all = wallet?.entries ?? []
    if (filter === 'earned') return all.filter((e) => e.direction === 'credit')
    if (filter === 'spent') return all.filter((e) => e.direction === 'debit')
    return all
  }, [wallet, filter])

  const totals = wallet?.totals
  const tiles = [
    {
      label: 'From purchases',
      value: totals?.from_purchases ?? 0,
      icon: ShoppingBag,
      tone: 'bg-[oklch(0.93_0.06_296)] text-[oklch(0.42_0.2_296)]',
    },
    {
      label: 'Gifts received',
      value: totals?.from_gifts ?? 0,
      icon: Gift,
      tone: 'bg-[oklch(0.93_0.07_350)] text-[oklch(0.48_0.17_350)]',
    },
    {
      label: 'Prizes won',
      value: totals?.from_prizes ?? 0,
      icon: Trophy,
      tone: 'bg-[oklch(0.93_0.08_85)] text-[oklch(0.48_0.12_75)]',
    },
    {
      label: 'Spent on games',
      value: totals?.spent_on_games ?? 0,
      icon: Gamepad2,
      tone: 'bg-[oklch(0.92_0.07_195)] text-[oklch(0.42_0.11_205)]',
    },
  ]

  return (
    <>
      <CustomerPageHeader
        title="My points"
        description="Earn points when you buy gifts with a reward, when someone sends you points, and from prizes. Spend them to play games in the SendAGift app."
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <FormAlert error={error} />
      ) : wallet ? (
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy via-brand-ink to-brand-navy px-6 py-7 text-white shadow-[0_16px_44px_rgba(20,20,55,0.28)] ring-1 ring-white/10 sm:px-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-[oklch(0.8_0.14_75)]/35 blur-3xl"
            />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-white/55 uppercase">
                  Current balance
                </p>
                <p className="mt-2 flex items-baseline gap-2 font-display text-5xl tracking-tight">
                  {formatPoints(wallet.balance)}
                  <span className="text-base text-white/60">points</span>
                </p>
                <p className="mt-2 text-sm text-white/60">
                  {formatPoints(wallet.lifetime_earned)} earned · {formatPoints(wallet.lifetime_spent)}{' '}
                  spent all time
                </p>
              </div>
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
                <Coins className="size-6 text-[oklch(0.85_0.13_85)]" />
              </span>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile) => (
              <div key={tile.label} className={cn(customerPanelClass, 'p-4')}>
                <span
                  className={cn(
                    'mb-3 flex size-9 items-center justify-center rounded-xl',
                    tile.tone,
                  )}
                >
                  <tile.icon className="size-4" />
                </span>
                <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  {tile.label}
                </p>
                <p className="mt-1 font-display text-2xl tracking-tight">
                  {formatPoints(tile.value)}
                </p>
              </div>
            ))}
          </section>

          {totals && totals.sent_as_gifts > 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Send className="size-4" />
              You have sent {formatPoints(totals.sent_as_gifts)} points with gifts.
            </p>
          ) : null}

          {wallet.entries.length === 0 ? (
            <CustomerEmptyState
              icon={Coins}
              title="No points yet"
              description="Look for gifts marked “Earn points” — the points land here as soon as you order."
              action={
                <Button asChild className="rounded-full">
                  <Link to="/products">Browse gifts</Link>
                </Button>
              }
            />
          ) : (
            <section className={customerPanelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-3.5">
                <h2 className="font-medium">History</h2>
                <div className="flex gap-1 rounded-full bg-muted p-1">
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        filter === f.id
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {entries.length ? (
                <PointsLedger entries={entries} />
              ) : (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Nothing here yet.
                </p>
              )}
            </section>
          )}
        </div>
      ) : null}
    </>
  )
}
