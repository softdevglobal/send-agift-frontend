export const sellerPanelClass =
  'rounded-2xl bg-card shadow-[0_10px_36px_rgba(40,50,30,0.05)] ring-1 ring-border/50'

/**
 * A panel you can open. The lift on hover is the affordance — without it a
 * clickable gift card looked exactly like the static ones around it.
 */
export const sellerCardClass =
  'rounded-2xl bg-card shadow-[0_10px_36px_rgba(40,50,30,0.05)] ring-1 ring-border/50 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(40,50,30,0.12)]'

export const sellerListRowClass =
  'flex items-start justify-between gap-4 rounded-xl border border-border/40 bg-surface/90 px-4 py-3.5 transition-colors hover:border-border hover:bg-muted/40'

/**
 * Accent washes for metric tiles. Each nav area gets its own so a seller can
 * tell the four numbers apart at a glance instead of reading four identical
 * white boxes.
 */
export const sellerToneClass = {
  violet: {
    tile: 'bg-[linear-gradient(140deg,oklch(0.96_0.04_296)_0%,var(--card)_62%)]',
    icon: 'bg-[oklch(0.93_0.06_296)] text-[oklch(0.42_0.2_296)]',
  },
  teal: {
    tile: 'bg-[linear-gradient(140deg,oklch(0.95_0.05_195)_0%,var(--card)_62%)]',
    icon: 'bg-[oklch(0.92_0.07_195)] text-[oklch(0.42_0.11_205)]',
  },
  amber: {
    tile: 'bg-[linear-gradient(140deg,oklch(0.96_0.05_85)_0%,var(--card)_62%)]',
    icon: 'bg-[oklch(0.93_0.08_85)] text-[oklch(0.48_0.12_75)]',
  },
  navy: {
    tile: 'bg-[linear-gradient(140deg,oklch(0.94_0.03_265)_0%,var(--card)_62%)]',
    icon: 'bg-[oklch(0.91_0.05_265)] text-[oklch(0.38_0.13_270)]',
  },
} as const

export type SellerTone = keyof typeof sellerToneClass
