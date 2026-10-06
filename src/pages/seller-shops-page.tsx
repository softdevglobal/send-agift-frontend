import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImagePlus,
  Link2,
  LoaderCircle,
  MapPin,
  Package,
  Pencil,
  Plus,
  Store,
  Trash2,
  Truck,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { listCountries, type Country } from '@/api/countries'
import { uploadPublicImage } from '@/api/media'
import { listShopProducts, type Product } from '@/api/products'
import {
  createSellerShop,
  deleteSellerShop,
  getSellerMe,
  updateSellerShop,
  type Address,
  type Shop,
  type ShopInput,
} from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, usePagedList } from '@/components/common/page-nav'
import { TimezoneSelect } from '@/components/common/timezone-select'
import { ImageCropDialog } from '@/components/common/image-crop-dialog'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { SaveButton, type SaveStatus } from '@/components/common/save-button'
import { Toast } from '@/components/common/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ConfirmDialog,
  SellerPageHeader,
  SellerSheet,
  SellerSheetFacts,
  SellerSheetRow,
  SellerSheetSection,
  sellerCardClass,
  sellerPanelClass,
} from '@/features/seller'
import { DeliveryRangeMap } from '@/features/seller/delivery-range-map'
import type { ShopDeliveryZone } from '@/api/types'
import { getErrorMessage } from '@/lib/api'
import { countryOptionLabel } from '@/lib/country-options'
import { optionalString, slugify } from '@/lib/form'
import { publishSellerToMarketplace } from '@/lib/published-catalog'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { formatPriceAmount, majorToMinor, minorToMajor } from '@/lib/money'
import { cn } from '@/lib/utils'

/** Shop covers are cropped to a wide banner so the card grid stays even. */
const COVER_ASPECT = 16 / 9

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

type ZoneDraft = {
  max_km: string
  price_major: string
  estimated_days: string
  cutoff_time: string
}

const blankZone: ZoneDraft = { max_km: '', price_major: '', estimated_days: '1', cutoff_time: '' }

const emptyShop: ShopInput = {
  name: '',
  country_id: '',
  timezone: '',
  slug: '',
  description: '',
  customer_visible_location: '',
  status: 'active',
  address_id: '',
  return_address_id: '',
  image_url: '',
  delivery_zones: [],
}

function zonesToDrafts(zones?: ShopDeliveryZone[]): ZoneDraft[] {
  return (zones ?? []).map((zone) => ({
    max_km: String(zone.max_km),
    price_major:
      zone.is_free || zone.price_amount === 0
        ? '0'
        : String(minorToMajor(zone.price_amount, zone.currency || 'USD')),
    estimated_days: String(zone.estimated_days ?? 1),
    cutoff_time: zone.cutoff_time ?? '',
  }))
}

function draftsToZones(drafts: ZoneDraft[], currency: string): ShopDeliveryZone[] | string {
  const zones: ShopDeliveryZone[] = []
  const code = currency.trim().toUpperCase()
  for (const draft of drafts) {
    const kmRaw = draft.max_km.trim()
    const priceRaw = draft.price_major.trim()
    if (!kmRaw && !priceRaw && !(draft.estimated_days ?? '').trim() && !draft.cutoff_time.trim()) continue
    const maxKm = Number(kmRaw)
    const priceMajor = Number(priceRaw)
    const days = Number((draft.estimated_days ?? '1').trim())
    if (!Number.isFinite(maxKm) || maxKm <= 0) {
      return 'Each delivery range needs a distance greater than 0 km.'
    }
    if (!Number.isFinite(priceMajor) || priceMajor < 0) {
      return 'Each delivery range needs a price of 0 or more.'
    }
    if (!Number.isInteger(days) || days < 0) {
      return 'Each delivery range needs whole days of 0 or more. 0 means same day.'
    }
    const cutoff = draft.cutoff_time.trim()
    if (days === 0 && !/^\d{2}:\d{2}$/.test(cutoff)) {
      return 'Same-day delivery needs a cutoff time.'
    }
    zones.push({
      max_km: Math.round(maxKm * 100) / 100,
      price_amount: majorToMinor(priceMajor, code),
      currency: code,
      estimated_days: days,
      ...(days === 0 ? { cutoff_time: cutoff } : {}),
    })
  }
  zones.sort((a, b) => a.max_km - b.max_km)
  const seen = new Set<number>()
  for (const zone of zones) {
    if (seen.has(zone.max_km)) {
      return 'Two delivery ranges cannot use the same distance.'
    }
    seen.add(zone.max_km)
  }
  return zones
}

