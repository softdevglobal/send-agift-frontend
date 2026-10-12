import { useState } from 'react'
import { ArrowDownToLine, LoaderCircle, Wallet } from 'lucide-react'

import {
  setPayoutMode,
  withdrawPayouts,
  type PayoutMode,
  type PayoutTotals,
  type SellerPayouts,
} from '@/api/payments'
import { FormAlert } from '@/components/common/form-alert'
import { SlidingToggle } from '@/components/common/sliding-toggle'
import { Button } from '@/components/ui/button'
import { sellerPanelClass } from '@/features/seller/seller-styles'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'

type WithdrawCardProps = {
  account: SellerPayouts
  totals: PayoutTotals[]
  /** Reload the page's figures after the balance or the mode changed. */
  onChanged: () => Promise<void> | void
}

const money = (amount: number, currency: string) => formatPriceAmount(amount, currency.toUpperCase())

/**
 * The balance a seller can take out: gifts delivered and not yet paid out.
 * They choose whether it goes to their Stripe account by itself, or waits
 * here until they press Withdraw.
 */
export function WithdrawCard({ account, totals, onChanged }: WithdrawCardProps) {
  const [busy, setBusy] = useState<'mode' | 'withdraw' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const available = totals.filter((t) => t.awaiting > 0)
  // An older API leaves the mode out; it only ever paid out automatically.
  const mode: PayoutMode = account.payout_mode ?? 'automatic'
  const manual = mode === 'manual'
  const canWithdraw = account.payouts_enabled && available.length > 0

  async function changeMode(next: PayoutMode) {
    if (next === mode || busy) return
    setError(null)
    setNotice(null)
    setBusy('mode')
    try {
      await setPayoutMode(next)
      await onChanged()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change how you are paid.'))
    } finally {
      setBusy(null)
    }
  }

  async function withdraw() {
    setError(null)
    setNotice(null)
    setBusy('withdraw')
    try {
      const result = await withdrawPayouts()
      const currency = available[0]?.currency ?? 'usd'
      if (result.sent > 0) {
        setNotice(
          `${money(result.amount, currency)} was sent to your Stripe account` +
            (result.failed > 0
              ? `. ${result.failed} gift${result.failed === 1 ? '' : 's'} could not be sent yet and will stay here.`
              : '.'),
        )
      } else if (result.failed > 0) {
        setError(
          'Stripe could not send the money yet. The platform balance may still be clearing, so try again shortly.',
        )
      } else {
        setNotice('Nothing to withdraw right now.')
      }
      await onChanged()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not withdraw.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className={`${sellerPanelClass} space-y-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-violet text-white">
            <Wallet className="size-5" />
          </span>
          <div>
            <p className="font-poster text-xl text-brand-ink dark:text-foreground">
              Available to withdraw
            </p>
            <p className="font-poster text-3xl text-brand-ink dark:text-foreground">
              {available.length > 0
                ? available.map((t) => money(t.awaiting, t.currency)).join(' + ')
                : money(0, totals[0]?.currency ?? 'usd')}
            </p>
            <p className="mt-0.5 max-w-md text-sm text-muted-foreground">
              Gifts delivered to customers and not paid out yet. The platform fee is taken when the
              money is sent.
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="h-11 rounded-full px-6"
          disabled={!canWithdraw || busy !== null}
          onClick={() => void withdraw()}
        >
          {busy === 'withdraw' ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ArrowDownToLine className="size-4" />
          )}
          Withdraw now
        </Button>
      </div>

      <FormAlert error={error} notice={notice} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
        <div className="min-w-0">
          <p className="text-sm font-bold">How you are paid</p>
          <p className="text-sm text-muted-foreground">
            {manual
              ? 'Delivered gifts wait here until you press Withdraw.'
              : 'Each gift is sent to your Stripe account as soon as it is delivered.'}
          </p>
        </div>
        <SlidingToggle
          label="How you are paid"
          value={mode}
          onChange={(mode) => void changeMode(mode)}
          options={[
            { id: 'automatic', label: 'Automatic' },
            { id: 'manual', label: 'I withdraw' },
          ]}
        />
      </div>
    </section>
  )
}
