import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, Gift, LoaderCircle, Package, PackageX, Search } from 'lucide-react'
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
import {
  SellerEmptyState,
  SellerPageHeader,
  SellerStat,
  sellerPanelClass,
} from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

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

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All products' },
    { id: 'attention', label: 'Needs attention' },
    { id: 'free-gift', label: 'Free gifts' },
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
        <div className="flex flex-wrap items-center gap-3 border-b border-border/50 px-4 py-3 sm:px-5">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products or shops"
              className="h-10 pl-9"
              aria-label="Search inventory"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter inventory">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'h-9 rounded-full border-2 px-3.5 text-xs font-bold transition-colors',
                  filter === f.id
                    ? 'border-brand-ink bg-brand-ink text-white'
                    : 'border-brand-ink/15 hover:border-brand-ink',
                )}
              >
                {f.label}
              </button>
            ))}
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
    setAvailable(String(row.inventory?.available_qty ?? 0))
    setThreshold(String(row.inventory?.low_stock_threshold ?? 0))
  }, [row])

  const reserved = row?.inventory?.reserved_qty ?? 0
  const availableNumber = Number(available)
  const thresholdNumber = Number(threshold)
  const availableValid =
    available.trim() !== '' && Number.isInteger(availableNumber) && availableNumber >= 0
  const thresholdValid =
    threshold.trim() !== '' && Number.isInteger(thresholdNumber) && thresholdNumber >= 0
  const belowReserved = availableValid && availableNumber < reserved

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{row?.product.name}</DialogTitle>
          <DialogDescription>
            Set how many units you have in total. {reserved} are reserved for orders right now.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="inventory-available">Units in stock</Label>
            <Input
              id="inventory-available"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={available}
              onChange={(event) => setAvailable(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inventory-threshold">Low stock alert at</Label>
            <Input
              id="inventory-threshold"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
            />
          </div>
        </div>
        {belowReserved ? (
          <p className="text-xs font-medium text-destructive">
            It cannot be lower than the {reserved} units reserved for orders.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            The low stock alert shows a warning when what is left falls to this number.
          </p>
        )}

        <FormAlert error={error} />

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!availableValid || !thresholdValid || belowReserved || busy}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
