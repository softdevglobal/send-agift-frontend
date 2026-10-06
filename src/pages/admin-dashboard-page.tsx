import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Ban,
  Globe2,
  LoaderCircle,
  Plus,
  Store,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { getAdminMe, listAdminSellers, type Admin } from '@/api/admin'
import { listAdminCompetitions, type AdminCompetition } from '@/api/competitions'
import { listCountries, type Country } from '@/api/countries'
import { FormAlert } from '@/components/common/form-alert'
import { Dot, Marker, Sparkle } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import { adminDisplayName, adminNavGroups, adminRoleLabel, formatDate } from '@/features/admin'
import { StatusPill } from '@/features/admin/games-ui'
import { useAuth } from '@/features/auth/auth-context'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** A section title in the poster style, with an optional link on the right. */
function PanelTitle({ title, to, linkLabel }: { title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-poster text-xl text-brand-ink dark:text-foreground">
        <span className="marker-underline">{title}</span>
      </h2>
      {to && linkLabel ? (
        <Link
          to={to}
          className="group inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-brand-ink uppercase dark:text-foreground"
        >
          {linkLabel}
          <span className="flex size-6 items-center justify-center rounded-md bg-brand-ink text-white transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="size-3.5" />
          </span>
        </Link>
      ) : null}
    </div>
  )
}

