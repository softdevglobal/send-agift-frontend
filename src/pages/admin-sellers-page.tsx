import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, BadgeX, Ban, Eye, Power, Search, Store } from 'lucide-react'

import {
  getAdminSeller,
  listAdminSellers,
  setAdminSellerStatus,
  setAdminSellerVerification,
  type AdminSeller,
  type AdminSellerRecord,
  type AdminSellerStatus,
} from '@/api/admin'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, TABLE_PAGE_SIZE } from '@/components/common/page-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminEmptyState, AdminPageHeader, formatDate } from '@/features/admin'
import {
  AdminPreviewSheet,
  PreviewCounts,
  PreviewFacts,
  PreviewHeading,
} from '@/features/admin/admin-preview-sheet'
import { Loading, StatusPill } from '@/features/admin/games-ui'
import { VerifiedSellerBadge } from '@/features/customer-commerce/verified-seller-badge'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const tabs: { id: AdminSellerStatus | ''; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: '', label: 'All' },
]

const accountTone = {
  active: 'good',
  suspended: 'bad',
  deleted: 'neutral',
} as const

function accountLabel(status: string) {
  if (status === 'deleted') return 'Closed'
  if (status === 'suspended') return 'Suspended'
  if (status === 'active') return 'Active'
  return status
}

function sellerName(seller: AdminSeller) {
  return seller.trading_name?.trim() || seller.legal_name
}

