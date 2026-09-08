import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  Gift,
  Play,
  Store,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { compactCount, hashtagLine, type ReelView } from '@/features/reels/reel-view'
import { cn } from '@/lib/utils'

type ReelCardProps = {
  reel: ReelView
  /** True only for the reel filling the viewport. */
  active: boolean
  muted: boolean
  onToggleMute: () => void
  saved: boolean
  onToggleSave: () => void
  /** Advances the feed when the clip ends. */
  onEnded: () => void
}

/**
 * One reel, laid out the way Shorts does it: the vertical clip in a rounded
 * player, and the actions in a column of circular buttons *outside* it to the
 * right, so nothing covers the video.
 *
 * Only the active card plays. Browsers block autoplay with sound, so playback
 * starts muted and the viewer opts into audio; that choice is shared across
 * the feed so it survives scrolling to the next reel.
 */
export function ReelCard({
  reel,
  active,
  muted,
  onToggleMute,
  saved,
  onToggleSave,
  onEnded,
}: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [photoIndex, setPhotoIndex] = useState(0)

  const photos = reel.photoUrls.length ? reel.photoUrls : reel.imageUrl ? [reel.imageUrl] : []
  const photo = photos[Math.min(photoIndex, photos.length - 1)] ?? null

  const product = reel.product
  const tags = hashtagLine(reel)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (!active) {
      video.pause()
      // Scrolling back to a reel restarts it rather than resuming a clip the
      // viewer already half-watched.
      video.currentTime = 0
      setPaused(false)
      setProgress(0)
      return
    }

    if (!paused) {
      // A rejected play() is normal (autoplay policy, or the element being
      // torn down mid-scroll) and must not bubble as an unhandled rejection.
      void video.play().catch(() => undefined)
    }
  }, [active, paused])

  function togglePlayback() {
    const video = videoRef.current
    if (!video) {
      // Photo reels have no element to pause; the hold state is all there is.
      setPaused((value) => !value)
      return
    }
    if (video.paused) {
      void video.play().catch(() => undefined)
      setPaused(false)
    } else {
      video.pause()
      setPaused(true)
    }
  }

  return (
    <div className="flex h-full items-center justify-center gap-3 sm:gap-4">
      <article
        // Height-driven with a 9:16 ratio: the player fills the viewport
        // vertically and takes only the width a vertical clip needs.
        className="relative aspect-[9/16] h-full max-w-full shrink overflow-hidden rounded-2xl bg-brand-navy shadow-[0_24px_70px_-20px_rgba(15,27,69,0.55)]"
        aria-label={product ? `Reel: ${product.name}` : `Reel by ${reel.shopName}`}
      >
        <button
          type="button"
          onClick={togglePlayback}
          className="absolute inset-0 size-full cursor-pointer"
          aria-label={paused ? 'Play reel' : 'Pause reel'}
        >
          {reel.videoUrl ? (
            <video
              ref={videoRef}
              src={reel.videoUrl}
              poster={reel.imageUrl ?? undefined}
              className="size-full object-cover"
              playsInline
              loop={false}
              muted={muted}
              preload={active ? 'auto' : 'none'}
              onTimeUpdate={(event) => {
                const video = event.currentTarget
                if (video.duration > 0) setProgress(video.currentTime / video.duration)
              }}
              onEnded={onEnded}
            />
          ) : photo ? (
            <img
              src={photo}
              alt={product ? product.name : `Reel by ${reel.shopName}`}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : null}
        </button>

        {/* A photo post can carry up to ten frames; they are stepped through
            rather than played. */}
        {photos.length > 1 ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-7 flex justify-center gap-1.5">
              {photos.map((url, index) => (
                <span
                  key={url}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === photoIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50',
                  )}
                />
              ))}
            </div>
            <PhotoStep
              side="left"
              disabled={photoIndex === 0}
              onClick={() => setPhotoIndex((value) => Math.max(value - 1, 0))}
            />
            <PhotoStep
              side="right"
              disabled={photoIndex >= photos.length - 1}
              onClick={() =>
                setPhotoIndex((value) => Math.min(value + 1, photos.length - 1))
              }
            />
          </>
        ) : null}

        {/* Scrims top and bottom: the clip keeps its colour in the middle, and
            the text on either end stays readable whatever it sits on. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-navy/55 via-transparent to-brand-navy/90" />

        <div className="pointer-events-none absolute inset-x-3 top-3 h-[3px] overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-brand-teal transition-[width] duration-150 ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        {paused ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid size-16 place-items-center rounded-full bg-brand-navy/55 backdrop-blur-sm">
              <Play className="size-8 fill-white text-white" />
            </span>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
          <div className="pointer-events-auto flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-navy to-brand-violet ring-2 ring-white/25">
              {reel.shopImageUrl ? (
                <img
                  src={reel.shopImageUrl}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <Store className="size-4" />
              )}
            </span>
            <span className="truncate text-sm font-semibold">{reel.shopName}</span>
          </div>

          {product ? (
            <h3 className="mt-3 line-clamp-2 font-display text-2xl font-semibold tracking-tight">
              {product.name}
            </h3>
          ) : null}

          {reel.caption ? (
            <p className="mt-1.5 line-clamp-2 text-sm text-white/75">{reel.caption}</p>
          ) : null}

          {tags ? (
            <p className="mt-1.5 truncate text-[13px] font-semibold text-brand-teal">
              {tags}
            </p>
          ) : null}

          {product ? (
            <div className="pointer-events-auto mt-4 flex items-center gap-3">
              <span className="text-lg font-bold">{product.priceLabel}</span>
              <Button
                asChild
                className="h-11 flex-1 rounded-full bg-gradient-to-r from-brand-navy to-brand-violet text-white shadow-lg shadow-brand-violet/30 hover:opacity-95"
              >
                <Link to={`/products/${product.id}`}>
                  <Gift className="size-4" />
                  Send as a gift
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </article>

      {/* The rail sits beside the player, Shorts-style, so the clip is never
          covered by controls. */}
      <div className="flex shrink-0 flex-col items-center gap-4 pb-2">
        {product ? (
          <RailButton
            label={saved ? 'Saved' : 'Save'}
            onClick={onToggleSave}
            active={saved}
            activeClassName="bg-brand-teal text-white"
            icon={<Bookmark className={cn('size-5', saved && 'fill-current')} />}
          />
        ) : null}
        {reel.videoUrl ? (
          <RailButton
            label={muted ? 'Unmute' : 'Sound'}
            onClick={onToggleMute}
            icon={muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          />
        ) : null}
        {reel.viewCount > 0 ? (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Eye className="size-5" />
            <span className="text-xs font-semibold">{compactCount(reel.viewCount)}</span>
            <span className="text-[10px] leading-none">views</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RailButton({
  icon,
  label,
  onClick,
  active = false,
  activeClassName = 'bg-brand-violet text-white',
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  activeClassName?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center gap-1.5"
    >
      <span
        className={cn(
          'grid size-11 place-items-center rounded-full bg-muted text-foreground transition-all hover:scale-105 active:scale-95',
          active && activeClassName,
        )}
      >
        {icon}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </button>
  )
}

/** Steps a photo carousel, sitting over the edge of the frame. */
function PhotoStep({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-brand-navy/45 text-white backdrop-blur-sm transition-opacity hover:bg-brand-navy/70',
        side === 'left' ? 'left-2' : 'right-2',
        disabled && 'pointer-events-none opacity-0',
      )}
    >
      {side === 'left' ? (
        <ChevronLeft className="size-5" />
      ) : (
        <ChevronRight className="size-5" />
      )}
    </button>
  )
}
