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
    <section className={cn(adminPanelClass, 'p-5')}>
      <h2 className="font-display text-lg tracking-tight">
        {title}
        {typeof count === 'number' ? (
          <span className="ml-2 text-sm font-normal text-muted-foreground">{count}</span>
        ) : null}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function AdminFacts({ items }: { items: { label: string; value?: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 text-sm break-words">{item.value || 'Not set'}</dd>
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
