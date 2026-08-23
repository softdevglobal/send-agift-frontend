import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import {
  Boxes,
  Camera,
  Eye,
  ImagePlus,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Store,
  Tag,
  Trash2,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { uploadPublicImage } from '@/api/media'
import {
  createShopProduct,
  deleteSellerProduct,
  getProductInventory,
  getSellerProduct,
  listShopProducts,
  updateProductInventory,
  updateSellerProduct,
  type Product,
} from '@/api/products'
import { getSellerMe, type SellerDetails, type Shop } from '@/api/sellers'
import {
  KNOWN_CURRENCIES,
  PRODUCT_STATUSES,
  PRODUCT_VISIBILITIES,
  type CustomerTypeVisibility,
  type InventoryInput,
  type KnownCurrency,
  type ProductInput,
  type ProductStatus,
} from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { ImageCropDialog } from '@/components/common/image-crop-dialog'
import { SaveButton, type SaveStatus } from '@/components/common/save-button'
import { Toast } from '@/components/common/toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SellerEmptyState, SellerPageHeader, sellerPanelClass } from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { publishSellerToMarketplace, syncShopPublishedProducts } from '@/lib/published-catalog'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { formatPriceAmount, majorToMinor, minorToMajor } from '@/lib/money'
import { cn } from '@/lib/utils'

type ProductFormState = {
  name: string
  slug: string
  description: string
  product_type: string
  price_major: string
  currency: string
  status: ProductStatus
  occasion_tags: string
  customer_type_visibility: CustomerTypeVisibility
  points_display_enabled: boolean
  prep_minutes: string
  image_url: string
  available_qty: string
  reserved_qty: string
  low_stock_threshold: string
  unavailable_dates: string
}

const emptyForm: ProductFormState = {
  name: '',
  slug: '',
  description: '',
  product_type: 'gift',
  price_major: '',
  currency: 'USD',
  status: 'published',
  occasion_tags: '',
  customer_type_visibility: 'both',
  points_display_enabled: false,
  prep_minutes: '0',
  image_url: '',
  available_qty: '0',
  reserved_qty: '0',
  low_stock_threshold: '0',
  unavailable_dates: '',
}

function parseNonNegativeInt(value: string, fallback = 0): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseDates(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function isKnownCurrency(value: string): value is KnownCurrency {
  return (KNOWN_CURRENCIES as readonly string[]).includes(value)
}

function toInventoryInput(form: ProductFormState): InventoryInput {
  return {
    available_qty: parseNonNegativeInt(form.available_qty),
    reserved_qty: parseNonNegativeInt(form.reserved_qty),
    low_stock_threshold: parseNonNegativeInt(form.low_stock_threshold),
    unavailable_dates: parseDates(form.unavailable_dates),
  }
}

function toProductInput(
  form: ProductFormState,
  includeInventory: boolean,
): ProductInput | string {
  if (!form.name.trim()) return 'Product name is required.'

  const currency = form.currency.trim().toUpperCase()
  if (!currency) return 'Currency is required.'
  if (!isKnownCurrency(currency)) {
    return 'Currency must be a known ISO currency code.'
  }

  const dates = parseDates(form.unavailable_dates)
  if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return 'Unavailable dates must be YYYY-MM-DD.'
  }

  const input: ProductInput = {
    name: form.name.trim(),
    currency,
  }

  const slug = optionalString(form.slug)
  const description = optionalString(form.description)
  const productType = optionalString(form.product_type)
  if (slug) input.slug = slug
  if (description) input.description = description
  if (productType) input.product_type = productType
  input.image_url = optionalString(form.image_url) ?? null

  if (form.price_major.trim() !== '') {
    const major = Number(form.price_major)
    if (!Number.isFinite(major) || major < 0) {
      return 'Price must be a number of 0 or more.'
    }
    input.price_amount = majorToMinor(major, currency)
  }

  if (form.status) input.status = form.status
  input.occasion_tags = parseTags(form.occasion_tags)
  if (form.customer_type_visibility) {
    input.customer_type_visibility = form.customer_type_visibility
  }
  input.points_display_enabled = form.points_display_enabled
  if (form.prep_minutes.trim() !== '') {
    const prep = Number.parseInt(form.prep_minutes, 10)
    if (!Number.isFinite(prep) || prep < 0) {
      return 'Prep minutes must be 0 or more.'
    }
    input.prep_minutes = prep
  }

  if (includeInventory) {
    input.inventory = toInventoryInput(form)
  }

  return input
}

function productToForm(product: Product, inventory?: InventoryInput): ProductFormState {
  return {
    name: product.name,
    slug: product.slug ?? '',
    description: product.description ?? '',
    product_type: product.product_type,
    price_major: String(minorToMajor(product.price_amount, product.currency)),
    currency: product.currency,
    status: product.status,
    occasion_tags: (product.occasion_tags ?? []).join(', '),
    customer_type_visibility: product.customer_type_visibility,
    points_display_enabled: product.points_display_enabled,
    prep_minutes: String(product.prep_minutes ?? 0),
    image_url: product.image_url ?? '',
    available_qty: String(inventory?.available_qty ?? 0),
    reserved_qty: String(inventory?.reserved_qty ?? 0),
    low_stock_threshold: String(inventory?.low_stock_threshold ?? 0),
    unavailable_dates: (inventory?.unavailable_dates ?? []).join('\n'),
  }
}

/** Product images are square, matching the customer gift card. */
const PRODUCT_ASPECT = 1

const statusMeta: Record<ProductStatus, { label: string; tone: string; hint: string }> = {
  draft: {
    label: 'Draft',
    tone: 'bg-muted text-muted-foreground',
    hint: 'Hidden from customers',
  },
  published: {
    label: 'Published',
    tone: 'bg-primary/90 text-primary-foreground',
    hint: 'Visible in the customer catalog',
  },
  paused: {
    label: 'Paused',
    tone: 'bg-[oklch(0.96_0.04_85)] text-[oklch(0.48_0.1_80)]',
    hint: 'Temporarily hidden from customers',
  },
  rejected: {
    label: 'Rejected',
    tone: 'bg-destructive/10 text-destructive',
    hint: 'Not shown to customers',
  },
}

function FormSectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary ring-1 ring-primary/10">
        <Icon className="size-4" />
      </span>
      <div>
        <h3 className="font-medium">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  )
}

