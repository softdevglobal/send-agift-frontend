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
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react'

import { listCountries, type Country } from '@/api/countries'
import {
  addRecipientAddress,
  createRecipient,
  deleteRecipient,
  deleteRecipientAddress,
  getRecipient,
  listRecipients,
  updateRecipient,
  updateRecipientAddress,
  type Recipient,
  type RecipientAddress,
  type RecipientDetails,
  type RecipientInput,
} from '@/api/customers'
import { uploadPublicImage } from '@/api/media'
import { addressFieldsFromPlace, type PlaceDetails } from '@/api/places'
import type { AddressInput } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { ImageCropDialog } from '@/components/common/image-crop-dialog'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { SaveButton, type SaveStatus } from '@/components/common/save-button'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  customerListRowClass,
  customerPanelClass,
} from '@/features/customer-commerce'
import { PhoneField } from '@/features/auth/phone-field'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

type AddressFormState = {
  country_id: string
  label: string
  address_type: string
  line1: string
  line2: string
  city: string
  region: string
  postal_code: string
  latitude: number | null
  longitude: number | null
  is_default: boolean
}

function emptyAddressForm(countryId = ''): AddressFormState {
  return {
    country_id: countryId,
    label: '',
    address_type: 'shipping',
    line1: '',
    line2: '',
    city: '',
    region: '',
    postal_code: '',
    latitude: null,
    longitude: null,
    is_default: false,
  }
}

function addressHasRequiredFields(form: AddressFormState) {
  return Boolean(form.country_id && form.line1.trim() && form.city.trim())
}

function addressIsBlank(form: AddressFormState) {
  return (
    !form.label.trim() &&
    !form.line1.trim() &&
    !form.line2.trim() &&
    !form.city.trim() &&
    !form.region.trim() &&
    !form.postal_code.trim() &&
    !form.is_default
  )
}

function toAddressInput(form: AddressFormState): AddressInput {
  return {
    country_id: form.country_id,
    line1: form.line1.trim(),
    city: form.city.trim(),
    label: optionalString(form.label) ?? null,
    address_type: optionalString(form.address_type) || 'shipping',
    line2: optionalString(form.line2) ?? null,
    region: optionalString(form.region) ?? null,
    postal_code: optionalString(form.postal_code) ?? null,
    latitude: form.latitude,
    longitude: form.longitude,
    is_default: form.is_default,
  }
}

const COLOR_CHOICES = [
  { value: 'red', label: 'Red', swatch: '#c24141' },
  { value: 'pink', label: 'Pink', swatch: '#db2777' },
  { value: 'orange', label: 'Orange', swatch: '#ea580c' },
  { value: 'yellow', label: 'Yellow', swatch: '#ca8a04' },
  { value: 'green', label: 'Green', swatch: '#16a34a' },
  { value: 'blue', label: 'Blue', swatch: '#2563eb' },
  { value: 'purple', label: 'Purple', swatch: '#7c3aed' },
  { value: 'white', label: 'White', swatch: '#f8fafc' },
  { value: 'black', label: 'Black', swatch: '#171717' },
  { value: 'gold', label: 'Gold', swatch: '#d4a017' },
  { value: 'silver', label: 'Silver', swatch: '#94a3b8' },
  { value: 'neutral', label: 'Neutral', swatch: '#a8a29e' },
] as const

type RecipientPreferencesForm = {
  favoriteColors: string[]
  noAlcohol: boolean
  extra: Record<string, unknown>
}

function emptyPreferences(): RecipientPreferencesForm {
  return { favoriteColors: [], noAlcohol: false, extra: {} }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeColor(value: string) {
  return value.trim().toLowerCase()
}

function colorLabel(value: string) {
  const known = COLOR_CHOICES.find((color) => color.value === value)
  if (known) return known.label
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function parsePreferences(value: unknown): RecipientPreferencesForm {
  if (value == null || value === '') return emptyPreferences()

  let record: Record<string, unknown> | null = null
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      record = isRecord(parsed) ? parsed : null
    } catch {
      record = null
    }
  } else if (isRecord(value)) {
    record = value
  }

  if (!record) return emptyPreferences()

  const colors = Array.isArray(record.favorite_colors)
    ? [
        ...new Set(
          record.favorite_colors.flatMap((item) =>
            typeof item === 'string' && item.trim() ? [normalizeColor(item)] : [],
          ),
        ),
      ]
    : []

  const extra = { ...record }
  delete extra.favorite_colors
  delete extra.no_alcohol

  return {
    favoriteColors: colors,
    noAlcohol: record.no_alcohol === true,
    extra,
  }
}

