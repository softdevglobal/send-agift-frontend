import { useEffect, useState } from 'react'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { getAdminCustomer, type AdminCustomerRecord } from '@/api/admin'
import { getCustomerPoints, type PointsWallet } from '@/api/points'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
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
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'

export function AdminCustomerDetailPage() {
  const { customerId = '' } = useParams()
  const [customer, setCustomer] = useState<AdminCustomerRecord | null>(null)
  const [wallet, setWallet] = useState<PointsWallet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const orderPages = usePagedList(customer?.orders ?? [], TABLE_PAGE_SIZE, customerId)
  const recipientPages = usePagedList(customer?.recipients ?? [], TABLE_PAGE_SIZE, customerId)
  const savedPages = usePagedList(customer?.saved_gifts ?? [], TABLE_PAGE_SIZE, customerId)

  useEffect(() => {
    if (!customerId) return
    let cancelled = false
    setLoading(true)
    getAdminCustomer(customerId)
      .then((record) => {
        if (!cancelled) {
          setCustomer(record)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load this customer.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    getCustomerPoints(customerId)
      .then((points) => {
        if (!cancelled) setWallet(points)
      })
      .catch(() => {
        if (!cancelled) setWallet(null)
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  const name = customer?.display_name?.trim() || customer?.email || 'Customer'
  const recipients = customer?.recipients ?? []
  const saved = customer?.saved_gifts ?? []
  const orders = customer?.orders ?? []

  return (
    <>
      <Button asChild variant="ghost" className="mb-4 -ml-2 h-9 rounded-full px-3">
        <Link to="/admin/customers">
          <ArrowLeft className="size-4" />
          Customers
        </Link>
      </Button>

      {loading ? <Loading /> : null}
      <FormAlert error={error} className="mb-4" />

      {customer ? (
        <div className="space-y-5">
          <AdminPageHeader
            title={name}
            description={`${customer.email} · ${readable(customer.customer_type)} · ${customer.country_name}`}
            action={
              <StatusPill tone={customer.status === 'active' ? 'good' : 'neutral'}>
                {readable(customer.status)}
              </StatusPill>
            }
          />

          <AdminRecordSection title="Account">
            <AdminFacts
              items={[
                { label: 'Email', value: customer.email },
                { label: 'Phone', value: customer.phone },
                { label: 'Type', value: readable(customer.customer_type) },
                { label: 'Date of birth', value: customer.date_of_birth ? formatDate(customer.date_of_birth) : '' },
                { label: 'Age check', value: customer.age_verified_at ? formatDate(customer.age_verified_at) : '' },
                { label: 'Identity check', value: customer.identity_verified_at ? formatDate(customer.identity_verified_at) : '' },
                { label: 'Password', value: customer.password_change_required ? 'Temporary password still in use' : 'Set by the customer' },
                { label: 'Points', value: wallet ? wallet.balance.toLocaleString() : '' },
                { label: 'Joined', value: formatDate(customer.created_at) },
                { label: 'Closed', value: customer.deleted_at ? formatDate(customer.deleted_at) : '' },
              ]}
            />
          </AdminRecordSection>

          <AdminRecordSection title="Addresses" count={(customer.addresses ?? []).length}>
            {(customer.addresses ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No addresses.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {customer.addresses.map((address) => (
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

          <AdminRecordSection title="Recipients" count={recipients.length}>
            {recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recipients.</p>
            ) : (
              <>
              <ul className="space-y-4">
                {recipientPages.visible.map((recipient) => (
                  <li key={recipient.id} className="rounded-xl border border-border/50 p-4 text-sm">
                    <p className="font-medium">{recipient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[readable(recipient.relationship), recipient.email, recipient.phone].filter(Boolean).join(' · ')}
                    </p>
                    {(recipient.addresses ?? []).length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">No address for this recipient.</p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-muted-foreground">
                        {recipient.addresses.map((address) => (
                          <li key={address.id}>{formatAddressLines(address)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <PageNav
                page={recipientPages.page}
                pageCount={recipientPages.pageCount}
                onPage={recipientPages.setPage}
                label="Recipient pages"
                scroll={false}
              />
              </>
            )}
          </AdminRecordSection>

          <AdminRecordSection title="Saved gifts" count={saved.length}>
            {saved.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved gifts.</p>
            ) : (
              <>
              <ul className="divide-y divide-border/50 text-sm">
                {savedPages.visible.map((gift) => (
                  <li key={gift.id} className="flex items-baseline justify-between gap-3 py-2.5">
                    <span className="font-medium">{gift.product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatPriceAmount(gift.product.price_amount, gift.product.currency || 'USD')}
                      {' · '}
                      {readable(gift.product.status)}
                    </span>
                  </li>
                ))}
              </ul>
              <PageNav
                page={savedPages.page}
                pageCount={savedPages.pageCount}
                onPage={savedPages.setPage}
                label="Saved gift pages"
                scroll={false}
              />
              </>
            )}
          </AdminRecordSection>

          <AdminRecordSection title="Orders" count={orders.length}>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <>
              <div className="overflow-hidden rounded-lg border-2 border-brand-ink/10">
                <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-4 bg-brand-ink px-4 py-2.5 text-[10px] font-bold tracking-[0.14em] text-white uppercase md:grid">
                  <span>Order</span>
                  <span>Placed</span>
                  <span>Total</span>
                  <span className="text-right">Status</span>
                </div>
                <ul className="divide-y divide-brand-ink/10">
                  {orderPages.visible.map((order) => (
                    <li
                      key={order.id}
                      className="grid gap-2 px-4 py-3 transition-colors hover:bg-accent/40 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:items-center md:gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-teal text-brand-ink">
                          <ShoppingBag className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-sm font-bold">{order.order_number}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {readable(order.customer_type)}
                          </span>
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDate(order.created_at)}</span>
                      <span className="font-poster text-lg">
                        {formatPriceAmount(order.total_amount, order.currency)}
                      </span>
                      <span className="md:text-right">
                        <OrderStatusBadge status={order.status} />
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
      ) : null}
    </>
  )
}
