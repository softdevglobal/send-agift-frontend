import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'

import {
  addCustomerAddress,
  deleteCustomerAddress,
  deleteCustomerMe,
  getCustomerMe,
  updateCustomerMe,
  type CustomerDetails,
} from '@/api/customers'
import { listCountries, type Country } from '@/api/countries'
import { AccountShell } from '@/components/common/account-shell'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import {
  customerStatusLabel,
  customerTypes,
  type CustomerStatus,
} from '@/features/auth/customer-register-options'
import { getErrorMessage } from '@/lib/api'
import { optionalString, toDateInputValue } from '@/lib/form'
import { selectClassName } from '@/lib/form-styles'

const customerNav = [{ to: '/customer/profile', label: 'Profile', end: true }]

export function CustomerProfilePage() {
  const { logout } = useAuth()
  const [profile, setProfile] = useState<CustomerDetails | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingAddress, setAddingAddress] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [countryId, setCountryId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [customerType, setCustomerType] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [status, setStatus] = useState('')

  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [label, setLabel] = useState('')
  const [isDefault, setIsDefault] = useState(false)

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
        date_of_birth: dateOfBirth,
        status,
        phone: optionalString(phone),
        display_name: optionalString(displayName),
      })
      setProfile(updated)
      setNotice('Profile saved.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save profile.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleAddAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setAddingAddress(true)
    try {
      await addCustomerAddress({
        country_id: countryId,
        line1: line1.trim(),
        city: city.trim(),
        line2: optionalString(line2),
        region: optionalString(region),
        postal_code: optionalString(postalCode),
        label: optionalString(label),
        is_default: isDefault,
      })
      setLine1('')
      setLine2('')
      setCity('')
      setRegion('')
      setPostalCode('')
      setLabel('')
      setIsDefault(false)
      await load()
      setNotice('Address added.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not add address.'))
    } finally {
      setAddingAddress(false)
    }
  }

  async function handleDeleteAddress(id: string) {
    setError(null)
    setNotice(null)
    try {
      await deleteCustomerAddress(id)
      await load()
      setNotice('Address deleted.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete address.'))
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
    <AccountShell
      eyebrow="Customer"
      title="Your profile"
      description="Update your details and delivery addresses."
      nav={customerNav}
    >
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
            <p className="text-sm text-muted-foreground">{profile?.email}</p>

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
                <Input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-dob">Date of birth</Label>
                <Input
                  id="profile-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
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

          <section className="space-y-4 rounded-2xl bg-card p-6 ring-1 ring-border/60">
            <h2 className="font-display text-xl">Addresses</h2>
            {profile?.addresses?.length ? (
              <ul className="space-y-3">
                {profile.addresses.map((address) => (
                  <li
                    key={address.id}
                    className="flex items-start justify-between gap-4 rounded-xl bg-muted/50 px-4 py-3"
                  >
                    <div className="text-sm">
                      <p className="font-medium">
                        {address.label || address.address_type || 'Address'}
                        {address.is_default ? ' · Default' : ''}
                      </p>
                      <p className="text-muted-foreground">
                        {[address.line1, address.line2, address.city, address.region, address.postal_code]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Delete address"
                      onClick={() => handleDeleteAddress(address.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No addresses yet.</p>
            )}

            <form onSubmit={handleAddAddress} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="addr-line1">Line 1</Label>
                <Input
                  id="addr-line1"
                  value={line1}
                  onChange={(event) => setLine1(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="addr-line2">Line 2</Label>
                <Input
                  id="addr-line2"
                  value={line2}
                  onChange={(event) => setLine2(event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-city">City</Label>
                <Input
                  id="addr-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-region">Region</Label>
                <Input
                  id="addr-region"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-postal">Postal code</Label>
                <Input
                  id="addr-postal"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-label">Label</Label>
                <Input
                  id="addr-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  className="h-11 bg-surface px-3"
                  placeholder="Home"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="addr-default"
                  checked={isDefault}
                  onCheckedChange={(value) => setIsDefault(value === true)}
                />
                <Label htmlFor="addr-default" className="font-normal">
                  Default address
                </Label>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={addingAddress} className="h-10">
                  {addingAddress ? 'Adding…' : 'Add address'}
                </Button>
              </div>
            </form>
          </section>

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
    </AccountShell>
  )
}
