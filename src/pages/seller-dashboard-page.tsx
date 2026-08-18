import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  LoaderCircle,
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
  sellerDisplayName,
  sellerInitials,
  sellerListRowClass,
  sellerPanelClass,
  sellerSetupProgress,
  sellerSetupSteps,
  sellerVerificationLabel,
  sellerVerificationTone,
} from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

function Metric({
  icon,
  label,
  value,
  hint,
  valueClassName,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  valueClassName?: string
}) {
  return (
    <div className={cn(sellerPanelClass, 'p-4 sm:p-5')}>
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
        {icon}
      </div>
      <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 truncate text-xl font-medium tracking-tight',
          valueClassName,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
      ) : null}
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

      <section
        className={cn(
          sellerPanelClass,
          'relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8',
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-[oklch(0.92_0.04_125/0.45)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-10 size-48 rounded-full bg-[oklch(0.93_0.04_80/0.35)]"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {profile.image_url ? (
              <img
                src={profile.image_url}
                alt=""
                className="size-14 rounded-full object-cover shadow-[0_8px_24px_rgba(60,80,40,0.22)] ring-4 ring-background"
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_24px_rgba(60,80,40,0.22)] ring-4 ring-background">
                {sellerInitials(profile)}
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <h1 className="font-display text-3xl tracking-tight">{name}</h1>
              <span
                className={cn(
                  'mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                  sellerVerificationTone(profile.verification_status),
                )}
              >
                {sellerVerificationLabel(profile.verification_status)}
              </span>
            </div>
          </div>
          <Button asChild className="h-11 rounded-full px-5">
            <Link to="/seller/shops">
              <Plus className="size-4" />
              Create a shop
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={<BadgeCheck className="size-4.5" />}
          label="Verification"
          value={sellerVerificationLabel(profile.verification_status)}
          hint={profile.status}
        />
        <Metric
          icon={<Store className="size-4.5" />}
          label="Shops"
          value={String(shops.length)}
          hint={shops.length ? 'Ready to list gifts' : 'None yet'}
        />
        <Metric
          icon={<ShoppingBag className="size-4.5" />}
          label="Active orders"
          value="0"
          hint="No orders in progress"
        />
        <Metric
          icon={<Wallet className="size-4.5" />}
          label="Earnings"
          value="$0.00"
          hint="All time"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,1fr)]">
        <section className={sellerPanelClass}>
          <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
            <h2 className="font-medium">Active orders</h2>
            <Link
              to="/seller/orders"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <ShoppingBag className="size-5" />
            </div>
            <p className="text-sm font-medium">No active orders</p>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
              When buyers purchase from your shops, orders will appear here with
              due dates and status.
            </p>
          </div>
        </section>

        <div className="space-y-6">
          <section className={cn(sellerPanelClass, 'p-5')}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="font-medium">Setup progress</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {progress.done} of {progress.total} complete
                </p>
              </div>
              <p className="font-display text-2xl tracking-tight">
                {progress.percent}%
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress.percent}%` }}
              />
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
