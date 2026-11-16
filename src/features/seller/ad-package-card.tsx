import type { ReactNode } from 'react'
import { Crown, Gift, Infinity as Endless, Megaphone, Sparkles, Ticket, Trophy } from 'lucide-react'

import { costPerEntry, entriesLabel, formatCents, levelName, type AdPackage } from '@/api/game-entries'
import { cn } from '@/lib/utils'

const number = new Intl.NumberFormat()

/** One look per package in a row, so neighbouring packages read apart. */
const TONES = [
  { band: 'from-brand-violet to-indigo-600', bar: 'bg-brand-violet', soft: 'bg-brand-violet/10 text-brand-violet', icon: Megaphone },
  { band: 'from-brand-ink to-slate-700', bar: 'bg-brand-teal', soft: 'bg-brand-teal/15 text-brand-ink', icon: Sparkles },
  { band: 'from-amber-500 to-orange-600', bar: 'bg-amber-500', soft: 'bg-amber-100 text-amber-950', icon: Crown },
  { band: 'from-emerald-600 to-teal-700', bar: 'bg-emerald-500', soft: 'bg-emerald-100 text-emerald-900', icon: Trophy },
] as const

/**
 * An advertising package as a card: a coloured band with its name and
 * price, what it promotes and what each priority level earns a customer,
 * and its actions pinned to the bottom so buttons line up across a row.
 */
export function AdPackageCard({
  pkg,
  index,
  eyebrow,
  badge,
  highlight,
  muted,
  footnote,
  actions,
}: {
  pkg: AdPackage
  /** Position in the row; picks the colour. */
  index: number
  /** Small line above the name; the package name's own eyebrow by default. */
  eyebrow?: ReactNode
  /** A chip in the band's corner, such as "Best value" or a status. */
  badge?: ReactNode
  highlight?: boolean
  muted?: boolean
  footnote?: ReactNode
  actions: ReactNode
}) {
  const tone = TONES[index % TONES.length]
  const Icon = tone.icon
  const top = Math.max(1, ...pkg.level_entries)
  const each = costPerEntry(pkg)

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-card shadow-sm transition-shadow hover:shadow-md',
        highlight ? 'border-brand-violet ring-4 ring-brand-violet/15' : 'border-brand-ink/10',
        muted && 'opacity-70',
      )}
    >
      <header className={cn('relative bg-gradient-to-br px-5 pt-5 pb-6 text-white', tone.band)}>
        <Icon className="absolute -right-3 -bottom-4 size-24 opacity-15" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Icon className="size-5" />
          </span>
          {badge}
        </div>
        <p className="mt-4 text-[10px] font-bold tracking-[0.18em] uppercase opacity-80">{eyebrow ?? 'Advertising package'}</p>
        <h3 className="mt-0.5 truncate font-poster text-2xl">{pkg.name}</h3>
        <p className="mt-2 font-poster text-4xl tabular-nums">{formatCents(pkg.price_minor, pkg.currency)}</p>
        <p className="mt-1 text-xs opacity-80">One payment · nothing renews by itself</p>
      </header>

      <div className="flex flex-1 flex-col p-5">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              [Gift, 'Gifts', number.format(pkg.product_slots)],
              [Ticket, 'Budget', number.format(pkg.entries_pool)],
              [Trophy, 'Top earns', number.format(top)],
            ] as const
          ).map(([StatIcon, label, value]) => (
            <div key={label} className={cn('rounded-xl px-2.5 py-2 text-center', tone.soft)}>
              <StatIcon className="mx-auto size-4 opacity-80" />
              <p className="mt-1 font-poster text-lg leading-none tabular-nums">{value}</p>
              <p className="mt-1 text-[10px] font-bold tracking-[0.1em] uppercase opacity-80">{label}</p>
            </div>
          ))}
        </div>

        {pkg.description ? (
          <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{pkg.description}</p>
        ) : null}

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
            Game entries a buyer earns
          </p>
          <ol className="space-y-2">
            {pkg.level_entries.map((n, i) => (
              <li key={i}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{levelName(i + 1, pkg.product_slots, pkg.level_names)}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{entriesLabel(n)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${(n / top) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-auto pt-5">
          <div className="mb-4 space-y-1.5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Endless className="size-3.5 shrink-0" />
              {pkg.validity_days
                ? `Runs for ${pkg.validity_days} days, or until the budget is used`
                : 'Runs until the budget is used, with no end date'}
            </p>
            {Number.isFinite(each) ? (
              <p className="flex items-center gap-1.5">
                <Ticket className="size-3.5 shrink-0" />
                {formatCents(Math.round(each), pkg.currency)} per game entry
              </p>
            ) : null}
            {footnote}
          </div>
          {actions}
        </div>
      </div>
    </article>
  )
}

/** A small chip for the card's coloured band. */
export function BandChip({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'gold' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] uppercase',
        tone === 'gold' ? 'bg-amber-300 text-amber-950' : 'bg-white/20 text-white backdrop-blur',
      )}
    >
      {children}
    </span>
  )
}
