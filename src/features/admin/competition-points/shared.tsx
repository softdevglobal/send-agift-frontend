import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

import { STATUS_TONE } from './labels'

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase',
        STATUS_TONE[status] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {(label ?? status).replaceAll('_', ' ')}
    </span>
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function ActionButtons({
  actions,
  busy,
  onAction,
  disabled,
}: {
  actions: { action: string; label: string; danger?: boolean }[]
  busy: boolean
  onAction: (action: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button
          key={a.action}
          variant={a.danger ? 'destructive' : 'outline'}
          size="sm"
          disabled={busy || disabled}
          onClick={() => onAction(a.action)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  )
}

/** "unapproved" values must be visibly labelled in a sandbox. */
export function UnapprovedNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950 ring-1 ring-amber-200">{children}</p>
  )
}
