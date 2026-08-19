import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  ArrowLeftRight,
  Camera,
  Check,
  LoaderCircle,
  Mail,
  MapPin,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react'

import { listCountries, type Country } from '@/api/countries'
import { uploadPublicImage } from '@/api/media'
import {
  addSellerAddress,
  deleteSellerAddress,
  deleteSellerMe,
  getSellerMe,
  updateSellerAddress,
  updateSellerMe,
  type SellerAddress,
  type SellerAddressType,
  type SellerDetails,
  type SellerUpdateRequest,
} from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { ImageCropDialog } from '@/components/common/image-crop-dialog'
import { SaveButton, type SaveStatus } from '@/components/common/save-button'
import { Toast } from '@/components/common/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { PhoneField } from '@/features/auth/phone-field'
import { sellerTypes } from '@/features/auth/seller-register-options'
import {
  sellerDisplayName,
  sellerInitials,
  sellerPanelClass,
  sellerSetupProgress,
  sellerSetupSteps,
  sellerVerificationLabel,
  sellerVerificationTone,
} from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { publishPublicSeller } from '@/lib/public-sellers'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

const addressTypes: SellerAddressType[] = ['pickup', 'return', 'both']

const addressTypeMeta: Record<
  SellerAddressType,
  { label: string; hint: string; icon: LucideIcon }
> = {
  pickup: { label: 'Pickup', hint: 'Couriers collect orders here', icon: PackageCheck },
  return: { label: 'Return', hint: 'Customers send returns here', icon: Undo2 },
  both: { label: 'Both', hint: 'Used for pickups and returns', icon: ArrowLeftRight },
}

function metaForType(type: string) {
  return addressTypeMeta[type as SellerAddressType] ?? addressTypeMeta.both
}

