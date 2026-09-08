import { ArrowLeft, ArrowRight, Check, LoaderCircle, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type WizardStep = {
  id: string
  /** Rail label — two or three words. */
  title: string
  /** One line under the heading, saying what this step is for. */
  description: string
  icon: LucideIcon
  content: ReactNode
  /**
   * Blocks Next while the step is incomplete; the string is shown as the
   * reason, so the seller is never left guessing which field is missing.
   */
  blockedReason?: string | null
}

type WizardDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  steps: WizardStep[]
  /** Runs on the last step. Resolve to close; throw to stay open with an error. */
  onComplete: () => void | Promise<void>
  completeLabel: string
  completing?: boolean
  /** Shown above the footer — upload failures, API errors. */
  error?: ReactNode
}

/**
 * The step-by-step shell both seller creation flows are built on: a numbered
 * rail, one panel at a time, and a preview as the last step before anything is
 * written.
 *
 * Sharing it is the point — posting a gift and posting a reel should feel like
 * the same act of publishing, not two unrelated forms.
 */
export function WizardDialog({
  open,
  onOpenChange,
  title,
  description,
  steps,
  onComplete,
  completeLabel,
  completing = false,
  error,
}: WizardDialogProps) {
  const [index, setIndex] = useState(0)

  // Reopening starts from the top rather than wherever the last run ended.
  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  const safeIndex = Math.min(index, steps.length - 1)
  const step = steps[safeIndex]
  const isLast = safeIndex === steps.length - 1
  const blocked = step?.blockedReason ?? null

  const furthestReachable = useMemo(() => {
    // The rail can jump back freely, and forward only as far as the first
    // step that is still incomplete.
    for (let i = 0; i < steps.length; i += 1) {
      if (steps[i].blockedReason) return i
    }
    return steps.length - 1
  }, [steps])

  function goNext() {
    if (blocked) return
    if (isLast) {
      void onComplete()
      return
    }
    setIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  if (!step) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92svh] w-[calc(100%-1.5rem)] max-w-4xl gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onInteractOutside={(event) => {
          // Half-filled steps are easy to lose by a stray click; closing is
          // deliberate here (the X, Cancel, or Escape).
          event.preventDefault()
        }}
      >
        <div className="grid md:grid-cols-[15rem_1fr]">
          <StepRail
            title={title}
            description={description}
            steps={steps}
            index={safeIndex}
            furthestReachable={furthestReachable}
            onJump={setIndex}
          />

          <div className="flex min-h-[28rem] flex-col">
            <header className="border-b border-border/60 px-5 py-4 sm:px-7">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Step {safeIndex + 1} of {steps.length}
              </p>
              <DialogTitle className="mt-1 font-display text-xl tracking-tight">
                {step.title}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm">
                {step.description}
              </DialogDescription>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              {step.content}
            </div>

            <footer className="space-y-3 border-t border-border/60 px-5 py-4 sm:px-7">
              {error}
              {blocked ? (
                <p className="text-xs text-muted-foreground">{blocked}</p>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 rounded-full px-4"
                  onClick={() =>
                    safeIndex === 0
                      ? onOpenChange(false)
                      : setIndex((current) => Math.max(current - 1, 0))
                  }
                  disabled={completing}
                >
                  {safeIndex === 0 ? (
                    'Cancel'
                  ) : (
                    <>
                      <ArrowLeft className="size-4" />
                      Back
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  className="h-10 rounded-full px-5"
                  onClick={goNext}
                  disabled={Boolean(blocked) || completing}
                >
                  {completing ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  {isLast ? (
                    <>
                      <Check className="size-4" />
                      {completeLabel}
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </footer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The numbered rail: where you are, what is done, what is left. */
function StepRail({
  title,
  description,
  steps,
  index,
  furthestReachable,
  onJump,
}: {
  title: string
  description: string
  steps: WizardStep[]
  index: number
  furthestReachable: number
  onJump: (index: number) => void
}) {
  const progress = ((index + 1) / steps.length) * 100

  return (
    <aside className="hidden flex-col gap-6 bg-gradient-to-b from-brand-navy to-brand-violet p-6 text-white md:flex">
      <div>
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-white/70">{description}</p>
      </div>

      <ol className="flex flex-1 flex-col gap-1">
        {steps.map((item, itemIndex) => {
          const done = itemIndex < index
          const current = itemIndex === index
          const reachable = itemIndex <= Math.max(furthestReachable, index)
          const Icon = item.icon

          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onJump(itemIndex)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  current && 'bg-white/15',
                  !current && reachable && 'hover:bg-white/10',
                  !reachable && 'cursor-not-allowed opacity-45',
                )}
              >
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors',
                    done && 'bg-brand-teal text-white',
                    current && 'bg-white text-brand-navy',
                    !done && !current && 'bg-white/15 text-white/80',
                  )}
                >
                  {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {item.title}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-brand-teal transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-white/70">
          {index + 1} of {steps.length} steps
        </p>
      </div>
    </aside>
  )
}

/** Two-column field grid, so both wizards lay their inputs out the same way. */
export function WizardFields({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>
}

/** A labelled block inside a step, with optional helper text under it. */
export function WizardField({
  label,
  htmlFor,
  hint,
  full = false,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: ReactNode
  full?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-2', full && 'sm:col-span-2')}>
      <label
        htmlFor={htmlFor}
        className="text-sm leading-none font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** The framed summary used by the final step of both wizards. */
export function WizardPreviewFrame({
  caption,
  children,
}: {
  caption: string
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{caption}</p>
      <div className="rounded-2xl border border-border/70 bg-surface/70 p-5">
        {children}
      </div>
    </div>
  )
}
