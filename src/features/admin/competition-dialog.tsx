import { Trophy } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type CompetitionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
}

/**
 * The centred pop-up the competition form opens in, for creating and for
 * editing. The header stays put while the form scrolls under it, so the
 * title and the close button are always in reach on a long form.
 */
export function CompetitionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: CompetitionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl [&>[data-slot=dialog-close]]:top-5 [&>[data-slot=dialog-close]]:right-5 [&>[data-slot=dialog-close]]:z-10 [&>[data-slot=dialog-close]]:text-white [&>[data-slot=dialog-close]]:opacity-80">
        <DialogHeader className="relative shrink-0 overflow-hidden border-b border-border/60 bg-gradient-to-br from-brand-navy via-brand-ink to-[oklch(0.32_0.14_296)] px-6 py-5 text-left text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-[var(--brand-violet)]/45 blur-3xl"
          />
          <div className="relative flex items-center gap-3 pr-8">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15">
              <Trophy className="size-5 text-[oklch(0.86_0.14_85)]" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-display text-2xl tracking-tight text-white">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-white/65">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
