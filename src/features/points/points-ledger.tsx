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
import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'
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
  PRODUCT_PURCHASE: 'bg-brand-violet text-white',
  GIFT_REWARD: 'bg-brand-ink text-white',
  GIFT_SENT: 'bg-brand-ink text-white',
  GAME_ENTRY: 'bg-brand-teal text-brand-ink',
  POINTS_PURCHASE: 'bg-amber-300 text-amber-950',
  REWARD_FUNDING: 'bg-brand-ink text-white',
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
  const pages = usePagedList(entries, TABLE_PAGE_SIZE)
  return (
    <div>
    <ul className={cn('divide-y divide-brand-ink/10', className)}>
      {pages.visible.map((entry) => {
        const Icon = categoryIcon[entry.category] ?? Coins
        const credit = entry.direction === 'credit'
        return (
          <li key={entry.id} className="flex items-center gap-3.5 px-5 py-3.5">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg',
                categoryTone[entry.category] ?? 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{entry.description}</p>
              <p className="truncate text-xs text-muted-foreground">
                {POINTS_CATEGORY_LABEL[entry.category] ?? entry.category} · {when(entry.created_at)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  'font-poster text-lg tabular-nums',
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
    <PageNav
      page={pages.page}
      pageCount={pages.pageCount}
      onPage={pages.setPage}
      label="Points pages"
      scroll={false}
    />
    </div>
  )
}