export function AdminSellersPage() {
  const [tab, setTab] = useState<AdminSellerStatus | ''>('active')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AdminSeller[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState<AdminSeller | null>(null)
  const [verifying, setVerifying] = useState<AdminSeller | null>(null)
  /** The seller open in the side panel. */
  const [viewing, setViewing] = useState<AdminSeller | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listAdminSellers(tab, query.trim(), page, TABLE_PAGE_SIZE)
      setItems(res.items)
      setTotal(res.total)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load sellers.'))
    } finally {
      setLoading(false)
    }
  }, [tab, query, page])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  const nextStatus = pending?.status === 'suspended' ? 'active' : 'suspended'
  const nextVerification = verifying?.verification_status === 'verified' ? 'unverified' : 'verified'

  async function confirmStatus() {
    if (!pending) return
    setSaving(true)
    try {
      await setAdminSellerStatus(pending.id, nextStatus)
      setNotice(
        nextStatus === 'suspended'
          ? `${sellerName(pending)} is suspended. They cannot sign in, and their shops leave the public catalog.`
          : `${sellerName(pending)} is active again.`,
      )
      setPending(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update this seller.'))
      setPending(null)
    } finally {
      setSaving(false)
    }
  }

  // After a verify or suspend, show the refreshed row in the open preview.
  useEffect(() => {
    setViewing((current) =>
      current ? (items.find((item) => item.id === current.id) ?? current) : current,
    )
  }, [items])

  async function confirmVerification() {
    if (!verifying) return
    setSaving(true)
    try {
      await setAdminSellerVerification(verifying.id, nextVerification)
      setNotice(
        nextVerification === 'verified'
          ? `${sellerName(verifying)} is a verified seller. Their gifts show the Verified seller badge.`
          : `${sellerName(verifying)} is not verified. Their gifts stay in the catalog without the badge.`,
      )
      setVerifying(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update verification.'))
      setVerifying(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Sellers"
        description="Verify a business to show the Verified seller badge. Gifts stay in the catalog either way. Suspend still turns the account off."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit flex-wrap gap-1 rounded-lg bg-accent p-1">
          {tabs.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setTab(item.id)
                setPage(1)
              }}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors',
                tab === item.id
                  ? 'bg-brand-ink text-white'
                  : 'text-brand-ink/60 hover:text-brand-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search name or email"
            className="h-10 border-2 border-brand-ink/15 pl-9 focus-visible:border-brand-ink focus-visible:ring-0"
            aria-label="Search sellers"
          />
        </div>
      </div>

      <FormAlert error={error} notice={notice} className="mb-4" />

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={Store}
          title="No sellers here"
          description={
            query.trim()
              ? 'No seller matches that search.'
              : tab === 'suspended'
                ? 'No sellers are suspended.'
                : 'No sellers have signed up yet.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card">
          <ul className="divide-y divide-border/50 md:hidden">
            {items.map((seller) => (
              <li key={seller.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold">{sellerName(seller)}</span>
                      <VerifiedSellerBadge status={seller.verification_status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {seller.trading_name ? `${seller.legal_name} · ` : ''}
                      {seller.seller_type}
                    </p>
                  </div>
                  <StatusPill tone={accountTone[seller.status] ?? 'neutral'}>
                    {accountLabel(seller.status)}
                  </StatusPill>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Country</dt>
                    <dd className="font-medium">{seller.country_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Shops</dt>
                    <dd className="font-medium">{seller.shop_count}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="truncate font-medium">
                      {seller.email}
                      <span className="ml-1 font-normal text-muted-foreground">
                        · {seller.email_verified_at ? 'confirmed' : 'not confirmed'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Joined</dt>
                    <dd className="font-medium">{formatDate(seller.created_at)}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 flex-1"
                    onClick={() => setViewing(seller)}
                  >
                    <Eye className="size-4" />
                    Preview
                  </Button>
                  {seller.status !== 'deleted' ? (
                    <Button
                      type="button"
                      variant={seller.verification_status === 'verified' ? 'outline' : 'default'}
                      size="sm"
                      className="h-9 flex-1"
                      onClick={() => setVerifying(seller)}
                    >
                      {seller.verification_status === 'verified' ? 'Unverify' : 'Verify'}
                    </Button>
                  ) : null}
                  {seller.status === 'active' ? (
                    <Button type="button" variant="destructive" size="sm" className="h-9 flex-1" onClick={() => setPending(seller)}>
                      Suspend
                    </Button>
                  ) : seller.status === 'suspended' ? (
                    <Button type="button" variant="outline" size="sm" className="h-9 flex-1" onClick={() => setPending(seller)}>
                      Activate
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3">Seller</th>
                <th className="px-3 py-3">Country</th>
                <th className="px-3 py-3 text-center">Shops</th>
                <th className="px-3 py-3">Account</th>
                <th className="px-3 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-ink/10">
              {items.map((seller) => (
                <tr key={seller.id}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold',
                          seller.status === 'suspended'
                            ? 'bg-brand-ink/10 text-brand-ink/50'
                            : 'bg-brand-violet text-white',
                        )}
                      >
                        {initialsOf(sellerName(seller))}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewing(seller)}
                            className="text-left font-extrabold hover:text-brand-violet"
                          >
                            {sellerName(seller)}
                          </button>
                          <VerifiedSellerBadge status={seller.verification_status} />
                        </div>
                        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            title={seller.email_verified_at ? 'Email confirmed' : 'Email not confirmed'}
                            className={cn(
                              'size-1.5 shrink-0 rounded-sm',
                              seller.email_verified_at ? 'bg-brand-teal' : 'bg-amber-400',
                            )}
                          />
                          <span className="truncate">{seller.email}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex rounded-md bg-accent px-2 py-1 text-xs font-semibold whitespace-nowrap text-brand-ink">
                      {seller.country_name}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <span className="inline-flex size-8 items-center justify-center rounded-md border-2 border-brand-ink/10 font-poster text-base">
                      {seller.shop_count}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusPill tone={accountTone[seller.status] ?? 'neutral'}>
                      {accountLabel(seller.status)}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-3.5 text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(seller.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {seller.status !== 'deleted' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant={seller.verification_status === 'verified' ? 'outline' : 'default'}
                          onClick={() => setVerifying(seller)}
                        >
                          {seller.verification_status === 'verified' ? 'Unverify' : 'Verify'}
                        </Button>
                      ) : null}
                      {seller.status === 'active' ? (
                        <Button type="button" size="sm" variant="destructive" onClick={() => setPending(seller)}>
                          Suspend
                        </Button>
                      ) : seller.status === 'suspended' ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => setPending(seller)}>
                          Activate
                        </Button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setViewing(seller)}
                        title="Preview seller"
                        aria-label={`Preview ${sellerName(seller)}`}
                        className="flex size-9 items-center justify-center rounded-md border-2 border-brand-ink/15 text-brand-ink transition-colors hover:border-brand-ink hover:bg-brand-ink hover:text-white"
                      >
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <p className="border-t border-brand-ink/10 px-4 py-3 text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
            {total} {total === 1 ? 'seller' : 'sellers'}
          </p>
          <div className="px-4 pb-4">
            <PageNav
              page={page}
              pageCount={Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE))}
              onPage={setPage}
              label="Seller pages"
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={verifying !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setVerifying(null)
        }}
        tone={nextVerification === 'verified' ? 'default' : 'danger'}
        title={nextVerification === 'verified' ? 'Verify this seller?' : 'Remove verification?'}
        description={
          nextVerification === 'verified'
            ? `${verifying ? sellerName(verifying) : 'This seller'} keeps selling, and their gifts, shop, and profile show the Verified seller badge.`
            : `${verifying ? sellerName(verifying) : 'This seller'} keeps selling. The Verified seller badge comes off their gifts, shop, and profile.`
        }
        confirmLabel={nextVerification === 'verified' ? 'Verify' : 'Unverify'}
        busy={saving}
        onConfirm={() => void confirmVerification()}
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setPending(null)
        }}
        tone={nextStatus === 'suspended' ? 'danger' : 'default'}
        title={nextStatus === 'suspended' ? 'Suspend this seller?' : 'Activate this seller?'}
        description={
          nextStatus === 'suspended'
            ? `${pending ? sellerName(pending) : 'This seller'} cannot sign in or keep using the seller account. Their shops leave the public catalog until you activate them.`
            : `${pending ? sellerName(pending) : 'This seller'} can sign in again, and their public shops come back.`
        }
        confirmLabel={nextStatus === 'suspended' ? 'Suspend' : 'Activate'}
        busy={saving}
        onConfirm={() => void confirmStatus()}
      />
      <SellerPreview
        seller={viewing}
        onClose={() => setViewing(null)}
        onVerify={() => viewing && setVerifying(viewing)}
        onStatus={() => viewing && setPending(viewing)}
      />
    </>
  )
}

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase() || 'S'
  )
}

/** A quick look at one seller, with verify and suspend; the full record is its own page. */
function SellerPreview({
  seller,
  onClose,
  onVerify,
  onStatus,
}: {
  seller: AdminSeller | null
  onClose: () => void
  onVerify: () => void
  onStatus: () => void
}) {
  const [record, setRecord] = useState<AdminSellerRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sellerId = seller?.id ?? null

  useEffect(() => {
    if (!sellerId) return
    let cancelled = false
    setRecord(null)
    setError(null)
    getAdminSeller(sellerId)
      .then((data) => {
        if (!cancelled) setRecord(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load this seller.'))
      })
    return () => {
      cancelled = true
    }
  }, [sellerId])

  const verified = seller?.verification_status === 'verified'
  const shops = record?.shops ?? []

  return (
    <AdminPreviewSheet
      open={seller !== null}
      onClose={onClose}
      eyebrow="Seller"
      title={seller ? sellerName(seller) : 'Seller'}
      description={seller ? `${seller.legal_name} · ${seller.seller_type} · ${seller.country_name}` : undefined}
      badges={
        seller ? (
          <>
            <VerifiedSellerBadge status={seller.verification_status} />
            <StatusPill tone={accountTone[seller.status] ?? 'neutral'}>
              {accountLabel(seller.status)}
            </StatusPill>
          </>
        ) : null
      }
      fullDetailsTo={seller ? `/admin/sellers/${seller.id}` : undefined}
      actions={
        seller && seller.status !== 'deleted' ? (
          <>
            <Button
              type="button"
              variant={verified ? 'outline' : 'default'}
              className="h-10 px-4"
              onClick={onVerify}
            >
              {verified ? <BadgeX className="size-4" /> : <BadgeCheck className="size-4" />}
              {verified ? 'Unverify' : 'Verify'}
            </Button>
            {seller.status === 'active' ? (
              <Button type="button" variant="destructive" className="h-10 px-4" onClick={onStatus}>
                <Ban className="size-4" />
                Suspend
              </Button>
            ) : seller.status === 'suspended' ? (
              <Button type="button" variant="outline" className="h-10 px-4" onClick={onStatus}>
                <Power className="size-4" />
                Activate
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {seller ? (
        <>
          <PreviewCounts
            items={[
              { label: 'Shops', value: record ? shops.length : '–', tone: 'violet' },
              { label: 'Gifts', value: record ? (record.products ?? []).length : '–', tone: 'teal' },
              { label: 'Order lines', value: record ? (record.orders ?? []).length : '–', tone: 'ink' },
            ]}
          />
          <PreviewFacts
            items={[
              { label: 'Email', value: seller.email },
              { label: 'Confirmed', value: seller.email_verified_at ? 'Yes' : 'Not yet' },
              { label: 'Phone', value: record?.phone || seller.phone },
              { label: 'Country', value: seller.country_name },
              { label: 'Type', value: seller.seller_type },
              { label: 'Joined', value: formatDate(seller.created_at) },
            ]}
          />
          <FormAlert error={error} />
          {record ? (
            <div className="space-y-2">
              <PreviewHeading>Shops</PreviewHeading>
              {shops.length ? (
                <ul className="space-y-2">
                  {shops.map((shop) => (
                    <li
                      key={shop.id}
                      className="flex items-center gap-3 rounded-lg border-2 border-brand-ink/10 p-2.5"
                    >
                      <span className="size-10 shrink-0 overflow-hidden rounded-md bg-accent">
                        {shop.image_url ? (
                          <img src={shop.image_url} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-brand-violet">
                            <Store className="size-4" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{shop.name}</span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">
                          /{shop.slug}
                        </span>
                      </span>
                      <StatusPill tone={shop.status === 'active' ? 'good' : 'neutral'}>{shop.status}</StatusPill>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No shops yet.</p>
              )}
            </div>
          ) : !error ? (
            <Loading />
          ) : null}
        </>
      ) : null}
    </AdminPreviewSheet>
  )
}
