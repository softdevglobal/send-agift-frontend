import type { LucideIcon } from 'lucide-react'

import { storefrontFrameClass } from '@/components/common/site-styles'
import { cn } from '@/lib/utils'

type FeatureItem = {
  icon: LucideIcon
  title: string
  description: string
}

type FeatureBarProps = {
  items: FeatureItem[]
}

/** Solid ink strip of promises, the storefront's equivalent of a logo band. */
export function FeatureBar({ items }: FeatureBarProps) {
  return (
    <section className="bg-brand-ink text-white">
      <div
        className={cn(
          storefrontFrameClass,
          'grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:py-9',
        )}
      >
        {items.map((item) => (
          <div key={item.title} className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-teal text-brand-ink">
              <item.icon className="size-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-extrabold tracking-[0.12em] uppercase">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
