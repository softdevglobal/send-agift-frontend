import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, CalendarClock, Crown, FlaskConical, LoaderCircle, Percent, Receipt } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  cancelMembership,
  confirmTestPayment,
  getMembership,
  refusalOf,
  type BonusSlot,
  type MembershipStatus,
} from '@/api/competition-points'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { formatDate, formatMoney, nextActionLink } from '@/features/competition-points/format'
import { formatBps } from '@/features/competition-points/use-member-discount'
import { CustomerEmptyState, CustomerPageHeader } from '@/features/customer-commerce'
import { customerPanelClass } from '@/features/customer-commerce/customer-styles'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const SLOT_LABEL: Record<BonusSlot['status'], string> = {
  unawarded: 'Ready to unlock',
  awarded: 'Unlocked',
  reversed: 'Taken back',
  restored: 'Restored',
}

/** The customer's membership: the period in force, its bonus and the next charge. */
export function CustomerMembershipPage() {
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState<MembershipStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const testCheckout = params.get('test_checkout')
  const returned = params.get('checkout') === 'success'

  const load = useCallback(async () => {
    try {
      setStatus(await getMembership())
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your membership.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Back from the payment page: the webhook, not the redirect, activates the
  // membership, so check a few times while it arrives.
  useEffect(() => {
    if (!returned) return
    setNotice('Thanks. We are confirming your payment with the provider.')
    let tries = 0
    const timer = window.setInterval(async () => {
      tries++
      try {
        const s = await getMembership()
        setStatus(s)
        if (s.state !== 'payment_pending' || tries >= 10) {
          window.clearInterval(timer)
          setNotice(s.state === 'payment_pending' ? 'Your payment is still being confirmed. Check back shortly.' : null)
        }
      } catch {
        window.clearInterval(timer)
      }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [returned])

  async function testPay() {
    setBusy(true)
    setError(null)
    try {
      setStatus(await confirmTestPayment())
      setNotice('Test payment confirmed.')
      params.delete('test_checkout')
      setParams(params, { replace: true })
    } catch (err) {
      setError(refusalOf(err)?.message ?? getErrorMessage(err, 'Could not confirm the test payment.'))
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    setBusy(true)
    setError(null)
    try {
      setStatus(await cancelMembership())
      setNotice('Your membership will not renew. Your benefits continue to the end of the period you paid for.')
    } catch (err) {
      setError(refusalOf(err)?.message ?? getErrorMessage(err, 'Could not cancel your membership.'))
    } finally {
      setBusy(false)
      setConfirmCancel(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sub = status?.subscription
  const offer = status?.offer
  const period = status?.current_period
  const action = nextActionLink(status?.next_action)
  const canCancel = sub && ['active', 'past_due', 'incomplete'].includes(sub.status) && !sub.cancel_at_period_end

  return (
    <>
      <CustomerPageHeader
        title="My membership"
        description="Your paid periods, your member bonus and your next renewal."
        action={
          <Button asChild variant="outline" className="h-10 px-4">
            <Link to="/account/competition-points">Competition points</Link>
          </Button>
        }
      />
      <FormAlert error={error} notice={notice} className="mb-4" />

      {testCheckout && sub?.provider === 'test' && sub.status === 'incomplete' ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 px-5 py-4 text-amber-950">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical className="size-4" /> Sandbox: no real payment is taken.
          </p>
          <Button onClick={testPay} disabled={busy} className="h-10 px-4">
            Confirm test payment
          </Button>
        </div>
      ) : null}

      {!status || status.state === 'none' ? (
        <CustomerEmptyState
          icon={Crown}
          title="You're not a member"
          description="Members get gift benefits and an extra competition points bonus after their first qualifying gift each period."
          action={
            <Button asChild className="h-11 px-5">
              <Link to="/membership">See memberships</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-ink px-6 py-7 text-white sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-xl">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-white/55 uppercase">
                  {offer?.name ?? 'Membership'}
                </p>
                <p className="mt-2 font-poster text-3xl">{status.message}</p>
                {action ? (
                  <Button asChild className="mt-5 h-10 bg-brand-teal px-4 text-brand-ink hover:bg-brand-teal/90">
                    <Link to={action.to}>{action.label}</Link>
                  </Button>
                ) : null}
              </div>
              <span className="flex size-14 items-center justify-center rounded-xl bg-brand-violet">
                <Crown className="size-6" />
              </span>
            </div>
          </section>

          <section className={cn('grid gap-3 sm:grid-cols-2', offer && offer.member_discount_bps > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
            {offer && offer.member_discount_bps > 0 ? (
              <Fact
                icon={Percent}
                label="Gift discount"
                value={
                  period
                    ? `${formatBps(offer.member_discount_bps)} off every order until ${formatDate(period.period_end)}`
                    : `${formatBps(offer.member_discount_bps)} off, while a period is paid`
                }
              />
            ) : null}
            <Fact
              icon={CalendarClock}
              label="This period"
              value={period ? `${formatDate(period.period_start)} – ${formatDate(period.period_end)}` : 'No paid period now'}
            />
            <Fact
              icon={BadgeCheck}
              label="Member bonus"
              value={
                period?.bonus_slot
                  ? `${period.bonus_slot.bonus_points.toLocaleString()} points · ${SLOT_LABEL[period.bonus_slot.status]}`
                  : period
                    ? 'No bonus on this plan'
                    : '-'
              }
            />
            <Fact
              icon={Receipt}
              label="Next charge"
              value={
                status.next_charge_at && offer
                  ? `${formatMoney(status.next_charge_minor, offer.currency)} on ${formatDate(status.next_charge_at)}`
                  : sub?.cancel_at_period_end
                    ? `Ends ${formatDate(sub.current_period_end)}, no renewal`
                    : 'None scheduled'
              }
            />
          </section>

          {offer ? (
            <section className={cn(customerPanelClass, 'px-5 py-4 text-sm')}>
              <p>
                <strong>{offer.name}</strong> renews at {formatMoney(offer.price_minor, offer.currency)}{' '}
                {offer.billing_label}
                {sub?.cancel_at_period_end ? ', but you have cancelled it.' : '.'}
              </p>
              {canCancel ? (
                <Button variant="destructive" className="mt-4 h-10 px-4" onClick={() => setConfirmCancel(true)} disabled={busy}>
                  Cancel renewal
                </Button>
              ) : null}
            </section>
          ) : null}

          {status.periods.length > 0 ? (
            <section className={cn(customerPanelClass, 'divide-y divide-brand-ink/10')}>
              <h2 className="px-5 py-4 font-poster text-xl">Paid periods</h2>
              {status.periods.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span>
                    {formatDate(p.period_start)} – {formatDate(p.period_end)}
                  </span>
                  <span className="text-muted-foreground">
                    {formatMoney(p.amount_minor, p.currency)} · {p.status}
                    {p.bonus_slot ? ` · bonus ${SLOT_LABEL[p.bonus_slot.status].toLowerCase()}` : ''}
                  </span>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel your renewal?"
        description="Your membership will end when the current paid period ends. Points you already have keep their own terms."
        confirmLabel="Cancel renewal"
        onConfirm={cancel}
        busy={busy}
        tone="danger"
      />
    </>
  )
}

function Fact({ icon: Icon, label, value }: { icon: typeof Crown; label: string; value: string }) {
  return (
    <div className={cn(customerPanelClass, 'flex items-start gap-3 px-4 py-4')}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}
