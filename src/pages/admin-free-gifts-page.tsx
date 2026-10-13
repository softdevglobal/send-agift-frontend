import { useCallback, useEffect, useState } from 'react'
import { Ban, Gift, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  isFreeGiftDisabled,
  listFreeGiftPrograms,
  setFreeGiftSellerStopped,
  type AdminFreeGiftProgram,
} from '@/api/free-gifts'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
import { Button } from '@/components/ui/button'
import { AdminEmptyState, AdminPageHeader } from '@/features/admin'
import { Loading, StatusPill } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

const statusTone = {
  active: 'good',
  paused: 'warn',
  stopped: 'bad',
  not_set: 'neutral',
} as const

const statusLabel = {
  active: 'On',
  paused: 'Paused',
  stopped: 'Stopped',
  not_set: 'Not set',
} as const

/**
 * Every seller's free gift program: the budget they set, what is held and
 * spent, and the switch that stops one seller's program at once. Stopping
 * refuses new gifts; gifts already confirmed are still fulfilled.
 */
export function AdminFreeGiftsPage() {
  const [items, setItems] = useState<AdminFreeGiftProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [disabled, setDisabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [target, setTarget] = useState<AdminFreeGiftProgram | null>(null)
  const [busy, setBusy] = useState(false)
  const pages = usePagedList(items, TABLE_PAGE_SIZE)

  const load = useCallback(async () => {
    try {
      setItems(await listFreeGiftPrograms())
      setError(null)
    } catch (err) {
      if (isFreeGiftDisabled(err)) setDisabled(true)
      else setError(getErrorMessage(err, 'Could not load the free gift programs.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function confirm() {
    if (!target) return
    const stop = target.status !== 'stopped'
    setBusy(true)
    try {
      await setFreeGiftSellerStopped(target.seller_id, stop)
      setNotice(
        stop
          ? `${target.seller_name}'s free gift program is stopped.`
          : `${target.seller_name} can offer free gifts again. Their program is paused until they turn it on.`,
      )
      setTarget(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change this program.'))
      setTarget(null)
    } finally {
      setBusy(false)
    }
  }

  const active = items.filter((p) => p.status === 'active').length
  const stoppedCount = items.filter((p) => p.status === 'stopped').length
  const giftsSent = items.reduce((sum, p) => sum + p.gifts_sent, 0)

  return (
    <>
      <AdminPageHeader
        title="Free gifts"
        description="Each customer has one free gift, funded by a seller's marketing budget. Stop a seller's program here; the whole program is switched with FREE_GIFT_ENABLED on the server."
      />

      {disabled ? (
        <AdminEmptyState
          icon={Gift}
          title="The program is off"
          description="FREE_GIFT_ENABLED is not set on the server, so every free gift route is refused. Turn it on there to open the program."
        />
      ) : (
        <>
          <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryTile label="Sellers" value={String(items.length)} hint="with a budget" className="bg-white text-brand-ink" />
            <SummaryTile label="On now" value={String(active)} hint="offering free gifts" className="bg-brand-teal text-brand-ink" />
            <SummaryTile label="Gifts sent" value={giftsSent.toLocaleString()} hint="confirmed or delivered" className="bg-brand-violet text-white" />
            <SummaryTile label="Stopped" value={String(stoppedCount)} hint="by an admin" className="bg-brand-ink text-white" />
          </section>

          <FormAlert error={error} notice={notice} className="mb-4" />

          {loading ? (
            <Loading />
          ) : items.length === 0 ? (
            <AdminEmptyState
              icon={Gift}
              title="No programs yet"
              description="No seller has set a free gift budget yet."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card">
              <ul className="divide-y divide-border/40 md:hidden">
                {pages.visible.map((p) => (
                  <li key={p.seller_id} className="space-y-3 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/admin/sellers/${p.seller_id}`} className="font-extrabold hover:underline">
                          {p.seller_name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{p.seller_email}</p>
                      </div>
                      <StatusPill tone={statusTone[p.status]}>{statusLabel[p.status]}</StatusPill>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-xs">
                      <Fact label="Budget" value={formatPriceAmount(p.budget_cap, p.currency)} />
                      <Fact label="Held" value={formatPriceAmount(p.budget_held, p.currency)} />
                      <Fact label="Spent" value={formatPriceAmount(p.budget_spent, p.currency)} />
                    </dl>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {p.gifts_sent} gift{p.gifts_sent === 1 ? '' : 's'} · {p.products} product
                        {p.products === 1 ? '' : 's'}
                      </p>
                      <StopButton program={p} onClick={() => setTarget(p)} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[52rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                      <th className="px-4 py-3 font-medium">Seller</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Budget</th>
                      <th className="px-4 py-3 text-right font-medium">Held</th>
                      <th className="px-4 py-3 text-right font-medium">Spent</th>
                      <th className="px-4 py-3 text-right font-medium">Remaining</th>
                      <th className="px-4 py-3 text-right font-medium">Gifts</th>
                      <th className="px-4 py-3 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {pages.visible.map((p) => (
                      <tr key={p.seller_id}>
                        <td className="px-4 py-3 align-middle">
                          <Link to={`/admin/sellers/${p.seller_id}`} className="font-medium hover:underline">
                            {p.seller_name}
                          </Link>
                          <span className="block text-xs text-muted-foreground">{p.seller_email}</span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <StatusPill tone={statusTone[p.status]}>{statusLabel[p.status]}</StatusPill>
                        </td>
                        <td className="px-4 py-3 text-right align-middle tabular-nums">
                          {formatPriceAmount(p.budget_cap, p.currency)}
                        </td>
                        <td className="px-4 py-3 text-right align-middle tabular-nums">
                          {formatPriceAmount(p.budget_held, p.currency)}
                        </td>
                        <td className="px-4 py-3 text-right align-middle tabular-nums">
                          {formatPriceAmount(p.budget_spent, p.currency)}
                        </td>
                        <td className="px-4 py-3 text-right align-middle font-medium tabular-nums">
                          {formatPriceAmount(p.budget_remaining, p.currency)}
                        </td>
                        <td className="px-4 py-3 text-right align-middle tabular-nums">
                          {p.gifts_sent}
                          <span className="block text-xs text-muted-foreground">
                            {p.products} product{p.products === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right align-middle">
                          <StopButton program={p} onClick={() => setTarget(p)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 pb-4">
                <PageNav
                  page={pages.page}
                  pageCount={pages.pageCount}
                  onPage={pages.setPage}
                  label="Program pages"
                />
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && !busy && setTarget(null)}
        tone={target?.status === 'stopped' ? 'default' : 'danger'}
        title={
          target?.status === 'stopped'
            ? `Re-allow ${target.seller_name}?`
            : `Stop ${target?.seller_name ?? 'this seller'}'s free gifts?`
        }
        description={
          target?.status === 'stopped'
            ? 'Their program goes back to paused. They turn it on again themselves.'
            : 'No new free gifts can be sent from this seller, starting now. Gifts already confirmed are still fulfilled, and the seller cannot turn the program back on until you re-allow it.'
        }
        confirmLabel={target?.status === 'stopped' ? 'Re-allow' : 'Stop program'}
        busy={busy}
        onConfirm={() => void confirm()}
      />
    </>
  )
}

function StopButton({ program, onClick }: { program: AdminFreeGiftProgram; onClick: () => void }) {
  const stopped = program.status === 'stopped'
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        'h-9 border-2',
        stopped ? 'border-brand-ink/15' : 'border-destructive/40 text-destructive hover:text-destructive',
      )}
    >
      {stopped ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
      {stopped ? 'Re-allow' : 'Stop'}
    </Button>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-medium tabular-nums">{value}</dd>
    </div>
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
  className?: string
}) {
  return (
    <div className={cn('flex flex-col justify-between rounded-xl border-2 border-brand-ink/10 p-4', className)}>
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-70">{label}</span>
      <span className="mt-2 font-poster text-3xl">{value}</span>
      <span className="mt-1 text-xs opacity-70">{hint}</span>
    </div>
  )
}
