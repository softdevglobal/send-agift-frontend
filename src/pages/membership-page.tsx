import { useEffect, useState } from 'react'
import { BadgeCheck, Crown, Gift, LoaderCircle, LogIn, Percent } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import {
  getMembershipOffers,
  joinMembership,
  refusalOf,
  type MembershipOffers,
  type PlanOffer,
} from '@/api/competition-points'
import { FormAlert } from '@/components/common/form-alert'
import { Sparkle } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/features/auth/auth-context'
import { AvailabilityNotice } from '@/features/competition-points/availability-notice'
import { formatMoney, newRequestKey } from '@/features/competition-points/format'
import { formatBps } from '@/features/competition-points/use-member-discount'
import { CustomerPageHeader } from '@/features/customer-commerce'
import { getErrorMessage } from '@/lib/api'
import { returnToState } from '@/lib/auth'
import { cn } from '@/lib/utils'

/**
 * Membership offers, with every term the customer agrees to shown before
 * payment: the price, the true renewal interval, the gift benefits and the
 * first-gift bonus condition. Renewal consent is never pre-selected.
 */
export function MembershipPage() {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()
  const signedIn = isAuthenticated && role === 'customer'

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <CustomerPageHeader
        eyebrow="Membership"
        title="SendAGift membership"
        description="Gift benefits and discounts, and an extra competition points bonus after your first qualifying completed gift in each paid membership period."
      />
      {signedIn ? (
        <Offers />
      ) : (
        <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-ink px-6 py-10 text-white sm:px-10">
          <Sparkle className="absolute top-6 right-[20%] size-6 text-brand-teal" />
          <h2 className="font-poster text-3xl">Sign in to see the memberships available to you</h2>
          <p className="mt-3 max-w-xl text-sm text-white/70">
            What is offered depends on where you live. We check that before showing any price.
          </p>
          <Button asChild className="mt-6 h-11 px-5">
            <Link to="/login" state={returnToState(location.pathname, location.search)}>
              <LogIn className="size-4" />
              Sign in
            </Link>
          </Button>
        </section>
      )}
    </main>
  )
}

function Offers() {
  const navigate = useNavigate()
  const [data, setData] = useState<MembershipOffers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getMembershipOffers()
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Could not load memberships.')))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (error) return <FormAlert error={error} />
  if (!data) return null

  const { decision, offers } = data
  return (
    <div className="space-y-5">
      {!decision.allowed ? (
        <AvailabilityNotice code={decision.reason_code} message={decision.message} nextAction={decision.next_action} />
      ) : null}
      {offers.length === 0 && decision.allowed ? (
        <AvailabilityNotice message="There are no memberships on sale where you live right now." nextAction="shop" />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {offers.map((o) => (
          <OfferCard
            key={o.id}
            offer={o}
            canBuy={decision.allowed}
            onJoined={(url, provider) => {
              if (provider === 'test') navigate(new URL(url).pathname + new URL(url).search)
              else window.location.assign(url)
            }}
          />
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Competition points are separate from the points on your <Link to="/account/points" className="underline">My points</Link>{' '}
        page. They cannot be transferred, withdrawn as cash or bought directly. Competition availability and point
        conditions apply, and vary by location.
      </p>
    </div>
  )
}

function OfferCard({
  offer,
  canBuy,
  onJoined,
}: {
  offer: PlanOffer
  canBuy: boolean
  onJoined: (url: string, provider: string) => void
}) {
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One key per attempt to join, so a double click is one checkout.
  const [key] = useState(() => newRequestKey('join'))
  const price = formatMoney(offer.price_minor, offer.currency)

  async function join() {
    setBusy(true)
    setError(null)
    try {
      const res = await joinMembership(offer.id, consent, key)
      onJoined(res.checkout_url, res.provider)
    } catch (err) {
      setError(refusalOf(err)?.message ?? getErrorMessage(err, 'Could not start the checkout.'))
      setBusy(false)
    }
  }

  return (
    <article className="flex flex-col rounded-[1.75rem] border-2 border-brand-ink/15 bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
            {offer.country_name}
          </p>
          <h2 className="mt-1 font-poster text-3xl">{offer.name}</h2>
        </div>
        <span className="flex size-12 items-center justify-center rounded-xl bg-brand-violet text-white">
          <Crown className="size-5" />
        </span>
      </div>
      {offer.description ? <p className="mt-3 text-sm text-muted-foreground">{offer.description}</p> : null}

      <p className="mt-5 flex items-baseline gap-2">
        <span className="font-poster text-4xl">{price}</span>
        <span className="text-sm font-semibold text-muted-foreground">{offer.billing_label}</span>
      </p>

      <ul className="mt-5 space-y-2 text-sm">
        {offer.gift_benefits.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Gift className="mt-0.5 size-4 shrink-0 text-brand-teal" />
            {b}
          </li>
        ))}
        {offer.member_discount_bps > 0 ? (
          <li className="flex items-start gap-2">
            <Percent className="mt-0.5 size-4 shrink-0 text-brand-violet" />
            {formatBps(offer.member_discount_bps)} off the gift price on every order while you are a member.
          </li>
        ) : null}
        {offer.member_bonus_points > 0 ? (
          <li className="flex items-start gap-2">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-brand-violet" />
            An additional {offer.member_bonus_points.toLocaleString()} competition points after your first qualifying
            completed gift in each paid membership period. Other qualifying gifts earn ordinary points.
          </li>
        ) : null}
      </ul>

      <div className="mt-5 rounded-xl bg-accent/60 px-4 py-3 text-xs leading-relaxed text-brand-ink/80 dark:text-muted-foreground">
        Renews at <strong>{price}</strong> {offer.billing_label} until you cancel. Cancel any time from{' '}
        <strong>My membership</strong>; your benefits continue to the end of the period you paid for. A qualifying gift
        is a paid gift order that has been delivered; free gifts don&apos;t qualify. Terms version {offer.terms_version}.
      </div>

      <label className={cn('mt-5 flex items-start gap-3 text-sm', !canBuy && 'opacity-60')}>
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          disabled={!canBuy || busy}
          className="mt-0.5"
        />
        <span>
          I agree that this membership renews at {price} {offer.billing_label} until I cancel, and to the{' '}
          <Link to="/legal/customer-terms" className="underline">
            terms
          </Link>
          .
        </span>
      </label>

      <FormAlert error={error} className="mt-4" />

      <Button className="mt-5 h-11" disabled={!canBuy || !consent || busy} onClick={join}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Crown className="size-4" />}
        Join for {price}
      </Button>
    </article>
  )
}
