import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, Gift, LoaderCircle, Package, PackageX, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  listFreeGiftProducts,
  type FreeGiftProduct,
} from '@/api/free-gifts'
import {
  getProductInventory,
  listShopProducts,
  updateProductInventory,
  type Product,
} from '@/api/products'
import { listSellerOrderItems } from '@/api/seller-orders'
import { getSellerMe } from '@/api/sellers'
import type { Inventory } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { SlidingToggle, type SlidingToggleOption } from '@/components/common/sliding-toggle'
import { Toast } from '@/components/common/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SellerEmptyState,
  SellerPageHeader,
  SellerStat,
  sellerPanelClass,
} from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'
import { blankIfZero, cn } from '@/lib/utils'

type Row = {
  product: Product
  shopName: string
  /** null when stock was never set for the product. */
  inventory: Inventory | null
  freeGift: FreeGiftProduct | null
  /** Orders that include this product, and how many are still to deliver. */
  orders: number
  openOrders: number
}

type Filter = 'all' | 'attention' | 'free-gift'

type StockState = 'unset' | 'out' | 'low' | 'ok'

function stockLeft(row: Row): number | null {
  if (!row.inventory) return null
  return row.inventory.available_qty - row.inventory.reserved_qty
}

function stockState(row: Row): StockState {
  const left = stockLeft(row)
  if (left === null) return 'unset'
  if (left <= 0) return 'out'
  const threshold = row.inventory?.low_stock_threshold ?? 0
  if (threshold > 0 && left <= threshold) return 'low'
  return 'ok'
}

const stateBadge: Record<StockState, { label: string; className: string }> = {
  unset: { label: 'No stock set', className: 'bg-muted text-muted-foreground' },
  out: { label: 'Out of stock', className: 'bg-destructive text-white' },
  low: { label: 'Low stock', className: 'bg-amber-300 text-amber-950' },
  ok: { label: 'In stock', className: 'bg-brand-teal text-brand-ink' },
}

/**
 * Stock for every product the seller sells, in one place: what is on the
 * shelf, what is reserved for orders (including free gifts, which reserve a
 * unit the moment they are sent), and which products are offered as free
 * gifts. Stock is edited here; everything else about a product lives in
 * Products.
 */
