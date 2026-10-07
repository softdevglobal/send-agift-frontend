export const sellerPanelClass = 'rounded-xl border border-brand-ink/20 bg-card'

/**
 * A panel you can open. The ink outline on hover is the affordance. Without
 * it a clickable gift card looked exactly like the static ones around it.
 */
export const sellerCardClass =
  'rounded-xl border border-brand-ink/20 bg-card transition-colors duration-200 hover:border-brand-ink'

export const sellerListRowClass =
  'flex items-start justify-between gap-4 rounded-lg border-2 border-brand-ink/15 bg-card px-4 py-3.5 transition-colors hover:border-brand-ink hover:bg-accent/40'

/**
 * Solid colours for metric tiles. Each nav area gets its own so a seller can
 * tell the four numbers apart at a glance instead of reading four identical
 * white boxes.
 */
export const sellerToneClass = {
  violet: {
    tile: 'bg-card',
    icon: 'bg-brand-violet text-white',
  },
  teal: {
    tile: 'bg-card',
    icon: 'bg-brand-teal text-brand-ink',
  },
  amber: {
    tile: 'bg-card',
    icon: 'bg-amber-300 text-amber-950',
  },
  navy: {
    tile: 'bg-card',
    icon: 'bg-brand-ink text-white',
  },
} as const

export type SellerTone = keyof typeof sellerToneClass
