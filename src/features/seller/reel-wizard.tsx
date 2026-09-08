import {
  Check,
  Eye,
  Film,
  Gift,
  Hash,
  ImagePlus,
  LoaderCircle,
  Send,
  Store,
  Upload,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { uploadPublicFile, type UploadedFile } from '@/api/media'
import type { Product } from '@/api/products'
import type { ReelInput } from '@/api/reels'
import {
  WizardDialog,
  WizardField,
  WizardFields,
  WizardPreviewFrame,
  type WizardStep,
} from '@/features/seller/wizard-dialog'
import { getErrorMessage } from '@/lib/api'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

/** A file the seller picked, once it is in storage and ready to post. */
type PickedMedia = UploadedFile & { kind: 'video' | 'image' }

type ReelWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  shopName: string
  products: Product[]
  /** Posts the reel. Throw to keep the wizard open with the error shown. */
  onSubmit: (body: ReelInput) => Promise<void>
}

/**
 * Posting a reel, one step at a time: the clip, the words, the gift it sells,
 * how it goes out — and a preview of the finished post before it is published.
 */
export function ReelWizard({
  open,
  onOpenChange,
  shopName,
  products,
  onSubmit,
}: ReelWizardProps) {
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [productId, setProductId] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('published')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [media, setMedia] = useState<PickedMedia | null>(null)
  const [thumbnail, setThumbnail] = useState<PickedMedia | null>(null)
  const [durationMs, setDurationMs] = useState<number | null>(null)
  const [uploading, setUploading] = useState<'media' | 'thumbnail' | null>(null)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaInputRef = useRef<HTMLInputElement | null>(null)
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null)

  const product = useMemo(
    () => products.find((item) => item.id === productId) ?? null,
    [products, productId],
  )

  const tags = useMemo(
    () =>
      hashtags
        .split(/[\s,]+/)
        .map((tag) => tag.replace(/^#/, '').trim())
        .filter(Boolean),
    [hashtags],
  )

  function reset() {
    setCaption('')
    setHashtags('')
    setProductId('')
    setStatus('published')
    setVisibility('public')
    setMedia(null)
    setThumbnail(null)
    setDurationMs(null)
    setError(null)
  }

  async function pick(file: File | undefined, slot: 'media' | 'thumbnail') {
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    if (slot === 'thumbnail' && isVideo) {
      setError('A cover has to be an image.')
      return
    }

    setUploading(slot)
    setError(null)
    try {
      // Read the clip's length before uploading: duration_ms is informational
      // on the API, and the browser is the only place it is known.
      if (slot === 'media' && isVideo) {
        const seconds = await readVideoDuration(file)
        setDurationMs(seconds ? Math.round(seconds * 1000) : null)
      }
      const folder =
        slot === 'thumbnail' ? 'reel-thumbnail' : isVideo ? 'reel-video' : 'reel-photo'
      const uploaded = await uploadPublicFile(file, folder)
      const picked: PickedMedia = { ...uploaded, kind: isVideo ? 'video' : 'image' }
      if (slot === 'media') setMedia(picked)
      else setThumbnail(picked)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not upload the file'))
    } finally {
      setUploading(null)
    }
  }

  async function complete() {
    if (!media) return
    setPosting(true)
    setError(null)
    try {
      await onSubmit({
        product_id: productId || null,
        caption: caption.trim() || null,
        hashtags: tags,
        visibility,
        status,
        duration_ms: durationMs,
        thumbnail: thumbnail
          ? {
              object_path: thumbnail.objectPath,
              mime_type: thumbnail.mimeType,
              size_bytes: thumbnail.sizeBytes,
            }
          : null,
        media: [
          {
            object_path: media.objectPath,
            mime_type: media.mimeType,
            size_bytes: media.sizeBytes,
          },
        ],
      })
      reset()
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not post the reel'))
    } finally {
      setPosting(false)
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'media',
      title: 'The clip',
      description: 'Upload the video or photo customers will watch.',
      icon: Film,
      blockedReason: media
        ? null
        : uploading === 'media'
          ? 'Uploading…'
          : 'Add a video or photo to continue.',
      content: (
        <WizardFields>
          <MediaSlot
            label="Video or photo"
            hint="MP4, MOV or WebM for a clip; JPG or PNG for a photo post."
            picked={media}
            uploading={uploading === 'media'}
            accept="video/*,image/*"
            inputRef={mediaInputRef}
            onPick={(file) => void pick(file, 'media')}
            onClear={() => setMedia(null)}
            icon={Film}
          />
          <MediaSlot
            label="Cover image"
            hint="Optional. Shown while the clip loads."
            picked={thumbnail}
            uploading={uploading === 'thumbnail'}
            accept="image/*"
            inputRef={thumbnailInputRef}
            onPick={(file) => void pick(file, 'thumbnail')}
            onClear={() => setThumbnail(null)}
            icon={ImagePlus}
          />
        </WizardFields>
      ),
    },
    {
      id: 'story',
      title: 'Caption',
      description: 'The words that sit under your clip in the feed.',
      icon: Hash,
      content: (
        <WizardFields>
          <WizardField label="Caption" htmlFor="reel-caption" full>
            <textarea
              id="reel-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Say what the clip shows — this is the line customers read under it."
              className={textareaClassName}
            />
          </WizardField>
          <WizardField
            label="Hashtags"
            htmlFor="reel-hashtags"
            full
            hint="Separated by spaces or commas. The # is optional."
          >
            <Input
              id="reel-hashtags"
              value={hashtags}
              onChange={(event) => setHashtags(event.target.value)}
              placeholder="#giftbox #birthday"
            />
          </WizardField>
          {tags.length ? (
            <div className="flex flex-wrap gap-1.5 sm:col-span-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </WizardFields>
      ),
    },
    {
      id: 'gift',
      title: 'Tagged gift',
      description: 'Connect the gift this clip is selling.',
      icon: Gift,
      content: (
        <div className="space-y-4">
          <WizardField
            label="Gift"
            htmlFor="reel-product"
            hint="Tag a gift and the feed shows a “Send as a gift” button that opens it."
          >
            <select
              id="reel-product"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className={selectClassName}
            >
              <option value="">No gift — shop promo only</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {formatPriceAmount(item.price_amount, item.currency)}
                </option>
              ))}
            </select>
          </WizardField>

          {products.length === 0 ? (
            <p className="rounded-xl border border-border/60 bg-surface/60 p-4 text-sm text-muted-foreground">
              This shop has no gifts yet, so there is nothing to tag. You can still post
              the clip as a shop promo.
            </p>
          ) : null}

          {product ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface/60 p-4">
              <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="size-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPriceAmount(product.price_amount, product.currency)}
                </p>
              </div>
              <Check className="ml-auto size-5 text-brand-teal" />
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: 'publishing',
      title: 'Publishing',
      description: 'Decide whether this goes live now.',
      icon: Send,
      content: (
        <WizardFields>
          <WizardField label="Status" htmlFor="reel-status">
            <select
              id="reel-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as 'draft' | 'published')}
              className={selectClassName}
            >
              <option value="published">Published — live in the feed</option>
              <option value="draft">Draft — only you can see it</option>
            </select>
          </WizardField>
          <WizardField label="Visibility" htmlFor="reel-visibility">
            <select
              id="reel-visibility"
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as 'public' | 'private')
              }
              className={selectClassName}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </WizardField>
        </WizardFields>
      ),
    },
    {
      id: 'preview',
      title: 'Preview',
      description: 'This is the post customers will see.',
      icon: Eye,
      content: (
        <WizardPreviewFrame caption="How your reel appears in the feed:">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <ReelPreview
              media={media}
              thumbnail={thumbnail}
              shopName={shopName}
              caption={caption}
              tags={tags}
              product={product}
            />
            <dl className="grid flex-1 gap-2 text-sm">
              <SummaryRow label="Shop" value={shopName} />
              <SummaryRow
                label="Tagged gift"
                value={product ? product.name : 'None — shop promo'}
              />
              <SummaryRow
                label="Status"
                value={status === 'published' ? 'Published' : 'Draft'}
              />
              <SummaryRow label="Visibility" value={visibility} />
              <SummaryRow
                label="Type"
                value={media?.kind === 'video' ? 'Video' : 'Photo'}
              />
              {durationMs ? (
                <SummaryRow
                  label="Length"
                  value={`${Math.round(durationMs / 1000)}s`}
                />
              ) : null}
            </dl>
          </div>
        </WizardPreviewFrame>
      ),
    },
  ]

  return (
    <WizardDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
      title="New reel"
      description="Post a clip of your gift and connect it to something customers can send."
      steps={steps}
      onComplete={complete}
      completeLabel={status === 'published' ? 'Publish reel' : 'Save draft'}
      completing={posting}
      error={
        error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null
      }
    />
  )
}

