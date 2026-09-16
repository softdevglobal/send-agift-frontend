import { useState } from 'react'
import { LoaderCircle, Send } from 'lucide-react'

import { markShippingManual, type Shipment } from '@/api/seller-orders'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormAlert } from '@/components/common/form-alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api'

export type ManualShipmentDialogProps = {
  orderItemID: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onShipped: (shipment: Shipment) => void
}

/**
 * The fallback for a lane Shippo cannot quote at all — none of its connected
 * carrier accounts serve every country (Shippo's test carriers, for example,
 * are entirely US/Canada/Europe), so "no rates returned" can mean a perfectly
 * valid order with nothing left to fix on our side.
 *
 * This records what the seller arranged themselves — a courier name and their
 * own tracking number — and dispatches the item directly. No label, no rate,
 * no Shippo involvement past this point.
 */
export function ManualShipmentDialog({
  orderItemID,
  open,
  onOpenChange,
  onShipped,
}: ManualShipmentDialogProps) {
  const [courier, setCourier] = useState('')
  const [tracking, setTracking] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setCourier('')
    setTracking('')
    setTrackingUrl('')
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const courierProvider = courier.trim()
    const trackingNumber = tracking.trim()
    if (!courierProvider || !trackingNumber) {
      setError('Courier name and tracking number are both required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const shipment = await markShippingManual(orderItemID, {
        courier_provider: courierProvider,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl.trim() || undefined,
      })
      onShipped(shipment)
      onOpenChange(false)
      reset()
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Could not record this shipment.'))
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
            <DialogTitle>Ship it yourself</DialogTitle>
            <DialogDescription>
              No Shippo label for this order. Record the courier and tracking
              number you arranged directly — the order moves to dispatched
              straight away.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="manual-courier">Courier</Label>
              <Input
                id="manual-courier"
                value={courier}
                onChange={(event) => setCourier(event.target.value)}
                placeholder="Kandy Express Couriers"
                disabled={saving}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-tracking">Tracking number</Label>
              <Input
                id="manual-tracking"
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
                placeholder="KEC-00123"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-tracking-url">
                Tracking link <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="manual-tracking-url"
                type="url"
                value={trackingUrl}
                onChange={(event) => setTrackingUrl(event.target.value)}
                placeholder="https://courier.example/track/KEC-00123"
                disabled={saving}
              />
            </div>
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
                <Send className="size-4" />
              )}
              Mark dispatched
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
