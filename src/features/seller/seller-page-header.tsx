import type { ReactNode } from 'react'

type SellerPageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function SellerPageHeader({
  title,
  description,
  action,
}: SellerPageHeaderProps) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Seller portal
        </p>
        <h1 className="font-display text-3xl tracking-tight">{title}</h1>
        {description ? (
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
