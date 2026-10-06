import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Dot, Sparkle } from '@/components/common/storefront-decor'
import { cn } from '@/lib/utils'

type CustomerEmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function CustomerEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: CustomerEmptyStateProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] bg-accent px-6 py-16 text-center sm:py-20',
      )}
    >
      <Sparkle className="absolute top-8 left-[14%] size-6 text-brand-violet" />
      <Sparkle className="absolute right-[12%] bottom-10 size-4 text-brand-teal" />
      <Dot className="absolute top-12 right-[22%] size-2.5 bg-brand-teal" />
      <div className="relative mx-auto mb-5 flex size-14 rotate-[-6deg] items-center justify-center rounded-xl bg-brand-violet text-white">
        <Icon className="size-6" />
      </div>
      <h2 className="relative font-poster text-2xl text-brand-ink dark:text-foreground">{title}</h2>
      <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-brand-ink/70 dark:text-muted-foreground">
        {description}
      </p>
      {action ? <div className="relative mt-7">{action}</div> : null}
    </div>
  )
}
