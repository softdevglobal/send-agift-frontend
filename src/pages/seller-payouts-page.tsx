import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDownToLine,
  Clock,
  Coins,
  Landmark,
  LoaderCircle,
  Percent,
  Truck,
} from 'lucide-react'

import {
  getPayoutHistory,
  type PayoutHistory,
  type PayoutItem,
  type PayoutTotals,
} from '@/api/payments'
import { FormAlert } from '@/components/common/form-alert'
import { SellerPageHeader, SellerStat, sellerPanelClass } from '@/features/seller'
import { PayoutAccountCard } from '@/features/seller/payout-account-card'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

const statusLabel: Record<PayoutItem['status'], string> = {
  pending: 'Pending',
  in_transit: 'On its way',
  paid: 'Paid',
  failed: 'Failed',
  held: 'On hold',
}

const statusTone: Record<PayoutItem['status'], string> = {
  pending: 'bg-amber-200 text-amber-950',
  in_transit: 'bg-brand-violet text-white',
  paid: 'bg-brand-teal text-brand-ink',
  failed: 'bg-destructive text-white',
  held: 'bg-muted text-muted-foreground',
}

function money(amount: number, currency: string) {
  return formatPriceAmount(amount, currency.toUpperCase())
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function SellerPayoutsPage() {
  const [searchParams] = useSearchParams()
  const returned = searchParams.get('stripe') === 'return'
  const [data, setData] = useState<PayoutHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setData(await getPayoutHistory())
    } catch (err) {
      setError(getErrorMessage(err, 'Could not read your payouts.'))
    }
  }, [])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  async function refresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const totals: PayoutTotals[] =
    data && data.totals.length > 0
      ? data.totals
      : [{ currency: 'usd', paid_out: 0, fees: 0, on_the_way: 0, awaiting: 0 }]
  const multiCurrency = totals.length > 1

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={Landmark}
        tone="violet"
        title="Payouts"
        description="Connect your bank, then see what you have been paid and what is on its way."
      />

      {returned ? (
        <FormAlert notice="Welcome back. Stripe is updating your payout account, this can take a moment." />
      ) : null}
      <FormAlert error={error} />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <PayoutAccountCard status={data.account} refreshing={refreshing} onRefresh={() => void refresh()} />

          {totals.map((t) => {
            const c = t.currency
            const tag = multiCurrency ? ` (${c.toUpperCase()})` : ''
            return (
              <section key={c} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SellerStat
                  icon={ArrowDownToLine}
                  label={`Paid out${tag}`}
                  value={money(t.paid_out, c)}
                  hint="Sent to your Stripe account"
                  tone="teal"
                />
                <SellerStat
                  icon={Clock}
                  label={`Next payout${tag}`}
                  value={money(t.awaiting, c)}
                  hint="Delivered, paid out soon"
                  tone="violet"
                />
                <SellerStat
                  icon={Truck}
                  label={`On the way${tag}`}
                  value={money(t.on_the_way, c)}
                  hint="Paid, not delivered yet"
                  tone="amber"
                />
                <SellerStat
                  icon={Percent}
                  label={`Platform fees${tag}`}
                  value={money(t.fees, c)}
                  hint="Already taken from payouts"
                  tone="navy"
                />
              </section>
            )
          })}

          <section className={sellerPanelClass}>
            <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
              <span className="flex size-6 items-center justify-center rounded-md bg-accent text-primary">
                <Coins className="size-3.5" />
              </span>
              <h2 className="font-medium">Payout history</h2>
            </div>
            {data.items.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-card text-primary ring-1 ring-primary/15">
                  <ArrowDownToLine className="size-5" />
                </div>
                <p className="text-sm font-medium">No payouts yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  When a customer's gift is delivered, its value is sent to your Stripe account and
                  listed here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-3 py-3">Order</th>
                      <th className="px-3 py-3">Gift</th>
                      <th className="px-3 py-3 text-right">Sold for</th>
                      <th className="px-3 py-3 text-right">Fee</th>
                      <th className="px-3 py-3 text-right">You received</th>
                      <th className="px-5 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/40 last:border-0">
                        <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="px-3 py-3 font-medium whitespace-nowrap">{item.order_number}</td>
                        <td className="max-w-[14rem] truncate px-3 py-3">{item.product_name || '-'}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          {money(item.gross_amount, item.currency)}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap text-muted-foreground">
                          {item.fee_amount > 0 ? `-${money(item.fee_amount, item.currency)}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-right font-medium whitespace-nowrap">
                          {money(item.amount, item.currency)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={cn(
                              'inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] uppercase',
                              statusTone[item.status],
                            )}
                          >
                            {statusLabel[item.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
