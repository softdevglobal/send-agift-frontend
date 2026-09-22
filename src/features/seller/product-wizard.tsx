import {
  Boxes,
  Eye,
  Film,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Package,
  Ruler,
  Tag,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { uploadPublicFile } from '@/api/media'
import { KNOWN_CURRENCIES, PARCEL_DISTANCE_UNITS, PARCEL_MASS_UNITS } from '@/api/types'
import {
  coverImageUrl,
  emptyForm,
  isProductImageMedia,
  isProductVideoMime,
  MAX_PRODUCT_MEDIA,
  parcelComplete,
  parseTags,
  toProductInput,
  type ProductFormMedia,
  type ProductFormState,
} from '@/features/seller/product-form'
import {
  WizardDialog,
  WizardField,
  WizardFields,
  WizardPreviewFrame,
  type WizardStep,
} from '@/features/seller/wizard-dialog'
import { getErrorMessage } from '@/lib/api'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { formatPriceAmount, majorToMinor } from '@/lib/money'
import { cn } from '@/lib/utils'

type ProductWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  shopName: string
  /**
   * `edit` prefills every step and lets the seller jump straight to Save;
   * `create` starts blank. It is the same dialog either way — editing a gift
   * and listing one are the same flow.
   */
  mode?: 'create' | 'edit'
  /** Starting values for `edit`. Ignored in `create`. */
  initialForm?: ProductFormState | null
  /**
   * Receives the finished form once it validates. The caller creates or
   * updates. Throw to keep the wizard open with the error shown.
   */
  onSubmit: (form: ProductFormState) => Promise<void>
}

/**
 * Listing or editing a gift, one step at a time: what it is, what it costs,
 * how it looks, how many there are, the parcel size — and a preview of the
 * shelf card.
 *
 * Deliberately the same shell, rhythm and preview step as the reel wizard, so
 * publishing anything in the seller portal feels like one flow.
 */
