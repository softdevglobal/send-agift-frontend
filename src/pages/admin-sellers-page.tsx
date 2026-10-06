import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, Search, Store } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  listAdminSellers,
  setAdminSellerStatus,
  setAdminSellerVerification,
  type AdminSeller,
  type AdminSellerStatus,
} from '@/api/admin'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, TABLE_PAGE_SIZE } from '@/components/common/page-nav'
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
import { AdminEmptyState, AdminPageHeader, adminPanelClass, formatDate } from '@/features/admin'
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
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setTab(item.id)
                setPage(1)
              }}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                tab === item.id
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
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
            className="h-10 rounded-full pl-9"
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
        <div className={cn(adminPanelClass, 'overflow-x-auto')}>
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Shops</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((seller) => (
                <tr key={seller.id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{sellerName(seller)}</span>
                      <VerifiedSellerBadge status={seller.verification_status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {seller.trading_name ? `${seller.legal_name} · ` : ''}
                      {seller.seller_type}
                    </p>
                  </td>
                  <td className="px-4 py-3">{seller.country_name}</td>
                  <td className="px-4 py-3">{seller.shop_count}</td>
                  <td className="px-4 py-3">
                    <div>{seller.email}</div>
                    <p className="text-xs text-muted-foreground">
                      {seller.email_verified_at ? 'Email confirmed' : 'Email not confirmed'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={accountTone[seller.status] ?? 'neutral'}>
                      {accountLabel(seller.status)}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(seller.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/sellers/${seller.id}`}>Details</Link>
                      </Button>
                      {seller.status !== 'deleted' ? (
                        <Button
                          type="button"
                          variant={seller.verification_status === 'verified' ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => setVerifying(seller)}
                        >
                          {seller.verification_status === 'verified' ? 'Unverify' : 'Verify'}
                        </Button>
                      ) : null}
                      {seller.status === 'active' ? (
                        <Button type="button" variant="destructive" size="sm" onClick={() => setPending(seller)}>
                          Suspend
                        </Button>
                      ) : seller.status === 'suspended' ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => setPending(seller)}>
                          Activate
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-muted-foreground">
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

      <Dialog open={verifying !== null} onOpenChange={(open) => !open && !saving && setVerifying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {nextVerification === 'verified' ? 'Verify this seller?' : 'Remove verification?'}
            </DialogTitle>
            <DialogDescription>
              {nextVerification === 'verified'
                ? `${verifying ? sellerName(verifying) : 'This seller'} keeps selling, and their gifts, shop, and profile show the Verified seller badge.`
                : `${verifying ? sellerName(verifying) : 'This seller'} keeps selling. The Verified seller badge comes off their gifts, shop, and profile.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVerifying(null)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void confirmVerification()} disabled={saving}>
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {nextVerification === 'verified' ? 'Verify' : 'Unverify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && !saving && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {nextStatus === 'suspended' ? 'Suspend this seller?' : 'Activate this seller?'}
            </DialogTitle>
            <DialogDescription>
              {nextStatus === 'suspended'
                ? `${pending ? sellerName(pending) : 'This seller'} cannot sign in or keep using the seller account. Their shops leave the public catalog until you activate them.`
                : `${pending ? sellerName(pending) : 'This seller'} can sign in again, and their public shops come back.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPending(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={nextStatus === 'suspended' ? 'destructive' : 'default'}
              onClick={() => void confirmStatus()}
              disabled={saving}
            >
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {nextStatus === 'suspended' ? 'Suspend' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