/** The reel as the customer feed will render it, at postcard size. */
function ReelPreview({
  media,
  thumbnail,
  shopName,
  caption,
  tags,
  product,
}: {
  media: PickedMedia | null
  thumbnail: PickedMedia | null
  shopName: string
  caption: string
  tags: string[]
  product: Product | null
}) {
  const poster = thumbnail?.publicUrl ?? (media?.kind === 'image' ? media.publicUrl : null)

  return (
    <div className="relative aspect-[9/16] w-48 shrink-0 overflow-hidden rounded-2xl bg-brand-navy shadow-lg">
      {media?.kind === 'video' ? (
        <video
          src={media.publicUrl}
          poster={poster ?? undefined}
          className="size-full object-cover"
          muted
          playsInline
          autoPlay
          loop
        />
      ) : poster ? (
        <img src={poster} alt="" className="size-full object-cover" />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-transparent to-brand-navy/40" />

      <div className="absolute inset-x-0 bottom-0 space-y-1 p-3 text-white">
        <div className="flex items-center gap-1.5">
          <span className="grid size-5 place-items-center rounded-full bg-white/20">
            <Store className="size-2.5" />
          </span>
          <span className="truncate text-[10px] font-semibold">{shopName}</span>
        </div>
        {product ? (
          <p className="truncate font-display text-sm font-semibold">{product.name}</p>
        ) : null}
        {caption ? (
          <p className="line-clamp-2 text-[10px] text-white/75">{caption}</p>
        ) : null}
        {tags.length ? (
          <p className="truncate text-[10px] font-semibold text-brand-teal">
            {tags.map((tag) => `#${tag}`).join(' ')}
          </p>
        ) : null}
        {product ? (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold">
              {formatPriceAmount(product.price_amount, product.currency)}
            </span>
            <span className="flex-1 rounded-full bg-gradient-to-r from-brand-navy to-brand-violet px-2 py-1 text-center text-[9px] font-semibold">
              Send as a gift
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium capitalize">{value}</dd>
    </div>
  )
}

function MediaSlot({
  label,
  hint,
  picked,
  uploading,
  accept,
  inputRef,
  onPick,
  onClear,
  icon: Icon,
}: {
  label: string
  hint: string
  picked: PickedMedia | null
  uploading: boolean
  accept: string
  inputRef: React.RefObject<HTMLInputElement | null>
  onPick: (file: File | undefined) => void
  onClear: () => void
  icon: typeof Film
}) {
  return (
    <WizardField label={label} hint={hint}>
      <div
        className={cn(
          'relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface',
          picked && 'border-solid border-brand-teal/50',
        )}
      >
        {picked ? (
          <>
            {picked.kind === 'video' ? (
              <video
                src={picked.publicUrl}
                className="size-full object-cover"
                muted
                playsInline
              />
            ) : (
              <img src={picked.publicUrl} alt="" className="size-full object-cover" />
            )}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 size-8"
              onClick={onClear}
              aria-label={`Remove ${label.toLowerCase()}`}
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-full cursor-pointer flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {uploading ? (
              <LoaderCircle className="size-6 animate-spin" />
            ) : (
              <>
                <Icon className="size-6" />
                <span className="text-xs font-medium">
                  <Upload className="mr-1 inline size-3" />
                  Choose file
                </span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          onPick(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </WizardField>
  )
}

/** Reads a clip's length from the browser so `duration_ms` can be posted with it. */
function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(video.duration) ? video.duration : null)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    video.src = url
  })
}
