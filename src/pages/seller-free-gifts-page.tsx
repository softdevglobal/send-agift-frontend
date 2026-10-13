import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Gift,
  Lock,
  LoaderCircle,
  Package,
  Pause,
  Play,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  freeGiftErrorCode,
  getFreeGiftProgram,
  isFreeGiftDisabled,
  listFreeGiftProducts,
  removeFreeGiftProduct,
  setFreeGiftProduct,
  setFreeGiftProgram,
  type FreeGiftProduct,
  type FreeGiftProgram,
} from '@/api/free-gifts'
import { listShopProducts, type Product } from '@/api/products'
import { getSellerMe } from '@/api/sellers'
import { CurrencySelect } from '@/components/common/currency-select'
import { FormAlert } from '@/components/common/form-alert'
import { Toast } from '@/components/common/toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  ConfirmDialog,
  SellerEmptyState,
  SellerPageHeader,
  SellerStat,
  sellerPanelClass,
} from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { selectClassName } from '@/lib/form-styles'
import { formatPriceAmount, majorToMinor, minorToMajor } from '@/lib/money'
import { cn } from '@/lib/utils'

type ToastState = { message: string; variant: 'success' | 'error' }

const programStatusStyle: Record<FreeGiftProgram['status'], { label: string; className: string }> = {
  active: { label: 'On', className: 'bg-brand-teal text-brand-ink' },
  paused: { label: 'Paused', className: 'bg-amber-300 text-amber-950' },
  stopped: { label: 'Stopped by SendAGift', className: 'bg-destructive text-white' },
  not_set: { label: 'Not set up', className: 'bg-muted text-muted-foreground' },
}

/**
 * The seller's side of the free gift program: a marketing budget, and the
 * products customers may send from it. The budget is a limit, not a prepaid
 * balance. Each gift holds its cost when it is ordered and spends it when it
 * is delivered.
 */