function formatZoneSummary(zones?: ShopDeliveryZone[]): string {
  if (!zones?.length) return ''
  return [...zones]
    .sort((a, b) => a.max_km - b.max_km)
    .map((zone) => {
      const price =
        zone.is_free || zone.price_amount === 0
          ? 'free'
          : formatPriceAmount(zone.price_amount, zone.currency || 'USD')
      const sameDay = zone.estimated_days === 0 && zone.cutoff_time ? ` by ${zone.cutoff_time}` : ''
      return `${zone.max_km} km ${price}${sameDay}`
    })
    .join(' · ')
}

const GIFTS_PAGE_SIZE = 4

function productStatusLabel(status: string) {
  if (status === 'published') return 'Published'
  if (status === 'paused') return 'Paused'
  if (status === 'rejected') return 'Rejected'
  return 'Draft'
}

function ShopGifts({ shopId }: { shopId: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    listShopProducts(shopId)
      .then((list) => {
        if (!cancelled) setProducts(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([])
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [shopId])

  const pageCount = Math.max(1, Math.ceil(products.length / GIFTS_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const visible = products.slice(
    safePage * GIFTS_PAGE_SIZE,
    safePage * GIFTS_PAGE_SIZE + GIFTS_PAGE_SIZE,
  )

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {loading
            ? 'Gifts'
            : `${products.length} gift${products.length === 1 ? '' : 's'}`}
        </p>
        {pageCount > 1 ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Previous gifts"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {safePage + 1} / {pageCount}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Next gifts"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
      {loading ? (
        <p className="mt-2 text-xs text-muted-foreground">Loading gifts…</p>
      ) : failed ? (
        <p className="mt-2 text-xs text-muted-foreground">Could not load gifts.</p>
      ) : products.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No gifts in this shop yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {visible.map((product) => (
            <li key={product.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{product.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatPriceAmount(product.price_amount, product.currency || 'USD')}
                {' · '}
                {productStatusLabel(product.status)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function toShopInput(shop: Shop): ShopInput {
  return {
    name: shop.name,
    country_id: shop.country_id ?? '',
    timezone: shop.timezone ?? '',
    slug: shop.slug ?? '',
    description: shop.description ?? '',
    customer_visible_location: shop.customer_visible_location ?? '',
    status: shop.status ?? 'active',
    address_id: shop.address_id ?? '',
    return_address_id: shop.return_address_id ?? '',
    image_url: shop.image_url ?? '',
    delivery_zones: shop.delivery_zones ?? [],
  }
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

/** Mirrors the real shop card exactly, so sellers see what customers will see as they type. */
function ShopPreviewCard({ form }: { form: ShopInput }) {
  const isActive = (form.status ?? 'active') === 'active'
  return (
    <div className={cn(sellerPanelClass, 'flex flex-col overflow-hidden')}>
      <div className="relative aspect-video overflow-hidden bg-muted">
        {form.image_url ? (
          <img src={form.image_url} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
            <Store className="size-8" />
          </div>
        )}
        <span
          className={cn(
            'absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm',
            isActive
              ? 'bg-primary/90 text-primary-foreground'
              : 'bg-foreground/70 text-background',
          )}
        >
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg tracking-tight">
          {form.name.trim() || 'Your shop name'}
        </h3>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          /{form.slug?.trim() || 'your-shop-slug'}
        </p>
        {form.description?.trim() ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {form.description}
          </p>
        ) : null}
        {form.customer_visible_location?.trim() ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{form.customer_visible_location}</span>
          </p>
        ) : null}
        <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-4">
          <span className="flex h-9 flex-1 items-center justify-center gap-2 rounded-full border border-input text-sm text-muted-foreground">
            <Package className="size-4" />
            Products
          </span>
        </div>
      </div>
    </div>
  )
}

function serializeShop(input: ShopInput, zones: ShopDeliveryZone[]): ShopInput {
  return {
    name: input.name.trim(),
    country_id: input.country_id.trim(),
    timezone: (input.timezone ?? '').trim(),
    slug: optionalString(input.slug ?? ''),
    description: optionalString(input.description ?? ''),
    customer_visible_location: optionalString(input.customer_visible_location ?? ''),
    status: optionalString(input.status ?? ''),
    address_id: optionalString(input.address_id ?? '') ?? null,
    return_address_id: optionalString(input.return_address_id ?? '') ?? null,
    image_url: optionalString(input.image_url ?? '') ?? null,
    delivery_zones: zones,
  }
}

function formatAddress(address?: Address) {
  if (!address) return null
  return [address.line1, address.line2, address.city, address.region, address.postal_code]
    .filter(Boolean)
    .join(', ')
}

export function SellerShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const shopPages = usePagedList(shops, 6)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    message: string
    variant: 'success' | 'error'
  } | null>(null)
  const [form, setForm] = useState<ShopInput>(emptyShop)
  const [zoneDrafts, setZoneDrafts] = useState<ZoneDraft[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  /** Address currently pinned on the map. Follows the last dropdown pick. */
  const [mapAddressId, setMapAddressId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [previewShop, setPreviewShop] = useState<Shop | null>(null)
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null)
  const [deleting, setDeleting] = useState(false)
  /** Once the slug is edited by hand (or loaded from an existing shop) it stops tracking the name. */
  const [slugTouched, setSlugTouched] = useState(false)
  const [timezoneTouched, setTimezoneTouched] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ src: string; name: string } | null>(
    null,
  )
  const imageInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const savedTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const load = useCallback(async () => {
    const [me, countryList] = await Promise.all([
      getSellerMe(),
      listCountries().catch(() => [] as Country[]),
    ])
    publishSellerToMarketplace(me)
    setShops(me.shops ?? [])
    // The registered business address is private and never a delivery origin.
    setAddresses((me.addresses ?? []).filter((address) => address.address_type !== 'registered'))
    setCountries(Array.isArray(countryList) ? countryList : [])
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load shops.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

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

  function updateField<K extends keyof ShopInput>(key: K, value: ShopInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleNameChange(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug: slugTouched ? current.slug : slugify(name),
    }))
  }

  function handleCountryChange(countryId: string) {
    const next = countries.find((country) => country.id === countryId)
    setForm((current) => {
      const previous = countries.find((country) => country.id === current.country_id)
      const currentZone = (current.timezone ?? '').trim()
      const inherited =
        !timezoneTouched &&
        (currentZone === '' || currentZone === (previous?.default_timezone ?? ''))
      return {
        ...current,
        country_id: countryId,
        timezone: inherited ? next?.default_timezone || currentZone : currentZone,
      }
    })
  }

  const shopCountry = countries.find((country) => country.id === form.country_id) ?? null
  const zoneCurrency = shopCountry?.default_currency?.trim().toUpperCase() ?? ''

  function resetForm() {
    setForm(emptyShop)
    setZoneDrafts([])
    setMapAddressId(null)
    setSlugTouched(false)
    setTimezoneTouched(false)
    setEditingId(null)
    setShowForm(false)
  }

  function startCreate() {
    setForm(emptyShop)
    setZoneDrafts([{ ...blankZone }])
    setMapAddressId(null)
    setSlugTouched(false)
    setTimezoneTouched(false)
    setEditingId(null)
    setShowForm(true)
    setError(null)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      document.getElementById('shop-name')?.focus()
    })
  }

  function startEdit(shop: Shop) {
    setEditingId(shop.id)
    setForm(toShopInput(shop))
    const drafts = zonesToDrafts(shop.delivery_zones)
    setZoneDrafts(drafts.length ? drafts : [{ ...blankZone }])
    setMapAddressId(shop.address_id || shop.return_address_id || null)
    // Keep the published slug stable when the name is edited.
    setSlugTouched(true)
    setTimezoneTouched(false)
    setShowForm(true)
    setError(null)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      const url = await uploadPublicImage(croppedFile, 'shop-image')
      updateField('image_url', url)
      setToast({ message: 'Cover uploaded.', variant: 'success' })
    } catch (err) {
      const message = getErrorMessage(err, 'Could not upload image.')
      setError(message)
      setToast({ message, variant: 'error' })
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError('Shop name is required.')
      return
    }
    if (!form.country_id.trim() || !zoneCurrency.trim()) {
      setError('Choose the shop country. Its currency is used for products and delivery.')
      return
    }
    const timezone = (form.timezone ?? '').trim() || shopCountry?.default_timezone || ''
    if (!timezone) {
      setError('Choose the shop timezone. Same-day cutoffs use this clock.')
      return
    }
    const zones = draftsToZones(zoneDrafts, zoneCurrency)
    if (typeof zones === 'string') {
      setError(zones)
      return
    }
    if (zones.length === 0) {
      setError('Add at least one delivery range.')
      return
    }
    setStatus('saving')
    try {
      const body = serializeShop({ ...form, timezone }, zones)
      if (editingId) {
        await updateSellerShop(editingId, body)
      } else {
        await createSellerShop(body)
      }
      const saved = editingId ? 'Shop updated.' : 'Shop created.'
      await load()
      // Let the tick finish before the form collapses, so the confirmation is seen.
      flashSaved(resetForm)
      setToast({ message: saved, variant: 'success' })
    } catch (err) {
      setStatus('idle')
      setError(getErrorMessage(err, 'Could not save shop.'))
    }
  }

  async function confirmDelete() {
    const shop = shopToDelete
    if (!shop) return
    setError(null)
    setDeleting(true)
    try {
      await deleteSellerShop(shop.id)
      if (editingId === shop.id) resetForm()
      // Drop it from the list right away, then reconcile with the server.
      setShops((prev) => prev.filter((item) => item.id !== shop.id))
      setShopToDelete(null)
      setPreviewShop((current) => (current?.id === shop.id ? null : current))
      await load()
      setToast({ message: 'Shop deleted.', variant: 'success' })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete shop.'))
    } finally {
      setDeleting(false)
    }
  }

  const activeCount = shops.filter((shop) => shop.status === 'active').length

  return (
    <div>
      <SellerPageHeader
        icon={Store}
        tone="violet"
        title="Shops"
        description="Each shop is a storefront customers browse. Give it a cover, a name, and a pickup address."
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
              Create a shop
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

          {shops.length ? (
            <>
              <p className="text-sm text-muted-foreground">
                {shops.length} {shops.length === 1 ? 'shop' : 'shops'} · {activeCount}{' '}
                active
              </p>

              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {shopPages.visible.map((shop) => {
                  const country = countries.find((item) => item.id === shop.country_id)
                  return (
                  <li
                    key={shop.id}
                    className={cn(
                      sellerCardClass,
                      'group flex flex-col overflow-hidden',
                      editingId === shop.id && 'ring-2 ring-primary/30',
                    )}
                  >
                    {/* The cover opens the preview; the buttons below act in place. */}
                    <button
                      type="button"
                      aria-label={`Preview ${shop.name}`}
                      onClick={() => setPreviewShop(shop)}
                      className="relative aspect-video w-full overflow-hidden bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {shop.image_url ? (
                        <img
                          src={shop.image_url}
                          alt=""
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                          <Store className="size-8" />
                        </div>
                      )}
                      <span
                        className={cn(
                          'absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm',
                          shop.status === 'active'
                            ? 'bg-primary/90 text-primary-foreground'
                            : 'bg-foreground/70 text-background',
                        )}
                      >
                        {shop.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                      <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                        <Eye className="size-3.5" />
                        Preview
                      </span>
                    </button>

                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-lg tracking-tight">{shop.name}</h3>
                      {shop.slug ? (
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                          /{shop.slug}
                        </p>
                      ) : null}
                      {country || shop.timezone ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[country ? countryOptionLabel(country) : '', shop.timezone]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      ) : null}
                      {shop.description ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {shop.description}
                        </p>
                      ) : null}
                      {shop.customer_visible_location ? (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">
                            {shop.customer_visible_location}
                          </span>
                        </p>
                      ) : null}
                      {formatZoneSummary(shop.delivery_zones) ? (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Truck className="size-3 shrink-0" />
                          <span className="truncate">
                            {formatZoneSummary(shop.delivery_zones)}
                          </span>
                        </p>
                      ) : null}

                      <ShopGifts shopId={shop.id} />

                      <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-4">
                        <Button
                          asChild
                          variant="outline"
                          className="h-9 flex-1 rounded-full"
                        >
                          <Link to={`/seller/products?shop=${shop.id}`}>
                            <Package className="size-4" />
                            Products
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${shop.name}`}
                          onClick={() => startEdit(shop)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          aria-label={`Delete ${shop.name}`}
                          onClick={() => setShopToDelete(shop)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                  )
                })}
              </ul>
              <PageNav
                page={shopPages.page}
                pageCount={shopPages.pageCount}
                onPage={shopPages.setPage}
                label="Shop pages"
              />
            </>
          ) : showForm ? null : (
            <div
              className={cn(
                sellerPanelClass,
                'relative overflow-hidden px-6 py-16 text-center sm:py-20',
              )}
            >
              <div className="relative mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent text-primary ring-1 ring-primary/10">
                <Store className="size-6" />
              </div>
              <h2 className="relative font-display text-xl tracking-tight">
                No shops yet
              </h2>
              <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Create your first shop to start listing gifts. You can add a cover image
                and change details any time.
              </p>
              <Button
                type="button"
                className="relative mt-6 h-10 rounded-full px-5"
                onClick={startCreate}
              >
                <Plus className="size-4" />
                Create your first shop
              </Button>
            </div>
          )}

          {showForm ? (
            <div
              ref={formRef}
              className="animate-in fade-in slide-in-from-top-2 grid gap-6 duration-300 lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,1fr)] lg:items-start"
            >
              <form
                onSubmit={handleSubmit}
                className={cn(sellerPanelClass, 'space-y-7 p-6')}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary ring-1 ring-primary/10">
                    <Store className="size-4" />
                  </span>
                  <div>
                    <h2 className="font-display text-xl tracking-tight">
                      {editingId ? 'Edit shop' : 'New shop'}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Name is required. The slug must be unique across all shops.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <FormSectionHeader
                    icon={ImagePlus}
                    title="Cover image"
                    description="The banner customers see first when browsing this shop."
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                    className="group/cover relative block aspect-video w-full overflow-hidden rounded-xl border border-dashed border-border/70 bg-surface/60 transition-colors hover:border-border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:max-w-md"
                  >
                    {form.image_url ? (
                      <img src={form.image_url} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ImagePlus className="size-6" />
                        <span className="text-sm font-medium">Upload a cover</span>
                        <span className="text-xs">Cropped to 16:9</span>
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
                          {form.image_url ? 'Change cover' : 'Upload cover'}
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
                      Remove cover
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-5">
                  <FormSectionHeader
                    icon={Store}
                    title="Shop details"
                    description="Name, slug, and how it appears to customers."
                  />

                  <div className="space-y-2">
                    <Label htmlFor="shop-country">Country</Label>
                    <select
                      id="shop-country"
                      value={form.country_id}
                      onChange={(event) => handleCountryChange(event.target.value)}
                      className={selectClassName}
                      required
                    >
                      <option value="">Select country</option>
                      {countries.map((country) => (
                        <option key={country.id} value={country.id}>
                          {countryOptionLabel(country)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      This shop&apos;s products and delivery prices use this country&apos;s
                      currency.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shop-timezone">Timezone</Label>
                    <TimezoneSelect
                      id="shop-timezone"
                      value={form.timezone || shopCountry?.default_timezone || ''}
                      onChange={(zone) => {
                        setTimezoneTouched(true)
                        updateField('timezone', zone)
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Same-day cutoffs use this clock. It starts as the country&apos;s
                      timezone, and you can change it when the country has more than one.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shop-name">Name</Label>
                    <Input
                      id="shop-name"
                      value={form.name}
                      onChange={(event) => handleNameChange(event.target.value)}
                      className="h-11 bg-surface px-3"
                      placeholder="PD Gifts"
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="shop-slug">Slug</Label>
                        {!slugTouched && form.slug ? (
                          <span className="text-[11px] text-muted-foreground">
                            Auto from name
                          </span>
                        ) : null}
                      </div>
                      <Input
                        id="shop-slug"
                        value={form.slug ?? ''}
                        onChange={(event) => {
                          setSlugTouched(true)
                          updateField('slug', event.target.value)
                        }}
                        className="h-11 bg-surface px-3 font-mono text-sm"
                        placeholder="auto-generated-from-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div
                        role="group"
                        aria-label="Status"
                        className="relative inline-flex rounded-full bg-muted p-1"
                      >
                        <div
                          aria-hidden
                          className="absolute inset-y-1 left-1 w-[5.25rem] rounded-full bg-card shadow-sm transition-transform duration-300 ease-out"
                          style={{
                            transform: `translateX(${Math.max(0, statusOptions.findIndex((option) => option.value === form.status)) * 5.25}rem)`,
                          }}
                        />
                        {statusOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateField('status', option.value)}
                            className={cn(
                              'relative z-10 w-[5.25rem] rounded-full py-1.5 text-sm font-medium transition-colors duration-200 active:scale-95',
                              form.status === option.value
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shop-description">Description</Label>
                    <textarea
                      id="shop-description"
                      value={form.description ?? ''}
                      onChange={(event) => updateField('description', event.target.value)}
                      className={textareaClassName}
                      placeholder="What makes this shop worth browsing?"
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <FormSectionHeader
                    icon={Truck}
                    title="Location & returns"
                    description="Where orders ship from, and where returns go."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="shop-address">Pickup address</Label>
                      <select
                        id="shop-address"
                        value={form.address_id ?? ''}
                        onChange={(event) => {
                          const addressId = event.target.value
                          updateField('address_id', addressId)
                          setMapAddressId(addressId || null)
                        }}
                        className={selectClassName}
                      >
                        <option value="">No linked address</option>
                        {addresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.label ? `${address.label}. ${address.line1}` : address.line1}
                          </option>
                        ))}
                      </select>
                      {addresses.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No addresses yet , {' '}
                          <Link to="/seller/profile" className="text-primary hover:underline">
                            add one on your profile
                          </Link>
                          .
                        </p>
                      ) : null}
                    </div>
                    <AddressAutocomplete
                      id="shop-visible-location"
                      label="Customer-visible location"
                      placeholder="Kandy, Sri Lanka"
                      helperText="The town or city shoppers see on your shop page."
                      types="cities"
                      value={form.customer_visible_location ?? ''}
                      onQueryChange={(value) =>
                        updateField('customer_visible_location', value)
                      }
                      // The label is all this field stores, so skip the billed
                      // Place Details lookup.
                      resolveDetails={false}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shop-return-address">Return address</Label>
                    <select
                      id="shop-return-address"
                      value={form.return_address_id ?? ''}
                      onChange={(event) => {
                        const addressId = event.target.value
                        updateField('return_address_id', addressId)
                        setMapAddressId(addressId || null)
                      }}
                      className={selectClassName}
                    >
                      <option value="">No linked address</option>
                      {addresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.label ? `${address.label}. ${address.line1}` : address.line1}
                        </option>
                      ))}
                    </select>
                    {addresses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No addresses yet , {' '}
                        <Link to="/seller/profile" className="text-primary hover:underline">
                          add one on your profile
                        </Link>
                        .
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      const selectedId = mapAddressId || form.address_id || ''
                      const selected = addresses.find((address) => address.id === selectedId)
                      const latitude = Number(selected?.latitude)
                      const longitude = Number(selected?.longitude)
                      const rangesKm = zoneDrafts
                        .map((zone) => Number(zone.max_km))
                        .filter((km) => Number.isFinite(km) && km > 0)
                      const label = selected
                        ? selected.label
                          ? `${selected.label}. ${selected.line1}`
                          : selected.line1
                        : undefined
                      if (!selected || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                        return (
                          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                            Select a pickup or return address to show it on the map.
                            The address needs a map pin, so save it from search.
                          </p>
                        )
                      }
                      return (
                        <DeliveryRangeMap
                          latitude={latitude}
                          longitude={longitude}
                          label={label}
                          rangesKm={rangesKm}
                        />
                      )
                    })()}
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <Label>Delivery range</Label>
                        <p className="mt-1 text-sm font-medium">
                          {shopCountry
                            ? `${shopCountry.name} · ${zoneCurrency}`
                            : 'Choose the shop country above.'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 shrink-0 rounded-full px-3"
                        onClick={() =>
                          setZoneDrafts((current) => [
                            ...current,
                            { max_km: '', price_major: '', estimated_days: '1', cutoff_time: '' },
                          ])
                        }
                      >
                        <Plus className="size-3.5" />
                        Add range
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Required. How far this shop delivers itself, and the price for each band.
                      The closest band that covers the recipient is the price at checkout.
                      Days is the delivery time. Use Same day for a band that leaves today;
                      that band needs a cutoff time, and orders after it arrive the next day.
                      The price uses your shop country’s currency.
                    </p>
                    {zoneDrafts.length === 0 ? (
                      <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                        Add at least one delivery range before saving this shop.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {zoneDrafts.map((zone, index) => {
                          const sameDay = zone.estimated_days.trim() === '0'
                          return (
                          <li key={index} className="flex flex-wrap items-end gap-2">
                            <div className="min-w-[7rem] flex-1 space-y-1">
                              <Label htmlFor={`zone-km-${index}`}>Up to (km)</Label>
                              <Input
                                id={`zone-km-${index}`}
                                inputMode="decimal"
                                value={zone.max_km}
                                placeholder="5"
                                onChange={(event) =>
                                  setZoneDrafts((current) =>
                                    current.map((row, rowIndex) =>
                                      rowIndex === index
                                        ? { ...row, max_km: event.target.value }
                                        : row,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="min-w-[7rem] flex-1 space-y-1">
                              <Label htmlFor={`zone-price-${index}`}>
                                Price ({zoneCurrency || '-'})
                              </Label>
                              <Input
                                id={`zone-price-${index}`}
                                inputMode="decimal"
                                value={zone.price_major}
                                placeholder="0 for free"
                                onChange={(event) =>
                                  setZoneDrafts((current) =>
                                    current.map((row, rowIndex) =>
                                      rowIndex === index
                                        ? { ...row, price_major: event.target.value }
                                        : row,
                                    ),
                                  )
                                }
                              />
                            </div>
                            {sameDay ? null : (
                              <div className="w-24 space-y-1">
                                <Label htmlFor={`zone-days-${index}`}>Days</Label>
                                <Input
                                  id={`zone-days-${index}`}
                                  inputMode="numeric"
                                  value={zone.estimated_days}
                                  placeholder="1"
                                  onChange={(event) =>
                                    setZoneDrafts((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? { ...row, estimated_days: event.target.value }
                                          : row,
                                      ),
                                    )
                                  }
                                />
                              </div>
                            )}
                            <Button
                              type="button"
                              variant={sameDay ? 'default' : 'outline'}
                              className="h-10 rounded-full px-3"
                              onClick={() =>
                                setZoneDrafts((current) =>
                                  current.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? sameDay
                                        ? { ...row, estimated_days: '1', cutoff_time: '' }
                                        : { ...row, estimated_days: '0' }
                                      : row,
                                  ),
                                )
                              }
                            >
                              Same day
                            </Button>
                            {sameDay ? (
                              <div className="w-32 space-y-1">
                                <Label htmlFor={`zone-cutoff-${index}`}>Cutoff</Label>
                                <Input
                                  id={`zone-cutoff-${index}`}
                                  type="time"
                                  value={zone.cutoff_time}
                                  onChange={(event) =>
                                    setZoneDrafts((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? { ...row, cutoff_time: event.target.value }
                                          : row,
                                      ),
                                    )
                                  }
                                />
                              </div>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-10 rounded-full px-3 text-muted-foreground"
                              disabled={zoneDrafts.length === 1}
                              onClick={() =>
                                setZoneDrafts((current) =>
                                  current.filter((_, rowIndex) => rowIndex !== index),
                                )
                              }
                            >
                              <Trash2 className="size-4" />
                              Remove
                            </Button>
                          </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                <FormAlert error={error} />
                <div className="flex flex-wrap gap-2">
                  <SaveButton status={status}>
                    {editingId ? 'Update shop' : 'Create shop'}
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
                <ShopPreviewCard form={form} />
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
          aspect={COVER_ASPECT}
          cropShape="rect"
          title="Adjust cover"
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      ) : null}

      <SellerSheet
        open={previewShop !== null}
        onOpenChange={(open) => !open && setPreviewShop(null)}
        eyebrow="Shop"
        title={previewShop?.name ?? ''}
        description={previewShop?.description || undefined}
        media={
          previewShop ? (
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
              {previewShop.image_url ? (
                <img
                  src={previewShop.image_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                  <Store className="size-8" />
                </div>
              )}
              <span
                className={cn(
                  'absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm',
                  previewShop.status === 'active'
                    ? 'bg-primary/90 text-primary-foreground'
                    : 'bg-foreground/70 text-background',
                )}
              >
                {previewShop.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          ) : null
        }
        footer={
          previewShop ? (
            <div className="flex items-center gap-2">
              <Button asChild className="h-10 flex-1 rounded-full">
                <Link to={`/seller/products?shop=${previewShop.id}`}>
                  <Package className="size-4" />
                  Manage gifts
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-4"
                onClick={() => {
                  const shop = previewShop
                  setPreviewShop(null)
                  startEdit(shop)
                }}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 text-destructive"
                aria-label={`Delete ${previewShop.name}`}
                onClick={() => {
                  const shop = previewShop
                  setPreviewShop(null)
                  setShopToDelete(shop)
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ) : null
        }
      >
        {previewShop ? (
          <>
            <SellerSheetSection icon={Link2} title="Storefront">
              <SellerSheetFacts>
                <SellerSheetRow label="Handle">
                  <span className="font-mono text-xs">/{previewShop.slug || '-'}</span>
                </SellerSheetRow>
                <SellerSheetRow label="Status">
                  {previewShop.status === 'active' ? 'Active' : 'Inactive'}
                </SellerSheetRow>
                {previewShop.timezone ? (
                  <SellerSheetRow label="Timezone">{previewShop.timezone}</SellerSheetRow>
                ) : null}
                {previewShop.customer_visible_location ? (
                  <SellerSheetRow label="Location">
                    {previewShop.customer_visible_location}
                  </SellerSheetRow>
                ) : null}
              </SellerSheetFacts>
            </SellerSheetSection>

            <SellerSheetSection icon={Package} title="Gifts">
              <ShopGifts shopId={previewShop.id} />
            </SellerSheetSection>

            <SellerSheetSection icon={Truck} title="Addresses">
              <div className="space-y-3 rounded-xl border border-border/50 bg-surface/60 p-4">
                <div className="flex items-start gap-2.5">
                  <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Pickup address
                    </p>
                    <p className="mt-0.5 text-sm">
                      {formatAddress(
                        addresses.find((a) => a.id === previewShop.address_id),
                      ) || 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 border-t border-border/50 pt-3">
                  <Undo2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Return address
                    </p>
                    <p className="mt-0.5 text-sm">
                      {formatAddress(
                        addresses.find((a) => a.id === previewShop.return_address_id),
                      ) || 'Same as pickup address'}
                    </p>
                  </div>
                </div>
              </div>
            </SellerSheetSection>
          </>
        ) : null}
      </SellerSheet>

      <ConfirmDialog
        open={shopToDelete !== null}
        onOpenChange={(open) => !open && setShopToDelete(null)}
        title="Delete this shop?"
        description={
          <>
            <span className="font-medium text-foreground">{shopToDelete?.name}</span>{' '}
            and everything listed under it will be removed from the marketplace. This
            can’t be undone.
          </>
        }
        confirmLabel="Delete shop"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