function preferencesPayload(form: RecipientPreferencesForm): Record<string, unknown> {
  const body: Record<string, unknown> = { ...form.extra }
  if (form.favoriteColors.length) body.favorite_colors = form.favoriteColors
  else delete body.favorite_colors
  if (form.noAlcohol) body.no_alcohol = true
  else delete body.no_alcohol
  return body
}

function formatAddress(address: RecipientAddress) {
  return [address.line1, address.line2, address.city, address.region, address.postal_code]
    .filter(Boolean)
    .join(', ')
}

export function CustomerRecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [details, setDetails] = useState<RecipientDetails | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [personStatus, setPersonStatus] = useState<SaveStatus>('idle')
  const [addressStatus, setAddressStatus] = useState<SaveStatus>('idle')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<{ src: string; name: string } | null>(
    null,
  )
  const imageInputRef = useRef<HTMLInputElement>(null)
  const savedTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [defaultAddressId, setDefaultAddressId] = useState('')
  const [preferences, setPreferences] = useState<RecipientPreferencesForm>(emptyPreferences)
  const [customColor, setCustomColor] = useState('')
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm())

  const loadList = useCallback(async () => {
    const [list, countryList] = await Promise.all([listRecipients(), listCountries()])
    setRecipients(Array.isArray(list) ? list : [])
    setCountries(Array.isArray(countryList) ? countryList : [])
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadList()
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load recipients.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadList])

  useEffect(() => {
    const timers = savedTimers
    return () => {
      timers.current.forEach(clearTimeout)
    }
  }, [])

  function flashSaved(setStatus: (status: SaveStatus) => void, onDone?: () => void) {
    setStatus('saved')
    const timer = setTimeout(() => {
      savedTimers.current = savedTimers.current.filter((t) => t !== timer)
      setStatus('idle')
      onDone?.()
    }, 1100)
    savedTimers.current.push(timer)
  }

  function populatePerson(recipient: Recipient) {
    setName(recipient.name)
    setRelationship(recipient.relationship ?? '')
    setEmail(recipient.email ?? '')
    setPhone(recipient.phone ?? '')
    setImageUrl(recipient.image_url ?? '')
    setDefaultAddressId(recipient.default_address_id ?? '')
    setPreferences(parsePreferences(recipient.preferences))
    setCustomColor('')
  }

  function resetPersonForm() {
    setName('')
    setRelationship('')
    setEmail('')
    setPhone('')
    setImageUrl('')
    setDefaultAddressId('')
    setPreferences(emptyPreferences())
    setCustomColor('')
    setAddressForm(emptyAddressForm(countries[0]?.id ?? ''))
    setEditingId(null)
    setDetails(null)
    setShowForm(false)
    setShowAddressForm(false)
    setEditingAddressId(null)
  }

  function startCreate() {
    resetPersonForm()
    setAddressForm(emptyAddressForm(countries[0]?.id ?? ''))
    setShowForm(true)
    setError(null)
    setNotice(null)
  }

  async function startEdit(id: string) {
    setError(null)
    setNotice(null)
    try {
      const recipient = await getRecipient(id)
      setDetails(recipient)
      setEditingId(recipient.id)
      populatePerson(recipient)
      setAddressForm(emptyAddressForm(recipient.addresses[0]?.country_id || countries[0]?.id || ''))
      setShowAddressForm(false)
      setEditingAddressId(null)
      setShowForm(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load recipient.'))
    }
  }

  function updateAddressField<K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) {
    setAddressForm((current) => ({ ...current, [key]: value }))
  }

  /** Fills the address form from a Google place. Country stays the one selected above. */
  function applyPlaceToAddressForm(place: PlaceDetails) {
    const fields = addressFieldsFromPlace(place)
    setAddressForm((current) => ({
      ...current,
      line1: fields.line1,
      line2: fields.line2,
      city: fields.city,
      region: fields.region,
      postal_code: fields.postal_code,
      latitude: fields.latitude,
      longitude: fields.longitude,
    }))
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

  function toggleFavoriteColor(color: string) {
    const next = normalizeColor(color)
    if (!next) return
    setPreferences((current) => ({
      ...current,
      favoriteColors: current.favoriteColors.includes(next)
        ? current.favoriteColors.filter((item) => item !== next)
        : [...current.favoriteColors, next],
    }))
  }

  function addCustomColor() {
    const next = normalizeColor(customColor)
    if (!next) return
    setPreferences((current) =>
      current.favoriteColors.includes(next)
        ? current
        : { ...current, favoriteColors: [...current.favoriteColors, next] },
    )
    setCustomColor('')
  }

  function personFields(): Omit<RecipientInput, 'addresses'> | string {
    if (!name.trim()) return 'name is required'

    return {
      name: name.trim(),
      relationship: optionalString(relationship) ?? null,
      email: optionalString(email) ?? null,
      phone: optionalString(phone) ?? null,
      image_url: optionalString(imageUrl) ?? null,
      default_address_id: optionalString(defaultAddressId) ?? null,
      preferences: preferencesPayload(preferences),
    }
  }

  async function handleCropConfirm(croppedFile: File) {
    if (pendingImage) URL.revokeObjectURL(pendingImage.src)
    setPendingImage(null)
    setError(null)
    setUploadingImage(true)
    try {
      const url = await uploadPublicImage(croppedFile, 'product-image')
      setImageUrl(url)
      if (editingId) {
        const fields = personFields()
        if (typeof fields !== 'string') {
          const updated = await updateRecipient(editingId, { ...fields, image_url: url })
          setDetails(updated)
          populatePerson(updated)
          await loadList()
        }
      }
      setNotice('Photo uploaded.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not upload image.'))
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSavePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    const fields = personFields()
    if (typeof fields === 'string') {
      setError(fields)
      return
    }

    if (!editingId && !addressIsBlank(addressForm) && !addressHasRequiredFields(addressForm)) {
      setError('address requires country_id, line1, and city')
      return
    }

    setPersonStatus('saving')
    try {
      if (editingId) {
        const updated = await updateRecipient(editingId, fields)
        setDetails(updated)
        populatePerson(updated)
        await loadList()
        flashSaved(setPersonStatus)
        setNotice('Recipient updated.')
        return
      }

      const createBody: RecipientInput = {
        name: fields.name,
        relationship: fields.relationship,
        email: fields.email,
        phone: fields.phone,
        image_url: fields.image_url,
        preferences: fields.preferences,
      }
      if (addressHasRequiredFields(addressForm)) {
        createBody.addresses = [toAddressInput(addressForm)]
      }
      const created = await createRecipient(createBody)
      await loadList()
      setEditingId(created.id)
      setDetails(created)
      populatePerson(created)
      setAddressForm(emptyAddressForm(created.addresses[0]?.country_id || countries[0]?.id || ''))
      flashSaved(setPersonStatus)
      setNotice('Recipient created.')
    } catch (err) {
      setPersonStatus('idle')
      setError(getErrorMessage(err, 'Could not save recipient.'))
    }
  }

  function startEditAddress(address: RecipientAddress) {
    setAddressForm({
      country_id: address.country_id,
      label: address.label ?? '',
      address_type: address.address_type || 'shipping',
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      region: address.region ?? '',
      postal_code: address.postal_code ?? '',
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
      is_default: address.is_default,
    })
    setEditingAddressId(address.id)
    setShowAddressForm(true)
    setError(null)
    setNotice(null)
  }

  function resetAddressForm() {
    setAddressForm(
      emptyAddressForm(details?.addresses[0]?.country_id || countries[0]?.id || ''),
    )
    setShowAddressForm(false)
    setEditingAddressId(null)
  }

  async function handleSubmitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingId) return
    setError(null)
    setNotice(null)
    if (!addressHasRequiredFields(addressForm)) {
      setError('address requires country_id, line1, and city')
      return
    }
    setAddressStatus('saving')
    try {
      const body = toAddressInput(addressForm)
      if (editingAddressId) {
        await updateRecipientAddress(editingId, editingAddressId, body)
      } else {
        await addRecipientAddress(editingId, body)
      }
      const next = await getRecipient(editingId)
      setDetails(next)
      populatePerson(next)
      flashSaved(setAddressStatus, resetAddressForm)
      setNotice(editingAddressId ? 'Address updated.' : 'Address added.')
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

  async function handleDeleteAddress(addressId: string) {
    if (!editingId) return
    setError(null)
    setNotice(null)
    try {
      await deleteRecipientAddress(editingId, addressId)
      const next = await getRecipient(editingId)
      setDetails(next)
      populatePerson(next)
      if (editingAddressId === addressId) resetAddressForm()
      setNotice('Address deleted.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete address.'))
    }
  }

  async function handleDeleteRecipient(id: string, recipientName: string) {
    const confirmed = window.confirm(
      `Delete "${recipientName}"? This also deletes their addresses.`,
    )
    if (!confirmed) return
    setError(null)
    setNotice(null)
    try {
      await deleteRecipient(id)
      if (editingId === id) resetPersonForm()
      await loadList()
      setNotice('Recipient deleted.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete recipient.'))
    }
  }

  return (
    <div>
      <CustomerPageHeader
        title="Recipients"
        description="People you send gifts to. Add a photo and shipping addresses so checkout is faster."
        action={
          showForm ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-4"
              onClick={resetPersonForm}
            >
              <X className="size-4" />
              Cancel
            </Button>
          ) : (
            <Button type="button" className="h-10 rounded-full px-4" onClick={startCreate}>
              <Plus className="size-4" />
              Add recipient
            </Button>
          )
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <FormAlert error={error} notice={notice} />

          {recipients.length ? (
            <ul className="space-y-3">
              {recipients.map((recipient) => (
                <li key={recipient.id} className={customerListRowClass}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                      {recipient.image_url ? (
                        <img
                          src={recipient.image_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <Users className="size-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{recipient.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {[recipient.relationship, recipient.email, recipient.phone]
                          .filter(Boolean)
                          .join(' · ') || 'No contact details yet'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${recipient.name}`}
                      onClick={() => startEdit(recipient.id)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${recipient.name}`}
                      onClick={() => handleDeleteRecipient(recipient.id, recipient.name)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : showForm ? null : (
            <CustomerEmptyState
              icon={Users}
              title="No recipients yet"
              description="Add the people you send gifts to, with optional shipping addresses."
              action={
                <Button type="button" className="h-10 rounded-full px-4" onClick={startCreate}>
                  <Plus className="size-4" />
                  Add your first recipient
                </Button>
              }
            />
          )}

          {showForm ? (
            <div className="space-y-6">
              <form
                onSubmit={handleSavePerson}
                className={cn(customerPanelClass, 'space-y-5 p-6')}
              >
                <h2 className="font-display text-xl tracking-tight">
                  {editingId ? 'Edit recipient' : 'New recipient'}
                </h2>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                    aria-label={imageUrl ? 'Change photo' : 'Upload photo'}
                    className="group relative rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="size-20 rounded-full object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border">
                        <Users className="size-6" />
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
                  <p className="text-sm text-muted-foreground">Optional photo.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient-name">Name</Label>
                  <Input
                    id="recipient-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-11 bg-surface px-3"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="recipient-relationship">Relationship</Label>
                    <Input
                      id="recipient-relationship"
                      value={relationship}
                      onChange={(event) => setRelationship(event.target.value)}
                      className="h-11 bg-surface px-3"
                      placeholder="mother"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient-email">Email</Label>
                    <Input
                      id="recipient-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11 bg-surface px-3"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient-phone">Phone</Label>
                  <PhoneField id="recipient-phone" value={phone} onChange={setPhone} />
                </div>

                {editingId && details?.addresses.length ? (
                  <div className="space-y-2">
                    <Label htmlFor="recipient-default-address">Default address</Label>
                    <select
                      id="recipient-default-address"
                      value={defaultAddressId}
                      onChange={(event) => setDefaultAddressId(event.target.value)}
                      className={selectClassName}
                    >
                      <option value="">None</option>
                      {details.addresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.label || address.line1}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <fieldset className="space-y-4 rounded-xl border border-border/50 p-4">
                  <legend className="px-1 text-sm font-medium">
                    Gift preferences{' '}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </legend>
                  <p className="text-sm text-muted-foreground">
                    We’ll use this when suggesting gifts. You can skip it.
                  </p>

                  <div className="space-y-2">
                    <Label>Favorite colors</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_CHOICES.map((color) => {
                        const selected = preferences.favoriteColors.includes(color.value)
                        return (
                          <button
                            key={color.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleFavoriteColor(color.value)}
                            className={cn(
                              'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors',
                              selected
                                ? 'border-primary bg-accent text-accent-foreground'
                                : 'border-border bg-surface text-foreground hover:bg-muted',
                            )}
                          >
                            <span
                              className="size-3.5 rounded-full ring-1 ring-black/10"
                              style={{ backgroundColor: color.swatch }}
                              aria-hidden
                            />
                            {color.label}
                          </button>
                        )
                      })}
                      {preferences.favoriteColors
                        .filter(
                          (color) =>
                            !COLOR_CHOICES.some((choice) => choice.value === color),
                        )
                        .map((color) => (
                          <button
                            key={color}
                            type="button"
                            aria-pressed
                            onClick={() => toggleFavoriteColor(color)}
                            className="inline-flex h-9 items-center gap-2 rounded-full border border-primary bg-accent px-3 text-sm text-accent-foreground"
                          >
                            {colorLabel(color)}
                            <X className="size-3.5" />
                          </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        id="recipient-custom-color"
                        value={customColor}
                        onChange={(event) => setCustomColor(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            addCustomColor()
                          }
                        }}
                        className="h-11 max-w-56 bg-surface px-3"
                        placeholder="Add another color"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-full px-4"
                        disabled={!customColor.trim()}
                        onClick={addCustomColor}
                      >
                        Add color
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="recipient-no-alcohol"
                      checked={preferences.noAlcohol}
                      onCheckedChange={(value) =>
                        setPreferences((current) => ({
                          ...current,
                          noAlcohol: value === true,
                        }))
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <Label htmlFor="recipient-no-alcohol" className="font-normal">
                        Don’t include alcohol
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Skip wine, spirits, and other alcoholic gifts.
                      </p>
                    </div>
                  </div>
                </fieldset>

                {!editingId ? (
                  <fieldset className="space-y-4 rounded-xl border border-border/50 p-4">
                    <legend className="px-1 text-sm font-medium">
                      First address <span className="font-normal text-muted-foreground">(optional)</span>
                    </legend>
                    <AddressFields
                      form={addressForm}
                      countries={countries}
                      onChange={updateAddressField}
                      onSelectPlace={applyPlaceToAddressForm}
                      idPrefix="create"
                    />
                  </fieldset>
                ) : null}

                <SaveButton status={personStatus}>
                  {editingId ? 'Save recipient' : 'Create recipient'}
                </SaveButton>
              </form>

              {editingId ? (
                <section className={cn(customerPanelClass, 'space-y-5 p-6')}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl tracking-tight">Addresses</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Shipping locations for this person.
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
                        onClick={() => {
                          setAddressForm(
                            emptyAddressForm(
                              details?.addresses[0]?.country_id || countries[0]?.id || '',
                            ),
                          )
                          setEditingAddressId(null)
                          setShowAddressForm(true)
                        }}
                      >
                        <Plus className="size-4" />
                        Add address
                      </Button>
                    )}
                  </div>

                  {details?.addresses.length ? (
                    <ul className="space-y-3">
                      {details.addresses.map((address) => (
                        <li key={address.id} className={customerListRowClass}>
                          <div className="flex min-w-0 items-start gap-3">
                            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 text-sm">
                              <p className="font-medium">
                                {address.label || address.address_type || 'Address'}
                                {address.is_default || details.default_address_id === address.id
                                  ? ' · Default'
                                  : ''}
                              </p>
                              <p className="text-muted-foreground">{formatAddress(address)}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
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
                      ))}
                    </ul>
                  ) : showAddressForm ? null : (
                    <p className="text-sm text-muted-foreground">No addresses yet.</p>
                  )}

                  {showAddressForm ? (
                    <form onSubmit={handleSubmitAddress} className="space-y-4">
                      <h3 className="font-medium">
                        {editingAddressId ? 'Edit address' : 'New address'}
                      </h3>
                      <AddressFields
                        form={addressForm}
                        countries={countries}
                        onChange={updateAddressField}
                        onSelectPlace={applyPlaceToAddressForm}
                        idPrefix="edit"
                      />
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
              ) : null}
            </div>
          ) : null}
        </div>
      )}

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

function AddressFields({
  form,
  countries,
  onChange,
  onSelectPlace,
  idPrefix,
}: {
  form: AddressFormState
  countries: Country[]
  onChange: <K extends keyof AddressFormState>(key: K, value: AddressFormState[K]) => void
  onSelectPlace: (place: PlaceDetails) => void
  idPrefix: string
}) {
  // Restricts Google's results to the country picked above.
  const countryCode = countries.find((country) => country.id === form.country_id)?.iso_code

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-addr-country`}>Country</Label>
        {countries.length > 0 ? (
          <select
            id={`${idPrefix}-addr-country`}
            value={form.country_id}
            onChange={(event) => onChange('country_id', event.target.value)}
            className={selectClassName}
          >
            <option value="">Select country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name} ({country.iso_code})
              </option>
            ))}
          </select>
        ) : (
          <Input
            id={`${idPrefix}-addr-country`}
            value={form.country_id}
            onChange={(event) => onChange('country_id', event.target.value)}
            className="h-11 bg-surface px-3 font-mono text-sm"
          />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-addr-label`}>Label</Label>
        <Input
          id={`${idPrefix}-addr-label`}
          value={form.label}
          onChange={(event) => onChange('label', event.target.value)}
          className="h-11 bg-surface px-3"
          placeholder="Home"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-addr-type`}>Address type</Label>
        <Input
          id={`${idPrefix}-addr-type`}
          value={form.address_type}
          onChange={(event) => onChange('address_type', event.target.value)}
          className="h-11 bg-surface px-3"
          placeholder="shipping"
        />
      </div>
      <AddressAutocomplete
        id={`${idPrefix}-addr-search`}
        className="sm:col-span-2"
        countryCode={countryCode}
        onSelect={onSelectPlace}
      />
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-addr-line1`}>Line 1</Label>
        <Input
          id={`${idPrefix}-addr-line1`}
          value={form.line1}
          onChange={(event) => onChange('line1', event.target.value)}
          className="h-11 bg-surface px-3"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-addr-line2`}>Line 2</Label>
        <Input
          id={`${idPrefix}-addr-line2`}
          value={form.line2}
          onChange={(event) => onChange('line2', event.target.value)}
          className="h-11 bg-surface px-3"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-addr-city`}>City</Label>
        <Input
          id={`${idPrefix}-addr-city`}
          value={form.city}
          onChange={(event) => onChange('city', event.target.value)}
          className="h-11 bg-surface px-3"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-addr-region`}>Region</Label>
        <Input
          id={`${idPrefix}-addr-region`}
          value={form.region}
          onChange={(event) => onChange('region', event.target.value)}
          className="h-11 bg-surface px-3"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-addr-postal`}>Postal code</Label>
        <Input
          id={`${idPrefix}-addr-postal`}
          value={form.postal_code}
          onChange={(event) => onChange('postal_code', event.target.value)}
          className="h-11 bg-surface px-3"
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Checkbox
          id={`${idPrefix}-addr-default`}
          checked={form.is_default}
          onCheckedChange={(value) => onChange('is_default', value === true)}
        />
        <Label htmlFor={`${idPrefix}-addr-default`} className="font-normal">
          Default address
        </Label>
      </div>
    </div>
  )
}
