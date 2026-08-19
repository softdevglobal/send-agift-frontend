import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getCroppedImageFile } from '@/lib/image-crop'

type ImageCropDialogProps = {
  open: boolean
  imageSrc: string
  fileName: string
  onCancel: () => void
  onConfirm: (file: File) => void
}

export function ImageCropDialog({
  open,
  imageSrc,
  fileName,
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName)
      onConfirm(file)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust photo</DialogTitle>
          <DialogDescription>Drag to reposition, scroll or pinch to zoom.</DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="accent-primary w-full"
          aria-label="Zoom"
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={processing}>
            {processing ? 'Saving…' : 'Save photo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