export function ProductWizard({
  open,
  onOpenChange,
  shopName,
  mode = 'create',
  initialForm,
  onSubmit,
}: ProductWizardProps) {
  const [form, setForm] = useState<ProductFormState>(initialForm ?? emptyForm)
  const [uploadingKind, setUploadingKind] = useState<'photo' | 'video' | null>(null)
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggingPhotoIndex, setDraggingPhotoIndex] = useState<number | null>(null)
  const [dropPhotoIndex, setDropPhotoIndex] = useState<number | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)

  // Each open re-seeds the form: an edit gets that gift's values, a create
  // gets a blank slate. Reopening never shows the previous run's fields.
  useEffect(() => {
    if (open) {
      setForm(initialForm ?? emptyForm)
      setError(null)
      setUploadingKind(null)
      setUploadProgress({ completed: 0, total: 0 })
      setDraggingPhotoIndex(null)
      setDropPhotoIndex(null)
    }
  }, [open, initialForm])

  function update<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const priceMajor = Number(form.price_major)
  const priceValid =
    form.price_major.trim() !== '' && Number.isFinite(priceMajor) && priceMajor >= 0
  const tags = useMemo(() => parseTags(form.occasion_tags), [form.occasion_tags])
  const coverUrl = coverImageUrl(form)
  const photoEntries = useMemo(
    () =>
      form.media
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => isProductImageMedia(item)),
    [form.media],
  )
  const videoEntries = useMemo(
    () =>
      form.media
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => isProductVideoMime(item.mime_type)),
    [form.media],
  )
  const galleryRoom = MAX_PRODUCT_MEDIA - form.media.length
  const uploading = uploadingKind !== null

  const priceLabel = priceValid
    ? formatPriceAmount(majorToMinor(priceMajor, form.currency), form.currency)
    : '—'

  async function handleMediaFiles(
    files: FileList | null,
    kind: 'photo' | 'video',
  ) {
    if (!files || files.length === 0) return
    const room = MAX_PRODUCT_MEDIA - form.media.length
    if (room <= 0) {
      setError(`You can add up to ${MAX_PRODUCT_MEDIA} photos or videos.`)
      return
    }

    const selected = Array.from(files)
    const matching = selected.filter((file) =>
      kind === 'photo'
        ? file.type.startsWith('image/')
        : file.type.startsWith('video/'),
    )
    const rejected = selected.length - matching.length
    const picked = matching.slice(0, room)

    if (picked.length === 0) {
      setError(
        kind === 'photo'
          ? 'Choose image files only for the photos section.'
          : 'Choose video files only for the videos section.',
      )
      if (kind === 'photo' && photoInputRef.current) photoInputRef.current.value = ''
      if (kind === 'video' && videoInputRef.current) videoInputRef.current.value = ''
      return
    }

    setUploadingKind(kind)
    setError(null)
    setUploadProgress({ completed: 0, total: picked.length })
    try {
      const results = await Promise.all(
        picked.map(async (file) => {
          try {
            const folder = kind === 'video' ? 'product-video' : 'product-image'
            const result = await uploadPublicFile(file, folder)
            const item: ProductFormMedia = {
              object_path: result.objectPath,
              mime_type: result.mimeType,
              size_bytes: result.sizeBytes,
              metadata: result.metadata,
              preview_url: result.publicUrl || URL.createObjectURL(file),
            }
            return { ok: true as const, item }
          } catch (uploadError) {
            return {
              ok: false as const,
              filename: file.name,
              message: getErrorMessage(uploadError, 'Upload failed'),
            }
          } finally {
            setUploadProgress((current) => ({
              ...current,
              completed: current.completed + 1,
            }))
          }
        }),
      )
      const uploaded = results.flatMap((result) => (result.ok ? [result.item] : []))
      const failed = results.filter((result) => !result.ok)

      if (uploaded.length) {
        setForm((current) => ({
          ...current,
          media: [...current.media, ...uploaded],
          image_url:
            current.image_url ||
            uploaded.find((item) => item.mime_type.startsWith('image/'))?.preview_url ||
            current.image_url,
        }))
      }

      const messages: string[] = []
      if (rejected > 0) {
        messages.push(
          kind === 'photo'
            ? `${rejected} non-image file(s) were skipped.`
            : `${rejected} non-video file(s) were skipped.`,
        )
      }
      if (matching.length > picked.length) {
        messages.push(
          `${matching.length - picked.length} file(s) skipped because the gallery limit is ${MAX_PRODUCT_MEDIA}.`,
        )
      }
      if (failed.length) {
        messages.push(
          `Upload failed: ${failed
            .map((result) => `${result.filename} (${result.message})`)
            .join(', ')}.`,
        )
      }
      setError(messages.length ? messages.join(' ') : null)
    } finally {
      setUploadingKind(null)
      setUploadProgress({ completed: 0, total: 0 })
      if (kind === 'photo' && photoInputRef.current) photoInputRef.current.value = ''
      if (kind === 'video' && videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  function removeMedia(index: number) {
    setForm((current) => {
      const media = current.media.filter((_, i) => i !== index)
      const nextCover =
        media.find((item) => isProductImageMedia(item))?.preview_url || ''
      return {
        ...current,
        media,
        image_url: nextCover || current.image_url,
      }
    })
  }

  /** Reorders photos in place so the first photo becomes the product cover. */
  function reorderPhotos(fromMediaIndex: number, toMediaIndex: number) {
    if (fromMediaIndex === toMediaIndex) return
    setForm((current) => {
      const photoIndexes = current.media
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => isProductImageMedia(item))
        .map(({ index }) => index)
      const fromPos = photoIndexes.indexOf(fromMediaIndex)
      const toPos = photoIndexes.indexOf(toMediaIndex)
      if (fromPos < 0 || toPos < 0) return current

      const photos = photoIndexes.map((index) => current.media[index])
      const [moved] = photos.splice(fromPos, 1)
      if (!moved) return current
      photos.splice(toPos, 0, moved)

      let photoCursor = 0
      const media = current.media.map((item) => {
        if (!isProductImageMedia(item)) return item
        return photos[photoCursor++] ?? item
      })
      const cover = media.find((item) => isProductImageMedia(item))

      return {
        ...current,
        media,
        image_url: cover?.preview_url.trim() || current.image_url,
      }
    })
  }

  function clearPhotoDrag() {
    setDraggingPhotoIndex(null)
    setDropPhotoIndex(null)
  }

  async function complete() {
    // Validate with the shared builder so a gift saved here is checked exactly
    // like one saved anywhere else; the caller rebuilds the payload it needs.
    const check = toProductInput(form, true)
    if (typeof check === 'string') {
      setError(check)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSubmit(form)
      setForm(emptyForm)
      onOpenChange(false)
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          mode === 'edit' ? 'Could not save the gift' : 'Could not create the gift',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'basics',
      title: 'The gift',
      description: 'What you are listing, in the customer’s words.',
      icon: Package,
      blockedReason: form.name.trim() ? null : 'Give the gift a name to continue.',
      content: (
        <WizardFields>
          <WizardField label="Name" htmlFor="wizard-name" full>
            <Input
              id="wizard-name"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="Handbound Memory Journal"
            />
          </WizardField>
          <WizardField
            label="Description"
            htmlFor="wizard-description"
            full
            hint="Two or three lines is plenty — this shows on the gift page."
          >
            <textarea
              id="wizard-description"
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="A linen-wrapped journal with thick cream pages, made for letters and the moments worth keeping."
              className={textareaClassName}
            />
          </WizardField>
          <WizardField label="Type" htmlFor="wizard-type">
            <select
              id="wizard-type"
              value={form.product_type}
              onChange={(event) => update('product_type', event.target.value)}
              className={selectClassName}
            >
              <option value="gift">Gift</option>
              <option value="hamper">Hamper</option>
              <option value="experience">Experience</option>
              <option value="voucher">Voucher</option>
            </select>
          </WizardField>
          <WizardField
            label="Occasions"
            htmlFor="wizard-tags"
            hint="Comma separated — birthday, anniversary…"
          >
            <Input
              id="wizard-tags"
              value={form.occasion_tags}
              onChange={(event) => update('occasion_tags', event.target.value)}
              placeholder="birthday, thank you"
            />
          </WizardField>
          <WizardField
            label="Link slug"
            htmlFor="wizard-slug"
            full
            hint="Optional. The gift’s address in the catalog — leave blank to generate it."
          >
            <Input
              id="wizard-slug"
              value={form.slug}
              onChange={(event) => update('slug', event.target.value)}
              placeholder="handbound-memory-journal"
              className="font-mono text-sm"
            />
          </WizardField>
        </WizardFields>
      ),
    },
    {
      id: 'pricing',
      title: 'Price',
      description: 'What it costs, and who can see it.',
      icon: Tag,
      blockedReason: priceValid ? null : 'Enter a price of 0 or more to continue.',
      content: (
        <WizardFields>
          <WizardField label="Price" htmlFor="wizard-price">
            <Input
              id="wizard-price"
              inputMode="decimal"
              value={form.price_major}
              onChange={(event) => update('price_major', event.target.value)}
              placeholder="28.00"
            />
          </WizardField>
          <WizardField label="Currency" htmlFor="wizard-currency">
            <select
              id="wizard-currency"
              value={form.currency}
              onChange={(event) => update('currency', event.target.value)}
              className={selectClassName}
            >
              {KNOWN_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </WizardField>
          <WizardField
            label="Sold to"
            htmlFor="wizard-visibility"
            hint="Corporate buyers can be shown different gifts."
          >
            <select
              id="wizard-visibility"
              value={form.customer_type_visibility}
              onChange={(event) =>
                update(
                  'customer_type_visibility',
                  event.target.value as ProductFormState['customer_type_visibility'],
                )
              }
              className={selectClassName}
            >
              <option value="both">Everyone</option>
              <option value="personal">Personal buyers</option>
              <option value="corporate">Corporate buyers</option>
            </select>
          </WizardField>
          <WizardField
            label="Preparation"
            htmlFor="wizard-prep"
            hint="Minutes needed before this can ship."
          >
            <Input
              id="wizard-prep"
              inputMode="numeric"
              value={form.prep_minutes}
              onChange={(event) => update('prep_minutes', event.target.value)}
              placeholder="30"
            />
          </WizardField>
          <label className="flex items-center gap-2.5 sm:col-span-2">
            <Checkbox
              checked={form.points_display_enabled}
              onCheckedChange={(checked) =>
                update('points_display_enabled', checked === true)
              }
            />
            <span className="text-sm">Show reward points on this gift</span>
          </label>
        </WizardFields>
      ),
    },
    {
      id: 'photo',
      title: 'Media',
      description: 'Upload photos and videos in separate sections for the gift gallery.',
      icon: ImagePlus,
      content: (
        <div className="space-y-5">
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">Photos</h3>
                <p className="text-xs text-muted-foreground">
                  Drag a photo to the front to set the cover. Uses the product-image
                  folder.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {photoEntries.length} photo{photoEntries.length === 1 ? '' : 's'} ·{' '}
                {form.media.length}/{MAX_PRODUCT_MEDIA} total
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photoEntries.length === 0 && form.image_url ? (
                <div className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted">
                  <img
                    src={form.image_url}
                    alt=""
                    className="size-full object-cover"
                    draggable={false}
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                    Cover
                  </span>
                </div>
              ) : null}
              {photoEntries.map(({ item, index }, photoIndex) => (
                <div
                  key={`${item.object_path}-${index}`}
                  draggable={photoEntries.length > 1 && !uploading}
                  onDragStart={(event) => {
                    if (photoEntries.length <= 1 || uploading) {
                      event.preventDefault()
                      return
                    }
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', String(index))
                    setDraggingPhotoIndex(index)
                  }}
                  onDragOver={(event) => {
                    if (draggingPhotoIndex === null || draggingPhotoIndex === index) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    if (dropPhotoIndex !== index) setDropPhotoIndex(index)
                  }}
                  onDragLeave={() => {
                    if (dropPhotoIndex === index) setDropPhotoIndex(null)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const fromIndex = Number(
                      event.dataTransfer.getData('text/plain') || draggingPhotoIndex,
                    )
                    if (Number.isFinite(fromIndex)) {
                      reorderPhotos(fromIndex, index)
                    }
                    clearPhotoDrag()
                  }}
                  onDragEnd={clearPhotoDrag}
                  className={cn(
                    'relative aspect-square overflow-hidden rounded-xl border bg-muted transition-[box-shadow,opacity]',
                    photoEntries.length > 1 && !uploading
                      ? 'cursor-grab active:cursor-grabbing'
                      : null,
                    draggingPhotoIndex === index
                      ? 'border-primary/50 opacity-50'
                      : dropPhotoIndex === index
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border/60',
                  )}
                >
                  {item.preview_url ? (
                    <img
                      src={item.preview_url}
                      alt=""
                      className="pointer-events-none size-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground">
                      <ImagePlus className="size-5" />
                    </div>
                  )}
                  {photoIndex === 0 ? (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                      Cover
                    </span>
                  ) : null}
                  {photoEntries.length > 1 ? (
                    <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/50 p-1 text-white">
                      <GripVertical className="size-3" />
                    </span>
                  ) : null}
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                    {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1.5 right-1.5 size-7"
                    onClick={() => removeMedia(index)}
                    onPointerDown={(event) => event.stopPropagation()}
                    aria-label="Remove photo"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              {galleryRoom > 0 ? (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploading}
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingKind === 'photo' ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="size-5" />
                      <span className="px-2 text-center text-[11px] font-medium leading-tight">
                        Add photos
                      </span>
                    </>
                  )}
                </button>
              ) : null}
            </div>
            {uploadingKind === 'photo' ? (
              <p className="text-xs font-medium text-foreground">
                Uploading photos {uploadProgress.completed}/{uploadProgress.total}
              </p>
            ) : null}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleMediaFiles(event.target.files, 'photo')
              }}
            />
          </section>

          <section className="space-y-3 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">Videos</h3>
                <p className="text-xs text-muted-foreground">
                  Optional gallery clips. Uses the product-video folder.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {videoEntries.length} video{videoEntries.length === 1 ? '' : 's'} ·{' '}
                {form.media.length}/{MAX_PRODUCT_MEDIA} total
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {videoEntries.map(({ item, index }) => (
                <div
                  key={`${item.object_path}-${index}`}
                  className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted"
                >
                  {item.preview_url ? (
                    <video
                      src={item.preview_url}
                      className="size-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground">
                      <Film className="size-5" />
                    </div>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                    <Film className="size-2.5" />
                    Video
                  </span>
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                    {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1.5 right-1.5 size-7"
                    onClick={() => removeMedia(index)}
                    aria-label="Remove video"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              {galleryRoom > 0 ? (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploading}
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingKind === 'video' ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <>
                      <Film className="size-5" />
                      <span className="px-2 text-center text-[11px] font-medium leading-tight">
                        Add videos
                      </span>
                    </>
                  )}
                </button>
              ) : null}
            </div>
            {uploadingKind === 'video' ? (
              <p className="text-xs font-medium text-foreground">
                Uploading videos {uploadProgress.completed}/{uploadProgress.total}
              </p>
            ) : null}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleMediaFiles(event.target.files, 'video')
              }}
            />
          </section>

          <p className="text-xs text-muted-foreground">
            Combined limit {MAX_PRODUCT_MEDIA} files. Drag photos to reorder — the first
            photo is the cover.
          </p>
        </div>
      ),
    },
    {
      id: 'stock',
      title: 'Stock',
      description: 'How many you can send, and whether it goes live.',
      icon: Boxes,
      content: (
        <WizardFields>
          <WizardField label="Available quantity" htmlFor="wizard-qty">
            <Input
              id="wizard-qty"
              inputMode="numeric"
              value={form.available_qty}
              onChange={(event) => update('available_qty', event.target.value)}
            />
          </WizardField>
          <WizardField
            label="Reserved quantity"
            htmlFor="wizard-reserved"
            hint="Held back from sale — pending orders, samples."
          >
            <Input
              id="wizard-reserved"
              inputMode="numeric"
              value={form.reserved_qty}
              onChange={(event) => update('reserved_qty', event.target.value)}
            />
          </WizardField>
          <WizardField
            label="Low stock threshold"
            htmlFor="wizard-low"
            hint="You are warned when stock drops to this."
          >
            <Input
              id="wizard-low"
              inputMode="numeric"
              value={form.low_stock_threshold}
              onChange={(event) => update('low_stock_threshold', event.target.value)}
            />
          </WizardField>
          <WizardField
            label="Unavailable dates"
            htmlFor="wizard-dates"
            hint="YYYY-MM-DD, one per line. The gift can’t be sent for delivery on these days."
          >
            <textarea
              id="wizard-dates"
              value={form.unavailable_dates}
              onChange={(event) => update('unavailable_dates', event.target.value)}
              placeholder="2026-12-25"
              className={textareaClassName}
            />
          </WizardField>
          <WizardField label="Status" htmlFor="wizard-status" full>
            <select
              id="wizard-status"
              value={form.status}
              onChange={(event) =>
                update('status', event.target.value as ProductFormState['status'])
              }
              className={selectClassName}
            >
              <option value="published">Published — live in the catalog</option>
              <option value="draft">Draft — only you can see it</option>
            </select>
          </WizardField>
        </WizardFields>
      ),
    },
    {
      id: 'parcel',
      title: 'Parcel',
      description: 'Box size and weight for shipping quotes and labels.',
      icon: Ruler,
      blockedReason: parcelComplete(form)
        ? null
        : 'Enter length, width, height, and weight greater than 0.',
      content: (
        <WizardFields>
          <WizardField label="Length" htmlFor="wizard-parcel-length">
            <Input
              id="wizard-parcel-length"
              inputMode="decimal"
              value={form.parcel_length}
              onChange={(event) => update('parcel_length', event.target.value)}
              placeholder="20"
            />
          </WizardField>
          <WizardField label="Width" htmlFor="wizard-parcel-width">
            <Input
              id="wizard-parcel-width"
              inputMode="decimal"
              value={form.parcel_width}
              onChange={(event) => update('parcel_width', event.target.value)}
              placeholder="15"
            />
          </WizardField>
          <WizardField label="Height" htmlFor="wizard-parcel-height">
            <Input
              id="wizard-parcel-height"
              inputMode="decimal"
              value={form.parcel_height}
              onChange={(event) => update('parcel_height', event.target.value)}
              placeholder="10"
            />
          </WizardField>
          <WizardField label="Size unit" htmlFor="wizard-parcel-distance">
            <select
              id="wizard-parcel-distance"
              value={form.parcel_distance_unit}
              onChange={(event) =>
                update(
                  'parcel_distance_unit',
                  event.target.value as ProductFormState['parcel_distance_unit'],
                )
              }
              className={selectClassName}
            >
              {PARCEL_DISTANCE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </WizardField>
          <WizardField label="Weight" htmlFor="wizard-parcel-weight">
            <Input
              id="wizard-parcel-weight"
              inputMode="decimal"
              value={form.parcel_weight}
              onChange={(event) => update('parcel_weight', event.target.value)}
              placeholder="1.200"
            />
          </WizardField>
          <WizardField label="Weight unit" htmlFor="wizard-parcel-mass">
            <select
              id="wizard-parcel-mass"
              value={form.parcel_mass_unit}
              onChange={(event) =>
                update(
                  'parcel_mass_unit',
                  event.target.value as ProductFormState['parcel_mass_unit'],
                )
              }
              className={selectClassName}
            >
              {PARCEL_MASS_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </WizardField>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Used when customers get delivery quotes and when you buy a shipping label.
          </p>
        </WizardFields>
      ),
    },
    {
      id: 'preview',
      title: 'Preview',
      description: 'This is the card customers will see.',
      icon: Eye,
      content: (
        <WizardPreviewFrame caption="How your gift appears on the shelf:">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="w-48 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="aspect-square bg-muted">
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <Package className="size-7" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">
                  {form.name.trim() || 'Your gift name'}
                </p>
                <p className="mt-1 font-display text-lg tracking-tight">{priceLabel}</p>
                {tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <dl className="grid flex-1 gap-2 text-sm">
              <SummaryRow label="Shop" value={shopName} />
              <SummaryRow label="Type" value={form.product_type || 'gift'} />
              <SummaryRow label="Price" value={priceLabel} />
              <SummaryRow
                label="Sold to"
                value={
                  form.customer_type_visibility === 'both'
                    ? 'Everyone'
                    : `${form.customer_type_visibility} buyers`
                }
              />
              <SummaryRow label="In stock" value={form.available_qty || '0'} />
              <SummaryRow
                label="Parcel"
                value={`${form.parcel_length}×${form.parcel_width}×${form.parcel_height} ${form.parcel_distance_unit} · ${form.parcel_weight} ${form.parcel_mass_unit}`}
              />
              <SummaryRow
                label="Status"
                value={form.status === 'published' ? 'Published' : 'Draft'}
              />
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
        if (!next) {
          setForm(emptyForm)
          setError(null)
        }
        onOpenChange(next)
      }}
      title={mode === 'edit' ? 'Edit gift' : 'New gift'}
      description={
        mode === 'edit'
          ? 'Update the listing, step by step. Jump to any step from the rail.'
          : 'List something customers can send, step by step.'
      }
      steps={steps}
      onComplete={complete}
      completeLabel={
        mode === 'edit'
          ? 'Save changes'
          : form.status === 'published'
            ? 'Publish gift'
            : 'Save draft'
      }
      completing={saving}
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium capitalize">{value}</dd>
    </div>
  )
}