/** Mirrors the customer gift card, so sellers see the listing as they build it. */
function ProductPreviewCard({
  form,
  shopName,
}: {
  form: ProductFormState
  shopName?: string
}) {
  const meta = statusMeta[form.status] ?? statusMeta.draft
  const priceMajor = Number(form.price_major)
  const tags = parseTags(form.occasion_tags)
  return (
    <div className={cn(sellerPanelClass, 'flex flex-col overflow-hidden')}>
      <div className="relative aspect-square overflow-hidden bg-muted">
        {form.image_url ? (
          <img src={form.image_url} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-[radial-gradient(ellipse_at_center,oklch(0.94_0.03_125/0.7),transparent_70%)] text-muted-foreground">
            <Package className="size-8" />
          </div>
        )}
        <span
          className={cn(
            'absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm',
            meta.tone,
          )}
        >
          {meta.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {shopName ? (
          <p className="truncate text-xs text-muted-foreground">{shopName}</p>
        ) : null}
        <h3 className="mt-0.5 font-medium">{form.name.trim() || 'Your gift name'}</h3>
        <p className="mt-1 font-display text-lg tracking-tight">
          {form.price_major.trim() !== '' && Number.isFinite(priceMajor) && priceMajor >= 0
            ? formatPriceAmount(
                majorToMinor(priceMajor, form.currency),
                form.currency,
              )
            : '—'}
        </p>
        {form.description.trim() ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {form.description}
          </p>
        ) : null}
        {tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function SellerProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sellerProfile, setSellerProfile] = useState<SellerDetails | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    message: string
    variant: 'success' | 'error'
  } | null>(null)
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inventoryReady, setInventoryReady] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ src: string; name: string } | null>(
    null,
  )
  const imageInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const savedTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const selectedShopId = searchParams.get('shop') ?? shops[0]?.id ?? ''

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedShopId) ?? null,
    [shops, selectedShopId],
  )

  const loadProducts = useCallback(async (shopId: string) => {
    if (!shopId) {
      setProducts([])
      return
    }
    const list = await listShopProducts(shopId)
    const next = Array.isArray(list) ? list : []
    setProducts(next)
    const shop = sellerProfile?.shops?.find((item) => item.id === shopId)
    syncShopPublishedProducts(
      shopId,
      next,
      sellerProfile ? { seller: sellerProfile, shop } : undefined,
    )
  }, [sellerProfile])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSellerMe()
      .then((me) => {
        if (cancelled) return
        publishSellerToMarketplace(me)
        setSellerProfile(me)
        setShops(me.shops ?? [])
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load products.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!shops.length) return
    let cancelled = false
    Promise.all(
      shops.map(async (shop) => {
        const list = await listShopProducts(shop.id)
        return { id: shop.id, products: Array.isArray(list) ? list : [] }
      }),
    )
      .then((results) => {
        if (cancelled) return
        for (const result of results) {
          const shop = shops.find((item) => item.id === result.id)
          syncShopPublishedProducts(
            result.id,
            result.products,
            sellerProfile ? { seller: sellerProfile, shop } : undefined,
          )
        }
      })
      .catch(() => {
        // Catalog sync is best-effort; the selected shop still loads below.
      })
    return () => {
      cancelled = true
    }
  }, [sellerProfile, shops])

  useEffect(() => {
    if (!shops.length) return
    const requested = searchParams.get('shop')
    if (requested && shops.some((shop) => shop.id === requested)) return
    const firstShop = shops[0]
    if (!firstShop) return
    setSearchParams({ shop: firstShop.id }, { replace: true })
  }, [shops, searchParams, setSearchParams])

  useEffect(() => {
    if (!selectedShopId) return
    let cancelled = false
    loadProducts(selectedShopId).catch((err) => {
      if (!cancelled) setError(getErrorMessage(err, 'Could not load products.'))
    })
    return () => {
      cancelled = true
    }
  }, [loadProducts, selectedShopId])

  useEffect(() => {
    const timers = savedTimers
    return () => {
      timers.current.forEach(clearTimeout)
    }
  }, [])

  /** Holds the tick on screen briefly, then runs any follow-up (e.g. closing the form). */
  function flashSaved(onDone?: () => void) {
    setStatus('saved')
    const timer = setTimeout(() => {
      savedTimers.current = savedTimers.current.filter((t) => t !== timer)
      setStatus('idle')
      onDone?.()
    }, 1100)
    savedTimers.current.push(timer)
  }

  function updateField<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setInventoryReady(false)
    setShowForm(false)
  }

  function startCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setInventoryReady(false)
    setShowForm(true)
    setError(null)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      document.getElementById('product-name')?.focus()
    })
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPendingImage({ src: URL.createObjectURL(file), name: file.name })
  }

  function handleCropCancel() {
    if (pendingImage) URL.revokeObjectURL(pendingImage.src)
    setPendingImage(null)
  }

  async function handleCropConfirm(croppedFile: File) {
    if (pendingImage) URL.revokeObjectURL(pendingImage.src)
    setPendingImage(null)
    setError(null)
    setUploadingImage(true)
    try {
      const url = await uploadPublicImage(croppedFile, 'product-image')
      updateField('image_url', url)
      setToast({ message: 'Image uploaded.', variant: 'success' })
    } catch (err) {
      const message = getErrorMessage(err, 'Could not upload image.')
      setError(message)
      setToast({ message, variant: 'error' })
    } finally {
      setUploadingImage(false)
    }
  }

  function handleSelectShop(shopId: string) {
    setError(null)
    resetForm()
    setSearchParams(shopId ? { shop: shopId } : {})
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!selectedShopId) {
      setError('Create a shop before adding products.')
      return
    }
    const body = toProductInput(form, !editingId)
    if (typeof body === 'string') {
      setError(body)
      return
    }
    setStatus('saving')
    try {
      if (editingId) {
        await updateSellerProduct(editingId, body)
        if (inventoryReady) {
          await updateProductInventory(editingId, toInventoryInput(form))
        }
      } else {
        await createShopProduct(selectedShopId, body)
      }
      const saved = editingId ? 'Product updated.' : 'Product created.'
      await loadProducts(selectedShopId)
      // Let the tick finish before the form collapses, so the confirmation is seen.
      flashSaved(resetForm)
      setToast({ message: saved, variant: 'success' })
    } catch (err) {
      setStatus('idle')
      setError(getErrorMessage(err, 'Could not save product.'))
    }
  }

  async function handleEdit(id: string) {
    setError(null)
    try {
      const details = await getSellerProduct(id)
      let inventory = details.inventory
      if (!inventory) {
        try {
          inventory = await getProductInventory(id)
        } catch {
          inventory = undefined
        }
      }
      setEditingId(id)
      setInventoryReady(Boolean(inventory))
      setForm(productToForm(details, inventory))
      setShowForm(true)
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load product.'))
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This cannot be undone.`,
    )
    if (!confirmed) return
    setError(null)
    try {
      await deleteSellerProduct(product.id)
      if (editingId === product.id) resetForm()
      await loadProducts(selectedShopId)
      setToast({ message: 'Product deleted.', variant: 'success' })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete product.'))
    }
  }

  const publishedCount = products.filter((item) => item.status === 'published').length

  if (!loading && shops.length === 0) {
    return (
      <div>
        <SellerPageHeader
          title="Products"
          description="Create a shop first, then add gifts and inventory for that shop."
        />
        <SellerEmptyState
          icon={Package}
          title="No shops yet"
          description="Products belong to a shop. Create a shop, then come back to list gifts."
          action={
            <Button asChild className="h-10 rounded-full px-4">
              <Link to="/seller/shops">Create a shop</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <SellerPageHeader
        title="Products"
        description="Create gifts per shop. Set status to published so they appear in the customer catalog."
        action={
          showForm ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-4"
              onClick={resetForm}
            >
              <X className="size-4" />
              Cancel
            </Button>
          ) : (
            <Button type="button" className="h-10 rounded-full px-4" onClick={startCreate}>
              <Plus className="size-4" />
              Add product
            </Button>
          )
        }
      />
      {loading ? (
        <div className="flex justify-center py-24">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <FormAlert error={error} />

          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1 space-y-2 sm:max-w-xs">
              <Label htmlFor="product-shop">Shop</Label>
              <select
                id="product-shop"
                value={selectedShopId}
                onChange={(event) => handleSelectShop(event.target.value)}
                className={selectClassName}
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
            {products.length ? (
              <p className="pb-3 text-sm text-muted-foreground">
                {products.length} {products.length === 1 ? 'gift' : 'gifts'} ·{' '}
                {publishedCount} published
              </p>
            ) : null}
          </div>

          {publishedCount === 0 && products.length > 0 ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-surface/60 p-4">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                None of these gifts are published, so customers can't see them yet. Set a
                product's status to <span className="font-medium">Published</span> to list
                it in the catalog.
              </p>
            </div>
          ) : null}

          {products.length ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const meta = statusMeta[product.status] ?? statusMeta.draft
                return (
                  <li
                    key={product.id}
                    className={cn(
                      sellerPanelClass,
                      'group flex flex-col overflow-hidden transition-shadow hover:shadow-[0_14px_40px_rgba(40,50,30,0.10)]',
                      editingId === product.id && 'ring-2 ring-primary/30',
                    )}
                  >
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt=""
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-[radial-gradient(ellipse_at_center,oklch(0.94_0.03_125/0.7),transparent_70%)] text-muted-foreground">
                          <Package className="size-8" />
                        </div>
                      )}
                      <span
                        className={cn(
                          'absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm',
                          meta.tone,
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="truncate font-medium">{product.name}</h3>
                      <p className="mt-1 font-display text-lg tracking-tight">
                        {formatPriceAmount(product.price_amount, product.currency)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{meta.hint}</p>
                      {product.occasion_tags?.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {product.occasion_tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 flex items-center gap-1 border-t border-border/50 pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 flex-1 rounded-full"
                          onClick={() => handleEdit(product.id)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => handleDelete(product)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : showForm ? null : (
            <SellerEmptyState
              icon={Package}
              title="No gifts in this shop yet"
              description="Add your first gift with a photo, price, and description. Publish it to make it visible in the customer catalog."
              action={
                <Button
                  type="button"
                  className="h-10 rounded-full px-5"
                  onClick={startCreate}
                >
                  <Plus className="size-4" />
                  Add your first gift
                </Button>
              }
            />
          )}
          {showForm ? (
            <div
              ref={formRef}
              className="animate-in fade-in slide-in-from-top-2 grid gap-6 duration-300 lg:grid-cols-[minmax(0,1.7fr)_minmax(15rem,1fr)] lg:items-start"
            >
              <form
                onSubmit={handleSubmit}
                className={cn(sellerPanelClass, 'space-y-7 p-6')}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary ring-1 ring-primary/10">
                    <Package className="size-4" />
                  </span>
                  <div>
                    <h2 className="font-display text-xl tracking-tight">
                      {editingId ? 'Edit gift' : 'New gift'}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Listing in{' '}
                      <span className="font-medium text-foreground">
                        {selectedShop?.name ?? 'this shop'}
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <FormSectionHeader
                    icon={ImagePlus}
                    title="Photo"
                    description="A square image shown on the gift card in the customer catalog."
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                    className="group/cover relative block aspect-square w-40 overflow-hidden rounded-xl border border-dashed border-border/70 bg-surface/60 transition-colors hover:border-border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {form.image_url ? (
                      <img
                        src={form.image_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ImagePlus className="size-6" />
                        <span className="text-xs font-medium">Upload photo</span>
                      </span>
                    )}
                    <span
                      className={cn(
                        'absolute inset-0 flex items-center justify-center gap-1.5 bg-foreground/55 text-xs font-medium text-background transition-opacity',
                        uploadingImage
                          ? 'opacity-100'
                          : 'opacity-0 group-hover/cover:opacity-100 group-focus-visible/cover:opacity-100',
                      )}
                    >
                      {uploadingImage ? (
                        <LoaderCircle className="size-5 animate-spin" />
                      ) : (
                        <>
                          <Camera className="size-4" />
                          {form.image_url ? 'Change' : 'Upload'}
                        </>
                      )}
                    </span>
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  {form.image_url ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground"
                      onClick={() => updateField('image_url', '')}
                    >
                      <Trash2 className="size-3.5" />
                      Remove photo
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-5">
                  <FormSectionHeader
                    icon={Store}
                    title="Gift details"
                    description="What customers read before buying."
                  />

                  <div className="space-y-2">
                    <Label htmlFor="product-name">Name</Label>
                    <Input
                      id="product-name"
                      value={form.name}
                      onChange={(event) => updateField('name', event.target.value)}
                      className="h-11 bg-surface px-3"
                      placeholder="Handmade chocolate box"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product-description">Description</Label>
                    <textarea
                      id="product-description"
                      value={form.description}
                      onChange={(event) => updateField('description', event.target.value)}
                      className={textareaClassName}
                      placeholder="What's included, and who is it for?"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="product-slug">Slug</Label>
                      <Input
                        id="product-slug"
                        value={form.slug}
                        onChange={(event) => updateField('slug', event.target.value)}
                        className="h-11 bg-surface px-3 font-mono text-sm"
                        placeholder="auto-generated-from-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-type">Product type</Label>
                      <Input
                        id="product-type"
                        value={form.product_type}
                        onChange={(event) => updateField('product_type', event.target.value)}
                        className="h-11 bg-surface px-3"
                        placeholder="gift"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <FormSectionHeader
                    icon={Tag}
                    title="Pricing & visibility"
                    description="Only published gifts appear in the customer catalog."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="product-price">Price</Label>
                      <Input
                        id="product-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price_major}
                        onChange={(event) => updateField('price_major', event.target.value)}
                        className="h-11 bg-surface px-3"
                        placeholder="25.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-currency">Currency</Label>
                      <select
                        id="product-currency"
                        value={form.currency}
                        onChange={(event) => updateField('currency', event.target.value)}
                        className={selectClassName}
                        required
                      >
                        {KNOWN_CURRENCIES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                        {form.currency &&
                        !KNOWN_CURRENCIES.includes(
                          form.currency as (typeof KNOWN_CURRENCIES)[number],
                        ) ? (
                          <option value={form.currency}>{form.currency}</option>
                        ) : null}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div
                      role="radiogroup"
                      aria-label="Status"
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {PRODUCT_STATUSES.map((item) => {
                        const meta = statusMeta[item]
                        const active = form.status === item
                        return (
                          <button
                            key={item}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => updateField('status', item)}
                            className={cn(
                              'flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all active:scale-[0.98]',
                              active
                                ? 'border-primary/40 bg-accent/60 ring-1 ring-primary/20'
                                : 'border-border/40 bg-card hover:border-border hover:bg-muted/40',
                            )}
                          >
                            <span className="text-sm font-medium">{meta.label}</span>
                            <span className="text-xs leading-snug text-muted-foreground">
                              {meta.hint}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="product-visibility">Customer visibility</Label>
                      <select
                        id="product-visibility"
                        value={form.customer_type_visibility}
                        onChange={(event) =>
                          updateField(
                            'customer_type_visibility',
                            event.target.value as CustomerTypeVisibility,
                          )
                        }
                        className={selectClassName}
                        required
                      >
                        {PRODUCT_VISIBILITIES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-prep">Prep minutes</Label>
                      <Input
                        id="product-prep"
                        type="number"
                        min="0"
                        value={form.prep_minutes}
                        onChange={(event) => updateField('prep_minutes', event.target.value)}
                        className="h-11 bg-surface px-3"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product-tags">Occasion tags</Label>
                    <Input
                      id="product-tags"
                      value={form.occasion_tags}
                      onChange={(event) => updateField('occasion_tags', event.target.value)}
                      className="h-11 bg-surface px-3"
                      placeholder="birthday, thank-you"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma separated. Customers filter the catalog by these.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="product-points"
                      checked={form.points_display_enabled}
                      onCheckedChange={(value) =>
                        updateField('points_display_enabled', value === true)
                      }
                    />
                    <Label htmlFor="product-points" className="font-normal">
                      Show promotional points
                    </Label>
                  </div>
                </div>

                <div className="space-y-5">
                  <FormSectionHeader
                    icon={Boxes}
                    title="Inventory"
                    description="How many you can fulfil, and when you can't."
                  />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="inv-available">Available qty</Label>
                      <Input
                        id="inv-available"
                        type="number"
                        min="0"
                        value={form.available_qty}
                        onChange={(event) => updateField('available_qty', event.target.value)}
                        className="h-11 bg-surface px-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-reserved">Reserved qty</Label>
                      <Input
                        id="inv-reserved"
                        type="number"
                        min="0"
                        value={form.reserved_qty}
                        onChange={(event) => updateField('reserved_qty', event.target.value)}
                        className="h-11 bg-surface px-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-low">Low stock at</Label>
                      <Input
                        id="inv-low"
                        type="number"
                        min="0"
                        value={form.low_stock_threshold}
                        onChange={(event) =>
                          updateField('low_stock_threshold', event.target.value)
                        }
                        className="h-11 bg-surface px-3"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inv-dates">Unavailable dates</Label>
                    <textarea
                      id="inv-dates"
                      value={form.unavailable_dates}
                      onChange={(event) =>
                        updateField('unavailable_dates', event.target.value)
                      }
                      className={textareaClassName}
                      placeholder="YYYY-MM-DD, one per line"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SaveButton status={status}>
                    {editingId ? 'Update gift' : 'Create gift'}
                  </SaveButton>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    disabled={status !== 'idle'}
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                </div>
              </form>

              <div className="space-y-3 lg:sticky lg:top-6">
                <div className="flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground">
                  <Eye className="size-4" />
                  Live preview
                </div>
                <ProductPreviewCard form={form} shopName={selectedShop?.name} />
                <p className="px-1 text-xs text-muted-foreground">
                  {form.status === 'published'
                    ? 'This is how the gift appears to customers.'
                    : `Set status to Published to list this in the customer catalog.`}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
      {pendingImage ? (
        <ImageCropDialog
          open
          imageSrc={pendingImage.src}
          fileName={pendingImage.name}
          aspect={PRODUCT_ASPECT}
          cropShape="rect"
          title="Adjust photo"
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      ) : null}
    </div>
  )
}
