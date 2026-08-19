import { LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SaveStatus = 'idle' | 'saving' | 'saved'

type SaveButtonProps = {
  status: SaveStatus
  children: React.ReactNode
  savingLabel?: string
  savedLabel?: string
  className?: string
}

/** Draws a ring, then a tick inside it, to confirm a completed save. */
function CheckMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        className="animate-draw-circle [stroke-dasharray:64]"
      />
      <path d="M7.5 12.5l3 3 6-6.5" className="animate-draw-check [stroke-dasharray:22]" />
    </svg>
  )
}

export function SaveButton({
  status,
  children,
  savingLabel = 'Saving…',
  savedLabel = 'Saved',
  className,
}: SaveButtonProps) {
  return (
    <Button
      type="submit"
      disabled={status !== 'idle'}
      className={cn('h-10 disabled:opacity-100', className)}
    >
      {status === 'saving' ? (
        <>
          <LoaderCircle className="animate-spin" />
          {savingLabel}
        </>
      ) : status === 'saved' ? (
        <>
          <CheckMark />
          {savedLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
