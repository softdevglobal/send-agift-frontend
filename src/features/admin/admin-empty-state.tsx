import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Dot, Sparkle } from '@/components/common/storefront-decor'

type AdminEmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  /** Shows a "Coming soon" ribbon for sections without backend endpoints yet. */
  soon?: boolean
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  soon = false,
}: AdminEmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-accent px-6 py-16 text-center sm:py-20">
      <Sparkle className="absolute top-8 left-[14%] size-6 text-brand-violet" />
      <Sparkle className="absolute right-[12%] bottom-10 size-4 text-brand-teal" />
      <Dot className="absolute top-12 right-[22%] size-2.5 bg-brand-teal" />
      {soon ? (
        <span className="relative mb-4 inline-flex rounded-md bg-brand-ink px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-white uppercase">
          Coming soon
        </span>
      ) : null}
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
