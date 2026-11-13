import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Award,
  Bell,
  Crown,
  Gift,
  LoaderCircle,
  Medal,
  Megaphone,
  Plus,
  Receipt,
  Search,
  Ticket,
  X,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import {
  AD_PURCHASE_LABEL,
  buyAdPackage,
  cancelAdPurchase,
  entriesLabel,
  formatCents,
  getSellerAdvertising,
  levelName,
  markAdRemindersRead,
  setAdPromotions,
  syncAdPurchase,
  testPayAdPurchase,
  type AdPackage,
  type AdPurchase,
  type SellerAdvertising,
} from '@/api/game-entries'
import { listShopProducts, type Product } from '@/api/products'
import { getSellerMe } from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SellerEmptyState, SellerPageHeader, sellerPanelClass } from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const number = new Intl.NumberFormat()

function day(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
}

const STATUS_TONE: Record<AdPurchase['status'], string> = {
  pending: 'bg-amber-100 text-amber-900',
  active: 'bg-emerald-100 text-emerald-900',
  exhausted: 'bg-muted text-muted-foreground',
  expired: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  failed: 'bg-red-100 text-red-900',
  refunded: 'bg-muted text-muted-foreground',
}

/**
 * The seller's advertising: buy a package, put products in its priority
 * levels, and watch how much of its budget has gone to customers as game
 * entries. A package ends when its budget is used or its time is up; a new
 * one is only ever bought by the seller.
 */
