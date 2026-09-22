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
import { getErrorMessage } from '@/lib/api'

export type LocalDeliveryDialogProps = {
  orderItemID: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted: (shipment: Shipment) => void
}

/**
 * Confirm starting a personal hand-delivery.
 *
 * POST .../shipping/local with an empty body. No note, courier, or tracking.
 * Provider becomes "Local delivery". Complete later with .../local/delivered.
 */
export function LocalDeliveryDialog({
  orderItemID,
  open,
  onOpenChange,
  onStarted,
}: LocalDeliveryDialogProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      const shipment = await startLocalDelivery(orderItemID)
      onStarted(shipment)
      onOpenChange(false)
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
          if (!next) setError(null)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deliver it yourself</DialogTitle>
          <DialogDescription>
            Confirm you will hand this gift over in person. No Shippo label and
            no tracking number — provider will show as “Local delivery”.
          </DialogDescription>
        </DialogHeader>

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
          <Button type="button" onClick={() => void handleConfirm()} disabled={saving}>
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Bike className="size-4" />
            )}
            Confirm local delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
