import type { ReactNode } from 'react'

import { adminPanelClass } from '@/features/admin/admin-styles'
import { cn } from '@/lib/utils'

export function AdminRecordSection({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: ReactNode
}) {
  return (
    <section className={cn(adminPanelClass, 'border-2 border-brand-ink/10 p-5')}>
      <h2 className="flex items-center gap-2 font-poster text-xl text-brand-ink dark:text-foreground">
        <span className="marker-underline">{title}</span>
        {typeof count === 'number' ? (
          <span className="rounded-md bg-brand-ink px-1.5 py-0.5 font-sans text-[11px] font-bold tracking-normal text-white">
            {count}
          </span>
        ) : null}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function AdminFacts({ items }: { items: { label: string; value?: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 rounded-lg bg-accent/60 p-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[10px] font-bold tracking-[0.14em] text-brand-ink/55 uppercase">
            {item.label}
          </dt>
          <dd className={cn('mt-0.5 text-sm font-semibold break-words', !item.value && 'font-normal text-muted-foreground')}>
            {item.value || 'Not set'}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function readable(value?: string | null) {
  const text = value?.trim()
  if (!text) return ''
  return text.replaceAll('_', ' ')
}

export function formatAddressLines(address: {
  line1: string
  line2?: string | null
  city: string
  region?: string | null
  postal_code?: string | null
}) {
  return [address.line1, address.line2, [address.city, address.region, address.postal_code].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(', ')
}
