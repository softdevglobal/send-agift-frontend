import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Camera, ImagePlus, LoaderCircle, Package, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SellerEmptyState,
  SellerPageHeader,
  sellerListRowClass,
  sellerPanelClass,
} from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { publishSellerToMarketplace, syncShopPublishedProducts } from '@/lib/published-catalog'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { formatPriceAmount, majorToMinor, minorToMajor } from '@/lib/money'
import { cn } from '@/lib/utils'

const PRODUCT_IMAGE_ASPECT = 4 / 3

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

export function SellerProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sellerProfile, setSellerProfile] = useState<SellerDetails | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inventoryReady, setInventoryReady] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ src: string; name: string } | null>(
    null,
  )
  const imageInputRef = useRef<HTMLInputElement>(null)

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

  function updateField<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
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
    setNotice(null)
    setUploadingImage(true)
    try {
      const url = await uploadPublicImage(croppedFile, 'product-image')
      updateField('image_url', url)
      setNotice('Image uploaded.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not upload image.'))
    } finally {
      setUploadingImage(false)
    }
  }

  function handleSelectShop(shopId: string) {
    setError(null)
    setNotice(null)
    setEditingId(null)
    setInventoryReady(false)
    setForm(emptyForm)
    setSearchParams(shopId ? { shop: shopId } : {})
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (!selectedShopId) {
      setError('Create a shop before adding products.')
      return
    }
    const body = toProductInput(form, !editingId)
    if (typeof body === 'string') {
      setError(body)
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateSellerProduct(editingId, body)
        if (inventoryReady) {
          await updateProductInventory(editingId, toInventoryInput(form))
        }
        setNotice('Product updated.')
      } else {
        await createShopProduct(selectedShopId, body)
        setNotice('Product created.')
      }
      setForm(emptyForm)
      setEditingId(null)
      setInventoryReady(false)
      await loadProducts(selectedShopId)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save product.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(id: string) {
    setError(null)
    setNotice(null)
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
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load product.'))
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    setNotice(null)
    try {
      await deleteSellerProduct(id)
      if (editingId === id) {
        setEditingId(null)
        setInventoryReady(false)
        setForm(emptyForm)
      }
      await loadProducts(selectedShopId)
      setNotice('Product deleted.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete product.'))
    }
  }

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
          <Button
            type="button"
            className="h-10 rounded-full px-4"
            onClick={() => {
              setEditingId(null)
              setInventoryReady(false)
              setForm(emptyForm)
              document.getElementById('product-name')?.focus()
            }}
          >
            <Plus className="size-4" />
            Add product
          </Button>
        }
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <FormAlert error={error} notice={notice} />

          <div className="space-y-2">
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
            {selectedShop?.slug ? (
              <p className="text-xs text-muted-foreground">{selectedShop.slug}</p>
            ) : null}
          </div>

          <section className={`space-y-4 ${sellerPanelClass} p-6`}>
            <h2 className="font-display text-xl tracking-tight">Catalog</h2>
            {products.length ? (
              <ul className="space-y-2.5">
                {products.map((product) => (
                  <li key={product.id} className={sellerListRowClass}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <Package className="size-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPriceAmount(product.price_amount, product.currency)}
                          {' · '}
                          {product.status}
                          {product.status !== 'published'
                            ? ' · hidden from customers'
                            : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Edit product"
                        onClick={() => handleEdit(product.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete product"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No products in this shop yet.</p>
            )}
          </section>

          <form
            onSubmit={handleSubmit}
            className={`space-y-4 ${sellerPanelClass} p-6`}
          >
            <h2 className="font-display text-xl tracking-tight">
              {editingId ? 'Edit product' : 'Add product'}
            </h2>
            <div className="space-y-2">
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                className="h-11 bg-surface px-3"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-slug">Slug</Label>
                <Input
                  id="product-slug"
                  value={form.slug}
                  onChange={(event) => updateField('slug', event.target.value)}
                  className="h-11 bg-surface px-3"
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
            <div className="space-y-2">
              <Label htmlFor="product-description">Description</Label>
              <textarea
                id="product-description"
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                className={textareaClassName}
              />
            </div>
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
                />
                <p className="text-xs text-muted-foreground">
                  Entered as money, sent as integer cents (25.00 USD → 2500).
                </p>
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
              <div className="space-y-2">
                <Label htmlFor="product-status">Status</Label>
                <select
                  id="product-status"
                  value={form.status}
                  onChange={(event) =>
                    updateField('status', event.target.value as ProductStatus)
                  }
                  className={selectClassName}
                  required
                >
                  {PRODUCT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-tags">Occasion tags</Label>
                <Input
                  id="product-tags"
                  value={form.occasion_tags}
                  onChange={(event) => updateField('occasion_tags', event.target.value)}
                  className="h-11 bg-surface px-3"
                  placeholder="birthday, thank-you"
                />
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
            <div className="space-y-3">
              <Label>Product image</Label>
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => imageInputRef.current?.click()}
                className="group/cover relative block aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl border border-dashed border-border/70 bg-surface/60 transition-colors hover:border-border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImagePlus className="size-6" />
                    <span className="text-sm font-medium">Upload an image</span>
                    <span className="text-xs">Cropped to 4:3</span>
                  </span>
                )}
                <span
                  className={cn(
                    'absolute inset-0 flex items-center justify-center gap-2 bg-foreground/55 text-sm font-medium text-background transition-opacity',
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
                      {form.image_url ? 'Change image' : 'Upload image'}
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
                  Remove image
                </Button>
              ) : null}
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

            <h3 className="pt-2 font-medium">Inventory</h3>
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
                <Label htmlFor="inv-low">Low stock threshold</Label>
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

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving} className="h-10">
                {saving ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Saving…
                  </>
                ) : editingId ? (
                  'Update product'
                ) : (
                  'Create product'
                )}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    setEditingId(null)
                    setInventoryReady(false)
                    setForm(emptyForm)
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      )}
      {pendingImage ? (
        <ImageCropDialog
          open
          imageSrc={pendingImage.src}
          fileName={pendingImage.name}
          aspect={PRODUCT_IMAGE_ASPECT}
          cropShape="rect"
          title="Adjust product image"
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      ) : null}
    </div>
  )
}
