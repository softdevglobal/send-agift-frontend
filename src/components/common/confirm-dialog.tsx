import { CircleHelp, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  /** Disables both buttons and spins the confirm button. */
  busy?: boolean
  /** `danger` for deletes and suspensions; `default` for big but safe steps. */
  tone?: 'danger' | 'default'
}

/**
 * The portals' one "are you sure". Deliberately a centred dialog rather than
 * a side panel: a confirm interrupts, so it belongs in front of the work, not
 * beside it.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  busy = false,
  tone = 'danger',
}: ConfirmDialogProps) {
  const danger = tone === 'danger'
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // A half-finished action should not close by a stray outside click.
        if (!next && busy) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="border-2 border-brand-ink sm:max-w-md">
        <DialogHeader>
          <div
            className={cn(
              'mb-2 flex size-11 rotate-[-6deg] items-center justify-center rounded-lg',
              danger ? 'bg-destructive text-white' : 'bg-brand-violet text-white',
            )}
          >
            {danger ? <TriangleAlert className="size-5" /> : <CircleHelp className="size-5" />}
          </div>
          <DialogTitle className="font-poster text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-10 border-2 border-brand-ink/15 px-4"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn(
              'h-10 px-4',
              danger && 'bg-destructive text-white hover:bg-destructive/85',
            )}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
