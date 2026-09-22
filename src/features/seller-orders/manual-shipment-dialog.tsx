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
 * Seller’s own courier with tracking — not personal hand-delivery.
 *
 * POST .../shipping/manual — courier_provider + tracking_number (+ optional
 * tracking_url). Does not accept a note. Use when Shippo has no rates.
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
      const trackingLink = trackingUrl.trim()
      const shipment = await markShippingManual(orderItemID, {
        courier_provider: courierProvider,
        tracking_number: trackingNumber,
        ...(trackingLink ? { tracking_url: trackingLink } : {}),
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
            <DialogTitle>Use your own courier</DialogTitle>
            <DialogDescription>
              Record a courier you arranged yourself, with tracking. No Shippo
              label and no delivery note — only courier name and tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="manual-courier">Courier</Label>
              <Input
                id="manual-courier"
                value={courier}
                onChange={(event) => setCourier(event.target.value)}
                placeholder="Kandy Express"
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
                placeholder="KE123"
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
                placeholder="https://..."
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
