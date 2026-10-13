import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Gift,
  LoaderCircle,
  MapPin,
  Package,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import {
  getCustomerMe,
  getRecipient,
  listRecipients,
  type CustomerDetails,
  type Recipient,
  type RecipientDetails,
} from '@/api/customers'
import {
  getFreeGiftStatus,
  isFreeGiftDisabled,
  listFreeGiftOffers,
  sendFreeGift,
  type FreeGiftOffer,
  type FreeGiftRecipientReason,
  type FreeGiftStatus,
} from '@/api/free-gifts'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VerifyPhoneCard } from '@/features/account/verify-phone-card'
import { useAuth } from '@/features/auth/auth-context'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  customerPanelClass,
  toDateInputValue,
} from '@/features/customer-commerce'
import { VerifyEmailCard } from '@/features/free-gift/verify-email-card'
import { getErrorMessage } from '@/lib/api'
import { returnToState } from '@/lib/auth'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

const RECIPIENT_REASON: Record<FreeGiftRecipientReason, string> = {
  SELF_GIFT:
    'Your free gift is for someone else. This recipient has your own email or phone number.',
  RECIPIENT_CONTACT_REQUIRED:
    'This recipient needs both an email address and a valid phone number before they can be sent a free gift.',
  RECIPIENT_ALREADY_USED:
    'This recipient has already received a free gift. Each person can receive one.',
}

function defaultAddress(recipient: RecipientDetails | null) {
  return (
    recipient?.addresses?.find((address) => address.is_default) ??
    recipient?.addresses?.[0] ??
    null
  )
}

/**
 * The free gift: pick a product, a recipient and a day, then confirm. Guests
 * see what is on offer; everything about eligibility comes from the API, and
 * the confirm step is checked again on the server.
 */
