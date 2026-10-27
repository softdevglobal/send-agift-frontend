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
import { bonusWhen, formatMoney, newRequestKey } from '@/features/competition-points/format'
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
        description="Gift discounts, benefits and bonus points with every paid membership period."
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
      <div
        className={cn(
          'grid gap-5',
          offers.length === 1 && 'max-w-md',
          offers.length === 2 && 'md:grid-cols-2',
          offers.length >= 3 && 'md:grid-cols-2 lg:grid-cols-3',
        )}
      >
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
      {offers.length > 0 ? <HowItWorks /> : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Bonus points are added to <Link to="/account/points" className="underline">My points</Link>, the same points
        you earn from gifts and prizes. Points cannot be transferred or withdrawn as cash. Competition availability and
        point conditions apply, and vary by location.
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
    <article className="flex flex-col overflow-hidden rounded-[1.75rem] border-2 border-brand-ink/15 bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative overflow-hidden bg-brand-ink px-6 pt-6 pb-7 text-white">
        <Sparkle className="absolute top-5 right-5 size-5 text-brand-teal" />
        <Sparkle className="absolute right-[28%] bottom-5 size-3 text-brand-violet" />
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-violet text-white">
            <Crown className="size-5" />
          </span>
          <p className="text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">{offer.country_name}</p>
        </div>
        <h2 className="mt-4 font-poster text-2xl leading-tight">{offer.name}</h2>
        {offer.description ? <p className="mt-1 text-sm text-white/70">{offer.description}</p> : null}
        <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
          <span className="font-poster text-4xl leading-none">{price}</span>
          <span className="text-sm font-semibold text-white/70">{offer.billing_label}</span>
        </p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">What you get</p>
        <ul className="mt-4 space-y-3">
          {offer.member_discount_bps > 0 ? (
            <Perk icon={<Percent className="size-4" />} tone="bg-brand-violet/10 text-brand-violet">
              <strong className="block">{formatBps(offer.member_discount_bps)} off every gift</strong>
              On the gift price of every order while you are a member.
            </Perk>
          ) : null}
          {offer.member_bonus_points > 0 ? (
            <Perk icon={<BadgeCheck className="size-4" />} tone="bg-brand-teal/15 text-brand-teal">
              <strong className="block">+{offer.member_bonus_points.toLocaleString()} bonus points</strong>
              {bonusWhen(offer.bonus_trigger)}
            </Perk>
          ) : null}
          {offer.gift_benefits.map((b) => (
            <Perk key={b} icon={<Gift className="size-4" />} tone="bg-accent text-brand-ink dark:text-foreground">
              {b}
            </Perk>
          ))}
        </ul>

        <div className="mt-auto pt-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Renews at <strong className="text-foreground">{price}</strong> {offer.billing_label} until you cancel. Your
            benefits continue to the end of the period you paid for. Free gifts don&apos;t qualify. Terms{' '}
            {offer.terms_version}.
          </p>

          <label
            className={cn(
              'mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs leading-relaxed transition-colors',
              consent ? 'border-brand-violet bg-brand-violet/5' : 'border-border',
              !canBuy && 'cursor-not-allowed opacity-60',
            )}
          >
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

          <FormAlert error={error} className="mt-3" />

          <Button className="mt-4 h-11 w-full" disabled={!canBuy || !consent || busy} onClick={join}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Crown className="size-4" />}
            Join for {price}
          </Button>
        </div>
      </div>
    </article>
  )
}

function Perk({ icon, tone, children }: { icon: React.ReactNode; tone: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-muted-foreground">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tone)}>{icon}</span>
      <span className="pt-0.5 [&_strong]:text-foreground">{children}</span>
    </li>
  )
}

const STEPS = [
  { icon: Crown, title: 'Join', body: "Pick a membership and pay securely. You're a member once the payment goes through." },
  { icon: Gift, title: 'Send a gift', body: 'Your member discount comes off the gift price at checkout.' },
  { icon: BadgeCheck, title: 'Get your bonus', body: 'Bonus points land in My points with each paid period and carry over.' },
]

function HowItWorks() {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {STEPS.map((s, i) => (
        <div key={s.title} className="rounded-2xl bg-accent/60 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-brand-ink text-xs font-bold text-white">
              {i + 1}
            </span>
            <s.icon className="size-4 text-brand-violet" />
          </div>
          <h3 className="mt-3 font-semibold">{s.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
        </div>
      ))}
    </section>
  )
}
