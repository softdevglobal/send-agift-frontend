import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Coins, LoaderCircle, XCircle } from 'lucide-react'

import {
  confirmPointsPurchase,
  describeRate,
  failPointsPurchase,
  formatCents,
  listPointsPurchasesForAdmin,
  type PointsPurchase,
  type PointsPurchaseStatus,
  type PointsRate,
} from '@/api/points'
import { FormAlert } from '@/components/common/form-alert'
import { Sparkle } from '@/components/common/storefront-decor'
import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
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
import { AdminEmptyState, AdminPageHeader, formatDate } from '@/features/admin'
import { Loading, ReasonDialog, StatusPill } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { isSuperAdmin } from '@/lib/auth'
import { cn } from '@/lib/utils'

const tabs: { id: PointsPurchaseStatus | ''; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: '', label: 'All' },
]

const statusTone = {
  pending: 'warn',
  completed: 'good',
  failed: 'bad',
  cancelled: 'neutral',
} as const

/**
 * Sellers' points purchases. Points are only credited once a payment is
 * confirmed. By the provider's webhook, or here by a Super Admin who has
 * seen the money arrive. Both are audited.
 */
export function AdminPointsPage() {
  const [tab, setTab] = useState<PointsPurchaseStatus | ''>('pending')
  const [items, setItems] = useState<PointsPurchase[]>([])
  const [rate, setRate] = useState<PointsRate | null>(null)
  /** Every purchase, for the summary cards and the tab counts. */
  const [all, setAll] = useState<PointsPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<PointsPurchase | null>(null)
  const [failing, setFailing] = useState<PointsPurchase | null>(null)
  const canAct = isSuperAdmin()
  const pages = usePagedList(items, TABLE_PAGE_SIZE, tab)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, everything] = await Promise.all([
        listPointsPurchasesForAdmin(tab),
        listPointsPurchasesForAdmin(''),
      ])
      setItems(res.items)
      setRate(res.rate)
      setAll(everything.items)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load purchases.'))
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  const counts = {
    pending: all.filter((p) => p.status === 'pending').length,
    completed: all.filter((p) => p.status === 'completed').length,
    failed: all.filter((p) => p.status === 'failed').length,
    cancelled: all.filter((p) => p.status === 'cancelled').length,
  }
  const completed = all.filter((p) => p.status === 'completed')
  const pointsSold = completed.reduce((sum, p) => sum + (p.points_credited ?? p.points), 0)
  const collected = completed.reduce((sum, p) => sum + (p.paid_amount_cents ?? p.amount_cents), 0)
  const currency = completed[0]?.currency || 'USD'

  return (
    <>
      <AdminPageHeader
        title="Seller points"
        description={`Points sellers have bought to fund product rewards${
          rate ? ` · ${describeRate(rate)}` : ''
        }. A pending purchase is credited only when its payment is confirmed.`}
      />

      {/* The rate, then the four numbers that matter, then the list. */}
      <section className="relative mb-5 grid overflow-hidden rounded-xl bg-amber-300 text-amber-950 lg:grid-cols-[minmax(0,1fr)_auto]">
        <Sparkle className="absolute top-5 right-[40%] hidden size-6 text-white lg:block" />
        <div className="flex flex-col justify-center gap-2 px-6 py-6 sm:px-8">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-md bg-brand-ink px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
            <Coins className="size-3.5 text-amber-300" />
            Points rate
          </p>
          <p className="font-poster text-4xl sm:text-5xl">{rate ? describeRate(rate) : '–'}</p>
          <p className="text-sm font-medium text-amber-950/75">
            What sellers pay for every point they promise as a reward.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 sm:p-5 lg:w-[34rem] lg:grid-cols-2">
          <SummaryTile
            label="Waiting"
            value={String(counts.pending)}
            hint="pending payment"
            className="bg-white text-brand-ink"
          />
          <SummaryTile
            label="Points sold"
            value={pointsSold.toLocaleString()}
            hint={`${counts.completed} completed`}
            className="bg-brand-violet text-white"
          />
          <SummaryTile
            label="Collected"
            value={formatCents(collected, currency)}
            hint="from completed purchases"
            className="bg-brand-teal text-brand-ink"
          />
          <SummaryTile
            label="Didn't go through"
            value={String(counts.failed + counts.cancelled)}
            hint={`${counts.failed} failed · ${counts.cancelled} cancelled`}
            className="bg-brand-ink text-white"
          />
        </div>
      </section>

      <div className="mb-5 flex w-fit flex-wrap gap-1 rounded-lg bg-accent p-1">
        {tabs.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-md px-3.5 py-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors',
              tab === t.id ? 'bg-brand-ink text-white' : 'text-brand-ink/60 hover:text-brand-ink',
            )}
          >
            {t.label}
            <span
              className={cn(
                'ml-1.5 rounded-sm px-1 text-[10px]',
                tab === t.id ? 'bg-brand-teal text-brand-ink' : 'bg-white text-brand-ink',
              )}
            >
              {t.id ? counts[t.id] : all.length}
            </span>
          </button>
        ))}
      </div>

      <FormAlert error={error} notice={notice} className="mb-4" />

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={Coins}
          title="Nothing here"
          description={tab === 'pending' ? 'No purchases are waiting for payment.' : 'No purchases yet.'}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card">
          <ul className="divide-y divide-border/40 md:hidden">
            {pages.visible.map((p) => (
              <li key={p.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold">{p.seller_name ?? 'Seller'}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.seller_email}</p>
                  </div>
                  <StatusPill tone={statusTone[p.status]}>{p.status}</StatusPill>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-poster text-xl tabular-nums">
                      {(p.points_credited ?? p.points).toLocaleString()}
                      <span className="ml-1 font-sans text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                        points
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                  </div>
                  <div className="text-right text-sm font-bold tabular-nums">
                    {formatCents(p.paid_amount_cents ?? p.amount_cents, p.currency)}
                    {p.paid_amount_cents != null && p.paid_amount_cents !== p.amount_cents ? (
                      <p className="text-xs font-normal text-muted-foreground">
                        asked {formatCents(p.amount_cents, p.currency)}
                      </p>
                    ) : null}
                  </div>
                </div>
                {p.confirmed_by ? (
                  <p className="text-xs text-muted-foreground">Confirmed by {p.confirmed_by}</p>
                ) : null}
                {p.failure_reason ? (
                  <p className="text-xs text-muted-foreground">{p.failure_reason}</p>
                ) : null}
                {canAct && p.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button size="sm" className="h-9 flex-1" onClick={() => setConfirming(p)}>
                      <CheckCircle2 className="size-3.5" />
                      Confirm paid
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 flex-1" onClick={() => setFailing(p)}>
                      <XCircle className="size-3.5" />
                      Fail
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                <th className="px-5 py-3 font-medium">Seller</th>
                <th className="px-3 py-3 font-medium">Started</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Points</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {pages.visible.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-violet text-xs font-extrabold text-white">
                        {(p.seller_name ?? 'S')
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0] ?? '')
                          .join('')
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-extrabold">{p.seller_name ?? 'Seller'}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.seller_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-3 py-3.5 font-poster text-lg tabular-nums">
                    {formatCents(p.paid_amount_cents ?? p.amount_cents, p.currency)}
                    {p.paid_amount_cents != null && p.paid_amount_cents !== p.amount_cents ? (
                      <p className="text-xs text-muted-foreground">
                        asked {formatCents(p.amount_cents, p.currency)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-300 px-2 py-1 text-xs font-bold tabular-nums text-amber-950">
                      <Coins className="size-3.5" />
                      {(p.points_credited ?? p.points).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill tone={statusTone[p.status]}>{p.status}</StatusPill>
                    {p.confirmed_by ? (
                      <p className="mt-1 text-xs text-muted-foreground">by {p.confirmed_by}</p>
                    ) : null}
                    {p.failure_reason ? (
                      <p className="mt-1 text-xs text-muted-foreground">{p.failure_reason}</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {canAct && p.status === 'pending' ? (
                      <div className="inline-flex gap-1.5">
                        <Button size="sm" className="h-8" onClick={() => setConfirming(p)}>
                          <CheckCircle2 className="size-3.5" />
                          Confirm paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => setFailing(p)}
                        >
                          <XCircle className="size-3.5" />
                          Fail
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="px-4 pb-4">
            <PageNav page={pages.page} pageCount={pages.pageCount} onPage={pages.setPage} label="Purchase pages" />
          </div>
        </div>
      )}

      <ConfirmPaidDialog
        purchase={confirming}
        onClose={() => setConfirming(null)}
        onDone={async (p) => {
          setConfirming(null)
          setNotice(
            `Credited ${(p.points_credited ?? p.points).toLocaleString()} points to ${
              p.seller_name ?? 'the seller'
            }.`,
          )
          await load()
        }}
      />

      <ReasonDialog
        open={failing !== null}
        onOpenChange={(open) => !open && setFailing(null)}
        title="Mark this purchase failed?"
        description="No points are credited. The seller sees the reason on their purchase."
        confirmLabel="Mark failed"
        onConfirm={async (reason) => {
          if (!failing) return
          await failPointsPurchase(failing.id, reason)
          setNotice('Purchase marked failed.')
          await load()
        }}
      />
    </>
  )
}

function ConfirmPaidDialog({
  purchase,
  onClose,
  onDone,
}: {
  purchase: PointsPurchase | null
  onClose: () => void
  onDone: (p: PointsPurchase) => void | Promise<void>
}) {
  const [paid, setPaid] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (purchase) {
      setPaid((purchase.amount_cents / 100).toFixed(2))
      setReference('')
      setNote('')
      setError(null)
    }
  }, [purchase])

  const paidCents = Math.round(Number(paid) * 100)
  const points = purchase && paidCents > 0 ? Math.floor(paidCents / purchase.cents_per_point) : 0

  async function submit() {
    if (!purchase) return
    if (!(paidCents > 0)) return setError('Enter the amount that was paid.')
    setBusy(true)
    setError(null)
    try {
      const done = await confirmPointsPurchase(purchase.id, {
        paid_amount_cents: paidCents,
        ...(reference.trim() ? { provider_reference: reference.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      await onDone(done)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={purchase !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm payment received</DialogTitle>
          <DialogDescription>
            Points are credited from the amount actually paid, at the rate this purchase was
            quoted at. This is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="paid-amount">Amount paid ({purchase?.currency})</Label>
            <Input
              id="paid-amount"
              type="number"
              min={0}
              step={0.01}
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paid-ref">Payment reference (optional)</Label>
            <Input
              id="paid-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. bank transfer ID"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paid-note">Note (optional)</Label>
            <Input id="paid-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
            Credits <span className="font-semibold">{points.toLocaleString()} points</span>
          </p>
        </div>
        <FormAlert error={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || points <= 0}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Credit points
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SummaryTile({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: string
  hint: string
  className: string
}) {
  return (
    <div className={cn('flex flex-col justify-between rounded-lg p-3.5', className)}>
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-75">{label}</span>
      <span className="mt-2 truncate font-poster text-2xl">{value}</span>
      <span className="truncate text-[11px] font-medium opacity-70">{hint}</span>
    </div>
  )
}
