import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, Gift, LoaderCircle, Pencil, Plus, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'

import { listAdminSellers, type AdminSeller } from '@/api/admin'
import { listCountries, type Country } from '@/api/countries'
import {
  freeGiftErrorCode,
  isFreeGiftDisabled,
  listAdminFreeGiftOrders,
  listFreeGiftCountryBudgets,
  listFreeGiftPrograms,
  setAdminFreeGiftProgram,
  setFreeGiftCountryBudget,
  setFreeGiftSellerStopped,
  type AdminFreeGiftOrder,
  type AdminFreeGiftProgram,
  type FreeGiftCountryApply,
  type FreeGiftCountryBudget,
} from '@/api/free-gifts'
import { CurrencySelect } from '@/components/common/currency-select'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FormAlert } from '@/components/common/form-alert'
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
import { Switch } from '@/components/ui/switch'
import { AdminEmptyState, AdminPageHeader } from '@/features/admin'
import { Loading, StatusPill } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { countryOptionLabel } from '@/lib/country-options'
import { selectClassName } from '@/lib/form-styles'
import { formatPriceAmount, majorToMinor, minorToMajor } from '@/lib/money'
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

const budgetTone = {
  held: 'warn',
  spent: 'good',
  released: 'neutral',
  none: 'neutral',
} as const

const budgetLabel = {
  held: 'Held',
  spent: 'Spent',
  released: 'Given back',
  none: 'None',
} as const

