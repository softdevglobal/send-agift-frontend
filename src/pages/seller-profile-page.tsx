import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'

import { listCountries, type Country } from '@/api/countries'
import {
  addSellerAddress,
  deleteSellerAddress,
  deleteSellerMe,
  getSellerMe,
  updateSellerMe,
  type SellerAddressType,
  type SellerDetails,
} from '@/api/sellers'
import { AccountShell } from '@/components/common/account-shell'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { sellerTypes } from '@/features/auth/seller-register-options'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { selectClassName } from '@/lib/form-styles'

const sellerNav = [
  { to: '/seller/profile', label: 'Profile', end: true },
  { to: '/seller/shops', label: 'Shops' },
]

const addressTypes: SellerAddressType[] = ['pickup', 'return', 'both']

export function SellerProfilePage() {
  const { logout } = useAuth()
  const [profile, setProfile] = useState<SellerDetails | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingAddress, setAddingAddress] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [countryId, setCountryId] = useState('')
  const [sellerType, setSellerType] = useState('')
  const [legalName, setLegalName] = useState('')
  const [tradingName, setTradingName] = useState('')
  const [phone, setPhone] = useState('')

  const [line1, setLine1] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [addressType, setAddressType] = useState<SellerAddressType>('pickup')

  const load = useCallback(async () => {
    const [me, countryList] = await Promise.all([getSellerMe(), listCountries()])
    setProfile(me)
    setCountries(Array.isArray(countryList) ? countryList : [])
    setCountryId(me.country_id)
    setSellerType(me.seller_type)
    setLegalName(me.legal_name)
    setTradingName(me.trading_name ?? '')
    setPhone(me.phone ?? '')
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
      const updated = await updateSellerMe({
        country_id: countryId,
        seller_type: sellerType,
        legal_name: legalName.trim(),
        trading_name: optionalString(tradingName),
        phone: optionalString(phone),
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
      await addSellerAddress({
        country_id: countryId,
        line1: line1.trim(),
        city: city.trim(),
        address_type: addressType,
        region: optionalString(region),
        postal_code: optionalString(postalCode),
      })
      setLine1('')
      setCity('')
      setRegion('')
      setPostalCode('')
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
      await deleteSellerAddress(id)
      await load()
      setNotice('Address deleted.')
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

  return (
    <AccountShell
      eyebrow="Seller"
      title="Seller profile"
      description="Manage your legal details, pickup and return addresses, then add shops."
      nav={sellerNav}
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
            <p className="text-xs text-muted-foreground">
              Verification: {profile?.verification_status} · Status:{' '}
              {profile?.status}
            </p>

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
                <Input
                  id="seller-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
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
            <p className="text-sm text-muted-foreground">
              Address type must be pickup, return, or both.
            </p>
            {profile?.addresses?.length ? (
              <ul className="space-y-3">
                {profile.addresses.map((address) => (
                  <li
                    key={address.id}
                    className="flex items-start justify-between gap-4 rounded-xl bg-muted/50 px-4 py-3"
                  >
                    <div className="text-sm">
                      <p className="font-medium">{address.address_type}</p>
                      <p className="text-muted-foreground">
                        {[address.line1, address.city, address.region, address.postal_code]
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
              <div className="space-y-2">
                <Label htmlFor="s-addr-type">Address type</Label>
                <select
                  id="s-addr-type"
                  value={addressType}
                  onChange={(event) =>
                    setAddressType(event.target.value as SellerAddressType)
                  }
                  className={selectClassName}
                  required
                >
                  {addressTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-addr-city">City</Label>
                <Input
                  id="s-addr-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="s-addr-line1">Line 1</Label>
                <Input
                  id="s-addr-line1"
                  value={line1}
                  onChange={(event) => setLine1(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-addr-region">Region</Label>
                <Input
                  id="s-addr-region"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-addr-postal">Postal code</Label>
                <Input
                  id="s-addr-postal"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  className="h-11 bg-surface px-3"
                />
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
              Permanently delete this seller account.
            </p>
            <Button type="button" variant="destructive" onClick={handleDeleteAccount}>
              Delete seller
            </Button>
          </section>
        </div>
      )}
    </AccountShell>
  )
}
