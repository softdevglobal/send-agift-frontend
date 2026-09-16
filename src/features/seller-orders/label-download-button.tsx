import { useState } from 'react'
import { Download, LoaderCircle } from 'lucide-react'

import { getShippingLabelLink } from '@/api/seller-orders'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Downloads the label PDF for an order item.
 *
 * The link is fetched on click, not on render: it is a presigned URL that
 * expires within minutes, so one taken at page load would usually be dead by
 * the time the seller pressed the button. It also means an item that never had
 * a label bought only discovers that when asked.
 */
export function LabelDownloadButton({
  orderItemID,
  className,
}: {
  orderItemID: string
  className?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    setLoading(true)
    setError(null)
    try {
      const link = await getShippingLabelLink(orderItemID)
      // A new tab, not a fetch-and-blob: the PDF is large-ish, the browser's
      // own viewer handles printing, and the presigned URL needs no auth.
      window.open(link.url, '_blank', 'noopener,noreferrer')
    } catch (linkError) {
      setError(getErrorMessage(linkError, 'Could not open the label.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void download()}
        disabled={loading}
        className="rounded-full"
      >
        {loading ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Download label (PDF)
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