export function FreeGiftPage() {
  const { isAuthenticated, role, replaceToken } = useAuth()
  const isCustomer = isAuthenticated && role === 'customer'
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [offers, setOffers] = useState<FreeGiftOffer[]>([])
  const [disabled, setDisabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [status, setStatus] = useState<FreeGiftStatus | null>(null)
  const [me, setMe] = useState<CustomerDetails | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])

  const [productId, setProductId] = useState(searchParams.get('product') ?? '')
  const [recipientId, setRecipientId] = useState('')
  const [recipient, setRecipient] = useState<RecipientDetails | null>(null)
  const [recipientCheck, setRecipientCheck] = useState<FreeGiftStatus['recipient'] | null>(null)
  const [checkingRecipient, setCheckingRecipient] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [message, setMessage] = useState('')

  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One key for this confirm screen: a retry or a double click is one order.
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const loadOffers = useCallback(async () => {
    try {
      setOffers(await listFreeGiftOffers())
      setDisabled(false)
    } catch (err) {
      if (isFreeGiftDisabled(err)) setDisabled(true)
      else setLoadError(getErrorMessage(err, 'Could not load the free gifts.'))
    }
  }, [])

  const loadAccount = useCallback(async () => {
    if (!isCustomer) return
    try {
      const [nextStatus, profile, people] = await Promise.all([
        getFreeGiftStatus(),
        getCustomerMe(),
        listRecipients().catch(() => [] as Recipient[]),
      ])
      setStatus(nextStatus)
      setMe(profile)
      setRecipients(people)
    } catch (err) {
      if (isFreeGiftDisabled(err)) setDisabled(true)
      else setLoadError(getErrorMessage(err, 'Could not load your free gift.'))
    }
  }, [isCustomer])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([loadOffers(), loadAccount()]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [loadOffers, loadAccount])

  // Whether this recipient can receive one, and where it would be delivered.
  useEffect(() => {
    if (!recipientId) {
      setRecipient(null)
      setRecipientCheck(null)
      return
    }
    let cancelled = false
    setCheckingRecipient(true)
    Promise.all([getFreeGiftStatus(recipientId), getRecipient(recipientId)])
      .then(([next, details]) => {
        if (cancelled) return
        setRecipientCheck(next.recipient ?? null)
        setRecipient(details)
      })
      .catch(() => {
        if (cancelled) return
        setRecipientCheck(null)
        setRecipient(null)
      })
      .finally(() => {
        if (!cancelled) setCheckingRecipient(false)
      })
    return () => {
      cancelled = true
    }
  }, [recipientId])

  const product = useMemo(
    () => offers.find((offer) => offer.product_id === productId) ?? null,
    [offers, productId],
  )
  const address = defaultAddress(recipient)
  const recipientOk = Boolean(recipientCheck?.can_receive && address)
  const canSend =
    Boolean(status?.available) && Boolean(product) && recipientOk && Boolean(deliveryDate) && !sending

  // Everything still standing between the customer and the button, in the
  // order they would fix it, so a disabled button always says why.
  const blockers: string[] = []
  if (status && !status.available) {
    if (status.used) blockers.push('You have already sent your free gift.')
    else if (status.locked) blockers.push('Your free gift is on hold for a few days after an email change.')
    else if (status.missing.length > 0)
      blockers.push(`Verify your ${status.missing.join(' and ')} above.`)
  }
  if (!product) blockers.push('Pick a gift from the list.')
  if (!recipientId) blockers.push('Choose who it is for.')
  else if (checkingRecipient) blockers.push('Checking the recipient…')
  else if (recipientCheck && !recipientCheck.can_receive)
    blockers.push(
      recipientCheck.reason
        ? RECIPIENT_REASON[recipientCheck.reason]
        : 'This recipient cannot be sent a free gift.',
    )
  else if (recipient && !address) blockers.push('Add a delivery address for this recipient.')
  if (!deliveryDate) blockers.push('Choose a delivery date.')

  async function handleSend() {
    if (!product || !recipient || !address || !deliveryDate) return
    setError(null)
    setSending(true)
    try {
      const order = await sendFreeGift(
        {
          product_id: product.product_id,
          recipient_id: recipient.id,
          country_id: address.country_id || me?.country_id || '',
          delivery_date: deliveryDate,
          ...(message.trim() ? { gift_message: message.trim() } : {}),
        },
        idempotencyKey,
      )
      navigate(`/orders/${order.id}?placed=1`)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send your free gift.'))
      // Whatever refused it, the page should now say the same thing.
      await Promise.all([loadOffers(), loadAccount()])
      if (recipientId) {
        const next = await getFreeGiftStatus(recipientId).catch(() => null)
        if (next) setRecipientCheck(next.recipient ?? null)
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (disabled) {
    return (
      <div>
        <CustomerPageHeader title="Free gift" eyebrow="Free gift" />
        <CustomerEmptyState
          icon={Gift}
          title="Not available right now"
          description="The free gift is not open at the moment. Browse the gifts our sellers have ready today."
          action={
            <Button asChild className="h-11 rounded-full px-5">
              <Link to="/products">Browse gifts</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const used = Boolean(status?.used)
  const missing = status?.missing ?? []

  return (
    <div>
      <CustomerPageHeader
        eyebrow="Free gift"
        title="Send one gift, free"
        description="Every SendAGift customer has one free gift to send to someone special. The seller pays for the gift and its delivery. You pay nothing."
      />

      <FormAlert error={loadError} className="mb-5" />

      {/* Where this customer stands, before anything they can pick. */}
      {!isAuthenticated ? (
        <section className={cn(customerPanelClass, 'mb-6 flex flex-wrap items-center gap-4 p-5 sm:p-6')}>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-brand-ink">
            <Gift className="size-6" />
          </span>
          <div className="min-w-0 flex-1 basis-56">
            <p className="font-poster text-xl">Create an account to send yours</p>
            <p className="mt-1 text-sm text-muted-foreground">
              It takes a minute. Verify your email and phone, then pick a gift below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="h-11 rounded-full px-5">
              <Link to="/register" state={returnToState('/free-gift')}>
                Create account
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full px-5">
              <Link to="/login" state={returnToState('/free-gift')}>
                Sign in
              </Link>
            </Button>
          </div>
        </section>
      ) : !isCustomer ? (
        <FormAlert
          notice="The free gift is for customer accounts. These are the gifts customers can send right now."
          className="mb-6"
        />
      ) : used ? (
        <section className={cn(customerPanelClass, 'mb-6 flex flex-wrap items-center gap-4 p-5 sm:p-6')}>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-violet text-white">
            <CheckCircle2 className="size-6" />
          </span>
          <div className="min-w-0 flex-1 basis-56">
            <p className="font-poster text-xl">You have sent your free gift</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Each customer has one. Follow it from your orders.
            </p>
          </div>
          <Button asChild className="h-11 rounded-full px-5">
            <Link to="/orders">
              Track orders
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      ) : status?.locked ? (
        <FormAlert
          error="Your free gift is on hold for a few days because your email address was changed. It will be here when the hold ends."
          className="mb-6"
        />
      ) : missing.length > 0 ? (
        <section className={cn(customerPanelClass, 'mb-6 p-5 sm:p-6')}>
          <h2 className="font-poster text-xl">First, verify your account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A free gift needs a verified email address and a verified phone number.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-bold">Email address</p>
              {missing.includes('email') ? (
                me ? (
                  <VerifyEmailCard
                    email={me.email}
                    onVerified={(token) => {
                      replaceToken(token)
                      void loadAccount()
                    }}
                  />
                ) : null
              ) : (
                <Verified label="Email verified" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold">Phone number</p>
              {missing.includes('phone') ? (
                me?.phone ? (
                  <VerifyPhoneCard
                    phone={me.phone}
                    verified={false}
                    onVerified={() => void loadAccount()}
                  />
                ) : (
                  <div className="space-y-2 rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">
                      Add your phone number to your account, then verify it there.
                    </p>
                    <Button asChild variant="outline">
                      <Link to="/account/profile">Open account settings</Link>
                    </Button>
                  </div>
                )
              ) : (
                <Verified label="Phone verified" />
              )}
            </div>
          </div>
        </section>
      ) : null}

      {offers.length === 0 ? (
        <CustomerEmptyState
          icon={Package}
          title="No free gifts right now"
          description="Sellers add and remove free gifts as their budgets allow. Check back soon. Your free gift stays yours until you send it."
          action={
            <Button asChild className="h-11 rounded-full px-5">
              <Link to="/products">Browse all gifts</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
          <section>
            <h2 className="font-poster text-xl">1. Pick a gift</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {offers.map((offer) => {
                const picked = offer.product_id === productId
                return (
                  <li key={offer.product_id}>
                    <button
                      type="button"
                      onClick={() => setProductId(offer.product_id)}
                      aria-pressed={picked}
                      className={cn(
                        'flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 bg-card text-left transition-colors',
                        picked
                          ? 'border-brand-ink ring-2 ring-brand-teal'
                          : 'border-brand-ink/15 hover:border-brand-ink',
                      )}
                    >
                      <span className="relative block aspect-square w-full bg-muted">
                        {offer.image_url ? (
                          <img
                            src={offer.image_url}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-muted-foreground">
                            <Gift className="size-8" />
                          </span>
                        )}
                        <span className="absolute top-2 left-2 rounded-md bg-brand-teal px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-brand-ink uppercase">
                          Free
                        </span>
                        {picked ? (
                          <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-brand-ink text-white">
                            <CheckCircle2 className="size-4" />
                          </span>
                        ) : null}
                      </span>
                      <span className="flex flex-1 flex-col gap-1 p-3">
                        <span className="line-clamp-2 text-sm font-extrabold">{offer.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {offer.shop_name}
                        </span>
                        <span className="mt-auto pt-1 text-sm">
                          <span className="text-muted-foreground line-through">
                            {formatPriceAmount(offer.price_amount, offer.currency)}
                          </span>{' '}
                          <span className="font-extrabold text-brand-violet">Free</span>
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {isCustomer && status && !used ? (
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <section className={cn(customerPanelClass, 'space-y-4 p-5')}>
                <h2 className="font-poster text-xl">2. Who is it for?</h2>
                {recipients.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Add the person you want to send it to, with their email, phone number and
                      delivery address.
                    </p>
                    <Button asChild variant="outline" className="h-10 rounded-full px-4">
                      <Link to="/account/recipients">Add a recipient</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="free-gift-recipient">Recipient</Label>
                      <select
                        id="free-gift-recipient"
                        value={recipientId}
                        onChange={(event) => setRecipientId(event.target.value)}
                        className={selectClassName}
                      >
                        <option value="">Choose a recipient</option>
                        {recipients.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {checkingRecipient ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircle className="size-4 animate-spin" /> Checking…
                      </p>
                    ) : recipientId && recipientCheck && !recipientCheck.can_receive ? (
                      <FormAlert
                        error={
                          recipientCheck.reason
                            ? RECIPIENT_REASON[recipientCheck.reason]
                            : 'This recipient cannot be sent a free gift.'
                        }
                      />
                    ) : recipientId && recipient && !address ? (
                      <FormAlert error="This recipient has no delivery address yet. Add one so the shop knows where to deliver." />
                    ) : recipient && address ? (
                      <p className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 size-4 shrink-0" />
                        {[address.line1, address.line2, address.city, address.region, address.postal_code]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    ) : null}
                    <Link
                      to="/account/recipients"
                      className="inline-block text-xs font-bold tracking-[0.06em] text-brand-violet uppercase underline-offset-4 hover:underline"
                    >
                      Add or edit recipients
                    </Link>
                  </>
                )}
              </section>

              <section className={cn(customerPanelClass, 'space-y-4 p-5')}>
                <h2 className="font-poster text-xl">3. When, and what to say</h2>
                <div className="space-y-1.5">
                  <Label htmlFor="free-gift-date">Delivery date</Label>
                  <Input
                    id="free-gift-date"
                    type="date"
                    min={toDateInputValue(new Date())}
                    value={deliveryDate}
                    onChange={(event) => setDeliveryDate(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="free-gift-message">Gift message (optional)</Label>
                  <textarea
                    id="free-gift-message"
                    value={message}
                    maxLength={500}
                    onChange={(event) => setMessage(event.target.value)}
                    className={textareaClassName}
                    placeholder="Happy birthday. Thinking of you"
                  />
                </div>
              </section>

              <section className={cn(customerPanelClass, 'space-y-3 p-5')}>
                <h2 className="font-poster text-xl">Your free gift</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0 truncate text-muted-foreground">
                      {product ? product.name : 'Pick a gift'}
                    </dt>
                    <dd className="shrink-0">
                      {product ? formatPriceAmount(product.price_amount, product.currency) : '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Delivery</dt>
                    <dd>Paid by the seller</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-border/60 pt-2 font-medium">
                    <dt>You pay</dt>
                    <dd className="font-extrabold text-brand-violet">Free</dd>
                  </div>
                </dl>
                <FormAlert error={error} />
                {!canSend && !sending && blockers.length > 0 ? (
                  <div
                    role="status"
                    className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-950"
                  >
                    <p className="font-bold">To send your free gift:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {blockers.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <Button
                  type="button"
                  disabled={!canSend}
                  onClick={() => void handleSend()}
                  className="h-11 w-full rounded-full"
                >
                  {sending ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Gift className="size-4" />
                      Send my free gift
                    </>
                  )}
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {status.available
                    ? 'You have one free gift. Once it is sent it is used, unless you cancel it before the shop dispatches it.'
                    : 'Finish the steps above to send your free gift.'}
                </p>
              </section>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  )
}

function Verified({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
      <BadgeCheck className="size-4" /> {label}
    </p>
  )
}