function formatDay(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Every seller's free gift program: the marketing budget SendAGift sets for
 * them, what is held and spent, who sent which gift to whom, and the switch
 * that stops one seller's program at once. Stopping refuses new gifts; gifts
 * already confirmed are still fulfilled.
 */
export function AdminFreeGiftsPage() {
  const [items, setItems] = useState<AdminFreeGiftProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [disabled, setDisabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [target, setTarget] = useState<AdminFreeGiftProgram | null>(null)
  const [busy, setBusy] = useState(false)
  const [orders, setOrders] = useState<AdminFreeGiftOrder[]>([])
  const [orderSeller, setOrderSeller] = useState('')
  const [budgetFor, setBudgetFor] = useState<AdminFreeGiftProgram | 'new' | null>(null)
  const [countryBudgets, setCountryBudgets] = useState<FreeGiftCountryBudget[]>([])
  // 'new' opens the dialog on the whole-country mode; a budget edits that country.
  const [countryFor, setCountryFor] = useState<FreeGiftCountryBudget | 'new' | null>(null)
  const pages = usePagedList(items, TABLE_PAGE_SIZE)
  const orderPages = usePagedList(orders, TABLE_PAGE_SIZE)

  const load = useCallback(async () => {
    try {
      const [programs, sent, byCountry] = await Promise.all([
        listFreeGiftPrograms(),
        listAdminFreeGiftOrders(orderSeller),
        listFreeGiftCountryBudgets(),
      ])
      setItems(programs)
      setCountryBudgets(byCountry)
      setOrders(sent)
      setError(null)
    } catch (err) {
      if (isFreeGiftDisabled(err)) setDisabled(true)
      else setError(getErrorMessage(err, 'Could not load the free gift programs.'))
    } finally {
      setLoading(false)
    }
  }, [orderSeller])

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
  // Money is per currency, so a total only shows when there is one.
  const currencies = [...new Set(items.map((p) => p.currency))]
  const totalCurrency = currencies.length === 1 ? currencies[0] : null
  const totalBudget = items.reduce((sum, p) => sum + p.budget_cap, 0)
  const totalSpent = items.reduce((sum, p) => sum + p.budget_spent + p.budget_held, 0)

  return (
    <>
      <AdminPageHeader
        title="Free gifts"
        description="Each customer has one free gift, funded by a marketing budget you set for the seller. Set budgets, start or stop a seller's program, and see every gift sent. The whole program is switched with FREE_GIFT_ENABLED on the server."
        action={
          disabled ? undefined : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setCountryFor('new')} className="h-10">
                <Plus className="size-4" />
                Set a country budget
              </Button>
              <Button variant="outline" onClick={() => setBudgetFor('new')} className="h-10">
                Set one seller
              </Button>
            </div>
          )
        }
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
            <SummaryTile
              label="Budget used"
              value={totalCurrency ? formatPriceAmount(totalSpent, totalCurrency) : '–'}
              hint={
                totalCurrency
                  ? `of ${formatPriceAmount(totalBudget, totalCurrency)} · ${stoppedCount} stopped`
                  : `${stoppedCount} stopped · several currencies`
              }
              className="bg-brand-ink text-white"
            />
          </section>

          <FormAlert error={error} notice={notice} className="mb-4" />

          {!loading ? (
            <section className="mb-6">
              <h2 className="font-poster text-xl">Budgets by country</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                One budget per country, given to every seller registered there. Each seller gets the
                full amount for their own free gifts.
              </p>
              {countryBudgets.length === 0 ? (
                <p className="rounded-xl border-2 border-dashed border-brand-ink/15 px-4 py-6 text-center text-sm text-muted-foreground">
                  No country budgets yet. Set one and every seller in that country gets it once they
                  have agreed.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {countryBudgets.map((c) => (
                    <li
                      key={c.country_id}
                      className="space-y-2 rounded-xl border-2 border-brand-ink/10 bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-extrabold">{c.country_name}</p>
                        <StatusPill tone={c.status === 'active' ? 'good' : 'warn'}>
                          {c.status === 'active' ? 'On' : 'Paused'}
                        </StatusPill>
                      </div>
                      <p className="font-poster text-2xl tabular-nums">
                        {formatPriceAmount(c.budget_cap, c.currency)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">per seller</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.agreed} of {c.sellers} seller{c.sellers === 1 ? '' : 's'} agreed
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 border-2 border-brand-ink/15"
                        onClick={() => setCountryFor(c)}
                      >
                        <Pencil className="size-4" />
                        Change
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {loading ? (
            <Loading />
          ) : items.length === 0 ? (
            <AdminEmptyState
              icon={Gift}
              title="No programs yet"
              description="No seller has a free gift budget yet. Set one to let a seller start offering free gifts."
              action={
                <Button onClick={() => setCountryFor('new')}>
                  <Plus className="size-4" />
                  Set a country budget
                </Button>
              }
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
                      <div className="flex gap-1.5">
                        <BudgetButton onClick={() => setBudgetFor(p)} />
                        <StopButton program={p} onClick={() => setTarget(p)} />
                      </div>
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
                          <div className="flex justify-end gap-1.5">
                            <BudgetButton onClick={() => setBudgetFor(p)} />
                            <StopButton program={p} onClick={() => setTarget(p)} />
                          </div>
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

          {!loading ? (
            <section className="mt-8">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-poster text-xl">Gifts sent</h2>
                  <p className="text-sm text-muted-foreground">
                    Which seller funded each free gift, who sent it, to whom, and what it cost the
                    seller&rsquo;s budget. The customer pays the delivery.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="orders-seller" className="text-xs">
                    Seller
                  </Label>
                  <select
                    id="orders-seller"
                    value={orderSeller}
                    onChange={(event) => setOrderSeller(event.target.value)}
                    className={cn(selectClassName, 'h-10 min-w-48')}
                  >
                    <option value="">All sellers</option>
                    {items.map((p) => (
                      <option key={p.seller_id} value={p.seller_id}>
                        {p.seller_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {orders.length === 0 ? (
                <AdminEmptyState
                  icon={Gift}
                  title="No free gifts sent yet"
                  description="Gifts appear here the moment a customer sends one."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card">
                  <ul className="divide-y divide-border/40 md:hidden">
                    {orderPages.visible.map((o) => (
                      <li key={o.order_id} className="space-y-2 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 font-extrabold">{o.product_name}</p>
                          <StatusPill tone={budgetTone[o.budget_status]}>
                            {budgetLabel[o.budget_status]}
                          </StatusPill>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {o.seller_name} → {o.customer_name}
                          {o.recipient_name ? ` → ${o.recipient_name}` : ''}
                        </p>
                        <p className="text-xs">
                          <span className="font-medium tabular-nums">
                            {formatPriceAmount(o.cost, o.currency)}
                          </span>{' '}
                          · {o.status} · {formatDay(o.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[60rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-border/50 text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                          <th className="px-4 py-3 font-medium">Sent</th>
                          <th className="px-4 py-3 font-medium">Seller</th>
                          <th className="px-4 py-3 font-medium">Customer</th>
                          <th className="px-4 py-3 font-medium">To</th>
                          <th className="px-4 py-3 font-medium">Gift</th>
                          <th className="px-4 py-3 text-right font-medium">Cost</th>
                          <th className="px-4 py-3 font-medium">Order</th>
                          <th className="px-4 py-3 font-medium">Budget</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {orderPages.visible.map((o) => (
                          <tr key={o.order_id}>
                            <td className="px-4 py-3 align-middle whitespace-nowrap text-muted-foreground">
                              {formatDay(o.created_at)}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <Link to={`/admin/sellers/${o.seller_id}`} className="font-medium hover:underline">
                                {o.seller_name}
                              </Link>
                              <span className="block text-xs text-muted-foreground">{o.shop_name}</span>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <Link to={`/admin/customers/${o.customer_id}`} className="font-medium hover:underline">
                                {o.customer_name}
                              </Link>
                              <span className="block text-xs text-muted-foreground">{o.customer_email}</span>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              {o.recipient_name ?? '–'}
                              {o.recipient_city ? (
                                <span className="block text-xs text-muted-foreground">{o.recipient_city}</span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 align-middle font-medium">{o.product_name}</td>
                            <td className="px-4 py-3 text-right align-middle tabular-nums">
                              {formatPriceAmount(o.cost, o.currency)}
                              <span className="block text-xs text-muted-foreground">
                                customer paid{' '}
                                {formatPriceAmount(o.delivery_amount, o.currency)} delivery
                                {o.delivery_amount > 0 && !o.delivery_paid ? ' (unpaid)' : ''}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <span className="block capitalize">{o.status.replace('_', ' ')}</span>
                              <span className="block text-xs text-muted-foreground">
                                {o.order_number} · due {o.delivery_date}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <StatusPill tone={budgetTone[o.budget_status]}>
                                {budgetLabel[o.budget_status]}
                              </StatusPill>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 pb-4">
                    <PageNav
                      page={orderPages.page}
                      pageCount={orderPages.pageCount}
                      onPage={orderPages.setPage}
                      label="Gift pages"
                    />
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </>
      )}

      <CountryBudgetDialog
        target={countryFor}
        onClose={() => setCountryFor(null)}
        onSaved={async (result) => {
          setCountryFor(null)
          const skipped =
            result.skipped_not_agreed +
            result.skipped_stopped +
            result.skipped_below_committed +
            result.skipped_currency_locked
          const parts = [
            result.skipped_not_agreed > 0 ? `${result.skipped_not_agreed} have not agreed yet` : '',
            result.skipped_stopped > 0 ? `${result.skipped_stopped} are stopped` : '',
            result.skipped_below_committed > 0
              ? `${result.skipped_below_committed} already hold or spend more than this`
              : '',
            result.skipped_currency_locked > 0
              ? `${result.skipped_currency_locked} have products in another currency`
              : '',
          ].filter(Boolean)
          setNotice(
            `${result.budget.country_name} budget saved and applied to ${result.applied} seller${
              result.applied === 1 ? '' : 's'
            }.${skipped > 0 ? ` Skipped ${skipped}: ${parts.join(', ')}.` : ''}`,
          )
          await load()
        }}
      />

      <BudgetDialog
        target={budgetFor}
        programs={items}
        onClose={() => setBudgetFor(null)}
        onSaved={async (message) => {
          setBudgetFor(null)
          setNotice(message)
          await load()
        }}
      />

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

/**
 * Sets one budget for a whole country: every seller registered there who has
 * agreed gets it, as their own cap. Sellers who agree later get it too.
 */
function CountryBudgetDialog({
  target,
  onClose,
  onSaved,
}: {
  /** A country budget to change, 'new' to set one, null when closed. */
  target: FreeGiftCountryBudget | 'new' | null
  onClose: () => void
  onSaved: (result: FreeGiftCountryApply) => void | Promise<void>
}) {
  const existing = target !== null && target !== 'new' ? target : null
  const [countries, setCountries] = useState<Country[]>([])
  const [countryId, setCountryId] = useState('')
  const [currency, setCurrency] = useState('')
  const [amount, setAmount] = useState('')
  const [start, setStart] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (target === null) return
    setError(null)
    if (existing) {
      setCountryId(existing.country_id)
      setCurrency(existing.currency)
      setAmount(String(minorToMajor(existing.budget_cap, existing.currency)))
      setStart(existing.status === 'active')
    } else {
      setCountryId('')
      setCurrency('')
      setAmount('')
      setStart(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  useEffect(() => {
    if (target === null || countries.length > 0) return
    let cancelled = false
    listCountries()
      .then((list) => {
        if (!cancelled) setCountries(list)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [target, countries.length])

  const major = Number(amount)
  const cap = currency && Number.isFinite(major) ? majorToMinor(major, currency) : 0
  const valid = countryId !== '' && Boolean(currency) && cap > 0

  async function submit() {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      const result = await setFreeGiftCountryBudget(countryId, {
        budget_cap: cap,
        currency,
        status: start ? 'active' : 'paused',
      })
      await onSaved(result)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save this country budget.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existing ? `${existing.country_name} budget` : 'Set a country budget'}
          </DialogTitle>
          <DialogDescription>
            Every seller registered in this country who has agreed gets this amount as their own free
            gift budget. Each gift holds the product price from it when sent and spends it when
            delivered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="country-budget-country">Country</Label>
          <select
            id="country-budget-country"
            value={countryId}
            onChange={(event) => {
              const id = event.target.value
              setCountryId(id)
              // The country's own currency is the sensible default; it can
              // still be changed below.
              const picked = countries.find((country) => country.id === id)
              if (picked?.default_currency) setCurrency(picked.default_currency)
            }}
            disabled={existing !== null}
            className={selectClassName}
          >
            <option value="">Choose a country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {countryOptionLabel(country)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="country-budget-currency">Currency</Label>
            <CurrencySelect
              id="country-budget-currency"
              value={currency}
              onChange={setCurrency}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country-budget-amount">
              Budget per seller{currency ? ` (${currency})` : ''}
            </Label>
            <Input
              id="country-budget-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="2500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border-2 border-brand-ink/10 px-4 py-3">
          <div>
            <Label htmlFor="country-budget-start" className="font-bold">
              Start free gifts now
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Turns free gifts on for every seller in the country who has agreed.
            </p>
          </div>
          <Switch id="country-budget-start" checked={start} onCheckedChange={setStart} />
        </div>

        <FormAlert error={error} />

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!valid || busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Apply to the country
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BudgetButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="h-9 border-2 border-brand-ink/15">
      <Pencil className="size-4" />
      Budget
    </Button>
  )
}

/**
 * Sets one seller's marketing budget and starts or pauses their program. The
 * seller agreed to a budget set by SendAGift when they registered; one who did
 * not cannot be given a budget until they do.
 */
function BudgetDialog({
  target,
  programs,
  onClose,
  onSaved,
}: {
  /** A program to change, 'new' to set one up, null when closed. */
  target: AdminFreeGiftProgram | 'new' | null
  programs: AdminFreeGiftProgram[]
  onClose: () => void
  onSaved: (message: string) => void | Promise<void>
}) {
  const existing = target !== null && target !== 'new' ? target : null
  const [sellers, setSellers] = useState<AdminSeller[]>([])
  const [sellerId, setSellerId] = useState('')
  const [currency, setCurrency] = useState('')
  const [amount, setAmount] = useState('')
  const [start, setStart] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (target === null) return
    setError(null)
    if (existing) {
      setSellerId(existing.seller_id)
      setCurrency(existing.currency)
      setAmount(String(minorToMajor(existing.budget_cap, existing.currency)))
      setStart(existing.status === 'active')
    } else {
      setSellerId('')
      setCurrency('')
      setAmount('')
      setStart(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  // Sellers to choose from, once, when the dialog is first opened for a new one.
  useEffect(() => {
    if (target !== 'new' || sellers.length > 0) return
    let cancelled = false
    listAdminSellers('active', '', 1, 100)
      .then((res) => {
        if (!cancelled) setSellers(res.items)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [target, sellers.length])

  const programBySeller = useMemo(
    () => new Map(programs.map((p) => [p.seller_id, p])),
    [programs],
  )
  // Picking a seller who already has a program starts from what it has now.
  function pickSeller(id: string) {
    setSellerId(id)
    const current = programBySeller.get(id)
    if (current) {
      setCurrency(current.currency)
      setAmount(String(minorToMajor(current.budget_cap, current.currency)))
      setStart(current.status === 'active')
    }
  }

  const committed = existing
    ? existing.budget_held + existing.budget_spent
    : (programBySeller.get(sellerId)?.budget_held ?? 0) +
      (programBySeller.get(sellerId)?.budget_spent ?? 0)
  const major = Number(amount)
  const cap = currency && Number.isFinite(major) ? majorToMinor(major, currency) : 0
  const belowCommitted = cap > 0 && cap < committed
  const stopped = (existing ?? programBySeller.get(sellerId))?.status === 'stopped'
  const valid = sellerId !== '' && Boolean(currency) && cap > 0 && !belowCommitted && !stopped

  async function submit() {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await setAdminFreeGiftProgram(sellerId, {
        budget_cap: cap,
        currency,
        status: start ? 'active' : 'paused',
      })
      await onSaved(start ? 'Budget saved and the free gifts are on.' : 'Budget saved. The program is paused.')
    } catch (err) {
      const code = freeGiftErrorCode(err)
      setError(
        code === 'SELLER_TERMS_REQUIRED'
          ? 'This seller has not agreed to the free gift marketing budget yet. Ask them to open Free gifts in their dashboard and agree.'
          : code === 'CURRENCY_LOCKED'
            ? 'The currency cannot change while this seller has products or gifts in the program.'
            : getErrorMessage(err, 'Could not save this budget.'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? `${existing.seller_name}'s budget` : 'Set a seller budget'}</DialogTitle>
          <DialogDescription>
            The most this seller funds in free gifts. Each gift holds the product price (not delivery, which the customer pays) from the
            budget when it is sent and spends it when it is delivered.
          </DialogDescription>
        </DialogHeader>

        {!existing ? (
          <div className="space-y-1.5">
            <Label htmlFor="budget-seller">Seller</Label>
            <select
              id="budget-seller"
              value={sellerId}
              onChange={(event) => pickSeller(event.target.value)}
              className={selectClassName}
            >
              <option value="">Choose a seller</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.trading_name || seller.legal_name} · {seller.email}
                  {programBySeller.has(seller.id) ? ' (has a budget)' : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="budget-currency">Currency</Label>
            <CurrencySelect
              id="budget-currency"
              value={currency}
              onChange={setCurrency}
              disabled={Boolean(programBySeller.get(sellerId)) && committed > 0}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Budget{currency ? ` (${currency})` : ''}</Label>
            <Input
              id="budget-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="2500"
            />
          </div>
        </div>
        {belowCommitted ? (
          <p className="text-xs font-medium text-destructive">
            It cannot be lower than {formatPriceAmount(committed, currency)}, which is already held
            and spent.
          </p>
        ) : null}
        {stopped ? (
          <p className="text-xs font-medium text-destructive">
            This seller&rsquo;s program is stopped. Re-allow it first, then set the budget.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4 rounded-lg border-2 border-brand-ink/10 px-4 py-3">
          <div>
            <Label htmlFor="budget-start" className="font-bold">
              Start free gifts now
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Customers can send this seller&rsquo;s free gifts once they have added products.
            </p>
          </div>
          <Switch id="budget-start" checked={start} onCheckedChange={setStart} />
        </div>

        <FormAlert error={error} />

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!valid || busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Save budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
