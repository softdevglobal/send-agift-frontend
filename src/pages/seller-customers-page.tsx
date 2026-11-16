import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Gift, LoaderCircle, MapPin, Package, Repeat, Search, ShoppingBag, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  getSellerCustomer,
  listSellerCustomers,
  type SellerCustomer,
  type SellerCustomerDetail,
  type SellerCustomerOrder,
} from '@/api/seller-orders'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDeliveryDate } from '@/features/customer-commerce/order-display'
import { OrderStatusBadge } from '@/features/customer-commerce/order-tracking'
import { SellerEmptyState, SellerPageHeader } from '@/features/seller'
import { sellerPanelClass } from '@/features/seller/seller-styles'
import { FulfilmentStatusBadge } from '@/features/seller-orders'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function formatDay(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date)
}

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase() || 'C'
  )
}

function regionOf(c: SellerCustomer) {
  return [c.state_name, c.country_name].filter(Boolean).join(', ')
}

/** "LKR 98,500.00", or several currencies side by side; a dash for none. */
function formatSpent(c: SellerCustomer) {
  if (!c.spent.length) return '–'
  return c.spent.map((s) => formatPriceAmount(s.amount, s.currency)).join(' + ')
}

/**
 * Everyone who has bought from the seller's shops, and what they ordered.
 * Only this seller's own lines show, and nothing about the customer beyond
 * their name and region: no contact details, no game entries.
 *
 * `/seller/customers/:customerId` is this same page with a customer open.
 */
