import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Gift,
  HeartHandshake,
  ImagePlus,
  Loader2,
  Send,
  Truck,
  X,
} from 'lucide-react'

import type {
  CreateReviewInput,
  ProductReview,
  ReviewMediaInput,
} from '@/api/reviews'
import { uploadPublicFile } from '@/api/media'
import { FormAlert } from '@/components/common/form-alert'
import { Dot, Sparkle } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { reviewHighlights, reviewMood } from '@/features/reviews/review-moods'
import { StarPicker } from '@/features/reviews/star-rating'
import { getErrorMessage } from '@/lib/api'
import { textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

/** The API rejects a tenth file, so stop the picker before the round trip. */
const MAX_MEDIA = 9
const TITLE_MAX = 120
const BODY_MAX = 5000

type Draft = {
  objectPath: string
  previewUrl: string
  mimeType: string
  sizeBytes: number
}

export type ReviewFormProps = {
  /** Editing an existing review; omit to write a new one. */
  review?: ProductReview
  onSubmit: (input: CreateReviewInput) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
  className?: string
  /** Sits at the top of the dark banner: the eyebrow, title and the close button. */
  header?: ReactNode
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

/**
 * Writing or editing a review.
 *
 * The first thing a recipient sees when they open the review link, so it is
 * built as a small moment rather than a form: a dark banner with one big
 * question, stars that answer back with a face and a line, quick things to
 * say, and a footer that is always in reach.
 *
 * The overall score is the only required one; the three detail scores default
 * to it so a customer who just wants to leave five stars is done in one tap.
 */
export function ReviewForm({
  review,
  onSubmit,
  onCancel,
  submitLabel,
  className,
  header,
}: ReviewFormProps) {
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [preview, setPreview] = useState(0)
  const [quality, setQuality] = useState(review?.product_quality_rating ?? 0)
  const [shipping, setShipping] = useState(review?.shipping_rating ?? 0)
  const [service, setService] = useState(review?.seller_service_rating ?? 0)
  const [title, setTitle] = useState(review?.title ?? '')
  const [body, setBody] = useState(review?.body ?? '')
  const [anonymous, setAnonymous] = useState(review?.is_anonymous ?? false)
  const [picked, setPicked] = useState<string[]>([])
  const [media, setMedia] = useState<Draft[]>(
    () =>
      review?.media.map((item) => ({
        objectPath: item.object_path,
        previewUrl: item.cdn_url ?? '',
        mimeType: item.mime_type,
        sizeBytes: item.size_bytes,
      })) ?? [],
  )
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  // Quick-pick chips write the headline until the person types their own.
  const titleIsTheirs = useRef(Boolean(review?.title))

  /**
   * Setting the overall score carries the untouched detail scores with it.
   * Once one has been set on its own it stops following, so an explicit
   * "delivery was a 2" is never quietly overwritten.
   */
  function setOverall(next: number) {
    if (quality === 0 || quality === rating) setQuality(next)
    if (shipping === 0 || shipping === rating) setShipping(next)
    if (service === 0 || service === rating) setService(next)
    // Highlights suit a score's tone; clear the ones that no longer fit.
    const fits = new Set(reviewHighlights(next))
    const kept = picked.filter((chip) => fits.has(chip))
    if (kept.length !== picked.length) {
      setPicked(kept)
      if (!titleIsTheirs.current) setTitle(kept.slice(0, 3).join(' · '))
    }
    setRating(next)
  }

  function toggleHighlight(chip: string) {
    const next = picked.includes(chip)
      ? picked.filter((item) => item !== chip)
      : [...picked, chip]
    setPicked(next)
    if (!titleIsTheirs.current) setTitle(next.slice(0, 3).join(' · '))
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const room = MAX_MEDIA - media.length
    if (room <= 0) {
      setError(`You can attach up to ${MAX_MEDIA} photos or videos.`)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const chosen = Array.from(files).slice(0, room)
      const uploaded = await Promise.all(
        chosen.map(async (file) => {
          const folder = file.type.startsWith('video/') ? 'review-video' : 'review-photo'
          const result = await uploadPublicFile(file, folder)
          return {
            objectPath: result.objectPath,
            // Fall back to a local preview when the bucket is private.
            previewUrl: result.publicUrl || URL.createObjectURL(file),
            mimeType: result.mimeType,
            sizeBytes: result.sizeBytes,
          }
        }),
      )
      setMedia((current) => [...current, ...uploaded])
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Could not upload that file.'))
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (rating < 1) {
      setError('Choose an overall rating first.')
      return
    }
    setSaving(true)
    setError(null)
    const payload: CreateReviewInput = {
      rating,
      // The API needs 1–5 on every dimension, so an untouched detail score
      // submits as the overall rather than as an invalid 0.
      product_quality_rating: quality || rating,
      shipping_rating: shipping || rating,
      seller_service_rating: service || rating,
      title: title.trim() || null,
      body: body.trim() || null,
      is_anonymous: anonymous,
      media: media.map(
        (item): ReviewMediaInput => ({
          object_path: item.objectPath,
          mime_type: item.mimeType,
          size_bytes: item.sizeBytes,
        }),
      ),
    }
    try {
      await onSubmit(payload)
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Could not save your review.'))
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || uploading
  const shown = preview || rating
  const mood = reviewMood(shown)
  const MoodIcon = mood.icon
  const highlights = reviewHighlights(rating)

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex min-h-0 flex-1 flex-col', className)}
    >
      {/* The banner: one question, and stars that answer back. */}
      <div className="relative shrink-0 overflow-hidden bg-brand-ink px-6 pt-6 pb-7 text-white">
        <Sparkle className="absolute top-5 right-14 size-5 text-brand-teal" />
        <Sparkle className="absolute bottom-5 left-5 size-3.5 text-white/40" />
        <Dot className="absolute right-8 bottom-8 size-2 bg-brand-violet" />

        {header}

        <div className="relative mt-5 flex flex-col items-center text-center">
          <StarPicker
            value={rating}
            onChange={setOverall}
            onPreview={setPreview}
            label="Overall rating"
            size="xl"
            tone="dark"
            disabled={busy}
            className="justify-center"
          />
          <div
            key={shown}
            className="animate-soft-rise mt-4 flex min-h-[4.25rem] flex-col items-center"
          >
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold',
                shown > 0 ? 'bg-brand-teal text-brand-ink' : 'bg-white/10 text-white',
              )}
            >
              <MoodIcon className="size-4" />
              {mood.headline}
            </span>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">{mood.nudge}</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
        <section className="space-y-3">
          <Eyebrow>What stood out?</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {highlights.map((chip) => {
              const on = picked.includes(chip)
              return (
                <button
                  key={chip}
                  type="button"
                  aria-pressed={on}
                  disabled={busy}
                  onClick={() => toggleHighlight(chip)}
                  className={cn(
                    'rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-all active:scale-95',
                    on
                      ? 'border-brand-ink bg-brand-ink text-white'
                      : 'border-brand-ink/15 bg-background hover:border-brand-ink',
                  )}
                >
                  {chip}
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <Eyebrow>Rate the details</Eyebrow>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {[
              { label: 'The gift', icon: Gift, value: quality, set: setQuality },
              { label: 'Delivery', icon: Truck, value: shipping, set: setShipping },
              { label: 'The seller', icon: HeartHandshake, value: service, set: setService },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-xl border-2 border-brand-ink/10 bg-background p-3"
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <row.icon className="size-3.5 text-brand-violet" />
                  {row.label}
                </p>
                <StarPicker
                  value={row.value}
                  onChange={row.set}
                  label={row.label}
                  size="md"
                  disabled={busy}
                  className="mt-2"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <Eyebrow>Tell the story</Eyebrow>
          <div className="space-y-1.5">
            <label htmlFor="review-title" className="text-sm font-medium">
              Sum it up in a line
            </label>
            <Input
              id="review-title"
              value={title}
              maxLength={TITLE_MAX}
              disabled={busy}
              onChange={(event) => {
                titleIsTheirs.current = event.target.value.trim() !== ''
                setTitle(event.target.value)
              }}
              placeholder="Arrived beautifully wrapped"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="review-body" className="text-sm font-medium">
              What did you and the recipient think?
            </label>
            <textarea
              id="review-body"
              value={body}
              maxLength={BODY_MAX}
              disabled={busy}
              onChange={(event) => setBody(event.target.value)}
              className={cn(textareaClassName, 'min-h-28')}
              placeholder="The moment it arrived, the reaction, anything the next buyer should know…"
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {body.length}/{BODY_MAX}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <Eyebrow>Show us</Eyebrow>
          {media.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {media.map((item, index) => (
                <div
                  key={`${item.objectPath}-${index}`}
                  className="relative size-20 overflow-hidden rounded-xl ring-2 ring-brand-ink/10"
                >
                  {item.mimeType.startsWith('video/') ? (
                    <video src={item.previewUrl} className="size-full object-cover" muted />
                  ) : (
                    <img src={item.previewUrl} alt="" className="size-full object-cover" />
                  )}
                  <button
                    type="button"
                    aria-label="Remove"
                    disabled={busy}
                    onClick={() =>
                      setMedia((current) => current.filter((_, i) => i !== index))
                    }
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {media.length < MAX_MEDIA ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-brand-ink/20 bg-accent/30 px-4 py-4 text-left transition-colors hover:border-brand-violet hover:bg-accent/60 disabled:opacity-50"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-violet text-white">
                {uploading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <ImagePlus className="size-5" />
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  {uploading ? 'Uploading…' : 'Add photos or a short video'}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Up to {MAX_MEDIA} files. Photos of the gift as it arrived help other buyers most.
                </span>
              </span>
            </button>
          ) : null}
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(event) => void addFiles(event.target.files)}
          />
        </section>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border-2 border-brand-ink/10 px-4 py-3">
          <span>
            <span className="block text-sm font-semibold">Post as Anonymous</span>
            <span className="block text-xs text-muted-foreground">
              Your name will not be shown with this review.
            </span>
          </span>
          <Switch checked={anonymous} disabled={busy} onCheckedChange={setAnonymous} />
        </label>

        <FormAlert error={error} />
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card px-6 py-4">
        <p className="text-xs text-muted-foreground">
          {rating < 1 ? 'Pick a star rating to continue.' : 'Looking good. Ready when you are.'}
        </p>
        <div className="flex gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-full px-5"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" className="h-11 rounded-full px-6" disabled={busy || rating < 1}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {submitLabel ?? (review ? 'Save changes' : 'Share my review')}
          </Button>
        </div>
      </div>
    </form>
  )
}
