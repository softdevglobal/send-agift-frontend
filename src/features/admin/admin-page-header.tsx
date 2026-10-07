import type { ReactNode } from 'react'

import { Dot, Sparkle } from '@/components/common/storefront-decor'

type AdminPageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
  eyebrow?: string
}

/** The ink banner every admin page opens with: its name, purpose and main action. */
export function AdminPageHeader({
  title,
  description,
  action,
  eyebrow = 'Admin console',
}: AdminPageHeaderProps) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-xl bg-brand-ink text-white">
      <Sparkle className="absolute top-5 right-[30%] hidden size-6 text-brand-violet sm:block" />
      <Dot className="absolute right-[18%] bottom-6 hidden size-2.5 bg-brand-teal sm:block" />
      <div className="relative flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-7 sm:py-6">
        <div className="space-y-2">
          <p className="w-fit rounded-md bg-brand-teal px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-brand-ink uppercase">
            {eyebrow}
          </p>
          <h1 className="font-poster text-3xl sm:text-4xl">{title}</h1>
          {description ? (
            <p className="max-w-xl text-sm leading-relaxed text-white/65">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
