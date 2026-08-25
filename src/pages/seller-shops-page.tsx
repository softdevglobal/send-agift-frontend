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

import { uploadPublicImage } from '@/api/media'
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
import { ImageCropDialog } from '@/components/common/image-crop-dialog'
import { PlaceAutocomplete } from '@/components/common/place-autocomplete'
import { SaveButton, type SaveStatus } from '@/components/common/save-button'
import { Toast } from '@/components/common/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SellerPageHeader, sellerPanelClass } from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { optionalString, slugify } from '@/lib/form'
import { publishSellerToMarketplace } from '@/lib/published-catalog'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

/** Shop covers are cropped to a wide banner so the card grid stays even. */
const COVER_ASPECT = 16 / 9

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

const emptyShop: ShopInput = {
  name: '',
  slug: '',
  description: '',
  customer_visible_location: '',
  status: 'active',
  address_id: '',
  return_address_id: '',
  image_url: '',
}

function toShopInput(shop: Shop): ShopInput {
  return {
    name: shop.name,
    slug: shop.slug ?? '',
    description: shop.description ?? '',
    customer_visible_location: shop.customer_visible_location ?? '',
    status: shop.status ?? 'active',
    address_id: shop.address_id ?? '',
    return_address_id: shop.return_address_id ?? '',
    image_url: shop.image_url ?? '',
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
          <div className="flex size-full items-center justify-center bg-[radial-gradient(ellipse_at_center,oklch(0.94_0.03_125/0.7),transparent_70%)] text-muted-foreground">
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

function serializeShop(input: ShopInput): ShopInput {
  return {
    name: input.name.trim(),
    slug: optionalString(input.slug ?? ''),
    description: optionalString(input.description ?? ''),
    customer_visible_location: optionalString(input.customer_visible_location ?? ''),
    status: optionalString(input.status ?? ''),
    address_id: optionalString(input.address_id ?? '') ?? null,
    return_address_id: optionalString(input.return_address_id ?? '') ?? null,
    image_url: optionalString(input.image_url ?? '') ?? null,
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [previewShop, setPreviewShop] = useState<Shop | null>(null)
  /** Once the slug is edited by hand (or loaded from an existing shop) it stops tracking the name. */
  const [slugTouched, setSlugTouched] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ src: string; name: string } | null>(
    null,
  )
  const imageInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const savedTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const load = useCallback(async () => {
    const me = await getSellerMe()
    publishSellerToMarketplace(me)
    setShops(me.shops ?? [])
    setAddresses(me.addresses ?? [])
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

  function resetForm() {
    setForm(emptyShop)
    setSlugTouched(false)
    setEditingId(null)
    setShowForm(false)
  }

  function startCreate() {
    setForm(emptyShop)
    setSlugTouched(false)
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
    // Keep the published slug stable when the name is edited.
    setSlugTouched(true)
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
    setStatus('saving')
    try {
      const body = serializeShop(form)
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

  async function handleDelete(shop: Shop) {
    const confirmed = window.confirm(`Delete "${shop.name}"? This cannot be undone.`)
    if (!confirmed) return
    setError(null)
    try {
      await deleteSellerShop(shop.id)
      if (editingId === shop.id) resetForm()
      await load()
      setToast({ message: 'Shop deleted.', variant: 'success' })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete shop.'))
    }
  }

  const activeCount = shops.filter((shop) => shop.status === 'active').length

  return (
    <div>
      <SellerPageHeader
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
                {shops.map((shop) => (
                  <li
                    key={shop.id}
                    className={cn(
                      sellerPanelClass,
                      'group flex flex-col overflow-hidden transition-shadow hover:shadow-[0_14px_40px_rgba(40,50,30,0.10)]',
                      editingId === shop.id && 'ring-2 ring-primary/30',
                    )}
                  >
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      {shop.image_url ? (
                        <img
                          src={shop.image_url}
                          alt=""
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-[radial-gradient(ellipse_at_center,oklch(0.94_0.03_125/0.7),transparent_70%)] text-muted-foreground">
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
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-lg tracking-tight">{shop.name}</h3>
                      {shop.slug ? (
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                          /{shop.slug}
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
                          aria-label={`Preview ${shop.name}`}
                          onClick={() => setPreviewShop(shop)}
                        >
                          <Eye className="size-4" />
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
                          aria-label={`Delete ${shop.name}`}
                          onClick={() => handleDelete(shop)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : showForm ? null : (
            <div
              className={cn(
                sellerPanelClass,
                'relative overflow-hidden px-6 py-16 text-center sm:py-20',
              )}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,oklch(0.94_0.03_125/0.45),transparent_70%)]"
              />
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
                        onChange={(event) => updateField('address_id', event.target.value)}
                        className={selectClassName}
                      >
                        <option value="">No linked address</option>
                        {addresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.label ? `${address.label} — ${address.line1}` : address.line1}
                          </option>
                        ))}
                      </select>
                      {addresses.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No addresses yet —{' '}
                          <Link to="/seller/profile" className="text-primary hover:underline">
                            add one on your profile
                          </Link>
                          .
                        </p>
                      ) : null}
                    </div>
                    <PlaceAutocomplete
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
                      onChange={(event) =>
                        updateField('return_address_id', event.target.value)
                      }
                      className={selectClassName}
                    >
                      <option value="">No linked address</option>
                      {addresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.label ? `${address.label} — ${address.line1}` : address.line1}
                        </option>
                      ))}
                    </select>
                    {addresses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No addresses yet —{' '}
                        <Link to="/seller/profile" className="text-primary hover:underline">
                          add one on your profile
                        </Link>
                        .
                      </p>
                    ) : null}
                  </div>
                </div>

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

      <Sheet
        open={previewShop !== null}
        onOpenChange={(open) => !open && setPreviewShop(null)}
      >
        <SheetContent className="overflow-y-auto p-0">
          {previewShop ? (
            <>
              <div className="relative aspect-video shrink-0 overflow-hidden bg-muted">
                {previewShop.image_url ? (
                  <img
                    src={previewShop.image_url}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-[radial-gradient(ellipse_at_center,oklch(0.94_0.03_125/0.7),transparent_70%)] text-muted-foreground">
                    <Store className="size-8" />
                  </div>
                )}
                <span
                  className={cn(
                    'absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm',
                    previewShop.status === 'active'
                      ? 'bg-primary/90 text-primary-foreground'
                      : 'bg-foreground/70 text-background',
                  )}
                >
                  {previewShop.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-6 p-6">
                <SheetHeader className="p-0">
                  <SheetTitle>{previewShop.name}</SheetTitle>
                  {previewShop.description ? (
                    <SheetDescription>{previewShop.description}</SheetDescription>
                  ) : null}
                </SheetHeader>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <Link2 className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono text-muted-foreground">
                      /{previewShop.slug || '—'}
                    </span>
                  </div>
                  {previewShop.customer_visible_location ? (
                    <div className="flex items-center gap-2.5">
                      <MapPin className="size-4 shrink-0 text-muted-foreground" />
                      <span className="text-foreground">
                        {previewShop.customer_visible_location}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-xl border border-border/50 bg-surface/60 p-4">
                  <div className="flex items-start gap-2.5">
                    <Truck className="size-4 shrink-0 text-muted-foreground" />
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
                    <Undo2 className="size-4 shrink-0 text-muted-foreground" />
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

                <div className="flex flex-col gap-2">
                  <Button asChild className="h-10 rounded-full">
                    <Link to={`/seller/products?shop=${previewShop.id}`}>
                      <Package className="size-4" />
                      Manage products
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-full"
                    onClick={() => {
                      const shop = previewShop
                      setPreviewShop(null)
                      startEdit(shop)
                    }}
                  >
                    <Pencil className="size-4" />
                    Edit shop
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
