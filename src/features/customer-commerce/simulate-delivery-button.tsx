import { useState } from 'react'
import { FlaskConical, LoaderCircle } from 'lucide-react'

import {
  shippingTestToolsEnabled,
  simulateShippoDelivered,
} from '@/api/shippo-webhooks'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api'

type SimulateDeliveryButtonProps = {
  trackingNumber: string
  /** Called after the webhook succeeds so the order can be reloaded. */
  onSimulated: () => void | Promise<void>
}

/**
 * DEV / test-only control: posts the Shippo tracking webhook as DELIVERED.
 * Production never shows this — Shippo calls the webhook itself.
 */
export function SimulateDeliveryButton({
  trackingNumber,
  onSimulated,
}: SimulateDeliveryButtonProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!shippingTestToolsEnabled()) return null
  if (!trackingNumber.trim()) return null

  async function handleClick() {
    setError(null)
    setBusy(true)
    try {
      await simulateShippoDelivered(trackingNumber)
      await onSimulated()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not simulate delivery.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3">
      <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
        Local test only
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Shippo cannot reach localhost. Simulate a DELIVERED webhook for{' '}
        <span className="font-mono font-medium text-foreground">{trackingNumber}</span>{' '}
        so this line becomes reviewable.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => void handleClick()}
        className="mt-2 h-8 rounded-full border-amber-500/40"
      >
        {busy ? (
          <>
            <LoaderCircle className="size-3.5 animate-spin" />
            Simulating…
          </>
        ) : (
          <>
            <FlaskConical className="size-3.5" />
            Mark delivered (test)
          </>
        )}
      </Button>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