export function SellerInventoryPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Row | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    try {
      const [me, freeGifts, orderItems] = await Promise.all([
        getSellerMe(),
        // The program may be switched off; the inventory still shows.
        listFreeGiftProducts().catch(() => [] as FreeGiftProduct[]),
        listSellerOrderItems().catch(() => []),
      ])
      // Orders per product: every order line counts once; open ones are not
      // delivered or cancelled yet.
      const ordersByProduct = new Map<string, { orders: number; open: number }>()
      for (const line of orderItems) {
        const entry = ordersByProduct.get(line.product_id) ?? { orders: 0, open: 0 }
        entry.orders += 1
        if (line.fulfilment_status !== 'delivered' && line.fulfilment_status !== 'cancelled') {
          entry.open += 1
        }
        ordersByProduct.set(line.product_id, entry)
      }
      const byShop = await Promise.all(
        (me.shops ?? []).map(async (shop) => {
          const products = await listShopProducts(shop.id).catch(() => [] as Product[])
          return products.map((product) => ({ product, shopName: shop.name }))
        }),
      )
      const flat = byShop.flat()
      const giftByProduct = new Map(freeGifts.map((g) => [g.product_id, g]))
      const next = await Promise.all(
        flat.map(async ({ product, shopName }): Promise<Row> => {
          const inventory = await getProductInventory(product.id).catch(() => null)
          return {
            product,
            shopName,
            inventory,
            freeGift: giftByProduct.get(product.id) ?? null,
            orders: ordersByProduct.get(product.id)?.orders ?? 0,
            openOrders: ordersByProduct.get(product.id)?.open ?? 0,
          }
        }),
      )
      setRows(next)
      setLoadError(null)
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Could not load your inventory.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    let out = 0
    let low = 0
    let gifts = 0
    let open = 0
    for (const row of rows) {
      open += row.openOrders
      const state = stockState(row)
      if (state === 'out') out += 1
      if (state === 'low') low += 1
      if (row.freeGift?.status === 'active') gifts += 1
    }
    return { out, low, gifts, open }
  }, [rows])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows
      .filter((row) => {
        if (needle && !`${row.product.name} ${row.shopName}`.toLowerCase().includes(needle)) {
          return false
        }
        if (filter === 'attention') return ['out', 'low', 'unset'].includes(stockState(row))
        if (filter === 'free-gift') return row.freeGift !== null
        return true
      })
      .sort((a, b) => {
        const rank = { out: 0, low: 1, unset: 2, ok: 3 } as const
        return rank[stockState(a)] - rank[stockState(b)] || a.product.name.localeCompare(b.product.name)
      })
  }, [rows, query, filter])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // How many products each filter holds, shown in the toggle.
  const filters: SlidingToggleOption<Filter>[] = [
    { id: 'all', label: 'All products', count: rows.length },
    {
      id: 'attention',
      label: 'Needs attention',
      count: rows.filter((row) => ['out', 'low', 'unset'].includes(stockState(row))).length,
    },
    {
      id: 'free-gift',
      label: 'Free gifts',
      count: rows.filter((row) => row.freeGift !== null).length,
    },
  ]

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={Boxes}
        tone="teal"
        title="Inventory"
        description="What you have on the shelf, what is reserved for orders and free gifts, and what is running low."
      />

      <FormAlert error={loadError} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SellerStat icon={Package} tone="navy" label="Products" value={String(rows.length)} hint={`${stats.open} open order${stats.open === 1 ? '' : 's'} to deliver`} />
        <SellerStat
          icon={PackageX}
          tone="violet"
          label="Out of stock"
          value={String(stats.out)}
          hint="Customers cannot order these"
        />
        <SellerStat
          icon={AlertTriangle}
          tone="amber"
          label="Low stock"
          value={String(stats.low)}
          hint="At or under the alert level"
        />
        <SellerStat
          icon={Gift}
          tone="teal"
          label="Free gifts offered"
          value={String(stats.gifts)}
          hint="Products customers can send free"
          to="/seller/free-gifts"
        />
      </section>

      <section className={sellerPanelClass}>
        {/* Search first, then the filters as one toggle under it, as on the
            other pages. */}
        <div className="space-y-3 border-b border-border/50 px-4 py-4 sm:px-5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products or shops"
              className="h-10 pl-9"
              aria-label="Search inventory"
            />
          </div>
          {/* On a phone the toggle scrolls on its own, never the page. */}
          <div className="-mx-4 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0">
            <SlidingToggle
              label="Filter inventory"
              value={filter}
              onChange={setFilter}
              options={filters}
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <SellerEmptyState
            icon={Package}
            title="No products yet"
            description="Add products to a shop and their stock appears here."
          />
        ) : visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nothing matches that filter.
          </p>
        ) : (
          <ul className="divide-y divide-brand-ink/10">
            {visible.map((row) => {
              const state = stockState(row)
              const badge = stateBadge[state]
              const left = stockLeft(row)
              return (
                <li key={row.product.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {row.product.image_url ? (
                      <img src={row.product.image_url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <Package className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-extrabold">{row.product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.shopName} · {formatPriceAmount(row.product.price_amount, row.product.currency)}
                      {row.product.status !== 'published' ? ` · ${row.product.status}` : ''}
                    </p>
                    {row.freeGift ? (
                      <p className="mt-1 flex items-center gap-1 text-xs font-bold text-brand-violet">
                        <Gift className="size-3.5" />
                        Free gift{row.freeGift.status === 'paused' ? ' (paused)' : ''} ·{' '}
                        {row.freeGift.gifts_count}
                        {row.freeGift.gifts_cap !== null ? ` of ${row.freeGift.gifts_cap}` : ''} sent
                      </p>
                    ) : null}
                  </div>
                  <dl className="flex gap-5 text-center">
                    <div>
                      <dt className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                        Orders
                      </dt>
                      <dd className="text-lg font-extrabold tabular-nums">{row.orders}</dd>
                      <p className="text-[10px] text-muted-foreground">{row.openOrders} open</p>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                        Available
                      </dt>
                      <dd className="text-lg font-extrabold tabular-nums">
                        {left === null ? '–' : Math.max(left, 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                        Reserved
                      </dt>
                      <dd className="text-lg font-extrabold tabular-nums">
                        {row.inventory?.reserved_qty ?? '–'}
                      </dd>
                    </div>
                  </dl>
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] uppercase',
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-2 border-brand-ink/15"
                    onClick={() => setEditing(row)}
                  >
                    Set stock
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="text-sm text-muted-foreground">
        A free gift reserves one unit when a customer sends it, so it shows under Reserved until
        you deliver it. Manage the gifts you offer in{' '}
        <Link to="/seller/free-gifts" className="font-medium text-primary hover:underline">
          Free gifts
        </Link>
        .
      </p>

      <StockDialog
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null)
          await load()
          setToast({ message: 'Stock saved.', variant: 'success' })
        }}
      />

      {toast ? (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      ) : null}
    </div>
  )
}

function StockDialog({
  row,
  onClose,
  onSaved,
}: {
  row: Row | null
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [available, setAvailable] = useState('')
  const [threshold, setThreshold] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!row) return
    setError(null)
    // A field opens empty rather than showing 0; empty saves as 0.
    setAvailable(blankIfZero(row.inventory?.available_qty))
    setThreshold(blankIfZero(row.inventory?.low_stock_threshold))
  }, [row])

  const reserved = row?.inventory?.reserved_qty ?? 0
  const availableNumber = available.trim() === '' ? 0 : Number(available)
  const thresholdNumber = threshold.trim() === '' ? 0 : Number(threshold)
  const availableValid = Number.isInteger(availableNumber) && availableNumber >= 0
  const thresholdValid = Number.isInteger(thresholdNumber) && thresholdNumber >= 0
  const belowReserved = availableValid && availableNumber < reserved
  const canSell = availableValid ? Math.max(availableNumber - reserved, 0) : 0
  const willBeLow = availableValid && thresholdValid && thresholdNumber > 0 && canSell <= thresholdNumber

  async function submit() {
    if (!row || !availableValid || !thresholdValid || belowReserved) return
    setBusy(true)
    setError(null)
    try {
      await updateProductInventory(row.product.id, {
        available_qty: availableNumber,
        // Reserved is the platform's count of units held by orders.
        reserved_qty: reserved,
        low_stock_threshold: thresholdNumber,
        unavailable_dates: row.inventory?.unavailable_dates ?? [],
      })
      await onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the stock.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={row !== null} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        {/* Which gift this is, before any number is changed. */}
        <div className="relative flex items-center gap-4 bg-brand-ink px-6 py-5 text-white">
          <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-white/10 ring-2 ring-white/15">
            {row?.product.image_url ? (
              <img src={row.product.image_url} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-white/70">
                <Package className="size-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold tracking-[0.18em] text-brand-teal uppercase">
              Update stock
            </p>
            <DialogTitle className="mt-1 truncate text-lg font-extrabold text-white">
              {row?.product.name}
            </DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-xs text-white/65">
              {row?.shopName}
            </DialogDescription>
          </div>
          <DialogClose
            disabled={busy}
            className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Where the stock stands now, and what saving would leave. */}
          <dl className="grid grid-cols-3 gap-2">
            <StockFact label="In stock" value={availableValid ? availableNumber : '-'} />
            <StockFact label="Reserved" value={reserved} hint="Held by orders" />
            <StockFact
              label="Can sell"
              value={canSell}
              tone={belowReserved ? 'bad' : willBeLow ? 'warn' : 'good'}
            />
          </dl>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inventory-available">Units in stock</Label>
              <UnitsInput
                id="inventory-available"
                value={available}
                onChange={setAvailable}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Everything you have, reserved included.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inventory-threshold">Low stock alert at</Label>
              <UnitsInput id="inventory-threshold" value={threshold} onChange={setThreshold} />
              <p className="text-xs text-muted-foreground">Warn me when this many are left.</p>
            </div>
          </div>

          {belowReserved ? (
            <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              It cannot be lower than the {reserved} units already reserved for orders.
            </p>
          ) : willBeLow ? (
            <p className="flex items-start gap-2 rounded-lg bg-amber-100 px-3 py-2.5 text-sm text-amber-950">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {canSell === 0
                ? 'This gift will show as sold out.'
                : `Only ${canSell} left to sell, so it will show as low on stock.`}
            </p>
          ) : null}

          <FormAlert error={error} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-brand-ink/10 bg-muted/40 px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!availableValid || !thresholdValid || belowReserved || busy}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Save stock
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** A whole-number field with a "units" suffix. Digits only, no spinner. */
function UnitsInput({
  id,
  value,
  onChange,
  autoFocus,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  autoFocus?: boolean
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        className="pr-14 text-base font-semibold tabular-nums"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-muted-foreground">
        units
      </span>
    </div>
  )
}

function StockFact({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: number | string
  hint?: string
  tone?: 'good' | 'warn' | 'bad'
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5',
        tone === 'bad'
          ? 'border-destructive/30 bg-destructive/5'
          : tone === 'warn'
            ? 'border-amber-300 bg-amber-50'
            : tone === 'good'
              ? 'border-brand-teal/40 bg-brand-teal/10'
              : 'border-brand-ink/10 bg-muted/40',
      )}
    >
      <dt className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-extrabold tabular-nums">{value}</dd>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
