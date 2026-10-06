import { useEffect, useMemo, useState } from 'react'
import { Coins, Gamepad2, Gift, LoaderCircle, Send, ShoppingBag, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getMyPoints, type PointsWallet } from '@/api/points'
import { FormAlert } from '@/components/common/form-alert'
import { Sparkle } from '@/components/common/storefront-decor'
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
      tone: 'bg-brand-violet text-white',
    },
    {
      label: 'Gifts received',
      value: totals?.from_gifts ?? 0,
      icon: Gift,
      tone: 'bg-brand-ink text-white',
    },
    {
      label: 'Prizes won',
      value: totals?.from_prizes ?? 0,
      icon: Trophy,
      tone: 'bg-amber-300 text-amber-950',
    },
    {
      label: 'Spent on games',
      value: totals?.spent_on_games ?? 0,
      icon: Gamepad2,
      tone: 'bg-brand-teal text-brand-ink',
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
          <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-ink px-6 py-7 text-white sm:px-8">
            <Sparkle className="absolute top-6 right-[22%] size-6 text-brand-teal" />
            <Sparkle className="absolute right-8 bottom-5 size-4 text-brand-violet" />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-white/55 uppercase">
                  Current balance
                </p>
                <p className="mt-2 flex items-baseline gap-3 font-poster text-6xl">
                  {formatPoints(wallet.balance)}
                  <span className="ml-1 font-sans text-sm font-bold tracking-[0.16em] text-white/60 uppercase">points</span>
                </p>
                <p className="mt-2 text-sm text-white/60">
                  {formatPoints(wallet.lifetime_earned)} earned · {formatPoints(wallet.lifetime_spent)}{' '}
                  spent all time
                </p>
              </div>
              <span className="flex size-14 items-center justify-center rounded-xl bg-brand-teal">
                <Coins className="size-6 text-brand-ink" />
              </span>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile) => (
              <div key={tile.label} className={cn(customerPanelClass, 'p-4')}>
                <span
                  className={cn(
                    'mb-3 flex size-10 items-center justify-center rounded-lg',
                    tile.tone,
                  )}
                >
                  <tile.icon className="size-4" />
                </span>
                <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  {tile.label}
                </p>
                <p className="mt-1 font-poster text-3xl">
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
              description="Look for gifts marked “Earn points”. The points land here as soon as you order."
              action={
                <Button asChild>
                  <Link to="/products">Browse gifts</Link>
                </Button>
              }
            />
          ) : (
            <section className={customerPanelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-ink/15 px-5 py-3.5">
                <h2 className="font-poster text-xl">History</h2>
                <div className="flex gap-1 rounded-lg bg-accent p-1">
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors',
                        filter === f.id
                          ? 'bg-brand-ink text-white'
                          : 'text-brand-ink/60 hover:text-brand-ink',
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
