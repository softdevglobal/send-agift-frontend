import { useEffect, useState } from 'react'
import { Coins, Eye, LoaderCircle, Search, Users } from 'lucide-react'

import { getAdminCustomer, type AdminCustomerRecord } from '@/api/admin'
import {
  POINTS_ENTRY_LABEL,
  adjustCustomerPoints,
  getCustomerPoints,
  searchCustomers,
  type CustomerPointsSummary,
  type PointsWallet,
} from '@/api/points'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AdminEmptyState, AdminPageHeader, formatDate } from '@/features/admin'
import {
  AdminPreviewSheet,
  PreviewCounts,
  PreviewFacts,
  PreviewHeading,
} from '@/features/admin/admin-preview-sheet'
import { EarningRulesPanel } from '@/features/admin/earning-rules-panel'
import { OrderStatusBadge } from '@/features/customer-commerce/order-tracking'
import { formatPriceAmount } from '@/lib/money'
import { Loading, StatusPill } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { isSuperAdmin } from '@/lib/auth'
import { textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

/** Customers and their points wallets. Grants and deductions are Super Admin only. */
export function AdminCustomersPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CustomerPointsSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CustomerPointsSummary | null>(null)
  /** The customer open in the preview panel. */
  const [viewing, setViewing] = useState<CustomerPointsSummary | null>(null)
  const customers = usePagedList(results, TABLE_PAGE_SIZE, query)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      searchCustomers(query.trim(), controller.signal)
        .then((items) => {
          setResults(items)
          setError(null)
        })
        .catch((err) => {
          if (!controller.signal.aborted) setError(getErrorMessage(err, 'Could not search customers.'))
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  return (
    <>
      <AdminPageHeader
        title="Customers"
        description="Open a customer to see their account, addresses, recipients, saved gifts, and orders. Points stay on this list."
      />

      <EarningRulesPanel editable={isSuperAdmin()} />

      <div className="relative mb-5 max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or name"
          aria-label="Search customers"
          className="h-11 pl-9"
        />
      </div>

      <FormAlert error={error} className="mb-4" />

      {loading && results.length === 0 ? (
        <Loading />
      ) : results.length === 0 ? (
        <AdminEmptyState icon={Users} title="No customers found" description="Try another email or name." />
      ) : (
        <div className="overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card">
          {customers.visible.map((c) => (
            <div
              key={c.customer_id}
              className="flex items-center gap-3 border-b border-brand-ink/10 px-4 py-3 transition-colors last:border-0 hover:bg-accent/40 sm:gap-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-teal text-xs font-extrabold text-brand-ink">
                {initialsOf(c.display_name || c.email)}
              </span>
              <button
                type="button"
                onClick={() => setViewing(c)}
                className="min-w-0 flex-1 text-left hover:text-brand-violet"
              >
                <p className="truncate font-extrabold">{c.display_name || c.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.email} · {c.country_name}
                </p>
              </button>
              {c.status !== 'active' ? <StatusPill tone="warn">{c.status}</StatusPill> : null}
              <button
                type="button"
                onClick={() => setSelected(c)}
                title="Points wallet"
                className="flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1.5 text-sm font-bold tabular-nums text-amber-950 transition-colors hover:bg-amber-300"
              >
                <Coins className="size-4" />
                {c.balance.toLocaleString()}
              </button>
              <button
                type="button"
                onClick={() => setViewing(c)}
                title="Preview customer"
                aria-label={`Preview ${c.display_name || c.email}`}
                className="flex size-9 shrink-0 items-center justify-center rounded-md border-2 border-brand-ink/15 text-brand-ink transition-colors hover:border-brand-ink hover:bg-brand-ink hover:text-white"
              >
                <Eye className="size-4" />
              </button>
            </div>
          ))}
          <div className="px-4 pb-4">
            <PageNav
              page={customers.page}
              pageCount={customers.pageCount}
              onPage={customers.setPage}
              label="Customer pages"
            />
          </div>
        </div>
      )}

      <CustomerPreview
        customer={viewing}
        onClose={() => setViewing(null)}
        onOpenWallet={() => {
          const customer = viewing
          setViewing(null)
          setSelected(customer)
        }}
      />

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected ? (
            <WalletSheet
              key={selected.customer_id}
              customer={selected}
              onBalance={(balance) =>
                setResults((prev) =>
                  prev.map((c) => (c.customer_id === selected.customer_id ? { ...c, balance } : c)),
                )
              }
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

function WalletSheet({
  customer,
  onBalance,
}: {
  customer: CustomerPointsSummary
  onBalance: (balance: number) => void
}) {
  const [wallet, setWallet] = useState<PointsWallet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [direction, setDirection] = useState<'grant' | 'deduct'>('grant')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  // One key per intended change, so a double click cannot apply it twice.
  const [key, setKey] = useState(() => crypto.randomUUID())

  useEffect(() => {
    getCustomerPoints(customer.customer_id)
      .then(setWallet)
      .catch((err) => setError(getErrorMessage(err, 'Could not load points.')))
  }, [customer.customer_id])

  async function submit() {
    const n = Math.trunc(Number(amount))
    if (!(n > 0)) return setError('Enter a whole number of points above zero.')
    if (!reason.trim()) return setError('A reason is required. It is kept with the entry.')
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const updated = await adjustCustomerPoints(customer.customer_id, {
        amount: direction === 'grant' ? n : -n,
        reason: reason.trim(),
        idempotency_key: key,
      })
      setWallet(updated)
      onBalance(updated.balance)
      setAmount('')
      setReason('')
      setKey(crypto.randomUUID())
      setNotice(direction === 'grant' ? `Granted ${n} points.` : `Deducted ${n} points.`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{customer.display_name || customer.email}</SheetTitle>
        <SheetDescription>
          {customer.email} · {customer.country_name}
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        {!wallet ? (
          error ? <FormAlert error={error} /> : <Loading />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Balance', wallet.balance],
                ['Earned', wallet.lifetime_earned],
                ['Spent', wallet.lifetime_spent],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-muted/40 px-4 py-3 ring-1 ring-border/50">
                  <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
                  <p className="mt-1 font-poster text-xl tabular-nums">{Number(value).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {isSuperAdmin() ? (
              <div className="space-y-3 rounded-2xl p-4 ring-1 ring-border/60">
                <p className="text-sm font-semibold">Adjust points</p>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <select
                    aria-label="Direction"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as 'grant' | 'deduct')}
                  >
                    <option value="grant">Grant</option>
                    <option value="deduct">Deduct</option>
                  </select>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Points"
                    aria-label="Points"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points-reason">Reason</Label>
                  <textarea
                    id="points-reason"
                    className={textareaClassName}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. goodwill credit for a delayed order"
                  />
                </div>
                <FormAlert error={error} notice={notice} />
                <Button type="button" className="h-10 w-full" disabled={busy} onClick={submit}>
                  {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  {direction === 'grant' ? 'Grant points' : 'Deduct points'}
                </Button>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-semibold">History</p>
              {wallet.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No points activity yet.</p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {wallet.entries.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{e.description || POINTS_ENTRY_LABEL[e.entry_type]}</p>
                        <p className="truncate text-xs text-muted-foreground" title={e.reason}>
                          {POINTS_ENTRY_LABEL[e.entry_type] ?? e.entry_type} · {formatDate(e.created_at)}
                          {e.reason && e.reason !== e.description ? ` · ${e.reason}` : ''}
                        </p>
                      </div>
                      <p
                        className={cn(
                          'font-semibold tabular-nums',
                          e.amount_delta < 0 ? 'text-red-700' : 'text-emerald-700',
                        )}
                      >
                        {e.amount_delta > 0 ? '+' : ''}
                        {e.amount_delta.toLocaleString()}
                      </p>
                      <p className="w-16 text-right text-xs text-muted-foreground tabular-nums">
                        = {e.balance_after.toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function initialsOf(name: string) {
  return (
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase() || 'C'
  )
}

/** A quick look at one customer; the full record is its own page. */
function CustomerPreview({
  customer,
  onClose,
  onOpenWallet,
}: {
  customer: CustomerPointsSummary | null
  onClose: () => void
  onOpenWallet: () => void
}) {
  const [record, setRecord] = useState<AdminCustomerRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const customerId = customer?.customer_id ?? null

  useEffect(() => {
    if (!customerId) return
    let cancelled = false
    setRecord(null)
    setError(null)
    getAdminCustomer(customerId)
      .then((data) => {
        if (!cancelled) setRecord(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load this customer.'))
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  const orders = record?.orders ?? []
  const recent = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3)

  return (
    <AdminPreviewSheet
      open={customer !== null}
      onClose={onClose}
      eyebrow="Customer"
      title={customer ? customer.display_name || customer.email : 'Customer'}
      description={customer ? `${customer.email} · ${customer.country_name}` : undefined}
      badges={
        customer ? (
          <>
            <StatusPill tone={customer.status === 'active' ? 'good' : 'warn'}>{customer.status}</StatusPill>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-950">
              <Coins className="size-3" />
              {customer.balance.toLocaleString()} pts
            </span>
          </>
        ) : null
      }
      fullDetailsTo={customer ? `/admin/customers/${customer.customer_id}` : undefined}
      actions={
        customer ? (
          <Button type="button" variant="outline" className="h-10 px-4" onClick={onOpenWallet}>
            <Coins className="size-4" />
            Points wallet
          </Button>
        ) : null
      }
    >
      {customer ? (
        <>
          <PreviewCounts
            items={[
              { label: 'Orders', value: record ? orders.length : '–', tone: 'violet' },
              { label: 'Recipients', value: record ? (record.recipients ?? []).length : '–', tone: 'teal' },
              { label: 'Saved', value: record ? (record.saved_gifts ?? []).length : '–', tone: 'ink' },
              { label: 'Addresses', value: record ? (record.addresses ?? []).length : '–', tone: 'amber' },
            ]}
          />
          <PreviewFacts
            items={[
              { label: 'Email', value: customer.email },
              { label: 'Phone', value: record?.phone },
              { label: 'Country', value: customer.country_name },
              { label: 'Type', value: record?.customer_type },
              { label: 'Joined', value: formatDate(customer.created_at) },
              { label: 'Points', value: customer.balance.toLocaleString() },
            ]}
          />
          <FormAlert error={error} />
          {record ? (
            <div className="space-y-2">
              <PreviewHeading>Recent orders</PreviewHeading>
              {recent.length ? (
                <ul className="space-y-2">
                  {recent.map((order) => (
                    <li
                      key={order.id}
                      className="flex items-center justify-between gap-3 rounded-lg border-2 border-brand-ink/10 p-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{order.order_number}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {formatDate(order.created_at)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-bold tabular-nums">
                          {formatPriceAmount(order.total_amount, order.currency)}
                        </span>
                        <OrderStatusBadge status={order.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
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
