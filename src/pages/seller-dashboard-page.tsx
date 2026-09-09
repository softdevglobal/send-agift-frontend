import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Compass,
  LoaderCircle,
  Package,
  Plus,
  ShoppingBag,
  Store,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { getSellerMe, type SellerDetails } from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  sellerAccountNav,
  sellerDisplayName,
  sellerInitials,
  sellerListRowClass,
  sellerPanelClass,
  sellerPrimaryNav,
  sellerSetupProgress,
  sellerSetupSteps,
  SellerStat,
  sellerVerificationLabel,
} from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Every seller page as a tile, in one card near the top of the dashboard.
 *
 * The sidebar already links these, but the dashboard is the landing page and a
 * seller lands here to _go somewhere_ — this makes the whole portal reachable
 * in one glance without hunting the rail.
 */
const quickNav = [
  ...sellerPrimaryNav.filter((item) => item.to !== '/seller'),
  ...sellerAccountNav,
]

function QuickNav() {
  return (
    <section className={cn(sellerPanelClass, 'p-4 sm:p-5')}>
      <div className="mb-3 flex items-center gap-2">
        <Compass className="size-4 text-muted-foreground" />
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Jump to
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {quickNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-surface/60 p-3 text-center transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-[0_12px_30px_rgba(40,50,30,0.12)]"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <item.icon className="size-4" />
            </span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** Circular percentage dial for the setup card — reads at a glance from across the screen. */
function ProgressRing({ percent }: { percent: number }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const filled = Math.max(0, Math.min(100, percent)) / 100

  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          className="stroke-muted"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-sm font-medium tracking-tight">
        {percent}%
      </span>
    </div>
  )
}

export function SellerDashboardPage() {
  const [profile, setProfile] = useState<SellerDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSellerMe()
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load dashboard.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return <FormAlert error={error} />
  }

  const name = sellerDisplayName(profile)
  const progress = sellerSetupProgress(profile)
  const steps = sellerSetupSteps(profile)
  const shops = profile.shops ?? []

  return (
    <div className="space-y-6 sm:space-y-8">
      <FormAlert error={error} />

      {/*
        The hero carries the brand gradient rather than the plain card wash —
        it is the one place in the portal that should feel like the storefront
        the seller is building, not the admin tooling around it.
      */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy via-brand-violet to-brand-navy px-5 py-7 text-white shadow-[0_18px_50px_rgba(30,25,70,0.28)] sm:px-8 sm:py-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-[color:var(--brand-teal)]/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-4 size-56 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {profile.image_url ? (
              <img
                src={profile.image_url}
                alt=""
                className="size-16 rounded-full object-cover shadow-[0_8px_24px_rgba(0,0,0,0.3)] ring-4 ring-white/20"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-white/15 text-lg font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.3)] ring-4 ring-white/20 backdrop-blur-sm">
                {sellerInitials(profile)}
              </div>
            )}
            <div>
              <p className="text-sm text-white/60">Welcome back</p>
              <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
                {name}
              </h1>
              {/* On the dark hero the status reads by icon + label; the light
                  tone classes are for the pill on the profile page. */}
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-sm">
                <BadgeCheck className="size-3.5" />
                {sellerVerificationLabel(profile.verification_status)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="h-11 rounded-full px-5 text-white hover:bg-white/15 hover:text-white"
            >
              <Link to="/seller/products">
                <Package className="size-4" />
                Add a gift
              </Link>
            </Button>
            <Button
              asChild
              className="h-11 rounded-full bg-white px-5 text-brand-navy hover:bg-white/90"
            >
              <Link to="/seller/shops">
                <Plus className="size-4" />
                Create a shop
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <QuickNav />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SellerStat
          tone="navy"
          icon={BadgeCheck}
          label="Verification"
          value={sellerVerificationLabel(profile.verification_status)}
          hint={profile.status}
          to="/seller/profile"
        />
        <SellerStat
          tone="violet"
          icon={Store}
          label="Shops"
          value={String(shops.length)}
          hint={shops.length ? 'Ready to list gifts' : 'None yet'}
          to="/seller/shops"
        />
        <SellerStat
          tone="teal"
          icon={ShoppingBag}
          label="Active orders"
          value="0"
          hint="No orders in progress"
          to="/seller/orders"
        />
        <SellerStat
          tone="amber"
          icon={Wallet}
          label="Earnings"
          value="$0.00"
          hint="All time"
          to="/seller/earnings"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,1fr)]">
        <section className={cn(sellerPanelClass, 'overflow-hidden')}>
          <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
            <h2 className="flex items-center gap-2 font-medium">
              <span className="flex size-6 items-center justify-center rounded-md bg-accent text-primary">
                <ShoppingBag className="size-3.5" />
              </span>
              Active orders
            </h2>
            <Link
              to="/seller/orders"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="relative flex flex-col items-center px-6 py-16 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top,oklch(0.94_0.03_125/0.5),transparent_70%)]"
            />
            <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-card text-primary ring-1 ring-primary/15 shadow-[0_10px_28px_rgba(40,50,30,0.10)]">
              <ShoppingBag className="size-6" />
            </div>
            <p className="relative text-sm font-medium">No active orders yet</p>
            <p className="relative mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
              When buyers purchase from your shops, orders land here with due
              dates and fulfilment status.
            </p>
            <Button
              asChild
              variant="outline"
              className="relative mt-5 h-9 rounded-full px-4"
            >
              <Link to="/seller/products">
                <Package className="size-4" />
                List a gift to sell
              </Link>
            </Button>
          </div>
        </section>

        <div className="space-y-6">
          <section className={cn(sellerPanelClass, 'p-5')}>
            <div className="flex items-center gap-4">
              <ProgressRing percent={progress.percent} />
              <div>
                <h2 className="font-medium">Setup progress</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {progress.done} of {progress.total} complete
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5">
              {steps.map((step) => (
                <li key={step.id} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full',
                      step.done
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Check className="size-3" />
                  </span>
                  <span
                    className={
                      step.done ? 'text-foreground' : 'text-muted-foreground'
                    }
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-5 h-9 w-full rounded-full">
              <Link to="/seller/profile">Complete profile</Link>
            </Button>
          </section>

          <section className={sellerPanelClass}>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
              <h2 className="font-medium">My shops</h2>
              <Link
                to="/seller/shops"
                className="text-sm font-medium text-primary hover:underline"
              >
                Manage
              </Link>
            </div>
            {shops.length ? (
              <ul className="space-y-2 p-3">
                {shops.map((shop) => (
                  <li key={shop.id} className={cn(sellerListRowClass, 'items-center')}>
                    <Link
                      to={`/seller/products?shop=${shop.id}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <div className="size-9 overflow-hidden rounded-lg bg-accent text-primary">
                        {shop.image_url ? (
                          <img
                            src={shop.image_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Store className="size-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{shop.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[shop.slug, shop.status].filter(Boolean).join(' · ') ||
                            'Draft'}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No shops yet. Create one to start listing gifts.
              </p>
            )}
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-primary px-5 py-5 text-primary-foreground shadow-[0_12px_32px_rgba(40,55,25,0.18)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -bottom-8 size-28 rounded-full bg-white/10"
            />
            <div className="relative mb-2 flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
              <Wallet className="size-4" />
              Earnings snapshot
            </div>
            <p className="relative font-display text-3xl tracking-tight">$0.00</p>
            <p className="relative mt-1 text-sm text-primary-foreground/75">
              Available balance after completed orders.
            </p>
            <Link
              to="/seller/earnings"
              className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-foreground hover:underline"
            >
              View earnings
              <ArrowRight className="size-3.5" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}
