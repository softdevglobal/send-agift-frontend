import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'

import type {
  CreateReviewInput,
  ProductReview,
  ReviewMediaInput,
} from '@/api/reviews'
import { uploadPublicFile } from '@/api/media'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormAlert } from '@/components/common/form-alert'
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
}

/**
 * Writing or editing a review.
 *
 * The overall score is the only required one; the three sub-scores default to
 * it so a customer who just wants to leave five stars is done in one tap, and
 * anyone with more to say can still pull them apart.
 */
export function ReviewForm({
  review,
  onSubmit,
  onCancel,
  submitLabel,
  className,
}: ReviewFormProps) {
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [quality, setQuality] = useState(review?.product_quality_rating ?? 0)
  const [shipping, setShipping] = useState(review?.shipping_rating ?? 0)
  const [service, setService] = useState(review?.seller_service_rating ?? 0)
  const [title, setTitle] = useState(review?.title ?? '')
  const [body, setBody] = useState(review?.body ?? '')
  const [anonymous, setAnonymous] = useState(review?.is_anonymous ?? false)
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

  /**
   * Setting the overall score carries the untouched sub-scores with it. Once a
   * sub-score has been set on its own it stops following, so an explicit
   * "delivery was a 2" is never quietly overwritten.
   */
  function setOverall(next: number) {
    if (quality === 0 || quality === rating) setQuality(next)
    if (shipping === 0 || shipping === rating) setShipping(next)
    if (service === 0 || service === rating) setService(next)
    setRating(next)
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
      const picked = Array.from(files).slice(0, room)
      const uploaded = await Promise.all(
        picked.map(async (file) => {
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (rating < 1) {
      setError('Choose an overall rating first.')
      return
    }
    setSaving(true)
    setError(null)
    const payload: CreateReviewInput = {
      rating,
      // The API needs 1–5 on every dimension, so an untouched sub-score
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

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-5', className)}>
      <div className="rounded-2xl bg-muted/40 p-4 text-center">
        <p className="text-sm font-medium">How was it overall?</p>
        <div className="mt-3 flex flex-col items-center gap-2">
          <StarPicker
            value={rating}
            onChange={setOverall}
            label="Overall rating"
            size="lg"
            showWord
            disabled={busy}
            className="justify-center"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Gift quality', value: quality, set: setQuality },
          { label: 'Delivery', value: shipping, set: setShipping },
          { label: 'Seller service', value: service, set: setService },
        ].map((row) => (
          <div key={row.label} className="rounded-xl border border-border/60 p-3">
            <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
            <StarPicker
              value={row.value}
              onChange={row.set}
              label={row.label}
              size="md"
              disabled={busy}
              className="mt-1.5"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-title">Headline</Label>
        <Input
          id="review-title"
          value={title}
          maxLength={TITLE_MAX}
          disabled={busy}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Arrived beautifully wrapped"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-body">Your review</Label>
        <textarea
          id="review-body"
          value={body}
          maxLength={BODY_MAX}
          disabled={busy}
          onChange={(event) => setBody(event.target.value)}
          className={cn(textareaClassName, 'min-h-28')}
          placeholder="What did you and the recipient think? Anything the next buyer should know?"
        />
        <p className="text-right text-[11px] text-muted-foreground">
          {body.length}/{BODY_MAX}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Photos and video</Label>
        <div className="flex flex-wrap gap-2">
          {media.map((item, index) => (
            <div
              key={`${item.objectPath}-${index}`}
              className="relative size-20 overflow-hidden rounded-lg ring-1 ring-border/60"
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
          {media.length < MAX_MEDIA ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              className="grid size-20 place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-5" />
              )}
            </button>
          ) : null}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(event) => void addFiles(event.target.files)}
        />
        <p className="text-[11px] text-muted-foreground">
          Up to {MAX_MEDIA} files. Photos of the gift as it arrived help other buyers most.
        </p>
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <Checkbox
          checked={anonymous}
          disabled={busy}
          onCheckedChange={(checked) => setAnonymous(checked === true)}
        />
        Post as Anonymous
      </label>

      <FormAlert error={error} />

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={busy || rating < 1}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitLabel ?? (review ? 'Save changes' : 'Post review')}
        </Button>
      </div>
    </form>
  )
}
