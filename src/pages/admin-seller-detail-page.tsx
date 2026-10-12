import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, Ban, Check, LoaderCircle, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { BackLink } from '@/components/common/back-link'
import {
  getAdminSeller,
  setAdminSellerStatus,
  setAdminSellerVerification,
  type AdminSellerRecord,
} from '@/api/admin'
import { listCountries } from '@/api/countries'
import type { Address, Shop, ShopDeliveryZone } from '@/api/types'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GRID_PAGE_SIZE, PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
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

type PendingAction = 'verify' | 'unverify' | 'reject' | 'suspend' | 'activate'

const ACTION_COPY: Record<
  PendingAction,
  { title: string; description: (name: string) => string; confirm: string; danger: boolean; done: (name: string) => string }
> = {
  verify: {
    title: 'Verify this seller?',
    description: (name) =>
      `${name} keeps selling, and their gifts, shop, and profile show the Verified seller badge.`,
    confirm: 'Verify',
    danger: false,
    done: (name) => `${name} is a verified seller. Their gifts show the Verified seller badge.`,
  },
  unverify: {
    title: 'Remove verification?',
    description: (name) =>
      `${name} keeps selling. The Verified seller badge comes off their gifts, shop, and profile.`,
    confirm: 'Unverify',
    danger: true,
    done: (name) => `${name} is no longer verified. Their gifts stay in the catalog without the badge.`,
  },
  reject: {
    title: 'Reject this seller?',
    description: (name) =>
      `${name}'s registration is marked as not accepted. They keep their account but never show the Verified seller badge unless you verify them later.`,
    confirm: 'Reject',
    danger: true,
    done: (name) => `${name} is rejected.`,
  },
  suspend: {
    title: 'Suspend this seller?',
    description: (name) =>
      `${name} cannot sign in or keep using the seller account. Their shops leave the public catalog until you activate them.`,
    confirm: 'Suspend',
    danger: true,
    done: (name) => `${name} is suspended. They cannot sign in, and their shops leave the public catalog.`,
  },
  activate: {
    title: 'Activate this seller?',
    description: (name) => `${name} can sign in again, and their public shops come back.`,
    confirm: 'Activate',
    danger: false,
    done: (name) => `${name} is active again.`,
  },
}

export function AdminSellerDetailPage() {
  const { sellerId = '' } = useParams()
  const [seller, setSeller] = useState<AdminSellerRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const record = await getAdminSeller(sellerId)
    setSeller(record)
    setError(null)
  }, [sellerId])

  useEffect(() => {
    if (!sellerId) return
    let cancelled = false
    setLoading(true)
    load()
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load this seller.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sellerId, load])

  const name = seller?.trading_name?.trim() || seller?.legal_name || 'Seller'

  async function confirm() {
    if (!pending || !seller) return
    const action = pending
    setSaving(true)
    setNotice(null)
    try {
      if (action === 'suspend' || action === 'activate') {
        await setAdminSellerStatus(seller.id, action === 'suspend' ? 'suspended' : 'active')
      } else {
        await setAdminSellerVerification(
          seller.id,
          action === 'verify' ? 'verified' : action === 'reject' ? 'rejected' : 'unverified',
        )
      }
      await load()
      setNotice(ACTION_COPY[action].done(name))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update this seller.'))
    } finally {
      setPending(null)
      setSaving(false)
    }
  }

  return (
    <>
      <BackLink to="/admin/sellers" label="All sellers" className="mb-4" />

      {loading ? <Loading /> : null}
      <FormAlert error={error} notice={notice} className="mb-4" />

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

          <SellerReviewPanel seller={seller} busy={saving} onAction={setPending} />

          <AdminSellerRecordSections seller={seller} />
        </div>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setPending(null)
        }}
        tone={pending && ACTION_COPY[pending].danger ? 'danger' : 'default'}
        title={pending ? ACTION_COPY[pending].title : ''}
        description={pending ? ACTION_COPY[pending].description(name) : ''}
        confirmLabel={pending ? ACTION_COPY[pending].confirm : 'Confirm'}
        busy={saving}
        onConfirm={() => void confirm()}
      />
    </>
  )
}

/**
 * The decision on a seller: whether their business is verified, and whether
 * their account is on, next to a checklist of what they registered with.
 */
