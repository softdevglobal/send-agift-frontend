import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  Gift,
  Heart,
  MessageCircle,
  Play,
  Store,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Popover } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  compactCount,
  hashtagLine,
  likersLine,
  type ReelView,
} from '@/features/reels/reel-view'
import type { LikeGate } from '@/features/reels/use-reel-likes'
import { returnToState } from '@/lib/auth'
import { cn } from '@/lib/utils'

/** How long the "sign in to like" note stays up if it is left alone. */
const LIKE_HINT_MS = 5000

type ReelCardProps = {
  reel: ReelView
  /** True only for the reel filling the viewport. */
  active: boolean
  muted: boolean
  onToggleMute: () => void
  saved: boolean
  onToggleSave: () => void
  /** Likes or unlikes. Only called when [likeGate] is null. */
  onToggleLike: () => void
  /** Set when this viewer cannot like; the heart explains why instead. */
  likeGate: LikeGate
  onOpenComments: () => void
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
  onToggleLike,
  likeGate,
  onOpenComments,
  onEnded,
}: ReelCardProps) {
  const location = useLocation()
  const [likeHintOpen, setLikeHintOpen] = useState(false)

  // The note belongs to the reel on screen: it goes when the reel scrolls
  // away, and on its own after a few seconds.
  useEffect(() => {
    if (!likeHintOpen) return
    if (!active) {
      setLikeHintOpen(false)
      return
    }
    const timer = window.setTimeout(() => setLikeHintOpen(false), LIKE_HINT_MS)
    return () => window.clearTimeout(timer)
  }, [active, likeHintOpen])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [photoIndex, setPhotoIndex] = useState(0)

  const photos = reel.photoUrls.length ? reel.photoUrls : reel.imageUrl ? [reel.imageUrl] : []
  const photo = photos[Math.min(photoIndex, photos.length - 1)] ?? null

  const product = reel.product
  const tags = hashtagLine(reel)
  const likers = likersLine(reel)

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

          {likers ? (
            <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-white/80">
              <Heart className="size-3.5 shrink-0 fill-rose-400 text-rose-400" />
              <span className="truncate">{likers}</span>
            </p>
          ) : null}

          {reel.commentCount > 0 ? (
            <button
              type="button"
              onClick={onOpenComments}
              className="pointer-events-auto mt-1 cursor-pointer text-xs font-medium text-white/70 hover:text-white"
            >
              {reel.commentCount === 1
                ? 'View 1 comment'
                : `View all ${compactCount(reel.commentCount)} comments`}
            </button>
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
        {/* A viewer who cannot like gets a note beside the heart, as on
            YouTube — the feed stays where it is. */}
        <Popover.Root open={likeHintOpen} onOpenChange={setLikeHintOpen}>
          <Popover.Anchor asChild>
            <div>
              <RailButton
                label={reel.likeCount > 0 ? compactCount(reel.likeCount) : 'Like'}
                ariaLabel={`${reel.likedByMe ? 'Unlike' : 'Like'} reel, ${reel.likeCount} ${reel.likeCount === 1 ? 'like' : 'likes'}`}
                onClick={() => (likeGate ? setLikeHintOpen(true) : onToggleLike())}
                active={reel.likedByMe}
                activeClassName="bg-rose-500 text-white"
                icon={<Heart className={cn('size-5', reel.likedByMe && 'fill-current')} />}
              />
            </div>
          </Popover.Anchor>
          <Popover.Portal>
            <Popover.Content
              side="right"
              align="center"
              sideOffset={10}
              collisionPadding={12}
              className="z-50 w-64 rounded-2xl border border-border bg-card p-4 text-sm text-foreground shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            >
              {likeGate === 'customer-only' ? (
                <p className="text-muted-foreground">
                  Likes are for customer accounts.
                </p>
              ) : (
                <>
                  <p className="font-semibold">Like this reel?</p>
                  <p className="mt-1 text-muted-foreground">Sign in to like it.</p>
                  <Button asChild size="sm" className="mt-3 h-8 rounded-full px-4">
                    <Link
                      to="/login"
                      state={returnToState(location.pathname, location.search)}
                    >
                      Sign in
                    </Link>
                  </Button>
                </>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <RailButton
          label={reel.commentCount > 0 ? compactCount(reel.commentCount) : 'Comment'}
          ariaLabel={`Comments, ${reel.commentCount} ${reel.commentCount === 1 ? 'comment' : 'comments'}`}
          onClick={onOpenComments}
          icon={<MessageCircle className="size-5" />}
        />
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
  ariaLabel,
  onClick,
  active = false,
  activeClassName = 'bg-brand-violet text-white',
}: {
  icon: React.ReactNode
  label: string
  /** When the visible label is only a count, this names what the button does. */
  ariaLabel?: string
  onClick: () => void
  active?: boolean
  activeClassName?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={ariaLabel && active ? true : undefined}
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