export function SellerFreeGiftsPage() {
  const [program, setProgram] = useState<FreeGiftProgram | null>(null)
  const [products, setProducts] = useState<FreeGiftProduct[]>([])
  const [catalog, setCatalog] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [disabled, setDisabled] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<FreeGiftProduct | 'new' | null>(null)
  const [removing, setRemoving] = useState<FreeGiftProduct | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [nextProgram, nextProducts] = await Promise.all([
        getFreeGiftProgram(),
        listFreeGiftProducts(),
      ])
      setProgram(nextProgram)
      setProducts(nextProducts)
      setLoadError(null)
    } catch (error) {
      if (isFreeGiftDisabled(error)) setDisabled(true)
      else setLoadError(getErrorMessage(error, 'Could not load your free gift program.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Every published product across the seller's shops, to choose from.
  useEffect(() => {
    let cancelled = false
    getSellerMe()
      .then(async (me) => {
        const lists = await Promise.all(
          (me.shops ?? []).map((shop) => listShopProducts(shop.id).catch(() => [] as Product[])),
        )
        if (!cancelled) setCatalog(lists.flat())
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const hasProgram = program !== null && program.status !== 'not_set'
  const stopped = program?.status === 'stopped'
  const currency = hasProgram ? program.currency : ''

  const addable = useMemo(() => {
    const taken = new Set(products.map((p) => p.product_id))
    return catalog.filter(
      (p) =>
        p.status === 'published' &&
        !taken.has(p.id) &&
        (!currency || p.currency.toUpperCase() === currency.toUpperCase()),
    )
  }, [catalog, products, currency])

  async function toggleProduct(product: FreeGiftProduct) {
    setBusyId(product.product_id)
    try {
      const status = product.status === 'active' ? 'paused' : 'active'
      await setFreeGiftProduct(product.product_id, { gifts_cap: product.gifts_cap, status })
      await refresh()
      setToast({
        message: status === 'active' ? 'Product is offered again.' : 'Product paused.',
        variant: 'success',
      })
    } catch (error) {
      setToast({ message: getErrorMessage(error, 'That did not work.'), variant: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  async function confirmRemove() {
    if (!removing) return
    setBusyId(removing.product_id)
    try {
      await removeFreeGiftProduct(removing.product_id)
      setRemoving(null)
      await refresh()
      setToast({ message: 'Product taken out of the program.', variant: 'success' })
    } catch (error) {
      setToast({ message: getErrorMessage(error, 'Could not remove it.'), variant: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (disabled) {
    return (
      <div className="space-y-6">
        <SellerPageHeader
          icon={Gift}
          title="Free gifts"
          description="Offer a free first gift to new customers from a marketing budget you set."
        />
        <SellerEmptyState
          icon={Gift}
          title="Not open yet"
          description="The free gift program is not switched on yet. You will be able to set a budget and choose products here when it opens."
        />
      </div>
    )
  }

  const status = programStatusStyle[program?.status ?? 'not_set']

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={Gift}
        tone="teal"
        title="Free gifts"
        description="Every customer has one free gift to send. Set a marketing budget and choose which of your products they can send. You fund the gift and its delivery; the customer pays nothing."
        action={
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] uppercase',
              status.className,
            )}
          >
            {status.label}
          </span>
        }
      />

      <FormAlert error={loadError} />
      {stopped ? (
        <FormAlert error="SendAGift has stopped your free gift program, so no new free gifts can be sent from your shop. Gifts already confirmed are still yours to fulfil. Contact support to have it re-allowed." />
      ) : null}

      {hasProgram ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SellerStat
            icon={Wallet}
            tone="teal"
            label="Remaining"
            value={formatPriceAmount(program.budget_remaining, program.currency)}
            hint="Still free for new gifts"
          />
          <SellerStat
            icon={Lock}
            tone="violet"
            label="Held"
            value={formatPriceAmount(program.budget_held, program.currency)}
            hint="Ordered, not delivered yet"
          />
          <SellerStat
            icon={CheckCircle2}
            tone="navy"
            label="Spent"
            value={formatPriceAmount(program.budget_spent, program.currency)}
            hint="Delivered gifts"
          />
          <SellerStat
            icon={Gift}
            tone="amber"
            label="Budget"
            value={formatPriceAmount(program.budget_cap, program.currency)}
            hint="The most you will fund"
          />
        </section>
      ) : null}

      {program ? (
        <BudgetForm
          key={program.updated_at ?? 'new'}
          program={program}
          hasProducts={products.length > 0}
          onSaved={async (message) => {
            await refresh()
            setToast({ message, variant: 'success' })
          }}
        />
      ) : null}

      <section className={sellerPanelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-accent text-primary">
              <Package className="size-3.5" />
            </span>
            <h2 className="font-medium">Products customers can send</h2>
          </div>
          <Button
            size="sm"
            className="h-9"
            disabled={!hasProgram || stopped}
            onClick={() => setEditing('new')}
          >
            <Plus className="size-4" />
            Add product
          </Button>
        </div>

        {!hasProgram ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Set your budget above first. Then choose the products.
          </p>
        ) : products.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No products yet. Add the ones you are happy to give away as a first gift.
          </p>
        ) : (
          <ul className="divide-y divide-brand-ink/10">
            {products.map((product) => {
              const busy = busyId === product.product_id
              const offered =
                product.status === 'active' &&
                product.product_status === 'published' &&
                (product.stock_left ?? 0) > 0 &&
                (product.gifts_cap === null || product.gifts_count < product.gifts_cap)
              return (
                <li key={product.product_id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {product.product_image_url ? (
                      <img src={product.product_image_url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <Package className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-extrabold">{product.product_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.shop_name} · {formatPriceAmount(product.price_amount, product.currency)}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span className="font-bold">
                        {product.gifts_count}
                        {product.gifts_cap !== null ? ` of ${product.gifts_cap}` : ''} sent
                      </span>
                      <span className={cn((product.stock_left ?? 0) > 0 ? 'text-muted-foreground' : 'font-bold text-destructive')}>
                        {product.stock_left === null
                          ? 'No stock set'
                          : product.stock_left > 0
                            ? `${product.stock_left} in stock`
                            : 'Out of stock'}
                      </span>
                      {product.product_status !== 'published' ? (
                        <span className="font-bold text-destructive">Not published</span>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] uppercase',
                      offered
                        ? 'bg-brand-teal text-brand-ink'
                        : product.status === 'paused'
                          ? 'bg-amber-300 text-amber-950'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {offered ? 'Offered' : product.status === 'paused' ? 'Paused' : 'Not offered'}
                  </span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 border-2 border-brand-ink/15"
                      disabled={busy || stopped}
                      onClick={() => setEditing(product)}
                    >
                      Cap
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 border-2 border-brand-ink/15"
                      disabled={busy || stopped}
                      aria-label={product.status === 'active' ? 'Pause product' : 'Offer product again'}
                      onClick={() => void toggleProduct(product)}
                    >
                      {busy ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : product.status === 'active' ? (
                        <Pause className="size-4" />
                      ) : (
                        <Play className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 text-destructive hover:text-destructive"
                      disabled={busy}
                      aria-label="Remove product"
                      onClick={() => setRemoving(product)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={cn(sellerPanelClass, 'p-5 text-sm leading-relaxed text-muted-foreground')}>
        <p>
          <span className="font-medium text-foreground">How it works.</span> Each free gift costs
          you the product price plus its delivery. That amount is{' '}
          <span className="font-medium text-foreground">held</span> the moment a customer orders,{' '}
          <span className="font-medium text-foreground">spent</span> when you mark it delivered, and
          given back if the customer cancels before you dispatch. When the remaining budget cannot
          cover a product, it stops being offered. A product is only offered while it is published
          and in stock, so keep stock up to date in{' '}
          <Link to="/seller/products" className="font-medium text-primary hover:underline">
            Products
          </Link>
          . Free gift orders arrive in{' '}
          <Link to="/seller/orders" className="font-medium text-primary hover:underline">
            Orders
          </Link>{' '}
          like any other.
        </p>
      </section>

      <ProductDialog
        target={editing}
        addable={addable}
        onClose={() => setEditing(null)}
        onSaved={async (message) => {
          setEditing(null)
          await refresh()
          setToast({ message, variant: 'success' })
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Take this product out?"
        description={
          <>
            <span className="font-medium">{removing?.product_name}</span> will no longer be offered
            as a free gift. Gifts already confirmed for it are still yours to fulfil.
          </>
        }
        confirmLabel="Remove"
        busy={busyId !== null && busyId === removing?.product_id}
        onConfirm={() => void confirmRemove()}
      />

      {toast ? (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      ) : null}
    </div>
  )
}

function BudgetForm({
  program,
  hasProducts,
  onSaved,
}: {
  program: FreeGiftProgram
  hasProducts: boolean
  onSaved: (message: string) => void | Promise<void>
}) {
  const isNew = program.status === 'not_set'
  const stopped = program.status === 'stopped'
  const committed = program.budget_held + program.budget_spent
  // The currency is fixed once products or gifts depend on it.
  const currencyLocked = !isNew && (hasProducts || committed > 0)

  const [currency, setCurrency] = useState(isNew ? '' : program.currency)
  const [amount, setAmount] = useState(
    isNew ? '' : String(minorToMajor(program.budget_cap, program.currency)),
  )
  const [active, setActive] = useState(isNew ? true : program.status === 'active')
  const [terms, setTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const major = Number(amount)
  const cap = currency && Number.isFinite(major) ? majorToMinor(major, currency) : 0
  const belowCommitted = !isNew && cap > 0 && cap < committed
  const valid = Boolean(currency) && cap > 0 && !belowCommitted && (!isNew || terms)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await setFreeGiftProgram({
        budget_cap: cap,
        currency,
        status: active ? 'active' : 'paused',
        ...(isNew ? { accept_terms: true } : {}),
      })
      await onSaved(
        isNew
          ? 'Budget set. Now choose your products.'
          : active
            ? 'Budget saved. Your free gifts are on.'
            : 'Budget saved. Your free gifts are paused.',
      )
    } catch (err) {
      setError(
        freeGiftErrorCode(err) === 'TERMS_REQUIRED'
          ? 'Accept the program terms to set a budget.'
          : getErrorMessage(err, 'Could not save your budget.'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className={cn(sellerPanelClass, 'space-y-5 p-5')}>
      <div>
        <h2 className="font-poster text-xl">{isNew ? 'Set your budget' : 'Your budget'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The most you are willing to fund in free gifts. It is a limit, not a payment: nothing is
          charged, you give away your own stock and deliver it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="free-gift-currency">Currency</Label>
          <CurrencySelect
            id="free-gift-currency"
            value={currency}
            onChange={setCurrency}
            disabled={currencyLocked || stopped}
            required
          />
          <p className="text-xs text-muted-foreground">
            {currencyLocked
              ? 'Fixed while the program has products or gifts.'
              : 'Only products priced in this currency can be offered.'}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="free-gift-budget">Budget{currency ? ` (${currency})` : ''}</Label>
          <Input
            id="free-gift-budget"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={amount}
            disabled={stopped}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="2500"
          />
          {belowCommitted ? (
            <p className="text-xs font-medium text-destructive">
              It cannot be lower than {formatPriceAmount(committed, program.currency)}, which is
              already held and spent.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Covers each gift&rsquo;s price and its delivery.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border-2 border-brand-ink/10 px-4 py-3">
        <div>
          <Label htmlFor="free-gift-active" className="font-bold">
            Offer free gifts
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Turn off to pause. Gifts already confirmed are still fulfilled.
          </p>
        </div>
        <Switch
          id="free-gift-active"
          checked={active}
          disabled={stopped}
          onCheckedChange={setActive}
        />
      </div>

      {isNew ? (
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={terms}
            onCheckedChange={(checked) => setTerms(checked === true)}
            className="mt-0.5"
          />
          <span className="text-muted-foreground">
            I agree to the free gift program terms: I fund each free gift and its delivery from
            this budget, and I fulfil every free gift order confirmed for my shop.
          </span>
        </label>
      ) : null}

      <FormAlert error={error} />

      <Button type="submit" disabled={!valid || busy || stopped} className="h-11 px-5">
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {isNew ? 'Set budget' : 'Save budget'}
      </Button>
    </form>
  )
}

function ProductDialog({
  target,
  addable,
  onClose,
  onSaved,
}: {
  /** A product to change, 'new' to add one, null when closed. */
  target: FreeGiftProduct | 'new' | null
  addable: Product[]
  onClose: () => void
  onSaved: (message: string) => void | Promise<void>
}) {
  const adding = target === 'new'
  const existing = target !== null && target !== 'new' ? target : null
  const [productId, setProductId] = useState('')
  const [cap, setCap] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (target === null) return
    setError(null)
    setProductId('')
    setCap(existing?.gifts_cap != null ? String(existing.gifts_cap) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  const capNumber = cap.trim() === '' ? null : Number(cap)
  const capValid =
    capNumber === null ||
    (Number.isInteger(capNumber) && capNumber > 0 && capNumber >= (existing?.gifts_count ?? 0))
  const valid = capValid && (existing !== null || productId !== '')

  async function submit() {
    const id = existing?.product_id ?? productId
    if (!valid || !id) return
    setBusy(true)
    setError(null)
    try {
      await setFreeGiftProduct(id, {
        gifts_cap: capNumber,
        status: existing?.status ?? 'active',
      })
      await onSaved(adding ? 'Product added to your free gifts.' : 'Cap saved.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save this product.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{adding ? 'Add a product' : existing?.product_name}</DialogTitle>
          <DialogDescription>
            {adding
              ? 'Customers will be able to send it as their free gift, one unit each.'
              : 'Limit how many of this product you give away.'}
          </DialogDescription>
        </DialogHeader>

        {adding ? (
          <div className="space-y-1.5">
            <Label htmlFor="free-gift-product">Product</Label>
            {addable.length === 0 ? (
              <p className="rounded-lg bg-accent/70 px-3 py-2 text-sm text-accent-foreground">
                No more published products in your budget&rsquo;s currency. Publish one from
                Products first.
              </p>
            ) : (
              <select
                id="free-gift-product"
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className={selectClassName}
              >
                <option value="">Choose a product</option>
                {addable.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {formatPriceAmount(product.price_amount, product.currency)}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="free-gift-cap">Most gifts of this product (optional)</Label>
          <Input
            id="free-gift-cap"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={cap}
            onChange={(event) => setCap(event.target.value)}
            placeholder="No cap"
          />
          <p className={cn('text-xs', capValid ? 'text-muted-foreground' : 'font-medium text-destructive')}>
            {capValid
              ? 'Leave empty and your budget is the only limit.'
              : existing && capNumber !== null && capNumber < existing.gifts_count
                ? `${existing.gifts_count} have already been sent, so the cap cannot be lower.`
                : 'Enter a whole number above 0, or leave it empty.'}
          </p>
        </div>

        <FormAlert error={error} />

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!valid || busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {adding ? 'Add product' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
