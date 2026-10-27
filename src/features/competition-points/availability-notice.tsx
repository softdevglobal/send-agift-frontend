import { CircleSlash, MapPinOff, PauseCircle, ShieldAlert, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { NextAction, ReasonCode } from '@/api/competition-points'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { nextActionLink } from './format'

function iconFor(code: ReasonCode | undefined) {
  switch (code) {
    case 'LOCATION_UNAVAILABLE':
      return MapPinOff
    case 'VERIFICATION_REQUIRED':
    case 'AGE_RESTRICTED':
      return ShieldAlert
    case 'CHANNEL_UNAVAILABLE':
      return Smartphone
    case 'OPERATION_STOPPED':
      return PauseCircle
    default:
      return CircleSlash
  }
}

/**
 * Why something is unavailable, and the one useful thing to do instead. The
 * server decides availability; this only explains its answer. It never
 * offers a purchase as the remedy for a location restriction.
 */
export function AvailabilityNotice({
  code,
  message,
  nextAction,
  className,
}: {
  code?: ReasonCode
  message: string
  nextAction?: NextAction
  className?: string
}) {
  const Icon = iconFor(code)
  const link = nextActionLink(nextAction)
  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-start gap-4 rounded-2xl border-2 border-brand-ink/15 bg-card px-5 py-4',
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-brand-ink">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-ink dark:text-foreground">{message}</p>
        {code ? <p className="mt-1 text-xs text-muted-foreground">Reason: {code.replaceAll('_', ' ').toLowerCase()}</p> : null}
      </div>
      {link ? (
        <Button asChild variant="outline" className="h-10 px-4">
          <Link to={link.to}>{link.label}</Link>
        </Button>
      ) : null}
    </div>
  )
}
