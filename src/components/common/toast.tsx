import { useEffect } from 'react'
import { CheckCircle2, X, XCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error'

type ToastProps = {
  message: string
  onClose: () => void
  variant?: ToastVariant
  durationMs?: number
}

export function Toast({ message, onClose, variant = 'success', durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs)
    return () => clearTimeout(timer)
  }, [onClose, durationMs])

  const Icon = variant === 'success' ? CheckCircle2 : XCircle

  return (
    <div
      role="status"
      className="animate-in fade-in slide-in-from-bottom-4 fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-[0_12px_32px_rgba(30,40,20,0.18)] ring-1 ring-border/60 duration-300"
    >
      <Icon
        className={cn(
          'size-5 shrink-0',
          variant === 'success' ? 'text-green-600' : 'text-red-600',
        )}
      />
      <span className="font-medium">{message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="ml-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
