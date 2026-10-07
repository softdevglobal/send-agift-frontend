import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Coins,
  Gamepad2,
  Globe2,
  LoaderCircle,
  Plus,
  ShieldAlert,
  Store,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { getAdminMe, listAdminSellers, type Admin, type AdminSeller } from '@/api/admin'
import { listAdminCompetitions, type AdminCompetition } from '@/api/competitions'
import { listCountries, type Country } from '@/api/countries'
import { listAdminGames, type AdminGameSummary } from '@/api/games'
import { listPointsPurchasesForAdmin, searchCustomers, type CustomerPointsSummary } from '@/api/points'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  adminDisplayName,
  adminRoleLabel,
  formatDate,
} from '@/features/admin'
import { formatScore } from '@/features/admin/games-format'
import { GameBadge, StatusPill } from '@/features/admin/games-ui'
import { VerifiedSellerBadge } from '@/features/customer-commerce/verified-seller-badge'
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

/** One figure on a plain card, with a coloured icon to tell them apart. */
function StatCard({
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
  const iconClass = {
    violet: 'bg-brand-violet text-white',
    teal: 'bg-brand-teal text-brand-ink',
    ink: 'bg-brand-ink text-white',
    amber: 'bg-amber-300 text-amber-950',
  }[tone]
  return (
    <Link
      to={to}
      className="group flex flex-col gap-4 rounded-xl border-2 border-brand-ink/10 bg-card p-5 transition-colors hover:border-brand-ink"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('flex size-10 items-center justify-center rounded-lg', iconClass)}>
          <Icon className="size-5" />
        </span>
        <ArrowUpRight className="size-4 text-brand-ink/30 transition-colors group-hover:text-brand-ink" />
      </div>
      <div>
        <p className="font-poster text-4xl text-brand-ink dark:text-foreground">{value}</p>
        <p className="mt-1 text-xs font-bold tracking-[0.12em] text-brand-ink uppercase dark:text-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
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
  const [recentSellers, setRecentSellers] = useState<AdminSeller[] | null>(null)
  const [newestCustomers, setNewestCustomers] = useState<CustomerPointsSummary[] | null>(null)
  const [games, setGames] = useState<AdminGameSummary[] | null>(null)
  const [pendingPurchases, setPendingPurchases] = useState<number | null>(null)
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
    listAdminSellers('', '', 1, 5)
      .then((res) => {
        if (!cancelled) setRecentSellers(res.items)
      })
      .catch(() => {
        if (!cancelled) setRecentSellers([])
      })
    searchCustomers('')
      .then((items) => {
        if (!cancelled)
          setNewestCustomers(
            [...items].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
          )
      })
      .catch(() => {
        if (!cancelled) setNewestCustomers([])
      })
    listAdminGames()
      .then((items) => {
        if (!cancelled) setGames(items.filter((g) => g.practice))
      })
      .catch(() => {
        if (!cancelled) setGames([])
      })
    listPointsPurchasesForAdmin('pending')
      .then((res) => {
        if (!cancelled) setPendingPurchases(res.items.length)
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

  const scoresToReview = (games ?? []).reduce((sum, g) => sum + g.under_review, 0)
  const competitionReviews = (competitions ?? []).reduce((sum, c) => sum + c.under_review, 0)
  const attention = [
    { label: 'Points purchases waiting for payment', count: pendingPurchases ?? 0, to: '/admin/points', icon: Coins, tone: 'bg-amber-300 text-amber-950' },
    { label: 'Game scores held for review', count: scoresToReview, to: '/admin/games', icon: ShieldAlert, tone: 'bg-brand-violet text-white' },
    { label: 'Competition entries to review', count: competitionReviews, to: '/admin/competitions', icon: Trophy, tone: 'bg-brand-teal text-brand-ink' },
    { label: 'Suspended sellers', count: suspendedTotal ?? 0, to: '/admin/sellers', icon: Ban, tone: 'bg-brand-ink text-white' },
  ].filter((item) => item.count > 0)
  const topGames = [...(games ?? [])].sort((a, b) => b.plays - a.plays).slice(0, 4)

  const show = (value: number | null) => (value === null ? '–' : String(value))

  return (
    <div className="space-y-6 sm:space-y-8">
      <FormAlert error={error} />

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
            {greeting()} · {adminRoleLabel(role)}
          </p>
          <h1 className="mt-1 font-poster text-3xl text-brand-ink sm:text-4xl dark:text-foreground">
            Hi, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {suspendedTotal
              ? `${suspendedTotal} ${suspendedTotal === 1 ? 'seller is' : 'sellers are'} suspended.`
              : 'Here is the marketplace at a glance.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-10 px-4">
            <Link to="/admin/sellers">
              <Store className="size-4" />
              Review sellers
            </Link>
          </Button>
          <Button asChild className="h-10 px-4">
            <Link to="/admin/countries">
              <Plus className="size-4" />
              Add a country
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          tone="violet"
          icon={Store}
          label="Sellers"
          value={show(sellerTotal)}
          hint="All seller accounts"
          to="/admin/sellers"
        />
        <StatCard
          tone="ink"
          icon={Ban}
          label="Suspended"
          value={show(suspendedTotal)}
          hint="Paused from selling"
          to="/admin/sellers"
        />
        <StatCard
          tone="teal"
          icon={Globe2}
          label="Markets live"
          value={`${activeCountries.length}/${countries.length}`}
          hint="Countries open for sign-up"
          to="/admin/countries"
        />
        <StatCard
          tone="amber"
          icon={Trophy}
          label="Live competitions"
          value={competitions === null ? '–' : String(liveCount)}
          hint={`${running.length - liveCount} scheduled or paused`}
          to="/admin/competitions"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <PanelTitle title="Needs attention" />
          {attention.length ? (
            <ul className="overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card">
              {attention.map((item) => (
                <li key={item.label} className="border-b border-brand-ink/10 last:border-0">
                  <Link
                    to={item.to}
                    className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-accent/50"
                  >
                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', item.tone)}>
                      <item.icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-bold">{item.label}</span>
                    <span className="font-poster text-2xl">{item.count}</span>
                    <ArrowRight className="size-4 text-brand-ink/40" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border-2 border-brand-ink/10 bg-card px-4 py-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-teal text-brand-ink">
                <CheckCircle2 className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold">All clear</p>
                <p className="text-xs text-muted-foreground">
                  Nothing is waiting on you right now.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <PanelTitle title="Recent sellers" to="/admin/sellers" linkLabel="All" />
          {recentSellers === null ? (
            <div className="flex justify-center py-10">
              <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : recentSellers.length ? (
            <ul className="overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card">
              {recentSellers.map((seller) => {
                const name = seller.trading_name?.trim() || seller.legal_name
                return (
                  <li key={seller.id} className="border-b border-brand-ink/10 last:border-0">
                    <Link
                      to={`/admin/sellers/${seller.id}`}
                      className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-accent/50"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-violet text-xs font-extrabold text-white">
                        {name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0] ?? '')
                          .join('')
                          .toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-bold">{name}</span>
                          <VerifiedSellerBadge status={seller.verification_status} />
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {seller.country_name} · joined {formatDate(seller.created_at)}
                        </span>
                      </span>
                      <StatusPill tone={seller.status === 'active' ? 'good' : 'bad'}>
                        {seller.status}
                      </StatusPill>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-brand-ink/20 px-6 py-10 text-center text-sm text-muted-foreground">
              No sellers yet.
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <PanelTitle title="Markets" to="/admin/countries" linkLabel="Manage" />
          {countries.length ? (
            <ul className="overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card">
              {countries.slice(0, 6).map((country) => {
                const active = country.status?.toLowerCase() === 'active'
                return (
                  <li
                    key={country.id}
                    className="flex items-center gap-3.5 border-b border-brand-ink/10 px-4 py-3 last:border-0"
                  >
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-extrabold',
                        active ? 'bg-brand-violet text-white' : 'bg-accent text-brand-ink',
                      )}
                    >
                      {country.iso_code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{country.name}</span>
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
            <div className="rounded-xl border-2 border-dashed border-brand-ink/20 px-6 py-10 text-center">
              <p className="font-bold">No countries yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Add at least one market before customers or sellers sign up.
              </p>
              <Button asChild className="mt-4 h-10 px-4">
                <Link to="/admin/countries">Add a country</Link>
              </Button>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <PanelTitle title="Competitions" to="/admin/competitions" linkLabel="All" />
          {competitions === null ? (
            <div className="flex justify-center py-10">
              <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : upcoming.length ? (
            <ul className="overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card">
              {upcoming.map((item) => (
                <li key={item.id} className="border-b border-brand-ink/10 last:border-0">
                  <Link
                    to={`/admin/competitions/${item.id}`}
                    className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-accent/50"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-amber-300 text-amber-950">
                      <Trophy className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{item.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.game_name} · {item.effective_status === 'live' ? 'Ends' : 'Starts'}{' '}
                        {formatDate(item.effective_status === 'live' ? item.ends_at : item.starts_at)} ·{' '}
                        {item.attempts.toLocaleString()} plays
                      </span>
                    </span>
                    <StatusPill
                      tone={
                        competitionTone[item.effective_status as keyof typeof competitionTone] ?? 'neutral'
                      }
                    >
                      {item.effective_status}
                    </StatusPill>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-brand-ink/20 px-6 py-10 text-center">
              <p className="font-bold">No competitions running</p>
              <Button asChild variant="outline" className="mt-4 h-10 px-4">
                <Link to="/admin/competitions">Set one up</Link>
              </Button>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <PanelTitle title="Popular games" to="/admin/games" linkLabel="All games" />
          {games === null ? (
            <div className="flex justify-center py-10">
              <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : topGames.length ? (
            <ul className="overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card">
              {topGames.map((game) => (
                <li key={game.slug} className="border-b border-brand-ink/10 last:border-0">
                  <Link
                    to={`/admin/games/${game.slug}`}
                    className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-accent/50"
                  >
                    <GameBadge slug={game.slug} className="size-10" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{game.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {game.plays.toLocaleString()} plays · {game.players.toLocaleString()} players
                      </span>
                    </span>
                    {game.top_score !== undefined ? (
                      <span className="text-right">
                        <span className="block font-poster text-lg text-amber-600">
                          {formatScore(game.top_score)}
                        </span>
                        <span className="block text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                          best
                        </span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-brand-ink/20 p-4 text-sm font-semibold">
              <Gamepad2 className="size-5 text-brand-violet" />
              No games played yet.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <PanelTitle title="Newest customers" to="/admin/customers" linkLabel="All" />
          {newestCustomers === null ? (
            <div className="flex justify-center py-10">
              <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : newestCustomers.length ? (
            <ul className="overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card">
              {newestCustomers.map((customer) => (
                <li key={customer.customer_id} className="border-b border-brand-ink/10 last:border-0">
                  <Link
                    to={`/admin/customers/${customer.customer_id}`}
                    className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-accent/50"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-teal text-xs font-extrabold text-brand-ink">
                      {(customer.display_name || customer.email)
                        .split(/[\s@._-]+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0] ?? '')
                        .join('')
                        .toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {customer.display_name || customer.email}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {customer.country_name} · joined {formatDate(customer.created_at)}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-950 tabular-nums">
                      <Coins className="size-3.5" />
                      {customer.balance.toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-brand-ink/20 p-4 text-sm font-semibold">
              <Users className="size-5 text-brand-violet" />
              No customers yet.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
