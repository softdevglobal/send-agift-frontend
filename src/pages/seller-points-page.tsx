import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  History,
  LoaderCircle,
  Lock,
  Package,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  cancelPointsPurchase,
  completeTestPayment,
  createPointsPurchase,
  describeRate,
  formatCents,
  getSellerPoints,
  listSellerPointsPurchases,
  type PointsPurchase,
  type PointsPurchaseStatus,
  type SellerPointsWallet,
} from '@/api/points'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
import { Toast } from '@/components/common/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPoints } from '@/features/points/format'
import { PointsLedger } from '@/features/points/points-ledger'
import { SellerPageHeader, SellerStat, sellerPanelClass } from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Ready-made amounts, in dollars. */
const PACKS = [5, 10, 25, 100]

const statusStyle: Record<
  PointsPurchaseStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-[oklch(0.95_0.06_85)] text-[oklch(0.45_0.12_75)]',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    className: 'bg-[oklch(0.94_0.06_155)] text-[oklch(0.42_0.12_155)]',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    className: 'bg-[oklch(0.95_0.05_25)] text-[oklch(0.5_0.18_25)]',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-muted text-muted-foreground',
    icon: XCircle,
  },
}

function StatusPill({ status }: { status: PointsPurchaseStatus }) {
  const s = statusStyle[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        s.className,
      )}
    >
      <s.icon className="size-3" />
      {s.label}
    </span>
  )
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function SellerPointsPage() {
  const [wallet, setWallet] = useState<SellerPointsWallet | null>(null)
  const [purchases, setPurchases] = useState<PointsPurchase[]>([])
  const purchasePages = usePagedList(purchases, TABLE_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [buying, setBuying] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  )

  const refresh = useCallback(async () => {
    try {
      const [w, p] = await Promise.all([getSellerPoints(), listSellerPointsPurchases()])
      setWallet(w)
      setPurchases(p)
      setLoadError(null)
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Could not load your points.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function act(id: string, run: () => Promise<PointsPurchase>, done: string) {
    setBusyId(id)
    try {
      const updated = await run()
      await refresh()
      setToast({
        message: updated.status === 'failed' ? 'Payment declined. No points added.' : done,
        variant: updated.status === 'failed' ? 'error' : 'success',
      })
    } catch (error) {
      setToast({ message: getErrorMessage(error, 'That did not work.'), variant: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const rateLabel = wallet ? describeRate(wallet.rate) : '1 point = $0.10'

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={Coins}
        tone="amber"
        title="Points"
        description="Buy points and set a reward on your products. Customers earn them when they order, paid from your balance."
        action={
          <Button
            onClick={() => setBuying(true)}
            disabled={!wallet}
            className="h-10 rounded-full bg-white px-5 text-brand-navy hover:bg-white/90"
          >
            <CreditCard className="size-4" />
            Buy points
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-white/75">
          <span className="inline-flex items-center gap-2 font-semibold text-white">
            <Sparkles className="size-4 text-[oklch(0.85_0.13_85)]" />
            {rateLabel}
          </span>
          <span>$1.00 = 10 points · $10.00 = 100 points · $100.00 = 1,000 points</span>
        </div>
      </SellerPageHeader>

      <FormAlert error={loadError} />

      {wallet ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SellerStat
            icon={Coins}
            tone="amber"
            label="Available"
            value={formatPoints(wallet.available)}
            hint="Free to promise as rewards"
          />
          <SellerStat
            icon={Lock}
            tone="violet"
            label="Reserved"
            value={formatPoints(wallet.reserved)}
            hint="Promised on orders not yet delivered"
          />
          <SellerStat
            icon={Package}
            tone="teal"
            label="Total balance"
            value={formatPoints(wallet.balance)}
            hint="Available + reserved"
          />
          <SellerStat
            icon={History}
            tone="navy"
            label="Paid out as rewards"
            value={formatPoints(wallet.lifetime_spent)}
            hint={`${formatPoints(wallet.lifetime_purchased)} bought in total`}
          />
        </section>
      ) : null}

      <section className={cn(sellerPanelClass, 'p-5 text-sm leading-relaxed text-muted-foreground')}>
        <p>
          <span className="font-medium text-foreground">How rewards work.</span> Set{' '}
          <span className="font-medium text-foreground">Reward points</span> on a product from{' '}
          <Link to="/seller/products" className="font-medium text-primary hover:underline">
            Products
          </Link>
          . When someone orders it, that many points per unit move from your available balance to
          the customer, and come back to you if the order is cancelled or refunded. A product only
          shows its reward while you hold enough points to pay it.
        </p>
      </section>

      <section className={sellerPanelClass}>
        <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent text-primary">
            <CreditCard className="size-3.5" />
          </span>
          <h2 className="font-medium">Purchase history</h2>
        </div>
        {purchases.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No purchases yet. Buy points to start rewarding your customers.
          </p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Amount paid</th>
                  <th className="px-3 py-3 font-medium">Points</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {purchasePages.visible.map((p) => {
                  const busy = busyId === p.id
                  return (
                    <tr key={p.id}>
                      <td className="px-5 py-3.5 whitespace-nowrap">{shortDate(p.created_at)}</td>
                      <td className="px-3 py-3.5 tabular-nums">
                        {formatCents(p.paid_amount_cents ?? p.amount_cents, p.currency)}
                      </td>
                      <td className="px-3 py-3.5 font-medium tabular-nums">
                        {formatPoints(p.points_credited ?? p.points)}
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusPill status={p.status} />
                        {p.failure_reason ? (
                          <p className="mt-1 text-xs text-muted-foreground">{p.failure_reason}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {p.status === 'pending' ? (
                          <div className="inline-flex gap-1.5">
                            {wallet?.test_payments ? (
                              <Button
                                size="sm"
                                className="h-8 rounded-full px-3"
                                disabled={busy}
                                onClick={() =>
                                  void act(
                                    p.id,
                                    () => completeTestPayment(p.id, 'success'),
                                    `${formatPoints(p.points)} points added.`,
                                  )
                                }
                              >
                                {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                                {wallet.payment_provider === 'instant' ? 'Add points' : 'Pay (test)'}
                              </Button>
                            ) : p.checkout_url ? (
                              <Button asChild size="sm" className="h-8 rounded-full px-3">
                                <a href={p.checkout_url}>Pay now</a>
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-full px-3"
                              disabled={busy}
                              onClick={() =>
                                void act(p.id, () => cancelPointsPurchase(p.id), 'Purchase cancelled.')
                              }
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <PageNav
            page={purchasePages.page}
            pageCount={purchasePages.pageCount}
            onPage={purchasePages.setPage}
            label="Purchase pages"
            scroll={false}
          />
          </>
        )}
      </section>

      <section className={sellerPanelClass}>
        <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent text-primary">
            <History className="size-3.5" />
          </span>
          <h2 className="font-medium">Points activity</h2>
        </div>
        {wallet && wallet.entries.length > 0 ? (
          <PointsLedger entries={wallet.entries} />
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Bought points and rewards paid to customers will show here.
          </p>
        )}
      </section>

      {wallet ? (
        <BuyPointsDialog
          open={buying}
          wallet={wallet}
          onClose={() => setBuying(false)}
          onBought={async (purchase) => {
            setBuying(false)
            await refresh()
            setToast({
              message:
                purchase.status === 'completed'
                  ? `${formatPoints(purchase.points_credited ?? purchase.points)} points added.`
                  : 'Purchase started. Points are added once payment is confirmed.',
              variant: 'success',
            })
          }}
        />
      ) : null}

      {toast ? (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      ) : null}
    </div>
  )
}

function BuyPointsDialog({
  open,
  wallet,
  onClose,
  onBought,
}: {
  open: boolean
  wallet: SellerPointsWallet
  onClose: () => void
  onBought: (purchase: PointsPurchase) => void | Promise<void>
}) {
  const [dollars, setDollars] = useState('10')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One key per open dialog, so a double-click is one purchase.
  const [key, setKey] = useState(() => crypto.randomUUID())

  useEffect(() => {
    if (open) {
      setKey(crypto.randomUUID())
      setError(null)
      setDollars('10')
    }
  }, [open])

  const rate = wallet.rate.cents_per_point
  const cents = Math.round(Number(dollars) * 100)
  const valid = Number.isFinite(cents) && cents >= 100 && cents <= 1_000_000 && cents % rate === 0
  // Shown for guidance only; the server works the points out itself.
  const points = useMemo(() => (valid ? Math.floor(cents / rate) : 0), [valid, cents, rate])

  async function submit() {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      let purchase = await createPointsPurchase({ amount_cents: cents, idempotency_key: key })
      if (purchase.checkout_url) {
        window.location.assign(purchase.checkout_url)
        return
      }
      // The instant provider credits it on the server; the test one waits
      // for the seller to approve it here.
      if (purchase.status === 'pending' && wallet.test_payments) {
        purchase = await completeTestPayment(purchase.id, 'success')
      }
      await onBought(purchase)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start the purchase.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy points</DialogTitle>
          <DialogDescription>{describeRate(wallet.rate)}. Points never expire.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          {PACKS.map((pack) => {
            const active = Number(dollars) === pack
            return (
              <button
                key={pack}
                type="button"
                onClick={() => setDollars(String(pack))}
                className={cn(
                  'rounded-xl border px-2 py-3 text-center transition-colors',
                  active
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50',
                )}
              >
                <span className="block font-display text-lg">${pack}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {formatPoints(Math.floor((pack * 100) / rate))} pts
                </span>
              </button>
            )
          })}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="points-amount">Or enter an amount ({wallet.rate.currency})</Label>
          <Input
            id="points-amount"
            type="number"
            inputMode="decimal"
            min={1}
            max={10000}
            step={rate / 100}
            value={dollars}
            onChange={(event) => setDollars(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Between $1 and $10,000, in steps of {formatCents(rate, wallet.rate.currency)}.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[oklch(0.975_0.03_85)] px-4 py-3 ring-1 ring-border/50">
          <span className="text-sm text-muted-foreground">You get</span>
          <span className="font-display text-2xl tracking-tight">
            {formatPoints(points)} <span className="text-sm text-muted-foreground">points</span>
          </span>
        </div>

        {wallet.payment_provider === 'instant' ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            The points are added to your balance straight away.
          </p>
        ) : !wallet.test_payments ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Your purchase stays <span className="font-medium text-foreground">Pending</span> until
            the payment is confirmed; the points are added the moment it is.
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-[oklch(0.45_0.12_75)]">
            Test payments are on: this completes instantly without charging anything.
          </p>
        )}

        <FormAlert error={error} />

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!valid || busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
            Pay {valid ? formatCents(cents, wallet.rate.currency) : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