export function SellerCustomersPage() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<SellerCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    listSellerCustomers()
      .then((list) => {
        if (!cancelled) setCustomers(list)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load your customers.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => c.name.toLowerCase().includes(q) || regionOf(c).toLowerCase().includes(q))
  }, [customers, query])
  const paged = usePagedList(filtered, TABLE_PAGE_SIZE, query)

  const repeat = customers.filter((c) => c.orders_count > 1).length
  const orders = customers.reduce((sum, c) => sum + c.orders_count, 0)

  return (
    <div>
      <SellerPageHeader
        icon={Users}
        tone="violet"
        title="Customers"
        description="Everyone who has bought from your shops, and what they ordered from you."
      />

      <FormAlert error={error} className="mb-5" />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        error ? null : (
          <SellerEmptyState
            icon={Users}
            title="No customers yet"
            description="When someone buys from one of your shops, they show up here with everything they ordered from you."
            action={
              <Button asChild className="h-10 rounded-full px-4">
                <Link to="/seller/products">Add a gift</Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Stat icon={Users} label="Customers" value={customers.length} tone="bg-brand-violet text-white" />
            <Stat icon={Repeat} label="Came back for more" value={repeat} tone="bg-brand-teal text-brand-ink" />
            <Stat icon={ShoppingBag} label="Orders" value={orders} tone="bg-amber-300 text-amber-950" />
          </div>

          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              {filtered.length} {filtered.length === 1 ? 'customer' : 'customers'}
            </p>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or region"
                aria-label="Search customers"
                className="h-10 border-2 border-brand-ink/15 pl-9 focus-visible:border-brand-ink focus-visible:ring-0"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className={cn(sellerPanelClass, 'px-4 py-10 text-center text-sm text-muted-foreground')}>
              No customer matches “{query.trim()}”.
            </p>
          ) : (
            <section className={cn(sellerPanelClass, 'overflow-hidden')}>
              <ul className="divide-y divide-brand-ink/10">
                {paged.visible.map((c) => (
                  <li key={c.customer_id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/seller/customers/${c.customer_id}`)}
                      aria-current={c.customer_id === customerId ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors sm:gap-4',
                        c.customer_id === customerId ? 'bg-accent' : 'hover:bg-accent/40',
                      )}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-violet text-xs font-extrabold text-white">
                        {initialsOf(c.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-extrabold">{c.name}</span>
                          {c.orders_count > 1 ? (
                            <span className="shrink-0 rounded-md bg-brand-teal px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-brand-ink uppercase">
                              Repeat
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {regionOf(c)} · last order {formatDay(c.last_order_at)}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-right sm:block">
                        <span className="block text-sm font-bold tabular-nums">
                          {c.orders_count} {c.orders_count === 1 ? 'order' : 'orders'}
                        </span>
                        <span className="block text-[11px] text-muted-foreground tabular-nums">
                          {c.items_count} {c.items_count === 1 ? 'item' : 'items'}
                        </span>
                      </span>
                      <span className="w-28 shrink-0 text-right font-poster text-base tabular-nums sm:w-36 sm:text-lg">
                        {formatSpent(c)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-4 pb-4">
                <PageNav page={paged.page} pageCount={paged.pageCount} onPage={paged.setPage} label="Customer pages" />
              </div>
            </section>
          )}
        </>
      )}

      <CustomerPanel customerId={customerId ?? null} onClose={() => navigate('/seller/customers')} />
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users
  label: string
  value: number
  tone: string
}) {
  return (
    <div className={cn(sellerPanelClass, 'flex items-center gap-3 p-4')}>
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', tone)}>
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block font-poster text-2xl leading-none tabular-nums">{value.toLocaleString()}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  )
}

/** One customer's orders with this seller, over the list. */
function CustomerPanel({ customerId, onClose }: { customerId: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<SellerCustomerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customerId) return
    let cancelled = false
    setDetail(null)
    setError(null)
    getSellerCustomer(customerId)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load this customer.'))
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  return (
    <Sheet open={customerId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[calc(100%-2.5rem)] overflow-y-auto p-0 sm:max-w-xl">
        {detail ? (
          <>
            <SheetHeader className="bg-brand-ink p-6 text-white">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-violet text-sm font-extrabold">
                  {initialsOf(detail.name)}
                </span>
                <div className="min-w-0">
                  <SheetTitle className="truncate font-poster text-2xl text-white">{detail.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-1 text-white/75">
                    <MapPin className="size-3.5" />
                    {regionOf(detail)}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-2.5">
                <Fact label="Orders" value={String(detail.orders_count)} />
                <Fact label="Items bought" value={String(detail.items_count)} />
                <Fact label="Spent with you" value={formatSpent(detail)} />
                <Fact label="Customer since" value={formatDay(detail.first_order_at)} />
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">Orders</p>
                {detail.orders.map((order) => (
                  <OrderCard key={order.order_id} order={order} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <SheetHeader className="sr-only">
              <SheetTitle>Customer</SheetTitle>
              <SheetDescription>Their orders with you</SheetDescription>
            </SheetHeader>
            {error ? (
              <FormAlert error={error} />
            ) : (
              <div className="flex justify-center py-16">
                <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3.5 py-3">
      <p className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 truncate font-poster text-lg tabular-nums">{value}</p>
    </div>
  )
}

function OrderCard({ order }: { order: SellerCustomerOrder }) {
  const freeGift = order.order_kind === 'free_gift'
  return (
    <article className="overflow-hidden rounded-xl border-2 border-brand-ink/10">
      <header className="flex flex-wrap items-start justify-between gap-2 bg-muted/40 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-extrabold tracking-tight">{order.order_number}</p>
          <p className="text-[11px] text-muted-foreground">
            Ordered {formatDay(order.created_at)} · deliver {formatDeliveryDate(order.delivery_date)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-poster text-base tabular-nums">
            {freeGift ? 'Free gift' : formatPriceAmount(order.amount, order.currency)}
          </span>
          <span className="flex items-center gap-1">
            {freeGift ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-teal px-1.5 py-0.5 text-[10px] font-bold text-brand-ink uppercase">
                <Gift className="size-3" />
                You fund this
              </span>
            ) : null}
            <OrderStatusBadge status={order.status} />
          </span>
        </div>
      </header>
      <ul className="divide-y divide-brand-ink/10">
        {order.items.map((item) => (
          <li key={item.id}>
            <Link
              to={`/seller/orders/${item.id}`}
              className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
            >
              {item.product_image_url ? (
                <img
                  src={item.product_image_url}
                  alt=""
                  className="size-11 shrink-0 rounded-lg border border-brand-ink/10 object-cover"
                />
              ) : (
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Package className="size-5 text-muted-foreground" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{item.product_name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {[`${item.quantity} × `, item.shop_name].join('')}
                  {item.recipient_name ? ` · for ${item.recipient_name}` : ''}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-bold tabular-nums">
                  {formatPriceAmount(item.total_amount, order.currency)}
                </span>
                <FulfilmentStatusBadge status={item.fulfilment_status} />
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-ink" />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  )
}
