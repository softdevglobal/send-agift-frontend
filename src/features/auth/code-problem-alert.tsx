import {
  Hourglass,
  KeyRound,
  MailWarning,
  ShieldAlert,
  TimerReset,
  type LucideIcon,
} from 'lucide-react'

import type { CodeProblem } from '@/features/auth/code-problem'
import { cn } from '@/lib/utils'

const ICON: Record<CodeProblem['kind'], LucideIcon> = {
  wait: TimerReset,
  daily_limit: Hourglass,
  locked: ShieldAlert,
  wrong: KeyRound,
  expired: Hourglass,
  invalid: MailWarning,
  other: MailWarning,
}

const TONE: Record<CodeProblem['kind'], { box: string; icon: string }> = {
  wait: { box: 'border-amber-300 bg-amber-50', icon: 'bg-amber-200 text-amber-950' },
  daily_limit: { box: 'border-amber-300 bg-amber-50', icon: 'bg-amber-200 text-amber-950' },
  locked: { box: 'border-destructive/40 bg-destructive/5', icon: 'bg-destructive text-white' },
  wrong: { box: 'border-brand-violet/30 bg-accent/60', icon: 'bg-brand-violet text-white' },
  expired: { box: 'border-brand-violet/30 bg-accent/60', icon: 'bg-brand-violet text-white' },
  invalid: { box: 'border-destructive/30 bg-destructive/5', icon: 'bg-destructive text-white' },
  other: { box: 'border-destructive/30 bg-destructive/5', icon: 'bg-destructive text-white' },
}

type CodeProblemAlertProps = {
  problem: CodeProblem
  /** Seconds left on the resend timer, for the "wait" case. */
  secondsLeft?: number
  className?: string
}

/** A friendly callout for a code problem, with a live timer when it is a wait. */
export function CodeProblemAlert({ problem, secondsLeft = 0, className }: CodeProblemAlertProps) {
  const Icon = ICON[problem.kind]
  const tone = TONE[problem.kind]
  const total = problem.seconds ?? 60
  const waiting = problem.kind === 'wait' && secondsLeft > 0

  return (
    <div
      role="alert"
      className={cn('flex gap-3 rounded-xl border p-3.5', tone.box, className)}
    >
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tone.icon)}>
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{problem.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{problem.body}</p>
        {problem.kind === 'wait' ? (
          <div className="mt-2.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-amber-200/70">
              <div
                className="h-full rounded-full bg-amber-500 transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.min(100, (secondsLeft / total) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-medium text-amber-950">
              {waiting ? `Fresh code available in ${secondsLeft}s` : 'You can ask for a fresh code now'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
