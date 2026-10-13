import { useState } from 'react'
import { BadgeCheck, Banknote, LoaderCircle } from 'lucide-react'

import { startSellerPayoutOnboarding, type SellerPayouts } from '@/api/payments'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { sellerPanelClass } from '@/features/seller/seller-styles'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

type PayoutAccountCardProps = {
  status: SellerPayouts
  refreshing: boolean
  onRefresh: () => void
}

/**
 * Where a seller connects their bank through Stripe so delivered orders can
 * be paid out. Everything sensitive is entered on Stripe's own page.
 */
export function PayoutAccountCard({ status, refreshing, onRefresh }: PayoutAccountCardProps) {
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function connect() {
    setError(null)
    setStarting(true)
    try {
      const { url } = await startSellerPayoutOnboarding()
      window.location.assign(url)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not open the payout setup.'))
      setStarting(false)
    }
  }

  const ready = status.connected && status.payouts_enabled
  let title = 'Connect your bank account'
  let summary = 'Add your bank details on Stripe so delivered orders are paid out to you.'
  let action = 'Set up payouts'
  if (!status.enabled) {
    title = 'Payouts are not switched on yet'
    summary = 'Card payouts are not enabled on this server. Check back soon.'
  } else if (ready) {
    title = 'Payouts are on'
    summary = 'Delivered orders are paid out to your Stripe account, then to your bank.'
  } else if (status.connected && !status.details_submitted) {
    title = 'Finish your payout setup'
    summary = 'You started connecting your bank but have not finished. Pick up where you left off.'
    action = 'Continue setup'
  } else if (status.connected) {
    title = 'Stripe is checking your details'
    summary = 'Payouts turn on as soon as Stripe finishes. This can take a few minutes.'
    action = 'Review details'
  }

  return (
    <section className={cn(sellerPanelClass, 'p-5 sm:p-6')}>
      <div className="flex flex-wrap items-start gap-4">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            ready ? 'bg-brand-teal text-brand-ink' : 'bg-accent text-accent-foreground',
          )}
        >
          {ready ? <BadgeCheck className="size-5" /> : <Banknote className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-poster text-xl">{title}</h2>
          <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">{summary}</p>
          {status.connected ? (
            <ul className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold tracking-[0.1em] uppercase">
              <Pill on={status.details_submitted}>Details submitted</Pill>
              <Pill on={status.charges_enabled}>Charges</Pill>
              <Pill on={status.payouts_enabled}>Payouts</Pill>
            </ul>
          ) : null}
        </div>
        {status.enabled ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-4"
              disabled={refreshing}
              onClick={onRefresh}
            >
              {refreshing ? <LoaderCircle className="animate-spin" /> : null}
              Refresh status
            </Button>
            <Button
              type="button"
              variant={ready ? 'outline' : 'default'}
              className="h-10 rounded-full px-5"
              disabled={starting}
              onClick={() => void connect()}
            >
              {starting ? <LoaderCircle className="animate-spin" /> : null}
              {ready ? 'Update bank details' : action}
            </Button>
          </div>
        ) : null}
      </div>
      <FormAlert error={error} className="mt-4" />
    </section>
  )
}

function Pill({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li
      className={cn(
        'rounded-md px-2 py-1',
        on ? 'bg-brand-teal/25 text-brand-ink' : 'bg-muted text-muted-foreground',
      )}
    >
      {on ? '✓ ' : ''}
      {children}
    </li>
  )
}
