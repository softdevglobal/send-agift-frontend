import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Gift,
  History,
  LoaderCircle,
  Lock,
  Package,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  cancelPointsPurchase,
  completeTestPayment,
  createPointsPurchase,
  describeRate,
  formatCents,
  getSellerPoints,
  listSellerPointPackages,
  listSellerPointsPurchases,
  syncPointsPurchase,
  type PointPackage,
  type PointsPurchase,
  type PointsPurchaseStatus,
  type SellerPointsWallet,
} from '@/api/points'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
import { Toast } from '@/components/common/toast'
import { Sparkle } from '@/components/common/storefront-decor'
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

const statusStyle: Record<
  PointsPurchaseStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-300 text-amber-950',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    className: 'bg-brand-teal text-brand-ink',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    className: 'bg-destructive text-white',
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

  // Back from Stripe: re-check the payment (the webhook may not have arrived
  // yet), say what happened, and tidy the address bar.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const purchaseId = searchParams.get('purchase')
    if (!purchaseId) return
    const cancelled = searchParams.get('cancelled') === '1'
    setSearchParams({}, { replace: true })
    if (cancelled) {
      setToast({ message: 'Payment cancelled. No points were added.', variant: 'error' })
      return
    }
    void syncPointsPurchase(purchaseId)
      .then(async (p) => {
        await refresh()
        setToast(
          p.status === 'completed'
            ? {
                message: `${formatPoints(p.points_credited ?? p.points)} points added${
                  p.points_settled > 0
                    ? `, ${formatPoints(p.points_settled)} of them paid off what you owed`
                    : ''
                }.`,
                variant: 'success',
              }
            : {
                message: 'Payment received. Your points are added the moment Stripe confirms it.',
                variant: 'success',
              },
        )
      })
      .catch(() => undefined)
  }, [searchParams, setSearchParams, refresh])

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
          <Button onClick={() => setBuying(true)} disabled={!wallet} className="h-11 px-5">
            <CreditCard className="size-4" />
            Buy points
          </Button>
        }
      />

      {/* The exchange rate is the number a seller needs most, so it gets a
          banner of its own instead of a line of small print. */}
      <section className="relative grid overflow-hidden rounded-xl bg-amber-300 text-amber-950 lg:grid-cols-[minmax(0,1fr)_auto]">
        <Sparkle className="absolute top-5 right-[42%] hidden size-6 text-white lg:block" />
        <Sparkle className="absolute bottom-5 left-[46%] hidden size-4 text-amber-950/60 lg:block" />
        <div className="flex flex-col justify-center gap-2 px-6 py-6 sm:px-8">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-md bg-brand-ink px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
            <Sparkles className="size-3.5 text-amber-300" />
            Points rate
          </p>
          <p className="font-poster text-4xl sm:text-5xl lg:text-6xl">{rateLabel}</p>
          <p className="max-w-md text-sm font-medium text-amber-950/75">
            What every point costs you, and what a purchase turns into.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4 sm:p-5 lg:w-[26rem]">
          {[
            ['$1', '10'],
            ['$10', '100'],
            ['$100', '1,000'],
          ].map(([money, pts]) => (
            <div
              key={money}
              className="flex flex-col justify-between rounded-lg bg-white/70 p-3 sm:p-4"
            >
              <span className="font-poster text-2xl sm:text-3xl">{money}</span>
              <span className="mt-3 text-[11px] font-bold tracking-[0.08em] uppercase sm:text-xs">
                = {pts} pts
              </span>
            </div>
          ))}
        </div>
      </section>

      <FormAlert error={loadError} />

      {wallet?.low_balance ? <LowBalanceBanner wallet={wallet} onBuy={() => setBuying(true)} /> : null}

      {wallet ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SellerStat
            icon={Coins}
            tone="amber"
            label="Available"
            value={formatPoints(Math.max(0, wallet.available))}
            hint="Free to promise as rewards"
          />
          <SellerStat
            icon={Lock}
            tone="violet"
            label="Reserved"
            value={formatPoints(wallet.reserved)}
            hint="Promised on orders not yet delivered"
          />
          {wallet.owed > 0 ? (
            <SellerStat
              icon={AlertTriangle}
              tone="violet"
              label="Owed"
              value={formatPoints(wallet.owed)}
              hint="Fronted for your rewards; paid from your next purchase"
            />
          ) : (
            <SellerStat
              icon={Package}
              tone="teal"
              label="Total balance"
              value={formatPoints(wallet.balance)}
              hint="Available + reserved"
            />
          )}
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
          . When someone orders it, that many points per unit move from your balance to the
          customer, and come back to you if the order is cancelled or refunded. If you run low,
          customers still get your rewards: we front up to{' '}
          <span className="font-medium text-foreground">
            {formatPoints(wallet?.credit_limit ?? 1000)} points
          </span>{' '}
          for you, and what you owe comes out of your next purchase first.
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
          <ul className="divide-y divide-brand-ink/10 md:hidden">
            {purchasePages.visible.map((p) => {
              const busy = busyId === p.id
              return (
                <li key={p.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-poster text-xl">
                        {formatPoints(p.points_credited ?? p.points)}
                        <span className="ml-1 font-sans text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                          points
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {shortDate(p.created_at)}
                        {p.package_name ? ` · ${p.package_name}` : ''}
                      </p>
                      <PurchaseExtras purchase={p} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">
                        {formatCents(p.paid_amount_cents ?? p.amount_cents, p.currency)}
                      </p>
                      <div className="mt-1">
                        <StatusPill status={p.status} />
                      </div>
                    </div>
                  </div>
                  {p.failure_reason ? (
                    <p className="text-xs text-muted-foreground">{p.failure_reason}</p>
                  ) : null}
                  {p.status === 'pending' ? (
                    <div className="flex flex-wrap gap-2">
                      {wallet?.test_payments ? (
                        <Button
                          size="sm"
                          className="h-9 flex-1"
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
                        <Button asChild size="sm" className="h-9 flex-1">
                          <a href={p.checkout_url}>Pay now</a>
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 border-2 border-brand-ink/15"
                        disabled={busy}
                        onClick={() =>
                          void act(p.id, () => cancelPointsPurchase(p.id), 'Purchase cancelled.')
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
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
                  const actions = (
                    <>
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
                    </>
                  )
                  return (
                    <tr key={p.id}>
                      <td className="px-5 py-3.5 whitespace-nowrap">{shortDate(p.created_at)}</td>
                      <td className="px-3 py-3.5 tabular-nums">
                        {formatCents(p.paid_amount_cents ?? p.amount_cents, p.currency)}
                      </td>
                      <td className="px-3 py-3.5 font-medium tabular-nums">
                        {formatPoints(p.points_credited ?? p.points)}
                        {p.package_name ? (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            {p.package_name}
                          </span>
                        ) : null}
                        <PurchaseExtras purchase={p} />
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusPill status={p.status} />
                        {p.failure_reason ? (
                          <p className="mt-1 text-xs text-muted-foreground">{p.failure_reason}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {actions}
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

/** Bonus and settled points under a purchase, when there are any. */
function PurchaseExtras({ purchase }: { purchase: PointsPurchase }) {
  if (purchase.bonus_points <= 0 && purchase.points_settled <= 0) return null
  return (
    <p className="mt-0.5 text-xs font-normal text-muted-foreground">
      {purchase.bonus_points > 0 ? `Incl. ${formatPoints(purchase.bonus_points)} bonus` : ''}
      {purchase.bonus_points > 0 && purchase.points_settled > 0 ? ' · ' : ''}
      {purchase.points_settled > 0
        ? `${formatPoints(purchase.points_settled)} paid off what you owed`
        : ''}
    </p>
  )
}

/**
 * A heads-up when the seller owes points, or their balance covers only a few
 * more orders of their biggest reward.
 */
function LowBalanceBanner({
  wallet,
  onBuy,
}: {
  wallet: SellerPointsWallet
  onBuy: () => void
}) {
  const owes = wallet.owed > 0
  return (
    <section
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-xl border-2 p-5',
        owes ? 'border-destructive/30 bg-destructive/5' : 'border-amber-300 bg-amber-50',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl',
          owes ? 'bg-destructive text-white' : 'bg-amber-300 text-amber-950',
        )}
      >
        <AlertTriangle className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {owes
            ? `You owe ${formatPoints(wallet.owed)} points`
            : 'Your points balance is running low'}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {owes
            ? `Your customers still got their rewards; we fronted the points. Your next purchase pays this off first. ${formatPoints(Math.max(0, wallet.credit_left))} points of credit left before rewards stop showing.`
            : `${formatPoints(Math.max(0, wallet.available))} points left covers only a few more orders of your ${formatPoints(wallet.largest_reward)}-point reward.`}
        </p>
      </div>
      <Button onClick={onBuy} className="h-10 rounded-full px-5">
        <CreditCard className="size-4" />
        Top up points
      </Button>
    </section>
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
  const [packages, setPackages] = useState<PointPackage[] | null>(null)
  /** A package id, or "custom" for an amount of the seller's own. */
  const [choice, setChoice] = useState<string>('custom')
  const [dollars, setDollars] = useState('10')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One key per open dialog, so a double-click is one purchase.
  const [key, setKey] = useState(() => crypto.randomUUID())

  useEffect(() => {
    if (!open) return
    setKey(crypto.randomUUID())
    setError(null)
    setDollars('10')
    let cancelled = false
    listSellerPointPackages()
      .then((res) => {
        if (cancelled) return
        setPackages(res.items)
        // Start on the highlighted package, else the first one.
        const pick = res.items.find((p) => p.badge) ?? res.items[0]
        setChoice(pick ? pick.id : 'custom')
      })
      .catch(() => {
        if (!cancelled) {
          setPackages([])
          setChoice('custom')
        }
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const rate = wallet.rate.cents_per_point
  const chosen = packages?.find((p) => p.id === choice) ?? null
  const cents = chosen ? chosen.price_cents : Math.round(Number(dollars) * 100)
  const valid = chosen
    ? true
    : Number.isFinite(cents) && cents >= 100 && cents <= 1_000_000 && cents % rate === 0
  // Shown for guidance only; the server works the points out itself.
  const points = useMemo(
    () => (chosen ? chosen.points + chosen.bonus_points : valid ? Math.floor(cents / rate) : 0),
    [chosen, valid, cents, rate],
  )
  const settles = Math.min(points, wallet.owed)

  async function submit() {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      let purchase = await createPointsPurchase(
        chosen
          ? { package_id: chosen.id, idempotency_key: key }
          : { amount_cents: cents, idempotency_key: key },
      )
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Buy points</DialogTitle>
          <DialogDescription>{describeRate(wallet.rate)}. Points never expire.</DialogDescription>
        </DialogHeader>

        {packages === null ? (
          <div className="flex justify-center py-6">
            <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : packages.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {packages.map((pkg) => {
              const active = choice === pkg.id
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setChoice(pkg.id)}
                  aria-pressed={active}
                  className={cn(
                    'relative rounded-xl border-2 p-3.5 text-left transition-all',
                    active
                      ? 'border-brand-ink bg-brand-ink text-white'
                      : 'border-brand-ink/15 hover:border-brand-ink',
                  )}
                >
                  {pkg.badge ? (
                    <span
                      className={cn(
                        'absolute -top-2.5 right-3 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] uppercase',
                        active ? 'bg-brand-teal text-brand-ink' : 'bg-amber-300 text-amber-950',
                      )}
                    >
                      {pkg.badge}
                    </span>
                  ) : null}
                  <span className="block text-xs font-semibold opacity-75">{pkg.name}</span>
                  <span className="mt-1 block font-poster text-2xl">
                    {formatPoints(pkg.points + pkg.bonus_points)}
                    <span className="ml-1 font-sans text-xs font-bold tracking-[0.1em] uppercase opacity-70">
                      pts
                    </span>
                  </span>
                  {pkg.bonus_points > 0 ? (
                    <span
                      className={cn(
                        'mt-1 inline-flex items-center gap-1 text-xs font-semibold',
                        active ? 'text-brand-teal' : 'text-brand-violet',
                      )}
                    >
                      <Gift className="size-3.5" />+{formatPoints(pkg.bonus_points)} bonus
                    </span>
                  ) : null}
                  <span className="mt-2 block text-sm font-bold">
                    {formatCents(pkg.price_cents, pkg.currency)}
                  </span>
                  {pkg.description ? (
                    <span className="mt-1 block text-xs opacity-70">{pkg.description}</span>
                  ) : null}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setChoice('custom')}
              aria-pressed={choice === 'custom'}
              className={cn(
                'col-span-2 rounded-xl border-2 border-dashed px-4 py-3 text-left text-sm font-semibold transition-colors',
                choice === 'custom'
                  ? 'border-brand-ink bg-accent'
                  : 'border-brand-ink/20 hover:border-brand-ink',
              )}
            >
              Or choose your own amount
            </button>
          </div>
        ) : null}

        {choice === 'custom' ? (
          <div className="space-y-1.5">
            <Label htmlFor="points-amount">Amount ({wallet.rate.currency})</Label>
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
        ) : null}

        <div className="space-y-1 rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">You get</span>
            <span className="font-poster text-2xl">
              {formatPoints(points)} <span className="text-sm text-muted-foreground">points</span>
            </span>
          </div>
          {settles > 0 ? (
            <p className="text-xs text-amber-950/80">
              {formatPoints(settles)} of these pay off what you owe; {formatPoints(points - settles)}{' '}
              go to your balance.
            </p>
          ) : null}
        </div>

        {wallet.payment_provider === 'stripe' ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            You pay securely on Stripe next. The points are added as soon as the payment goes
            through.
          </p>
        ) : wallet.payment_provider === 'instant' ? (
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
          <Button onClick={() => void submit()} disabled={!valid || busy || packages === null}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
            Pay {valid ? formatCents(cents, wallet.rate.currency) : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
