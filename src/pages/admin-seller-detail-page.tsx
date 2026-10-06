import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { getAdminSeller, type AdminSellerRecord } from '@/api/admin'
import type { Shop, ShopDeliveryZone } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { GRID_PAGE_SIZE, PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
import { Button } from '@/components/ui/button'
import {
  AdminFacts,
  AdminRecordSection,
  formatAddressLines,
  readable,
} from '@/features/admin/admin-record'
import { AdminPageHeader, formatDate } from '@/features/admin'
import { Loading, StatusPill } from '@/features/admin/games-ui'
import { OrderStatusBadge } from '@/features/customer-commerce/order-tracking'
import { VerifiedSellerBadge } from '@/features/customer-commerce/verified-seller-badge'
import { FulfilmentStatusBadge } from '@/features/seller-orders/fulfilment-status-badge'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'

function zoneSummary(zones?: ShopDeliveryZone[]) {
  if (!zones?.length) return ''
  return [...zones]
    .sort((a, b) => a.max_km - b.max_km)
    .map((zone) => {
      const price = zone.is_free || zone.price_amount === 0
        ? 'free'
        : formatPriceAmount(zone.price_amount, zone.currency || 'USD')
      const sameDay = zone.estimated_days === 0 && zone.cutoff_time ? ` by ${zone.cutoff_time}` : ''
      return `${zone.max_km} km ${price}${sameDay}`
    })
    .join(' · ')
}

function accountLabel(status: string) {
  if (status === 'deleted') return 'Closed'
  if (status === 'suspended') return 'Suspended'
  if (status === 'active') return 'Active'
  return readable(status)
}

export function AdminSellerDetailPage() {
  const { sellerId = '' } = useParams()
  const [seller, setSeller] = useState<AdminSellerRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sellerId) return
    let cancelled = false
    setLoading(true)
    getAdminSeller(sellerId)
      .then((record) => {
        if (!cancelled) {
          setSeller(record)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load this seller.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sellerId])

  const name = seller?.trading_name?.trim() || seller?.legal_name || 'Seller'

  return (
    <>
      <Button asChild variant="ghost" className="mb-4 -ml-2 h-9 rounded-full px-3">
        <Link to="/admin/sellers">
          <ArrowLeft className="size-4" />
          Sellers
        </Link>
      </Button>

      {loading ? <Loading /> : null}
      <FormAlert error={error} className="mb-4" />

      {seller ? (
        <div className="space-y-5">
          <AdminPageHeader
            title={name}
            description={`${seller.legal_name} · ${readable(seller.seller_type)} · ${seller.country_name}`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <VerifiedSellerBadge status={seller.verification_status} />
                <StatusPill tone={seller.status === 'active' ? 'good' : seller.status === 'suspended' ? 'bad' : 'neutral'}>
                  {accountLabel(seller.status)}
                </StatusPill>
              </div>
            }
          />

          <AdminSellerRecordSections seller={seller} />
        </div>
      ) : null}
    </>
  )
}

/**
 * Everything on file for one seller, section by section. Shared by the full
 * seller page and the side panel on the sellers list.
 */
export function AdminSellerRecordSections({ seller }: { seller: AdminSellerRecord }) {
  const products = seller.products ?? []
  const orders = seller.orders ?? []
  const orderPages = usePagedList(orders, TABLE_PAGE_SIZE, seller.id)
  const shops = seller.shops ?? []

  return (
    <div className="space-y-5">
      <AdminRecordSection title="Account">
        <AdminFacts
          items={[
            { label: 'Email', value: seller.email },
            { label: 'Phone', value: seller.phone },
            { label: 'Email confirmation', value: seller.email_verified_at ? `Confirmed ${formatDate(seller.email_verified_at)}` : 'Not confirmed' },
            { label: 'Local name', value: seller.local_name },
            { label: 'Registration', value: readable(seller.registration_status) },
            { label: 'Registration note', value: seller.registration_note },
            { label: 'Tax', value: readable(seller.tax_status) },
            { label: 'Contact', value: [seller.contact_name, readable(seller.contact_role), seller.contact_job_title].filter(Boolean).join(' · ') },
            { label: 'Authority confirmed', value: seller.authority_confirmed_at ? formatDate(seller.authority_confirmed_at) : '' },
            { label: 'Terms accepted', value: seller.terms_accepted_at ? formatDate(seller.terms_accepted_at) : '' },
            { label: 'Marketing', value: seller.marketing_opt_in ? 'Opted in' : 'Not opted in' },
            { label: 'Joined', value: formatDate(seller.created_at) },
          ]}
        />
      </AdminRecordSection>

      <AdminRecordSection title="Identifiers" count={(seller.identifiers ?? []).length}>
        {(seller.identifiers ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No business identifiers.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(seller.identifiers ?? []).map((item) => (
              <li key={item.id}>
                <span className="font-medium">{item.type}</span> {item.value}
                {item.authority || item.jurisdiction ? (
                  <span className="text-muted-foreground">
                    {' · '}
                    {[item.authority, item.jurisdiction].filter(Boolean).join(', ')}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AdminRecordSection>

      <AdminRecordSection title="Tax registrations" count={(seller.tax_registrations ?? []).length}>
        {(seller.tax_registrations ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No tax registrations.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(seller.tax_registrations ?? []).map((item) => (
              <li key={item.id}>
                <span className="font-medium">{item.scheme}</span> {item.number}
                {item.jurisdiction ? <span className="text-muted-foreground"> · {item.jurisdiction}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </AdminRecordSection>

      <AdminRecordSection title="Addresses" count={(seller.addresses ?? []).length}>
        {(seller.addresses ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No addresses.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {seller.addresses.map((address) => (
              <li key={address.id}>
                <p className="text-xs text-muted-foreground">
                  {readable(address.address_type)}
                  {address.label ? ` · ${address.label}` : ''}
                  {address.is_default ? ' · Default' : ''}
                </p>
                <p>{formatAddressLines(address)}</p>
              </li>
            ))}
          </ul>
        )}
      </AdminRecordSection>

      <AdminRecordSection title="Shops and gifts" count={shops.length}>
        {shops.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shops.</p>
        ) : (
          <div className="space-y-4">
            {shops.map((shop) => (
              <ShopBlock key={shop.id} shop={shop} products={products.filter((product) => product.shop_id === shop.id)} />
            ))}
          </div>
        )}
      </AdminRecordSection>

      <AdminRecordSection title="Orders" count={orders.length}>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <>
          <div className="overflow-hidden rounded-lg border-2 border-brand-ink/10">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] gap-4 bg-brand-ink px-4 py-2.5 text-[10px] font-bold tracking-[0.14em] text-white uppercase md:grid">
              <span>Gift &amp; order</span>
              <span>Recipient</span>
              <span>Delivery</span>
              <span className="text-right">Status</span>
            </div>
            <ul className="divide-y divide-brand-ink/10">
              {orderPages.visible.map((line) => (
                <li
                  key={line.id}
                  className="grid gap-3 px-4 py-3 transition-colors hover:bg-accent/40 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-violet font-poster text-sm text-white">
                      ×{line.quantity}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold">{line.product_name}</span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        {line.order_number} · {line.shop_name}
                      </span>
                    </span>
                  </div>
                  <span className="truncate text-sm">
                    <span className="mr-1 text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase md:hidden">
                      For
                    </span>
                    {line.recipient_name || '–'}
                  </span>
                  <span className="text-sm font-semibold text-brand-violet">
                    {line.delivery_date ? formatDate(line.delivery_date) : '–'}
                  </span>
                  <span className="flex flex-wrap gap-1.5 md:justify-end">
                    <FulfilmentStatusBadge status={line.fulfilment_status} />
                    <OrderStatusBadge status={line.order_status} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <PageNav
            page={orderPages.page}
            pageCount={orderPages.pageCount}
            onPage={orderPages.setPage}
            label="Order pages"
            scroll={false}
          />
          </>
        )}
      </AdminRecordSection>
    </div>
  )
}

function ShopBlock({ shop, products }: { shop: Shop; products: AdminSellerRecord['products'] }) {
  const gifts = products ?? []
  const giftPages = usePagedList(gifts, GRID_PAGE_SIZE, shop.id)
  return (
    <div className="rounded-lg border-2 border-brand-ink/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-poster text-lg">{shop.name}</h3>
        <span className="font-mono text-xs text-muted-foreground">/{shop.slug}</span>
        <StatusPill tone={shop.status === 'active' ? 'good' : 'neutral'}>{readable(shop.status)}</StatusPill>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {[shop.timezone, shop.customer_visible_location, zoneSummary(shop.delivery_zones)].filter(Boolean).join(' · ')}
      </p>
      {shop.description ? <p className="mt-2 text-sm text-muted-foreground">{shop.description}</p> : null}
      {shop.support_email || shop.website ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {[shop.support_email, shop.website].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      {gifts.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No gifts in this shop.</p>
      ) : (
        <>
        <ul className="mt-3 divide-y divide-border/40">
          {giftPages.visible.map((product) => (
            <li key={product.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate font-medium">{product.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatPriceAmount(product.price_amount, product.currency || 'USD')}
                {' · '}
                {readable(product.status)}
              </span>
            </li>
          ))}
        </ul>
        <PageNav
          page={giftPages.page}
          pageCount={giftPages.pageCount}
          onPage={giftPages.setPage}
          label="Gift pages"
          scroll={false}
        />
        </>
      )}
    </div>
  )
}