/** One big solid-colour figure; four side by side make a colour band. */
function BigFigure({
  tone,
  icon: Icon,
  label,
  value,
  hint,
  to,
}: {
  tone: 'violet' | 'teal' | 'ink' | 'amber'
  icon: LucideIcon
  label: string
  value: string
  hint: string
  to: string
}) {
  const toneClass = {
    violet: 'bg-brand-violet text-white',
    teal: 'bg-brand-teal text-brand-ink',
    ink: 'bg-brand-ink text-white',
    amber: 'bg-amber-300 text-amber-950',
  }[tone]
  return (
    <Link
      to={to}
      className={cn(
        'group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-xl p-5 transition-transform duration-200 hover:-translate-y-0.5',
        toneClass,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold tracking-[0.14em] uppercase opacity-80">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-md bg-black/10">
          <Icon className="size-4" />
        </span>
      </div>
      <div>
        <p className="font-poster text-5xl">{value}</p>
        <p className="mt-1 flex items-center gap-1 text-xs font-medium opacity-75">
          {hint}
          <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </p>
      </div>
    </Link>
  )
}

const competitionTone = {
  live: 'good',
  scheduled: 'info',
  paused: 'warn',
} as const

export function AdminDashboardPage() {
  const { role } = useAuth()
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [sellerTotal, setSellerTotal] = useState<number | null>(null)
  const [suspendedTotal, setSuspendedTotal] = useState<number | null>(null)
  const [competitions, setCompetitions] = useState<AdminCompetition[] | null>(null)
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
    // The figures below are extras: a failure leaves a dash, not a broken page.
    listAdminSellers('', '', 1, 1)
      .then((res) => {
        if (!cancelled) setSellerTotal(res.total)
      })
      .catch(() => {})
    listAdminSellers('suspended', '', 1, 1)
      .then((res) => {
        if (!cancelled) setSuspendedTotal(res.total)
      })
      .catch(() => {})
    listAdminCompetitions()
      .then((items) => {
        if (!cancelled) setCompetitions(items)
      })
      .catch(() => {
        if (!cancelled) setCompetitions([])
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
  )
  const name = adminDisplayName(admin)
  const firstName = name.split(/\s+/)[0] || name
  const running = (competitions ?? []).filter((item) =>
    ['live', 'scheduled', 'paused'].includes(item.effective_status),
  )
  const liveCount = running.filter((item) => item.effective_status === 'live').length
  // Live first, then the next to start.
  const upcoming = [...running]
    .sort((a, b) => {
      const rank = (c: AdminCompetition) => (c.effective_status === 'live' ? 0 : 1)
      return rank(a) - rank(b) || a.starts_at.localeCompare(b.starts_at)
    })
    .slice(0, 4)
  const jumpTo = adminNavGroups
    .flatMap((group) => group.items)
    .filter((item) => item.to !== '/admin' && !item.soon)
    .filter((item) => !item.roles || (role !== null && item.roles.includes(role)))

  const show = (value: number | null) => (value === null ? '–' : String(value))

  return (
    <div className="space-y-6 sm:space-y-8">
      <FormAlert error={error} />

      {/* Bento hero: the welcome on ink, the live markets on violet. */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        <div className="relative overflow-hidden rounded-xl bg-brand-ink px-6 py-7 text-white sm:px-8 sm:py-9">
          <Sparkle className="absolute top-6 right-[12%] size-8 text-brand-violet" />
          <Sparkle className="absolute right-[30%] bottom-8 hidden size-4 text-brand-teal sm:block" />
          <Dot className="absolute top-1/2 right-[6%] size-3 bg-white/40" />

          <span className="relative inline-block rounded-md bg-brand-teal px-2.5 py-1 text-[11px] font-bold text-brand-ink">
            {adminRoleLabel(role)}
          </span>
          <p className="relative mt-6 text-xs font-bold tracking-[0.18em] text-white/60 uppercase">
            {greeting()}
          </p>
          <h1 className="relative mt-1 font-poster text-4xl sm:text-5xl lg:text-6xl">
            Hi, <Marker tone="violet">{firstName}</Marker>
          </h1>
          <p className="relative mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            {suspendedTotal
              ? `${suspendedTotal} ${suspendedTotal === 1 ? 'seller is' : 'sellers are'} suspended. Review them when you have a moment.`
              : 'Here is the marketplace at a glance: markets, sellers and competitions.'}
          </p>
          <div className="relative mt-6 flex flex-wrap gap-2">
            <Button asChild className="h-11 bg-white px-5 text-brand-ink hover:bg-brand-teal">
              <Link to="/admin/sellers">
                <Store className="size-4" />
                Review sellers
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 border-2 border-white bg-transparent px-5 text-white hover:bg-white hover:text-brand-ink"
            >
              <Link to="/admin/countries">
                <Plus className="size-4" />
                Add a country
              </Link>
            </Button>
          </div>
        </div>

        <Link
          to="/admin/countries"
          className="group relative flex flex-col overflow-hidden rounded-xl bg-brand-violet p-6 text-white"
        >
          <p className="text-[11px] font-bold tracking-[0.16em] text-white/70 uppercase">Markets live</p>
          <p className="mt-2 font-poster text-7xl">{activeCountries.length}</p>
          <p className="text-sm text-white/75">
            of {countries.length} {countries.length === 1 ? 'country' : 'countries'} open for sign-up
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {countries.slice(0, 12).map((country) => (
              <span
                key={country.id}
                title={country.name}
                className={cn(
                  'rounded-md px-2 py-1 text-[11px] font-extrabold',
                  country.status?.toLowerCase() === 'active'
                    ? 'bg-brand-teal text-brand-ink'
                    : 'bg-white/15 text-white/70',
                )}
              >
                {country.iso_code}
              </span>
            ))}
          </div>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[11px] font-bold tracking-[0.12em] uppercase">
            Manage markets
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BigFigure
          tone="teal"
          icon={Store}
          label="Sellers"
          value={show(sellerTotal)}
          hint="All seller accounts"
          to="/admin/sellers"
        />
        <BigFigure
          tone="ink"
          icon={Ban}
          label="Suspended"
          value={show(suspendedTotal)}
          hint="Sellers paused from selling"
          to="/admin/sellers"
        />
        <BigFigure
          tone="violet"
          icon={Globe2}
          label="Countries"
          value={String(countries.length)}
          hint={`${activeCountries.length} active`}
          to="/admin/countries"
        />
        <BigFigure
          tone="amber"
          icon={Trophy}
          label="Live competitions"
          value={competitions === null ? '–' : String(liveCount)}
          hint={`${running.length - liveCount} scheduled or paused`}
          to="/admin/competitions"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,1fr)]">
        <section className="space-y-4">
          <PanelTitle title="Markets" to="/admin/countries" linkLabel="Manage" />
          {countries.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {countries.slice(0, 6).map((country) => {
                const active = country.status?.toLowerCase() === 'active'
                return (
                  <li
                    key={country.id}
                    className="flex items-center gap-3.5 rounded-lg border-2 border-brand-ink/15 bg-card p-3 transition-colors hover:border-brand-ink"
                  >
                    <span
                      className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-md font-poster text-lg',
                        active ? 'bg-brand-violet text-white' : 'bg-accent text-brand-ink',
                      )}
                    >
                      {country.iso_code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">{country.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[country.default_currency, country.default_timezone].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <StatusPill tone={active ? 'good' : 'neutral'}>{country.status}</StatusPill>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="relative overflow-hidden rounded-xl bg-accent px-6 py-14 text-center">
              <Sparkle className="absolute top-6 left-[12%] size-6 text-brand-violet" />
              <div className="mx-auto mb-4 flex size-14 rotate-[-6deg] items-center justify-center rounded-xl bg-brand-violet text-white">
                <Globe2 className="size-6" />
              </div>
              <p className="font-poster text-2xl text-brand-ink dark:text-foreground">No countries yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-brand-ink/70 dark:text-muted-foreground">
                Registration forms load this list, so add at least one market before customers
                or sellers sign up.
              </p>
              <Button asChild className="mt-6 h-10 px-5">
                <Link to="/admin/countries">Add a country</Link>
              </Button>
            </div>
          )}

          <PanelTitle title="Jump to" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {jumpTo.map((item, index) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex flex-col gap-3 rounded-lg border-2 border-brand-ink/15 bg-card p-3 transition-colors hover:border-brand-ink hover:bg-brand-ink hover:text-white"
              >
                <span className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground group-hover:text-white/60">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <item.icon className="size-5 text-brand-violet group-hover:text-brand-teal" />
                <span className="text-xs font-bold">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <PanelTitle title="Competitions" to="/admin/competitions" linkLabel="All" />
          {competitions === null ? (
            <div className="flex justify-center py-10">
              <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : upcoming.length ? (
            <ul className="space-y-2.5">
              {upcoming.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/admin/competitions/${item.id}`}
                    className="block rounded-lg border-2 border-brand-ink/15 bg-card p-3.5 transition-colors hover:border-brand-ink"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.game_name}
                        </span>
                      </span>
                      <StatusPill
                        tone={
                          competitionTone[item.effective_status as keyof typeof competitionTone] ??
                          'neutral'
                        }
                      >
                        {item.effective_status}
                      </StatusPill>
                    </span>
                    <span className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-brand-ink/70 dark:text-muted-foreground">
                      <span>
                        {item.effective_status === 'live' ? 'Ends' : 'Starts'}{' '}
                        {formatDate(item.effective_status === 'live' ? item.ends_at : item.starts_at)}
                      </span>
                      <span>{item.attempts.toLocaleString()} plays</span>
                      {item.under_review ? (
                        <span className="text-amber-700">{item.under_review} to review</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link
              to="/admin/competitions"
              className="flex items-center gap-3 rounded-lg border-2 border-dashed border-brand-ink/25 p-4 text-sm font-semibold transition-colors hover:border-brand-ink"
            >
              <span className="flex size-10 items-center justify-center rounded-md bg-amber-300 text-amber-950">
                <Trophy className="size-5" />
              </span>
              No competitions running. Set one up.
            </Link>
          )}
        </section>
      </div>
    </div>
  )
}
