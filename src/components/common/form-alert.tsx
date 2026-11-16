import { CircleAlert, CircleCheck } from 'lucide-react'

import { cn } from '@/lib/utils'

type FormAlertProps = {
  error?: string | null
  notice?: string | null
  /** Kept for callers that pass one; messages show without a heading. */
  errorTitle?: string
  className?: string
}

/**
 * The one way the site shows a problem or a confirmation: a single line of
 * plain words with a small icon, in a clear colour, with no box around it.
 * Announced to screen readers.
 */
export function FormAlert({ error, notice, className }: FormAlertProps) {
  if (!error && !notice) return null

  return (
    <div className={cn('space-y-1.5', className)}>
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 text-sm leading-relaxed font-medium text-rose-600 dark:text-rose-400"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">{error}</span>
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="flex items-start gap-2 text-sm leading-relaxed font-medium text-emerald-700 dark:text-emerald-400"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">{notice}</span>
        </p>
      ) : null}
    </div>
  )
}
