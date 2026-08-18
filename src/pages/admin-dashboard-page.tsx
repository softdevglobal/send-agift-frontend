import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, Globe2, LoaderCircle, Plus, Store, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getAdminMe, type Admin } from '@/api/admin'
import { listCountries, type Country } from '@/api/countries'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  adminDisplayName,
  adminInitials,
  adminListRowClass,
  adminPanelClass,
  adminRoleLabel,
} from '@/features/admin'
import { useAuth } from '@/features/auth/auth-context'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className={cn(adminPanelClass, 'p-4 sm:p-5')}>
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
        {icon}
      </div>
      <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-medium tracking-tight">{value}</p>
      {hint ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function AdminDashboardPage() {
  const { role } = useAuth()
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getAdminMe(), listCountries()])
      .then(([me, list]) => {
        if (cancelled) return
        setAdmin(me)
        setCountries(Array.isArray(list) ? list : [])
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

  const activeCountries = countries.filter(
    (country) => country.status?.toLowerCase() === 'active',
  ).length

  return (
    <div className="space-y-6 sm:space-y-8">
      <FormAlert error={error} />

      <section
        className={cn(
          adminPanelClass,
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
            <div className="flex size-14 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_24px_rgba(60,80,40,0.22)] ring-4 ring-background">
              {adminInitials(admin)}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <h1 className="font-display text-3xl tracking-tight">
                {adminDisplayName(admin)}
              </h1>
              <span className="mt-2 inline-flex rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                {adminRoleLabel(role)}
              </span>
            </div>
          </div>
          <Button asChild className="h-11 rounded-full px-5">
            <Link to="/admin/countries">
              <Plus className="size-4" />
              Add a country
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<Globe2 className="size-4.5" />}
          label="Countries"
          value={String(countries.length)}
          hint={`${activeCountries} active`}
        />
        <Metric
          icon={<Store className="size-4.5" />}
          label="Sellers"
          value="—"
          hint="Endpoint not wired yet"
        />
        <Metric
          icon={<Users className="size-4.5" />}
          label="Customers"
          value="—"
          hint="Endpoint not wired yet"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,1fr)]">
        <section className={adminPanelClass}>
          <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
            <h2 className="font-medium">Markets</h2>
            <Link
              to="/admin/countries"
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage
            </Link>
          </div>
          {countries.length ? (
            <ul className="space-y-2 p-3">
              {countries.slice(0, 6).map((country) => (
                <li
                  key={country.id}
                  className={cn(adminListRowClass, 'items-center')}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-xs font-semibold text-primary">
                      {country.iso_code}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{country.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[country.default_currency, country.default_timezone]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {country.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Globe2 className="size-5" />
              </div>
              <p className="text-sm font-medium">No countries yet</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Registration forms load this list, so add at least one market
                before customers or sellers sign up.
              </p>
              <Button asChild variant="outline" className="mt-5 h-9 rounded-full">
                <Link to="/admin/countries">Add a country</Link>
              </Button>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className={cn(adminPanelClass, 'p-5')}>
            <h2 className="font-medium">Quick actions</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Jump into the sections that are wired up.
            </p>
            <div className="mt-4 space-y-2">
              <Button
                asChild
                variant="outline"
                className="h-10 w-full justify-start rounded-xl"
              >
                <Link to="/admin/countries">
                  <Globe2 className="size-4" />
                  Manage countries
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-10 w-full justify-start rounded-xl"
              >
                <Link to="/admin/account">
                  <Users className="size-4" />
                  View your profile
                </Link>
              </Button>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-primary px-5 py-5 text-primary-foreground shadow-[0_12px_32px_rgba(40,55,25,0.18)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -bottom-8 size-28 rounded-full bg-white/10"
            />
            <div className="relative mb-2 flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
              <Globe2 className="size-4" />
              Markets live
            </div>
            <p className="relative font-display text-3xl tracking-tight">
              {activeCountries}
            </p>
            <p className="relative mt-1 text-sm text-primary-foreground/75">
              Active markets available at registration.
            </p>
            <Link
              to="/admin/countries"
              className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-foreground hover:underline"
            >
              Manage markets
              <ArrowRight className="size-3.5" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}
