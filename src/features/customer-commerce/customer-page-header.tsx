import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

type CustomerPageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
  /** Label in the chip above the title; `false` hides it. Defaults by section. */
  eyebrow?: string | false
}

function sectionLabel(pathname: string) {
  if (pathname.startsWith('/sellers')) return 'Shop'
  if (pathname.startsWith('/cart') || pathname.startsWith('/checkout')) return 'Your bag'
  return 'My account'
}

export function CustomerPageHeader({
  title,
  description,
  action,
  eyebrow,
}: CustomerPageHeaderProps) {
  const { pathname } = useLocation()
  const label = eyebrow === false ? null : (eyebrow ?? sectionLabel(pathname))
  return (
    <div
      className={
        description
          ? 'mb-8 flex flex-wrap items-start justify-between gap-4'
          : 'mb-8 flex flex-wrap items-center justify-between gap-4'
      }
    >
      <div className="min-w-0 space-y-3">
        {label ? (
          <p className="w-fit rounded-md bg-brand-ink px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
            {label}
          </p>
        ) : null}
        <h1 className="font-poster text-3xl text-brand-ink sm:text-4xl dark:text-foreground">
          <span className="marker-underline">{title}</span>
        </h1>
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
