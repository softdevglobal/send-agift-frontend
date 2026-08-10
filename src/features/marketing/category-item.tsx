import { Link } from 'react-router-dom'

import type { GiftCategory } from '@/features/marketing/data'
import { cn } from '@/lib/utils'

type CategoryItemProps = {
  category: GiftCategory
}

export function CategoryItem({ category }: CategoryItemProps) {
  return (
    <Link
      to="/customer"
      className="group flex w-[7.5rem] shrink-0 flex-col items-center gap-3 sm:w-auto"
    >
      <span
        className={cn(
          'flex size-24 items-center justify-center overflow-hidden rounded-full transition-transform duration-300 group-hover:scale-105 sm:size-28',
          category.tint
        )}
      >
        <img
          src={category.image}
          alt={category.name}
          className="size-[70%] rounded-full object-cover shadow-sm"
          loading="lazy"
        />
      </span>
      <span className="text-sm font-medium text-foreground">{category.name}</span>
    </Link>
  )
}
