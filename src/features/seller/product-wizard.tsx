import { Boxes, Eye, ImagePlus, LoaderCircle, Package, Tag, Upload, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { uploadPublicImage } from '@/api/media'
import { KNOWN_CURRENCIES, type ProductInput } from '@/api/types'
import {
  emptyForm,
  parseTags,
  toProductInput,
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
  /** Creates the product. Throw to keep the wizard open with the error shown. */
  onSubmit: (body: ProductInput) => Promise<void>
}

/**
 * Listing a gift, one step at a time: what it is, what it costs, how it looks,
 * how many there are — and a preview of the shelf card before it is created.
 *
 * Deliberately the same shell, rhythm and preview step as the reel wizard, so
 * publishing anything in the seller portal feels like one flow.
 */
export function ProductWizard({
  open,
  onOpenChange,
  shopName,
  onSubmit,
}: ProductWizardProps) {
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

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

  const priceLabel = priceValid
    ? formatPriceAmount(majorToMinor(priceMajor, form.currency), form.currency)
    : '—'

  async function handleImage(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      update('image_url', await uploadPublicImage(file, 'product-image'))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not upload the image'))
    } finally {
      setUploading(false)
    }
  }

  async function complete() {
    // The same builder the inline edit form uses, so a gift created here is
    // validated exactly like one edited later.
    const body = toProductInput(form, true)
    if (typeof body === 'string') {
      setError(body)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSubmit(body)
      setForm(emptyForm)
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the gift'))
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
      title: 'Photo',
      description: 'The picture customers browse with.',
      icon: ImagePlus,
      content: (
        <div className="space-y-3">
          <div
            className={cn(
              'relative flex aspect-square max-w-xs items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface',
              form.image_url && 'border-solid border-brand-teal/50',
            )}
          >
            {form.image_url ? (
              <>
                <img src={form.image_url} alt="" className="size-full object-cover" />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 size-8"
                  onClick={() => update('image_url', '')}
                  aria-label="Remove photo"
                >
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex size-full cursor-pointer flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {uploading ? (
                  <LoaderCircle className="size-6 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="size-6" />
                    <span className="text-xs font-medium">
                      <Upload className="mr-1 inline size-3" />
                      Choose image
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Optional, but a gift without a photo rarely sells. Square images look best.
          </p>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void handleImage(event.target.files?.[0])
              event.target.value = ''
            }}
          />
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
      id: 'preview',
      title: 'Preview',
      description: 'This is the card customers will see.',
      icon: Eye,
      content: (
        <WizardPreviewFrame caption="How your gift appears on the shelf:">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="w-48 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="aspect-square bg-muted">
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="size-full object-cover" />
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
      title="New gift"
      description="List something customers can send, step by step."
      steps={steps}
      onComplete={complete}
      completeLabel={form.status === 'published' ? 'Publish gift' : 'Save draft'}
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
