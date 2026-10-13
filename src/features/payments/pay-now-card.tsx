import { useState } from 'react'
import { CreditCard, LoaderCircle } from 'lucide-react'

import { startOrderPayment } from '@/api/payments'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'

type PayNowCardProps = {
  orderId: string
  /** Gifts and delivery in minor units, shown as the breakdown of the total. */
  subtotal: number
  delivery: number
  total: number
  currency: string
  /** Set when the customer came back from Stripe without paying. */
  cancelled?: boolean
}

/**
 * An order still waiting for payment. Paying happens on Stripe's own page;
 * the order only becomes paid when Stripe tells the server, so nothing here
 * is taken as proof of payment.
 */
export function PayNowCard({
  orderId,
  subtotal,
  delivery,
  total,
  currency,
  cancelled,
}: PayNowCardProps) {
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    setError(null)
    setStarting(true)
    try {
      const { url } = await startOrderPayment(orderId)
      window.location.assign(url)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not open the payment page.'))
      setStarting(false)
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-brand-ink/20 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <CreditCard className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-poster text-xl">Complete your payment</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {cancelled
              ? 'The payment was not completed. Your gift is not sent until it is paid.'
              : 'Your gift is sent to the seller as soon as the payment goes through.'}
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-11 rounded-full px-6"
          disabled={starting}
          onClick={() => void pay()}
        >
          {starting ? <LoaderCircle className="animate-spin" /> : null}
          Pay {formatPriceAmount(total, currency)}
        </Button>
      </div>
      <dl className="mt-4 max-w-xs space-y-1 border-t border-border/60 pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Gifts</dt>
          <dd>{formatPriceAmount(subtotal, currency)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Delivery</dt>
          <dd>{delivery > 0 ? formatPriceAmount(delivery, currency) : 'Free'}</dd>
        </div>
        <div className="flex justify-between gap-3 font-medium">
          <dt>Total</dt>
          <dd>{formatPriceAmount(total, currency)}</dd>
        </div>
      </dl>
      <FormAlert error={error} className="mt-4" />
    </section>
  )
}
