import { useState } from 'react'
import { Bike, LoaderCircle } from 'lucide-react'

import { startLocalDelivery, type Shipment } from '@/api/seller-orders'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api'
import { textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

const NOTE_MAX = 500

export type LocalDeliveryDialogProps = {
  orderItemID: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted: (shipment: Shipment) => void
}

/**
 * Starting a delivery the seller is making in person.
 *
 * No courier and no tracking number, because there is no carrier involved —
 * the only optional field is a note for the seller's own record. The item
 * moves to dispatched, and the seller confirms the hand-over separately.
 */
export function LocalDeliveryDialog({
  orderItemID,
  open,
  onOpenChange,
  onStarted,
}: LocalDeliveryDialogProps) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setNote('')
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const shipment = await startLocalDelivery(orderItemID, {
        note: note.trim() || undefined,
      })
      onStarted(shipment)
      onOpenChange(false)
      reset()
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Could not start this delivery.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) {
          onOpenChange(next)
          if (!next) reset()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Deliver this yourself</DialogTitle>
            <DialogDescription>
              For a gift you are taking to the recipient in person. No courier
              and no tracking number — the order moves to dispatched, and you
              confirm the hand-over once it is done.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="local-delivery-note">
              Note <span className="text-muted-foreground">(optional, only you see this)</span>
            </Label>
            <textarea
              id="local-delivery-note"
              value={note}
              maxLength={NOTE_MAX}
              disabled={saving}
              onChange={(event) => setNote(event.target.value)}
              className={cn(textareaClassName, 'min-h-20')}
              placeholder="Delivering by bike this evening"
            />
          </div>

          <FormAlert error={error} className="mt-4" />

          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Bike className="size-4" />
              )}
              Start delivery
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