function SellerReviewPanel({
  seller,
  busy,
  onAction,
}: {
  seller: AdminSellerRecord
  busy: boolean
  onAction: (action: PendingAction) => void
}) {
  const verified = seller.verification_status === 'verified'
  const rejected = seller.verification_status === 'rejected'
  const suspended = seller.status === 'suspended'
  const closed = seller.status === 'deleted'
  const emailConfirmed = Boolean(seller.email_verified_at)

  // What a reviewer is looking for: the registration is complete.
  const checks = [
    { label: 'Email confirmed', ok: emailConfirmed },
    { label: 'Authority confirmed', ok: Boolean(seller.authority_confirmed_at) },
    { label: 'Terms accepted', ok: Boolean(seller.terms_accepted_at) },
    { label: 'Business ID on file', ok: (seller.identifiers ?? []).length > 0 },
    { label: 'Address on file', ok: (seller.addresses ?? []).length > 0 },
    { label: 'Has a shop', ok: (seller.shops ?? []).length > 0 },
  ]

  return (
    <section className="rounded-xl border-2 border-brand-ink/10 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl',
              verified ? 'bg-brand-teal text-brand-ink' : rejected ? 'bg-destructive text-white' : 'bg-accent text-accent-foreground',
            )}
          >
            {verified ? <ShieldCheck className="size-5" /> : rejected ? <ShieldX className="size-5" /> : <ShieldAlert className="size-5" />}
          </span>
          <div>
            <h2 className="font-poster text-xl">Seller review</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {closed
                ? 'This account is closed.'
                : verified
                  ? 'Verified. Their gifts, shop, and profile show the Verified seller badge.'
                  : rejected
                    ? 'Rejected. They keep their account without the Verified seller badge.'
                    : 'Not verified yet. Check what they registered with below, then verify or reject.'}
              {suspended ? ' The account is suspended.' : ''}
            </p>
          </div>
        </div>

        {!closed ? (
          <div className="flex flex-wrap gap-2">
            {verified ? (
              <Button variant="outline" className="h-10 rounded-full px-4" disabled={busy} onClick={() => onAction('unverify')}>
                <ShieldAlert className="size-4" />
                Unverify
              </Button>
            ) : (
              <Button className="h-10 rounded-full px-4" disabled={busy} onClick={() => onAction('verify')}>
                <BadgeCheck className="size-4" />
                Verify seller
              </Button>
            )}
            {!rejected && !verified ? (
              <Button variant="outline" className="h-10 rounded-full px-4" disabled={busy} onClick={() => onAction('reject')}>
                <ShieldX className="size-4" />
                Reject
              </Button>
            ) : null}
            {suspended ? (
              <Button variant="outline" className="h-10 rounded-full px-4" disabled={busy} onClick={() => onAction('activate')}>
                {busy ? <LoaderCircle className="animate-spin" /> : <Check className="size-4" />}
                Activate
              </Button>
            ) : (
              <Button variant="destructive" className="h-10 rounded-full px-4" disabled={busy} onClick={() => onAction('suspend')}>
                <Ban className="size-4" />
                Suspend
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((c) => (
          <li
            key={c.label}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
              c.ok ? 'bg-brand-teal/20 text-brand-ink' : 'bg-muted text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full text-white',
                c.ok ? 'bg-brand-teal text-brand-ink' : 'bg-muted-foreground/40',
              )}
            >
              <Check className="size-3" />
            </span>
            {c.label}
          </li>
        ))}
      </ul>
    </section>
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
  const addresses = seller.addresses ?? []
  const countries = useCountryNames()
  const countryName = (id?: string | null) => (id ? (countries[id] ?? '') : '')
  const displayName = seller.trading_name?.trim() || seller.legal_name

  return (
    <div className="space-y-5">
      <AdminRecordSection title="Business">
        <div className="mb-4 flex items-center gap-4">
          {seller.image_url ? (
            <img
              src={seller.image_url}
              alt=""
              className="size-16 shrink-0 rounded-xl object-cover ring-2 ring-brand-ink/10"
            />
          ) : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-brand-violet font-poster text-2xl text-white">
              {displayName.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-poster text-xl">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">
              {[readable(seller.seller_type), seller.country_name].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <AdminFacts
          items={[
            { label: 'Legal name', value: seller.legal_name },
            { label: 'Trading name', value: seller.trading_name },
            { label: 'Local name', value: seller.local_name },
            { label: 'Business type', value: readable(seller.seller_type) },
            { label: 'Country', value: seller.country_name },
            { label: 'Phone', value: seller.phone },
            { label: 'Email', value: seller.email },
            {
              label: 'Email confirmation',
              value: seller.email_verified_at
                ? `Confirmed ${formatDate(seller.email_verified_at)}`
                : 'Not confirmed',
            },
            { label: 'Verification', value: readable(seller.verification_status) },
            { label: 'Account', value: accountLabel(seller.status) },
            { label: 'Joined', value: formatDate(seller.created_at) },
            { label: 'Last updated', value: formatDate(seller.updated_at) },
          ]}
        />
      </AdminRecordSection>

      <AdminRecordSection title="Registration and compliance">
        <AdminFacts
          items={[
            { label: 'Business registration', value: readable(seller.registration_status) },
            { label: 'Registration note', value: seller.registration_note },
            { label: 'Tax status', value: readable(seller.tax_status) },
            { label: 'Contact person', value: seller.contact_name },
            { label: 'Contact role', value: readable(seller.contact_role) },
            { label: 'Contact job title', value: seller.contact_job_title },
            {
              label: 'Authority confirmed',
              value: seller.authority_confirmed_at ? formatDate(seller.authority_confirmed_at) : '',
            },
            {
              label: 'Terms accepted',
              value: seller.terms_accepted_at ? formatDate(seller.terms_accepted_at) : '',
            },
            { label: 'Marketing', value: seller.marketing_opt_in ? 'Opted in' : 'Not opted in' },
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
                {item.authority || item.jurisdiction || countryName(item.country_id) ? (
                  <span className="text-muted-foreground">
                    {' · '}
                    {[item.authority, item.jurisdiction, countryName(item.country_id)]
                      .filter(Boolean)
                      .join(', ')}
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
                {item.jurisdiction || countryName(item.country_id) ? (
                  <span className="text-muted-foreground">
                    {' · '}
                    {[item.jurisdiction, countryName(item.country_id)].filter(Boolean).join(', ')}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AdminRecordSection>

      <AdminRecordSection title="Addresses" count={addresses.length}>
        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No addresses.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {addresses.map((address) => (
              <li key={address.id} className="rounded-lg border-2 border-brand-ink/10 p-3.5 text-sm">
                <p className="text-[10px] font-bold tracking-[0.14em] text-brand-ink/55 uppercase">
                  {readable(address.address_type)}
                  {address.label ? ` · ${address.label}` : ''}
                  {address.is_default ? ' · Default' : ''}
                </p>
                <p className="mt-1 font-medium">{formatAddressLines(address)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[
                    countryName(address.country_id),
                    address.latitude != null && address.longitude != null
                      ? `${address.latitude.toFixed(4)}, ${address.longitude.toFixed(4)}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
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
              <ShopBlock
                key={shop.id}
                shop={shop}
                addresses={addresses}
                products={products.filter((product) => product.shop_id === shop.id)}
              />
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

/** Country names by id, loaded once for the identifier and address lines. */
function useCountryNames(): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({})
  useEffect(() => {
    let cancelled = false
    listCountries()
      .then((list) => {
        if (!cancelled) setNames(Object.fromEntries(list.map((c) => [c.id, c.name])))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])
  return names
}

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function ShopFact({ label, children }: { label: string; children?: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold tracking-[0.14em] text-brand-ink/55 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{children}</dd>
    </div>
  )
}

function ShopBlock({
  shop,
  products,
  addresses,
}: {
  shop: Shop
  products: AdminSellerRecord['products']
  addresses: Address[]
}) {
  const gifts = products ?? []
  const giftPages = usePagedList(gifts, GRID_PAGE_SIZE, shop.id)
  const pickup = addresses.find((a) => a.id === shop.address_id)
  const returns = addresses.find((a) => a.id === shop.return_address_id)
  const days = [...(shop.working_days ?? [])].sort(
    (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b),
  )
  return (
    <div className="rounded-lg border-2 border-brand-ink/10 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {shop.image_url ? (
          <img src={shop.image_url} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
        ) : null}
        <h3 className="font-poster text-lg">{shop.name}</h3>
        <span className="font-mono text-xs text-muted-foreground">/{shop.slug}</span>
        <StatusPill tone={shop.status === 'active' ? 'good' : 'neutral'}>{readable(shop.status)}</StatusPill>
      </div>
      {shop.description ? <p className="mt-2 text-sm text-muted-foreground">{shop.description}</p> : null}

      <dl className="mt-3 grid gap-x-6 gap-y-3 rounded-lg bg-accent/50 p-3.5 sm:grid-cols-2">
        <ShopFact label="Public location">{shop.customer_visible_location}</ShopFact>
        <ShopFact label="Time zone">{shop.timezone}</ShopFact>
        <ShopFact label="Support email">{shop.support_email}</ShopFact>
        <ShopFact label="Website">{shop.website}</ShopFact>
        <ShopFact label="Dispatch address">{pickup ? formatAddressLines(pickup) : ''}</ShopFact>
        <ShopFact label="Returns address">{returns ? formatAddressLines(returns) : ''}</ShopFact>
        <ShopFact label="Categories">{(shop.categories ?? []).join(', ')}</ShopFact>
        <ShopFact label="Gift options">{(shop.gift_options ?? []).map(readable).join(', ')}</ShopFact>
        <ShopFact label="Working days">{days.map((d) => d.toUpperCase()).join(' ')}</ShopFact>
        <ShopFact label="Pickup">{shop.pickup_enabled ? 'Customers can collect' : 'Delivery only'}</ShopFact>
        <ShopFact label="Delivery zones">{zoneSummary(shop.delivery_zones)}</ShopFact>
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-[10px] font-bold tracking-[0.14em] text-brand-ink/55 uppercase">
            Returns policy
          </dt>
          <dd className="mt-0.5 text-sm font-medium break-words whitespace-pre-line">
            {shop.returns_policy || <span className="font-normal text-muted-foreground">Not set</span>}
          </dd>
        </div>
      </dl>
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
