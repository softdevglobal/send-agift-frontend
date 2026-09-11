import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type ImageLightboxProps = {
  src: string
  alt: string
  onClose: () => void
}

/**
 * A same-tab, full-screen preview for a chat photo, so tapping one never
 * leaves the conversation for a new browser tab. Closes on Escape, a
 * backdrop click, or the close button; portalled to `document.body` so it
 * sits above the inbox's own full-screen mobile overlay and any open dialog.
 */
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    // Behind-the-scenes page shouldn't scroll while the photo is up.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Photo'}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      {/* Stops the click from bubbling to the backdrop so tapping the photo doesn't close it. */}
      <img
        src={src}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200"
      />
    </div>,
    document.body,
  )
}
