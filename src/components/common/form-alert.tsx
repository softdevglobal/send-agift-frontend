import { cn } from '@/lib/utils'

type FormAlertProps = {
  error?: string | null
  notice?: string | null
  className?: string
}

export function FormAlert({ error, notice, className }: FormAlertProps) {
  if (!error && !notice) return null

  return (
    <div className={cn('space-y-2', className)}>
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-lg bg-accent/70 px-3 py-2 text-sm text-accent-foreground"
        >
          {notice}
        </p>
      ) : null}
    </div>
  )
}
