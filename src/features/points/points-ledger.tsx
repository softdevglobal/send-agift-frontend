import {
  Coins,
  Gamepad2,
  Gift,
  HandCoins,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'

import { POINTS_CATEGORY_LABEL, type PointsCategory, type PointsEntry } from '@/api/points'
import { formatPoints } from '@/features/points/format'
import { cn } from '@/lib/utils'

const categoryIcon: Record<PointsCategory, LucideIcon> = {
  PRODUCT_PURCHASE: ShoppingBag,
  GIFT_REWARD: Gift,
  GIFT_SENT: Send,
  GAME_ENTRY: Gamepad2,
  POINTS_PURCHASE: Coins,
  REWARD_FUNDING: HandCoins,
  REFUND: RotateCcw,
  ADMIN_ADJUSTMENT: ShieldCheck,
}

const categoryTone: Record<PointsCategory, string> = {
  PRODUCT_PURCHASE: 'bg-[oklch(0.93_0.06_296)] text-[oklch(0.42_0.2_296)]',
  GIFT_REWARD: 'bg-[oklch(0.93_0.07_350)] text-[oklch(0.48_0.17_350)]',
  GIFT_SENT: 'bg-[oklch(0.93_0.07_350)] text-[oklch(0.48_0.17_350)]',
  GAME_ENTRY: 'bg-[oklch(0.92_0.07_195)] text-[oklch(0.42_0.11_205)]',
  POINTS_PURCHASE: 'bg-[oklch(0.93_0.08_85)] text-[oklch(0.48_0.12_75)]',
  REWARD_FUNDING: 'bg-[oklch(0.91_0.05_265)] text-[oklch(0.38_0.13_270)]',
  REFUND: 'bg-muted text-muted-foreground',
  ADMIN_ADJUSTMENT: 'bg-muted text-muted-foreground',
}

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type PointsLedgerProps = {
  entries: PointsEntry[]
  className?: string
}

/**
 * A points history: what happened, when, the change and the balance it left.
 * The server writes every line's wording, so this reads the same on the
 * seller portal, the customer account and the admin tools.
 */
export function PointsLedger({ entries, className }: PointsLedgerProps) {
  return (
    <ul className={cn('divide-y divide-border/50', className)}>
      {entries.map((entry) => {
        const Icon = categoryIcon[entry.category] ?? Coins
        const credit = entry.direction === 'credit'
        return (
          <li key={entry.id} className="flex items-center gap-3.5 px-5 py-3.5">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-xl',
                categoryTone[entry.category] ?? 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{entry.description}</p>
              <p className="truncate text-xs text-muted-foreground">
                {POINTS_CATEGORY_LABEL[entry.category] ?? entry.category} · {when(entry.created_at)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  'font-display text-base tabular-nums',
                  credit ? 'text-[oklch(0.5_0.14_155)]' : 'text-[oklch(0.55_0.19_25)]',
                )}
              >
                {credit ? '+' : '−'}
                {formatPoints(entry.amount)}
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                Balance {formatPoints(entry.balance_after)}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
