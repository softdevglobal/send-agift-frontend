import { useEffect, useState } from 'react'
import { BadgeCheck, Crown, Gift, LoaderCircle, Percent } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { syncMembership, type MembershipStatus } from '@/api/competition-points'
import { Sparkle } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { formatDate } from '@/features/competition-points/format'
import { formatBps } from '@/features/competition-points/use-member-discount'

const TRIES = 10
const EVERY_MS = 3000

/**
 * Back from the membership checkout (?welcome=membership): asks the server
 * to confirm the payment with Stripe, a few times while it settles, then
 * welcomes the new member with what they get. onConfirmed reloads the page
 * behind it, so the bonus shows in the balance.
 */
export function MembershipWelcome({ onConfirmed }: { onConfirmed: () => void }) {
  const [params, setParams] = useSearchParams()
  const active = params.get('welcome') === 'membership'
  const [status, setStatus] = useState<MembershipStatus | null>(null)
  const [phase, setPhase] = useState<'checking' | 'done' | 'slow' | null>(active ? 'checking' : null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let tries = 0
    async function check() {
      tries++
      try {
        const s = await syncMembership()
        if (cancelled) return
        if (s.current_period) {
          setStatus(s)
          setPhase('done')
          onConfirmed()
          return
        }
      } catch {
        // Try again: the payment may still be settling.
      }
      if (cancelled) return
      if (tries >= TRIES) setPhase('slow')
      else window.setTimeout(check, EVERY_MS)
    }
    void check()
    return () => {
      cancelled = true
    }
    // onConfirmed is a reload; running once per return is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  function close() {
    setPhase(null)
    params.delete('welcome')
    setParams(params, { replace: true })
  }

  if (!phase) return null
  if (phase === 'checking' || phase === 'slow') {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-brand-violet/25 bg-brand-violet/5 px-5 py-4 text-sm">
        {phase === 'checking' ? (
          <>
            <LoaderCircle className="size-4 shrink-0 animate-spin text-brand-violet" />
            Thanks for joining. We&apos;re confirming your payment…
          </>
        ) : (
          <>
            <Crown className="size-4 shrink-0 text-brand-violet" />
            <span className="flex-1">
              Your payment is still being confirmed. Your bonus points appear here as soon as it is.
            </span>
            <Button size="sm" variant="outline" onClick={close}>
              OK
            </Button>
          </>
        )}
      </div>
    )
  }

  const offer = status?.offer
  const slot = status?.current_period?.bonus_slot
  const credited = slot && (slot.status === 'awarded' || slot.status === 'restored') ? slot.bonus_points : 0
  const bonus = offer?.member_bonus_points ?? 0

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="relative overflow-hidden bg-brand-ink px-6 pt-8 pb-7 text-center text-white">
          <Sparkle className="absolute top-5 left-6 size-5 text-brand-teal" />
          <Sparkle className="absolute top-10 right-8 size-4 text-brand-violet" />
          <Sparkle className="absolute right-[30%] bottom-4 size-3 text-brand-teal" />
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-violet">
            <Crown className="size-7" />
          </span>
          <p className="mt-4 text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">Welcome to</p>
          <DialogTitle className="mt-1 font-poster text-3xl text-white">{offer?.name ?? 'your membership'}</DialogTitle>
          {credited > 0 ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-teal px-4 py-1.5 text-sm font-bold text-brand-ink">
              +{credited.toLocaleString()} competition points added
            </p>
          ) : null}
        </div>

        <div className="space-y-4 px-6 py-6">
          <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">Your member benefits</p>
          <ul className="space-y-3 text-sm">
            {offer && offer.member_discount_bps > 0 ? (
              <Benefit icon={<Percent className="size-4" />} tone="bg-brand-violet/10 text-brand-violet">
                <strong>{formatBps(offer.member_discount_bps)} off every gift</strong>, taken off at checkout.
              </Benefit>
            ) : null}
            {bonus > 0 ? (
              <Benefit icon={<BadgeCheck className="size-4" />} tone="bg-brand-teal/15 text-brand-teal">
                <strong>{bonus.toLocaleString()} bonus competition points</strong>{' '}
                {offer?.bonus_trigger === 'first_gift'
                  ? 'after your first delivered gift each period.'
                  : 'every time your membership renews. Unused points carry over.'}
              </Benefit>
            ) : null}
            {(offer?.gift_benefits ?? []).map((b) => (
              <Benefit key={b} icon={<Gift className="size-4" />} tone="bg-accent text-brand-ink dark:text-foreground">
                {b}
              </Benefit>
            ))}
          </ul>
          {status?.current_period ? (
            <p className="rounded-xl bg-accent/60 px-4 py-3 text-xs text-muted-foreground">
              Paid until <strong className="text-foreground">{formatDate(status.current_period.period_end)}</strong>.
              Manage or cancel any time from My membership.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="h-11 flex-1" onClick={close}>
              See my points
            </Button>
            <Button asChild variant="outline" className="h-11 flex-1">
              <Link to="/products" onClick={close}>
                Send a gift
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Benefit({ icon, tone, children }: { icon: React.ReactNode; tone: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-muted-foreground">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      <span className="pt-1 [&_strong]:text-foreground">{children}</span>
    </li>
  )
}
