import { useState, type ReactNode } from 'react'
import { Crown, LoaderCircle } from 'lucide-react'

import type { AdminLeaderboardRow, AdminPlayer } from '@/api/games'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { adminPanelClass } from '@/features/admin/admin-styles'
import { formatScore, gameGradient, gameLook, type Tone } from '@/features/admin/games-format'
import { getErrorMessage } from '@/lib/api'
import { textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

export function GameBadge({ slug, className }: { slug: string; className?: string }) {
  const { icon: Icon } = gameLook(slug)
  return (
    <span
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_6px_16px_rgba(0,0,0,0.18)]',
        className,
      )}
      style={{ background: gameGradient(slug) }}
    >
      <Icon className="size-5" />
    </span>
  )
}

const toneClass: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  good: 'bg-emerald-100 text-emerald-800',
  warn: 'bg-amber-100 text-amber-800',
  bad: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-800',
}

export function StatusPill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function PlayerCell({ player }: { player: AdminPlayer }) {
  return (
    <div className="min-w-0">
      {/* No account-kind badge: every row here is a signed-in customer. */}
      <span className="truncate font-medium">{player.name}</span>
      {player.email || player.country_name ? (
        <p className="truncate text-xs text-muted-foreground">
          {[player.email, player.country_name].filter(Boolean).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

export function Loading() {
  return (
    <div className="flex justify-center py-24">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

const podiumStyle = [
  { order: 'order-2', height: 'h-28', medal: '#F5B700', label: '1st' },
  { order: 'order-1', height: 'h-20', medal: '#A7B1C2', label: '2nd' },
  { order: 'order-3', height: 'h-14', medal: '#D4884A', label: '3rd' },
]

/** The top three on a podium: first in the middle, raised highest. */
export function Podium({ entries, slug }: { entries: AdminLeaderboardRow[]; slug: string }) {
  const top = entries.slice(0, 3)
  if (top.length === 0) return null
  return (
    <div className={cn(adminPanelClass, 'overflow-hidden px-4 pt-6')}>
      <div className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-3">
        {top.map((row, i) => {
          const style = podiumStyle[i]
          return (
            <div key={`${row.rank}-${row.player.name}`} className={cn('flex flex-col items-center', style.order)}>
              {i === 0 ? <Crown className="mb-1 size-6" style={{ color: style.medal }} /> : null}
              <span
                className="mb-2 flex size-12 items-center justify-center rounded-full text-base font-semibold text-white ring-4 ring-white"
                style={{ background: style.medal }}
              >
                {row.player.name.charAt(0).toUpperCase()}
              </span>
              <p className="max-w-full truncate text-center text-sm font-medium">{row.player.name}</p>
              <p className="font-display text-xl tracking-tight">{formatScore(row.best_score)}</p>
              <div
                className={cn(
                  'mt-2 flex w-full items-start justify-center rounded-t-xl pt-2 text-lg font-semibold text-white',
                  style.height,
                )}
                style={{ background: i === 0 ? gameGradient(slug) : style.medal }}
              >
                {style.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type ReasonDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: (reason: string) => Promise<void>
}

/** Asks for a reason before a consequential admin action; it goes to the audit log. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!reason.trim()) {
      setError('Please give a reason — it is recorded in the audit log.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
      setReason('')
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return
        setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <textarea
          className={textareaClassName}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason"
          aria-label="Reason"
        />
        <FormAlert error={error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-10" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" className="h-10" disabled={busy} onClick={submit}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
