import { useEffect, useState } from 'react'
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Search,
  Store,
  XCircle,
} from 'lucide-react'

import {
  getAdminSeller,
  listAdminSellers,
  reviewSeller,
  type SellerVerificationStatus,
} from '@/api/admin'
import type { AdminSellerList, AdminSellerSummary, SellerDetails } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AdminEmptyState, AdminPageHeader, adminPanelClass, formatDate } from '@/features/admin'
import { Loading, StatusPill } from '@/features/admin/games-ui'
import { sellerTypes } from '@/features/auth/seller-register-options'
import { getErrorMessage } from '@/lib/api'
import { textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 25

type Tab = { value: SellerVerificationStatus | ''; label: string }

const tabs: Tab[] = [
  { value: 'pending', label: 'Pending review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'unverified', label: 'Confirming email' },
  { value: '', label: 'All' },
]

const statusPill: Record<string, { tone: 'good' | 'warn' | 'bad' | 'neutral'; label: string }> = {
  pending: { tone: 'warn', label: 'Pending review' },
  verified: { tone: 'good', label: 'Verified' },
  rejected: { tone: 'bad', label: 'Rejected' },
  unverified: { tone: 'neutral', label: 'Confirming email' },
}

function sellerName(s: { trading_name?: string; legal_name: string }) {
  return s.trading_name?.trim() || s.legal_name
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'S'
  )
}

function sellerTypeLabel(value: string) {
  return sellerTypes.find((t) => t.value === value)?.label ?? value
}

/** Seller applications: confirm who they are, then approve or reject. */
export function AdminSellersPage() {
  const [status, setStatus] = useState<SellerVerificationStatus | ''>('pending')
  const [query, setQuery] = useState('')
  const [data, setData] = useState<AdminSellerList | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      listAdminSellers({ status, q: query.trim(), limit: PAGE_SIZE }, controller.signal)
        .then((result) => {
          setData(result)
          setError(null)
        })
        .catch((err) => {
          if (!controller.signal.aborted) setError(getErrorMessage(err, 'Could not load sellers.'))
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [status, query])

  async function loadMore() {
    if (!data) return
    setLoadingMore(true)
    try {
      const more = await listAdminSellers({
        status,
        q: query.trim(),
        limit: PAGE_SIZE,
        offset: data.sellers.length,
      })
      setData({ ...more, sellers: [...data.sellers, ...more.sellers] })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load more sellers.'))
    } finally {
      setLoadingMore(false)
    }
  }

  function handleReviewed(updated: { id: string; verification_status: string }, previous: string) {
    setData((current) => {
      if (!current) return current
      const counts = { ...current.counts }
      const prev = previous as keyof typeof counts
      const next = updated.verification_status as keyof typeof counts
      if (prev !== next) {
        counts[prev] = Math.max(0, (counts[prev] ?? 0) - 1)
        counts[next] = (counts[next] ?? 0) + 1
      }
      // A seller who no longer matches the tab leaves the list.
      const stays = status === '' || status === next
      return {
        counts,
        total: stays ? current.total : Math.max(0, current.total - 1),
        sellers: stays
          ? current.sellers.map((s) =>
              s.id === updated.id ? { ...s, verification_status: updated.verification_status } : s,
            )
          : current.sellers.filter((s) => s.id !== updated.id),
      }
    })
  }

  const pendingCount = data?.counts.pending ?? 0

  return (
    <>
      <AdminPageHeader
        title="Sellers"
        description="Check each seller's details, then approve or reject their account. They're emailed either way."
      />

      {pendingCount > 0 ? (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <BadgeCheck className="size-4 shrink-0" />
          <span>
            <strong>{pendingCount}</strong> seller{pendingCount === 1 ? ' is' : 's are'} waiting for review.
          </span>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Verification status">
        {tabs.map((tab) => {
          const count = tab.value ? data?.counts[tab.value] : undefined
          const active = status === tab.value
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatus(tab.value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors',
                active
                  ? 'bg-foreground text-background ring-foreground'
                  : 'bg-card text-muted-foreground ring-border/60 hover:text-foreground',
              )}
            >
              {tab.label}
              {count !== undefined ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px] tabular-nums',
                    active ? 'bg-background/20' : 'bg-muted',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search sellers"
          className="h-11 pl-9"
        />
      </div>

      <FormAlert error={error} className="mb-4" />

      {loading && !data ? (
        <Loading />
      ) : !data || data.sellers.length === 0 ? (
        <AdminEmptyState
          icon={Store}
          title={status === 'pending' ? 'No sellers waiting' : 'No sellers found'}
          description={
            status === 'pending'
              ? 'New applications appear here once the seller confirms their email.'
              : 'Try another tab or search.'
          }
        />
      ) : (
        <>
          <div className={cn(adminPanelClass, 'divide-y divide-border/40', loading && 'opacity-60')}>
            {data.sellers.map((s) => (
              <SellerRow key={s.id} seller={s} onOpen={() => setSelectedId(s.id)} />
            ))}
          </div>
          {data.sellers.length < data.total ? (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" className="h-10" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Load more ({data.total - data.sellers.length} left)
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Sheet open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedId ? (
            <SellerReviewSheet key={selectedId} sellerId={selectedId} onReviewed={handleReviewed} />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

function SellerRow({ seller, onOpen }: { seller: AdminSellerSummary; onOpen: () => void }) {
  const name = sellerName(seller)
  const pill = statusPill[seller.verification_status] ?? {
    tone: 'neutral' as const,
    label: seller.verification_status,
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/40"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {seller.email} · {seller.country_name}
          {seller.city ? ` · ${seller.city}` : ''}
        </p>
      </div>
      <div className="hidden text-right text-xs text-muted-foreground sm:block">
        <p>
          {seller.shop_count} shop{seller.shop_count === 1 ? '' : 's'}
        </p>
        <p>Joined {new Date(seller.created_at).toLocaleDateString()}</p>
      </div>
      <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
    </button>
  )
}

function SellerReviewSheet({
  sellerId,
  onReviewed,
}: {
  sellerId: string
  onReviewed: (seller: { id: string; verification_status: string }, previous: string) => void
}) {
  const [seller, setSeller] = useState<SellerDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'verified' | 'rejected' | null>(null)

  useEffect(() => {
    getAdminSeller(sellerId)
      .then((s) => {
        setSeller(s)
        setNote(s.verification_note ?? '')
      })
      .catch((err) => setError(getErrorMessage(err, 'Could not load seller.')))
  }, [sellerId])

  async function decide(decision: 'verified' | 'rejected') {
    if (!seller) return
    if (decision === 'rejected' && !note.trim()) {
      setError('Add a note telling the seller what to fix. It goes in their email.')
      return
    }
    setBusy(decision)
    setError(null)
    setNotice(null)
    try {
      const updated = await reviewSeller(seller.id, {
        status: decision,
        note: note.trim() || undefined,
      })
      onReviewed(updated, seller.verification_status)
      setSeller({ ...seller, ...updated })
      setNotice(
        decision === 'verified'
          ? 'Approved. The seller has been emailed that their account is active.'
          : 'Rejected. The seller has been emailed your note.',
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the decision.'))
    } finally {
      setBusy(null)
    }
  }

  if (!seller) {
    return (
      <div className="p-6">{error ? <FormAlert error={error} /> : <Loading />}</div>
    )
  }

  const name = sellerName(seller)
  const pill = statusPill[seller.verification_status] ?? {
    tone: 'neutral' as const,
    label: seller.verification_status,
  }
  const emailConfirmed = Boolean(seller.email_verified_at)

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-foreground">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <SheetTitle className="truncate">{name}</SheetTitle>
            <SheetDescription className="truncate">{seller.legal_name}</SheetDescription>
          </div>
        </div>
        <div className="mt-2">
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        </div>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-8">
        <dl className="grid grid-cols-1 gap-3 text-sm">
          <Fact icon={Mail} label="Email">
            {seller.email}
            <span
              className={cn(
                'ml-2 text-xs',
                emailConfirmed ? 'text-emerald-700' : 'text-muted-foreground',
              )}
            >
              {emailConfirmed ? `confirmed ${formatDate(seller.email_verified_at)}` : 'not confirmed yet'}
            </span>
          </Fact>
          {seller.phone ? (
            <Fact icon={Phone} label="Phone">
              {seller.phone}
            </Fact>
          ) : null}
          <Fact icon={Building2} label="Business type">
            {sellerTypeLabel(seller.seller_type)}
          </Fact>
        </dl>

        <section>
          <p className="mb-2 text-sm font-semibold">Addresses</p>
          {seller.addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No address given.</p>
          ) : (
            <ul className="space-y-2">
              {seller.addresses.map((a) => (
                <li key={a.id} className="flex gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5 text-sm ring-1 ring-border/50">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    {[a.line1, a.line2, a.city, a.region, a.postal_code].filter(Boolean).join(', ')}
                    {a.address_type ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">({a.address_type})</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="mb-2 text-sm font-semibold">Shops</p>
          {seller.shops.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shops yet. Sellers open shops once approved.</p>
          ) : (
            <ul className="space-y-2">
              {seller.shops.map((shop) => (
                <li key={shop.id} className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5 text-sm ring-1 ring-border/50">
                  <Store className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{shop.name}</span>
                  <StatusPill>{shop.status}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3 rounded-2xl p-4 ring-1 ring-border/60">
          <p className="text-sm font-semibold">Decision</p>
          {!emailConfirmed ? (
            <p className="text-sm text-muted-foreground">
              This seller hasn&apos;t confirmed their email yet. You can review them once they do.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="seller-review-note">Note to the seller</Label>
                <textarea
                  id="seller-review-note"
                  className={textareaClassName}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional when approving. Required when rejecting. Say what needs fixing."
                />
              </div>
              <FormAlert error={error} notice={notice} />
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  disabled={busy !== null || seller.verification_status === 'rejected'}
                  onClick={() => decide('rejected')}
                >
                  {busy === 'rejected' ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  Reject
                </Button>
                <Button
                  type="button"
                  className="h-10 bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={busy !== null || seller.verification_status === 'verified'}
                  onClick={() => decide('verified')}
                >
                  {busy === 'verified' ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Approve
                </Button>
              </div>
              {seller.verification_reviewed_at ? (
                <p className="text-xs text-muted-foreground">
                  Last reviewed {formatDate(seller.verification_reviewed_at)}
                </p>
              ) : null}
            </>
          )}
        </section>
      </div>
    </>
  )
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-muted/40 px-3 py-2.5 ring-1 ring-border/50">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">{label}</dt>
        <dd className="break-words">{children}</dd>
      </div>
    </div>
  )
}