export function SellerProfilePage() {
  const { logout } = useAuth()
  const [profile, setProfile] = useState<SellerDetails | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [profileStatus, setProfileStatus] = useState<SaveStatus>('idle')
  const [addressStatus, setAddressStatus] = useState<SaveStatus>('idle')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  )
  const imageInputRef = useRef<HTMLInputElement>(null)
  const savedTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [pendingImage, setPendingImage] = useState<{ src: string; name: string } | null>(null)

  const [countryId, setCountryId] = useState('')
  const [sellerType, setSellerType] = useState('')
  const [legalName, setLegalName] = useState('')
  const [tradingName, setTradingName] = useState('')
  const [phone, setPhone] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const [addressLabel, setAddressLabel] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [addressType, setAddressType] = useState<SellerAddressType>('pickup')
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  /** The form does not expose is_default, so carry it through an edit unchanged. */
  const [editingIsDefault, setEditingIsDefault] = useState(false)

  const load = useCallback(async () => {
    const [me, countryList] = await Promise.all([getSellerMe(), listCountries()])
    publishPublicSeller(me)
    setProfile(me)
    setCountries(Array.isArray(countryList) ? countryList : [])
    setCountryId(me.country_id)
    setSellerType(me.seller_type)
    setLegalName(me.legal_name)
    setTradingName(me.trading_name ?? '')
    setPhone(me.phone ?? '')
    setImageUrl(me.image_url ?? '')
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load profile.'))
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

  /** Holds the tick on screen briefly, then runs any follow-up (e.g. closing a form). */
  function flashSaved(setStatus: (status: SaveStatus) => void, onDone?: () => void) {
    setStatus('saved')
    const timer = setTimeout(() => {
      savedTimers.current = savedTimers.current.filter((t) => t !== timer)
      setStatus('idle')
      onDone?.()
    }, 1100)
    savedTimers.current.push(timer)
  }

  async function persistProfile(overrides: Partial<SellerUpdateRequest> = {}) {
    const updated = await updateSellerMe({
      country_id: countryId,
      seller_type: sellerType,
      legal_name: legalName.trim(),
      trading_name: optionalString(tradingName),
      phone: optionalString(phone),
      image_url: optionalString(imageUrl),
      ...overrides,
    })
    const next = profile
      ? { ...profile, ...updated, addresses: profile.addresses, shops: profile.shops }
      : { ...updated, addresses: [], shops: [] }
    setProfile(next)
    publishPublicSeller(next)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setProfileStatus('saving')
    try {
      await persistProfile()
      flashSaved(setProfileStatus)
    } catch (err) {
      setProfileStatus('idle')
      setError(getErrorMessage(err, 'Could not save profile.'))
    }
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
      const url = await uploadPublicImage(croppedFile, 'seller-profile')
      setImageUrl(url)
      await persistProfile({ image_url: url })
      setToast({ message: 'Photo uploaded.', variant: 'success' })
    } catch (err) {
      const message = getErrorMessage(err, 'Could not upload image.')
      setError(message)
      setToast({ message, variant: 'error' })
    } finally {
      setUploadingImage(false)
    }
  }

  function resetAddressForm() {
    setAddressLabel('')
    setLine1('')
    setLine2('')
    setCity('')
    setRegion('')
    setPostalCode('')
    setAddressType('pickup')
    setShowAddressForm(false)
    setEditingAddressId(null)
    setEditingIsDefault(false)
  }

  function startEditAddress(address: SellerAddress) {
    setAddressLabel(address.label ?? '')
    setLine1(address.line1)
    setLine2(address.line2 ?? '')
    setCity(address.city)
    setRegion(address.region ?? '')
    setPostalCode(address.postal_code ?? '')
    setAddressType((address.address_type as SellerAddressType) ?? 'pickup')
    setEditingAddressId(address.id)
    setEditingIsDefault(address.is_default)
    setShowAddressForm(true)
    setError(null)
  }

  async function handleSubmitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setAddressStatus('saving')
    const body = {
      country_id: countryId,
      label: optionalString(addressLabel),
      line1: line1.trim(),
      line2: optionalString(line2),
      city: city.trim(),
      address_type: addressType,
      region: optionalString(region),
      postal_code: optionalString(postalCode),
      is_default: editingIsDefault,
    }
    try {
      if (editingAddressId) {
        await updateSellerAddress(editingAddressId, body)
      } else {
        await addSellerAddress(body)
      }
      const saved = editingAddressId ? 'Address updated.' : 'Address added.'
      await load()
      // Let the tick finish before the form collapses, so the confirmation is seen.
      flashSaved(setAddressStatus, resetAddressForm)
      setToast({ message: saved, variant: 'success' })
    } catch (err) {
      setAddressStatus('idle')
      setError(
        getErrorMessage(
          err,
          editingAddressId ? 'Could not update address.' : 'Could not add address.',
        ),
      )
    }
  }

  async function handleDeleteAddress(id: string) {
    setError(null)
    try {
      await deleteSellerAddress(id)
      await load()
      setToast({ message: 'Address deleted.', variant: 'success' })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete address.'))
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Delete your seller account? This cannot be undone.',
    )
    if (!confirmed) return
    try {
      await deleteSellerMe()
      logout()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete account.'))
    }
  }

  const progress = profile ? sellerSetupProgress(profile) : null

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-24">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          <FormAlert error={error} />

          <section
            className={cn(
              sellerPanelClass,
              'relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8',
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-[oklch(0.92_0.04_125/0.45)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 left-10 size-48 rounded-full bg-[oklch(0.93_0.04_80/0.35)]"
            />
            <div className="relative flex flex-wrap items-center gap-5">
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => imageInputRef.current?.click()}
                aria-label={imageUrl ? 'Change profile photo' : 'Upload profile photo'}
                className="group relative shrink-0 rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="size-20 rounded-full object-cover shadow-[0_8px_24px_rgba(60,80,40,0.22)] ring-4 ring-background sm:size-24"
                  />
                ) : (
                  <div className="flex size-20 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground shadow-[0_8px_24px_rgba(60,80,40,0.22)] ring-4 ring-background sm:size-24">
                    {profile ? sellerInitials(profile) : 'S'}
                  </div>
                )}
                <span
                  className={cn(
                    'absolute inset-0 flex items-center justify-center rounded-full bg-foreground/55 text-background transition-opacity',
                    uploadingImage
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
                  )}
                >
                  {uploadingImage ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <Camera className="size-5" />
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

              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  Seller portal
                </p>
                <h1 className="mt-1 font-display text-3xl tracking-tight">
                  {profile ? sellerDisplayName(profile) : 'Profile'}
                </h1>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                      sellerVerificationTone(profile?.verification_status ?? ''),
                    )}
                  >
                    {sellerVerificationLabel(profile?.verification_status ?? '')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    <Mail className="size-3" />
                    {profile?.email}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
            <div className="space-y-6">
              <form
                onSubmit={handleSave}
                className={`space-y-4 ${sellerPanelClass} p-6`}
              >
                <div>
                  <h2 className="font-display text-xl tracking-tight">Business details</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The legal identity behind your shops.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="seller-country">Country</Label>
                    {countries.length > 0 ? (
                      <select
                        id="seller-country"
                        value={countryId}
                        onChange={(event) => setCountryId(event.target.value)}
                        className={selectClassName}
                        required
                      >
                        {countries.map((country) => (
                          <option key={country.id} value={country.id}>
                            {country.name} ({country.iso_code})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="seller-country"
                        value={countryId}
                        onChange={(event) => setCountryId(event.target.value)}
                        className="h-11 bg-surface px-3 font-mono text-sm"
                        required
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seller-type">Seller type</Label>
                    <select
                      id="seller-type"
                      value={sellerType}
                      onChange={(event) => setSellerType(event.target.value)}
                      className={selectClassName}
                      required
                    >
                      {sellerTypes.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                      {sellerType &&
                      !sellerTypes.some((item) => item.value === sellerType) ? (
                        <option value={sellerType}>{sellerType}</option>
                      ) : null}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seller-legal">Legal name</Label>
                  <Input
                    id="seller-legal"
                    value={legalName}
                    onChange={(event) => setLegalName(event.target.value)}
                    className="h-11 bg-surface px-3"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="seller-trading">Trading name</Label>
                    <Input
                      id="seller-trading"
                      value={tradingName}
                      onChange={(event) => setTradingName(event.target.value)}
                      className="h-11 bg-surface px-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seller-phone">Phone</Label>
                    <PhoneField id="seller-phone" value={phone} onChange={setPhone} />
                  </div>
                </div>
                <SaveButton status={profileStatus}>Save profile</SaveButton>
              </form>

              <section className={`space-y-5 ${sellerPanelClass} p-6`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl tracking-tight">Addresses</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Where couriers collect orders and customers send returns.
                    </p>
                  </div>
                  {showAddressForm ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 rounded-full px-3"
                      onClick={resetAddressForm}
                    >
                      <X className="size-4" />
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-full px-4"
                      onClick={() => setShowAddressForm(true)}
                    >
                      <Plus className="size-4" />
                      Add address
                    </Button>
                  )}
                </div>

                {profile?.addresses?.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {profile.addresses.map((address) => {
                      const meta = metaForType(address.address_type)
                      return (
                        <li
                          key={address.id}
                          className={cn(
                            'group flex gap-3 rounded-xl border bg-surface/90 p-4 transition-colors',
                            editingAddressId === address.id
                              ? 'border-primary/40 ring-1 ring-primary/20'
                              : 'border-border/40 hover:border-border hover:bg-muted/30',
                          )}
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary ring-1 ring-primary/10">
                            <meta.icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {address.label || meta.label}
                              </p>
                              {address.label ? (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  {meta.label}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                              {[
                                address.line1,
                                address.line2,
                                address.city,
                                address.region,
                                address.postal_code,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Edit address"
                              onClick={() => startEditAddress(address)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Delete address"
                              onClick={() => handleDeleteAddress(address.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : showAddressForm ? null : (
                  <div className="rounded-xl border border-dashed border-border/60 px-6 py-10 text-center">
                    <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-accent text-primary ring-1 ring-primary/10">
                      <MapPin className="size-5" />
                    </div>
                    <p className="text-sm font-medium">No addresses yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                      Add a pickup or return address so orders can be collected.
                    </p>
                    <Button
                      type="button"
                      className="mt-5 h-10 rounded-full px-4"
                      onClick={() => setShowAddressForm(true)}
                    >
                      <Plus className="size-4" />
                      Add your first address
                    </Button>
                  </div>
                )}

                {showAddressForm ? (
                  <form
                    onSubmit={handleSubmitAddress}
                    className="animate-in fade-in slide-in-from-top-2 space-y-5 rounded-xl border border-border/40 bg-surface/60 p-5 duration-300"
                  >
                    <h3 className="font-display text-lg tracking-tight">
                      {editingAddressId ? 'Edit address' : 'New address'}
                    </h3>
                    <div className="space-y-2">
                      <Label>Address type</Label>
                      <div role="radiogroup" aria-label="Address type" className="grid gap-2 sm:grid-cols-3">
                        {addressTypes.map((item) => {
                          const meta = addressTypeMeta[item]
                          const active = addressType === item
                          return (
                            <button
                              key={item}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => setAddressType(item)}
                              className={cn(
                                'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all active:scale-[0.98]',
                                active
                                  ? 'border-primary/40 bg-accent/60 ring-1 ring-primary/20'
                                  : 'border-border/40 bg-card hover:border-border hover:bg-muted/40',
                              )}
                            >
                              <meta.icon
                                className={cn(
                                  'size-4',
                                  active ? 'text-primary' : 'text-muted-foreground',
                                )}
                              />
                              <span className="text-sm font-medium">{meta.label}</span>
                              <span className="text-xs leading-snug text-muted-foreground">
                                {meta.hint}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="s-addr-label">
                        Label <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="s-addr-label"
                        value={addressLabel}
                        onChange={(event) => setAddressLabel(event.target.value)}
                        className="h-11 bg-card px-3"
                        placeholder="Main warehouse"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="s-addr-line1">Line 1</Label>
                      <Input
                        id="s-addr-line1"
                        value={line1}
                        onChange={(event) => setLine1(event.target.value)}
                        className="h-11 bg-card px-3"
                        placeholder="Street address"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-addr-line2">
                        Line 2 <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="s-addr-line2"
                        value={line2}
                        onChange={(event) => setLine2(event.target.value)}
                        className="h-11 bg-card px-3"
                        placeholder="Apartment, suite, unit"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="s-addr-city">City</Label>
                        <Input
                          id="s-addr-city"
                          value={city}
                          onChange={(event) => setCity(event.target.value)}
                          className="h-11 bg-card px-3"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-addr-region">Region</Label>
                        <Input
                          id="s-addr-region"
                          value={region}
                          onChange={(event) => setRegion(event.target.value)}
                          className="h-11 bg-card px-3"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-addr-postal">Postal code</Label>
                        <Input
                          id="s-addr-postal"
                          value={postalCode}
                          onChange={(event) => setPostalCode(event.target.value)}
                          className="h-11 bg-card px-3"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <SaveButton status={addressStatus}>
                        {editingAddressId ? 'Update address' : 'Save address'}
                      </SaveButton>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        disabled={addressStatus !== 'idle'}
                        onClick={resetAddressForm}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </section>

            </div>

            <div className="space-y-6">
              {profile && progress ? (
                <section className={cn(sellerPanelClass, 'p-5')}>
                  <h2 className="font-medium">Profile strength</h2>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="relative flex size-20 shrink-0 items-center justify-center">
                      <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          strokeWidth="3"
                          className="stroke-muted"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${progress.percent} 100`}
                          className="stroke-primary transition-[stroke-dasharray] duration-700 ease-out"
                        />
                      </svg>
                      <span className="absolute font-display text-lg tracking-tight">
                        {progress.percent}%
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {progress.done} of {progress.total} steps done. Finish these to
                      start selling.
                    </p>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {sellerSetupSteps(profile).map((step) => (
                      <li key={step.id} className="flex items-center gap-2.5 text-sm">
                        <span
                          className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded-full',
                            step.done
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <Check className="size-3" />
                        </span>
                        <span
                          className={
                            step.done
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          }
                        >
                          {step.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section
                className={cn(sellerPanelClass, 'p-5 ring-destructive/20')}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <TriangleAlert className="size-4" />
                  </span>
                  <h2 className="font-medium">Danger zone</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Deleting your account removes your shops and listings. This cannot be
                  undone.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  className="mt-4 h-9 w-full"
                  onClick={handleDeleteAccount}
                >
                  Delete seller account
                </Button>
              </section>
            </div>
          </div>
        </div>
      )}
      {toast ? (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      ) : null}
      {pendingImage ? (
        <ImageCropDialog
          open
          imageSrc={pendingImage.src}
          fileName={pendingImage.name}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      ) : null}
    </div>
  )
}