export function SellerAdvertisingPage() {
  const [data, setData] = useState<SellerAdvertising | null>(null)
  const [catalog, setCatalog] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()

  const load = useCallback(async () => {
    try {
      setData(await getSellerAdvertising())
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your advertising.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Published products across the seller's shops, to choose from.
  useEffect(() => {
    let cancelled = false
    getSellerMe()
      .then(async (me) => {
        const lists = await Promise.all(
          (me.shops ?? []).map((shop) => listShopProducts(shop.id).catch(() => [] as Product[])),
        )
        if (!cancelled) setCatalog(lists.flat().filter((p) => p.status === 'published'))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  // Back from the payment page: the server asks Stripe, never the URL.
  useEffect(() => {
    const id = params.get('purchase')
    if (!id) return
    const cancelled = params.get('cancelled') === '1'
    setParams({}, { replace: true })
    if (cancelled) {
      setNotice('Payment cancelled. Nothing was charged and no package was started.')
      return
    }
    syncAdPurchase(id)
      .then((p) => {
        setNotice(
          p.status === 'active'
            ? `${p.package_name} is active. Choose the products to promote.`
            : 'Your payment is still being confirmed. This page updates as soon as it is.',
        )
      })
      .catch(() => undefined)
      .finally(() => void load())
    // Runs once for the return from checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Seeing the notices marks them read.
  useEffect(() => {
    if (data?.reminders.some((r) => !r.read_at)) void markAdRemindersRead().catch(() => undefined)
  }, [data])

  async function act(key: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      await fn()
      if (done) setNotice(done)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'That did not work. Please try again.'))
    } finally {
      setBusy(null)
    }
  }

  async function buy(pkg: AdPackage) {
    setBusy(pkg.id)
    setError(null)
    try {
      const purchase = await buyAdPackage(pkg.id, crypto.randomUUID())
      if (purchase.checkout_url) {
        window.location.assign(purchase.checkout_url)
        return
      }
      await load()
      setNotice('Purchase started. It becomes active once the payment is confirmed.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start the purchase.'))
    } finally {
      setBusy(null)
    }
  }

  const purchases = useMemo(() => data?.purchases ?? [], [data])
  const live = purchases.filter((p) => p.status === 'active' || p.status === 'pending')
  const past = purchases.filter((p) => p.status !== 'active' && p.status !== 'pending')
  const unread = (data?.reminders ?? []).filter((r) => !r.read_at)
  const promotedElsewhere = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of purchases) {
      if (p.status !== 'active') continue
      for (const pr of p.promotions ?? []) if (pr.level > 0) map.set(pr.product_id, p.id)
    }
    return map
  }, [purchases])

  return (
    <>
      <SellerPageHeader
        title="Advertising"
        icon={Megaphone}
        description="Promote your products. Customers who buy a promoted product earn game entries, paid from your package's budget."
      />
      <FormAlert error={error} notice={notice} className="mb-4" />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {(data?.reminders.length ?? 0) > 0 ? (
            <section className={cn(sellerPanelClass, 'px-5 py-4')}>
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Bell className="size-4" />
                Budget notices
                {unread.length > 0 ? (
                  <span className="rounded-full bg-brand-violet px-2 py-0.5 text-[10px] text-white">{unread.length} new</span>
                ) : null}
              </h2>
              <ul className="mt-3 space-y-2">
                {data!.reminders.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm',
                      r.threshold >= 100 ? 'bg-red-50 text-red-950' : 'bg-amber-50 text-amber-950',
                    )}
                  >
                    <span className="font-semibold">{r.threshold}% used.</span> {r.message}
                    <span className="ml-2 text-xs opacity-70">{day(r.created_at)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {live.map((p) => (
            <PurchaseCard
              key={p.id}
              purchase={p}
              catalog={catalog}
              promotedElsewhere={promotedElsewhere}
              busy={busy}
              onAct={act}
            />
          ))}

          <section>
            <h2 className="mb-3 font-poster text-xl">{live.length > 0 ? 'Buy another package' : 'Choose a package'}</h2>
            {(data?.packages.length ?? 0) === 0 ? (
              <SellerEmptyState
                icon={Megaphone}
                title="No packages on sale yet"
                description="Advertising packages are not available in your country yet. Check back soon."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data!.packages.map((pkg) => (
                  <article key={pkg.id} className="flex flex-col rounded-xl border-2 border-brand-ink/15 bg-card p-5">
                    <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">{pkg.name}</p>
                    <p className="mt-1 font-poster text-3xl">{formatCents(pkg.price_minor, pkg.currency)}</p>
                    {pkg.description ? <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{pkg.description}</p> : null}
                    <ul className="mt-4 space-y-1.5 text-sm">
                      <li>
                        Promotes up to <strong>{pkg.product_slots}</strong> {pkg.product_slots === 1 ? 'product' : 'products'}
                      </li>
                      {pkg.level_entries.map((n, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 text-muted-foreground">
                          <span>{levelName(i + 1, pkg.product_slots, pkg.level_names)} priority</span>
                          <span className="font-semibold text-foreground">{entriesLabel(n)} per purchase</span>
                        </li>
                      ))}
                      <li className="border-t border-border/60 pt-1.5">
                        Budget of <strong>{number.format(pkg.entries_pool)}</strong> game entries
                      </li>
                      <li>
                        {pkg.validity_days ? (
                          <>
                            Runs for <strong>{pkg.validity_days} days</strong>, or until the budget is used
                          </>
                        ) : (
                          <>
                            Runs <strong>until the budget is used</strong>, with no end date
                          </>
                        )}
                      </li>
                    </ul>
                    <Button className="mt-5 h-11" onClick={() => void buy(pkg)} disabled={busy === pkg.id}>
                      {busy === pkg.id ? <LoaderCircle className="size-4 animate-spin" /> : null}
                      Buy for {formatCents(pkg.price_minor, pkg.currency)}
                    </Button>
                  </article>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              A package ends when its budget is used up or its time runs out, whichever comes first. Unused budget or
              time is not refunded. Nothing renews automatically: a new package starts only when you buy one. Entries
              are given to customers where games are available; a customer elsewhere can still buy your product, without
              entries.
            </p>
          </section>

          {past.length > 0 ? (
            <section className={cn(sellerPanelClass, 'overflow-hidden')}>
              <h2 className="border-b border-border/60 px-5 py-4 font-poster text-xl">Past packages</h2>
              <ul className="divide-y divide-border/60">
                {past.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
                    <div>
                      <p className="font-semibold">{p.package_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCents(p.price_minor, p.currency)} · bought {day(p.paid_at ?? p.created_at)}
                        {p.ended_at ? ` · ended ${day(p.ended_at)}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] uppercase', STATUS_TONE[p.status])}>
                        {AD_PURCHASE_LABEL[p.status]}
                      </span>
                      {p.paid_at ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {number.format(p.entries_used)} of {number.format(p.entries_pool)} entries given
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </>
  )
}

function PurchaseCard({
  purchase: p,
  catalog,
  promotedElsewhere,
  busy,
  onAct,
}: {
  purchase: AdPurchase
  catalog: Product[]
  promotedElsewhere: Map<string, string>
  busy: string | null
  onAct: (key: string, fn: () => Promise<unknown>, done?: string) => Promise<void>
}) {
  // The list as the seller is arranging it: one product id per level.
  const saved = useMemo(() => {
    const slots: string[] = Array.from({ length: p.product_slots }, () => '')
    for (const pr of p.promotions ?? []) if (pr.level > 0) slots[pr.level - 1] = pr.product_id
    return slots
  }, [p])
  const [slots, setSlots] = useState<string[]>(saved)
  /** The level whose product is being chosen, if any. */
  const [picking, setPicking] = useState<number | null>(null)
  useEffect(() => setSlots(saved), [saved])
  const dirty = slots.join('|') !== saved.join('|')

  if (p.status === 'pending') {
    return (
      <section className={cn(sellerPanelClass, 'px-5 py-5')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-poster text-xl">{p.package_name}</p>
            <p className="text-sm text-muted-foreground">
              {formatCents(p.price_minor, p.currency)} · waiting for payment. It starts once the payment is confirmed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.checkout_url ? (
              <Button className="h-10 px-4" onClick={() => window.location.assign(p.checkout_url!)}>
                Pay now
              </Button>
            ) : null}
            {p.provider === 'test' ? (
              <Button
                variant="outline"
                className="h-10 px-4"
                disabled={busy === p.id}
                onClick={() => void onAct(p.id, () => testPayAdPurchase(p.id), 'Test payment confirmed.')}
              >
                Confirm test payment
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className="h-10 px-4"
              disabled={busy === p.id}
              onClick={() => void onAct(p.id, () => cancelAdPurchase(p.id), 'Purchase cancelled.')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const left = p.entries_pool - p.entries_used - p.entries_held
  const usedWidth = Math.min(100, (p.entries_used * 100) / p.entries_pool)
  const heldWidth = Math.min(100 - usedWidth, (p.entries_held * 100) / p.entries_pool)
  const granted = new Map((p.promotions ?? []).map((pr) => [pr.product_id, pr]))
  const earlier = (p.promotions ?? []).filter((pr) => pr.level === 0)

  function move(i: number, by: number) {
    const next = [...slots]
    const j = i + by
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setSlots(next)
  }

  function save() {
    const promotions = slots.map((id, i) => ({ product_id: id, level: i + 1 })).filter((s) => s.product_id)
    return onAct(p.id, () => setAdPromotions(p.id, promotions), 'Promoted products saved.')
  }

  return (
    <section className={cn(sellerPanelClass, 'overflow-hidden')}>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">Active package</p>
          <p className="mt-1 font-poster text-2xl">{p.package_name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Receipt className="size-4" />
              Paid {formatCents(p.paid_amount_minor ?? p.price_minor, p.currency)} on {day(p.paid_at)}
            </span>
            <span>{p.expires_at ? `Runs until ${day(p.expires_at)}` : 'Runs until the budget is used'}</span>
            <span>Receipt ref {p.id.slice(0, 8)}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-poster text-4xl">{p.usage_percent}%</p>
          <p className="text-xs text-muted-foreground">of budget used</p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div
          className="flex h-3 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${p.usage_percent}% of the budget used`}
        >
          <div className="bg-brand-violet" style={{ width: `${usedWidth}%` }} />
          <div className="bg-amber-300" style={{ width: `${heldWidth}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{number.format(p.entries_used)}</strong> given to customers
          </span>
          {p.entries_held > 0 ? (
            <span>
              <strong className="text-foreground">{number.format(p.entries_held)}</strong> on unpaid orders
            </span>
          ) : null}
          <span>
            <strong className="text-foreground">{number.format(Math.max(left, 0))}</strong> left of{' '}
            {number.format(p.entries_pool)}
          </span>
        </div>
      </div>

      <div className="border-t border-border/60 px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Promoted products</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              One product per level. The higher the level, the higher it is listed and the more a customer earns for
              buying it.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-violet/10 px-3 py-1 text-xs font-bold whitespace-nowrap text-brand-violet">
            {slots.filter(Boolean).length} of {slots.length} filled
          </span>
        </div>
        <ol className="mt-4 space-y-2.5">
          {slots.map((id, i) => {
            const award = p.level_entries[i]
            const stats = id ? granted.get(id) : undefined
            const product = id ? catalog.find((prod) => prod.id === id) : undefined
            const rank = SLOT_RANKS[i] ?? OTHER_SLOT_RANK
            const RankIcon = rank.icon
            const name = levelName(i + 1, p.product_slots, p.level_names)
            return (
              <li
                key={i}
                className={cn(
                  // Phone: level and controls on top, the product full width below.
                  // Wider: one row, level | product | stats and controls.
                  'flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-2xl border-2 p-3 transition sm:flex-nowrap',
                  id ? 'border-brand-ink/10 bg-surface' : 'border-dashed border-brand-ink/20 bg-muted/30',
                )}
              >
                {/* The level: its rank and what it earns. */}
                <div className="order-1 flex min-w-0 flex-1 items-center gap-2.5 sm:w-52 sm:flex-none sm:shrink-0">
                  <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', rank.badge)}>
                    <RankIcon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{name}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-brand-teal/15 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-brand-ink">
                      <Ticket className="size-3" />
                      {entriesLabel(award)}
                    </p>
                  </div>
                </div>

                {/* The product in it, or a place to choose one. */}
                <button
                  type="button"
                  onClick={() => setPicking(i)}
                  aria-label={product ? `Change the product for ${name}` : `Choose a product for ${name}`}
                  className={cn(
                    'order-3 flex min-w-0 basis-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition sm:order-2 sm:basis-auto sm:flex-1',
                    product
                      ? 'bg-muted/40 hover:bg-accent sm:bg-transparent'
                      : 'justify-center bg-brand-violet/5 py-3 text-brand-violet hover:bg-brand-violet/10 sm:bg-transparent',
                  )}
                >
                  {product ? (
                    <>
                      <ProductThumb product={product} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{product.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatCents(product.price_amount, product.currency)} · tap to change
                        </span>
                        {/* On a phone the numbers sit here, under the product. */}
                        <span className="mt-0.5 block text-xs text-muted-foreground sm:hidden">
                          {stats
                            ? `${number.format(stats.entries_granted)} entries given · ${number.format(stats.orders_count)} ${stats.orders_count === 1 ? 'sale' : 'sales'}`
                            : 'No sales yet'}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Plus className="size-4" />
                      Choose a product
                    </span>
                  )}
                </button>

                {/* How it is doing, and moving it. */}
                <div className="order-2 flex shrink-0 items-center gap-3 sm:order-3">
                  {stats ? (
                    <div className="hidden text-right text-xs whitespace-nowrap sm:block">
                      <p className="font-bold">{number.format(stats.entries_granted)} entries</p>
                      <p className="text-muted-foreground">
                        {number.format(stats.orders_count)} {stats.orders_count === 1 ? 'sale' : 'sales'}
                      </p>
                    </div>
                  ) : id ? (
                    <p className="hidden text-xs whitespace-nowrap text-muted-foreground sm:block">No sales yet</p>
                  ) : null}
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="size-8 rounded-full" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-full"
                      aria-label="Move down"
                      disabled={i === slots.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    {id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full"
                        aria-label="Remove product"
                        onClick={() => setSlots(slots.map((s, k) => (k === i ? '' : s)))}
                      >
                        <X className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
        {picking !== null ? (
          <ProductPicker
            title={`Product for ${levelName(picking + 1, p.product_slots, p.level_names)}`}
            catalog={catalog}
            current={slots[picking]}
            levelOf={(productId) => {
              const at = slots.indexOf(productId)
              return at >= 0 && at !== picking ? levelName(at + 1, p.product_slots, p.level_names) : null
            }}
            elsewhere={(productId) => {
              const other = promotedElsewhere.get(productId)
              return !!other && other !== p.id
            }}
            onPick={(productId) => {
              const next = [...slots]
              // A product sits in one level only: picking it here frees its old level.
              const at = next.indexOf(productId)
              if (at >= 0) next[at] = ''
              next[picking] = productId
              setSlots(next)
              setPicking(null)
            }}
            onClose={() => setPicking(null)}
          />
        ) : null}
        {catalog.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">You have no published products to promote yet.</p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button className="h-10 px-4" disabled={!dirty || busy === p.id} onClick={() => void save()}>
            {busy === p.id ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Save promoted products
          </Button>
          {dirty ? (
            <Button variant="ghost" className="h-10 px-4" onClick={() => setSlots(saved)}>
              Undo changes
            </Button>
          ) : null}
        </div>
        {earlier.length > 0 ? (
          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">Promoted earlier in this package</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {earlier.map((pr) => (
                <li key={pr.product_id} className="flex justify-between gap-3">
                  <span className="truncate">{pr.product_name}</span>
                  <span>
                    {number.format(pr.entries_granted)} entries · {number.format(pr.orders_count)} sales
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}


/** Rank looks for the levels: crown, medal, ribbon, then tickets. */
const SLOT_RANKS = [
  { icon: Crown, badge: 'bg-amber-400 text-brand-ink' },
  { icon: Medal, badge: 'bg-slate-300 text-brand-ink' },
  { icon: Award, badge: 'bg-orange-300 text-brand-ink' },
]
const OTHER_SLOT_RANK = { icon: Ticket, badge: 'bg-brand-violet/15 text-brand-violet' }

/** A product's photo, or a gift icon when it has none. */
function ProductThumb({ product, className }: { product: Product; className?: string }) {
  const url =
    product.image_url ||
    [...(product.media ?? [])]
      .sort((a, b) => a.position - b.position)
      .find((m) => m.asset_type === 'image' || m.mime_type.startsWith('image/'))?.cdn_url
  return (
    <span className={cn('grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted', className)}>
      {url ? (
        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <Gift className="size-5 text-muted-foreground" />
      )}
    </span>
  )
}

/**
 * Choosing a product for a level: the seller's published products with
 * their photos, searchable. One already at another level moves here; one
 * promoted by another package cannot be picked.
 */
function ProductPicker({
  title,
  catalog,
  current,
  levelOf,
  elsewhere,
  onPick,
  onClose,
}: {
  title: string
  catalog: Product[]
  current: string
  levelOf: (productId: string) => string | null
  elsewhere: (productId: string) => boolean
  onPick: (productId: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const shown = catalog.filter((prod) => prod.name.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-poster text-2xl">{title}</DialogTitle>
        </DialogHeader>
        <label className="relative block">
          <span className="sr-only">Search your products</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your products"
            className="h-10 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <ul className="-mx-1 max-h-[55vh] space-y-1 overflow-y-auto px-1">
          {shown.length === 0 ? (
            <li className="py-8 text-center text-sm text-muted-foreground">
              {catalog.length === 0 ? 'You have no published products yet.' : 'No product matches that.'}
            </li>
          ) : (
            shown.map((prod) => {
              const blocked = elsewhere(prod.id)
              const at = levelOf(prod.id)
              const chosen = prod.id === current
              return (
                <li key={prod.id}>
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => onPick(prod.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border-2 p-2 text-left transition',
                      chosen ? 'border-brand-violet bg-brand-violet/5' : 'border-transparent hover:bg-accent',
                      blocked && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                    )}
                  >
                    <ProductThumb product={prod} className="size-11" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{prod.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatCents(prod.price_amount, prod.currency)}
                        {blocked ? ' · in another package' : at ? ` · now at ${at}, moves here` : ''}
                      </span>
                    </span>
                    {chosen ? (
                      <span className="rounded-full bg-brand-violet px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                        Chosen
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
