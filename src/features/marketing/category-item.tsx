import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { GiftCategory } from '@/features/marketing/data'
import { cn } from '@/lib/utils'

type CategoryItemProps = {
  category: GiftCategory
}

/** Tall photo card with the occasion name and an "explore" cue under it. */
export function CategoryItem({ category }: CategoryItemProps) {
  return (
    <Link
      to={`/products?category=${category.id}`}
      className="group flex w-[11rem] shrink-0 snap-start flex-col gap-3 sm:w-auto"
    >
      <span
        className={cn(
          'relative block aspect-[3/4] overflow-hidden rounded-2xl',
          category.tint,
        )}
      >
        <img
          src={category.image}
          alt={category.name}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          loading="lazy"
        />
      </span>
      <span className="flex items-start justify-between gap-2">
        <span>
          <span className="block text-sm font-bold text-brand-ink dark:text-foreground">
            {category.name}
          </span>
          <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
            Explore now
          </span>
        </span>
        <ArrowRight className="mt-0.5 size-4 shrink-0 text-brand-ink transition-transform group-hover:translate-x-1 dark:text-foreground" />
      </span>
    </Link>
  )
}
