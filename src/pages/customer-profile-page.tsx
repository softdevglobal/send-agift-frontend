import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

import {
  deleteCustomerMe,
  getCustomerMe,
  updateCustomerMe,
  type CustomerDetails,
} from '@/api/customers'
import { listCountries, type Country } from '@/api/countries'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { PhoneField } from '@/features/auth/phone-field'
import { CustomerPageHeader } from '@/features/customer-commerce'
import {
  customerStatusLabel,
  customerTypes,
  type CustomerStatus,
} from '@/features/auth/customer-register-options'
import { getErrorMessage } from '@/lib/api'
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
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="size-16 rounded-full object-cover ring-1 ring-border"
                />
              ) : null}
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>

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
                        {country.name} ({country.iso_code})
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
              <Label htmlFor="profile-image">Image URL</Label>
              <Input
                id="profile-image"
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="h-11 bg-surface px-3"
                placeholder="https://"
              />
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
