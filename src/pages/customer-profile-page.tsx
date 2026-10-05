import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, LoaderCircle, MapPin, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  deleteCustomerMe,
  getCustomerMe,
  updateCustomerMe,
  type CustomerDetails,
} from '@/api/customers'
import { listCountries, type Country } from '@/api/countries'
import { uploadPublicImage } from '@/api/media'
import { ImageCropDialog } from '@/components/common/image-crop-dialog'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChangePasswordCard } from '@/features/account/change-password-card'
import { useAuth } from '@/features/auth/auth-context'
import { PhoneField } from '@/features/auth/phone-field'
import { CustomerPageHeader } from '@/features/customer-commerce'
import {
  customerStatusLabel,
  customerTypes,
  type CustomerStatus,
} from '@/features/auth/customer-register-options'
import { getErrorMessage } from '@/lib/api'
import { countryOptionLabel } from '@/lib/country-options'
import { optionalString, toDateInputValue } from '@/lib/form'
import { selectClassName } from '@/lib/form-styles'

export function CustomerProfilePage() {
  const { logout } = useAuth()
  const [profile, setProfile] = useState<CustomerDetails | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [countryId, setCountryId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [customerType, setCustomerType] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [status, setStatus] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [pendingImage, setPendingImage] = useState<{ src: string; name: string } | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [me, countryList] = await Promise.all([
      getCustomerMe(),
      listCountries(),
    ])
    setProfile(me)
    setCountries(Array.isArray(countryList) ? countryList : [])
    setCountryId(me.country_id)
    setDisplayName(me.display_name ?? '')
    setPhone(me.phone ?? '')
    setCustomerType(me.customer_type)
    setDateOfBirth(toDateInputValue(me.date_of_birth))
    setStatus(me.status)
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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setSaving(true)
    try {
      const updated = await updateCustomerMe({
        country_id: countryId,
        customer_type: customerType,
        date_of_birth: optionalString(dateOfBirth),
        status,
        phone: optionalString(phone),
        display_name: optionalString(displayName),
        image_url: optionalString(imageUrl),
      })
      setProfile((prev) =>
        prev
          ? { ...prev, ...updated, addresses: prev.addresses }
          : { ...updated, addresses: [] },
      )
      setNotice('Profile saved.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save profile.'))
    } finally {
      setSaving(false)
    }
  }

  /** Saves the photo straight away, with the rest of the profile as it was loaded. */
  async function savePhoto(url: string) {
    if (!profile) return
    setError(null)
    setNotice(null)
    setUploadingPhoto(true)
    try {
      const updated = await updateCustomerMe({
        country_id: profile.country_id,
        customer_type: profile.customer_type,
        date_of_birth: optionalString(toDateInputValue(profile.date_of_birth)),
        status: profile.status,
        phone: profile.phone,
        display_name: profile.display_name,
        image_url: url,
      })
      setImageUrl(updated.image_url ?? '')
      setProfile((prev) => (prev ? { ...prev, image_url: updated.image_url } : prev))
      setNotice(url ? 'Photo updated.' : 'Photo removed.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your photo.'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  function handlePhotoPicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }
    setPendingImage({ src: URL.createObjectURL(file), name: file.name })
  }

  async function handleCropConfirm(cropped: File) {
    if (pendingImage) URL.revokeObjectURL(pendingImage.src)
    setPendingImage(null)
    setUploadingPhoto(true)
    try {
      await savePhoto(await uploadPublicImage(cropped, 'customer-profile'))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not upload your photo.'))
      setUploadingPhoto(false)
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Delete your customer account? This cannot be undone.',
    )
    if (!confirmed) return
    setError(null)
    try {
      await deleteCustomerMe()
      logout()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete account.'))
    }
  }

  return (
    <div>
      <CustomerPageHeader
        title="Account settings"
        description="Your contact details and account preferences."
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <FormAlert error={error} notice={notice} />

          <form
            onSubmit={handleSave}
            className="space-y-4 rounded-2xl bg-card p-6 ring-1 ring-border/60"
          >
            <h2 className="font-display text-xl">Account</h2>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                disabled={uploadingPhoto}
                className="group relative size-20 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary/15 to-pink-200 ring-2 ring-background shadow-md"
                aria-label={imageUrl ? 'Change photo' : 'Add a photo'}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center font-display text-2xl text-primary">
                    {(displayName || profile?.email || '?').trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-foreground/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {uploadingPhoto ? <LoaderCircle className="size-5 animate-spin" /> : <Camera className="size-5" />}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{displayName || 'Your profile'}</p>
                <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={uploadingPhoto}
                    onClick={() => photoInput.current?.click()}
                  >
                    <Camera className="size-3.5" />
                    {imageUrl ? 'Change photo' : 'Add a photo'}
                  </Button>
                  {imageUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-muted-foreground"
                      disabled={uploadingPhoto}
                      onClick={() => void savePhoto('')}
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoPicked}
              />
            </div>

            {profile && profile.addresses.length === 0 ? (
              <Link
                to="/account/addresses"
                className="flex items-center gap-3 rounded-xl bg-accent/60 px-4 py-3 text-sm text-accent-foreground ring-1 ring-primary/15 transition-colors hover:bg-accent"
              >
                <MapPin className="size-4 shrink-0" />
                <span className="flex-1">Add a delivery address so checkout is one tap.</span>
                <span className="font-medium">Add address →</span>
              </Link>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-country">Country</Label>
                {countries.length > 0 ? (
                  <select
                    id="profile-country"
                    value={countryId}
                    onChange={(event) => setCountryId(event.target.value)}
                    className={selectClassName}
                    required
                  >
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {countryOptionLabel(country)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="profile-country"
                    value={countryId}
                    onChange={(event) => setCountryId(event.target.value)}
                    className="h-11 bg-surface px-3 font-mono text-sm"
                    required
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-type">Customer type</Label>
                <select
                  id="profile-type"
                  value={customerType}
                  onChange={(event) => setCustomerType(event.target.value)}
                  className={selectClassName}
                  required
                >
                  {customerTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                  {customerType &&
                  !customerTypes.some((item) => item.value === customerType) ? (
                    <option value={customerType}>{customerType}</option>
                  ) : null}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-display-name">Display name</Label>
              <Input
                id="profile-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="h-11 bg-surface px-3"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-phone">Phone</Label>
                <PhoneField id="profile-phone" value={phone} onChange={setPhone} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-dob">Date of birth</Label>
                <Input
                  id="profile-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-status">Status</Label>
              <select
                id="profile-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={selectClassName}
                required
              >
                {(Object.keys(customerStatusLabel) as CustomerStatus[]).map(
                  (item) => (
                    <option key={item} value={item}>
                      {customerStatusLabel[item]}
                    </option>
                  ),
                )}
                {status &&
                !(status in customerStatusLabel) ? (
                  <option value={status}>{status}</option>
                ) : null}
              </select>
            </div>

            <Button type="submit" disabled={saving} className="h-10">
              {saving ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Saving…
                </>
              ) : (
                'Save profile'
              )}
            </Button>
          </form>

          {pendingImage ? (
            <ImageCropDialog
              open
              imageSrc={pendingImage.src}
              fileName={pendingImage.name}
              onCancel={() => {
                URL.revokeObjectURL(pendingImage.src)
                setPendingImage(null)
              }}
              onConfirm={handleCropConfirm}
            />
          ) : null}

          <ChangePasswordCard temporary={Boolean(profile?.password_change_required)} />

          <section className="rounded-2xl bg-card p-6 ring-1 ring-destructive/20">
            <h2 className="font-display text-xl">Delete account</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Permanently delete this customer account.
            </p>
            <Button type="button" variant="destructive" onClick={handleDeleteAccount}>
              Delete customer
            </Button>
          </section>
        </div>
      )}
    </div>
  )
}
