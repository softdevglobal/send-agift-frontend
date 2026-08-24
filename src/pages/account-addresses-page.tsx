import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, MapPin, Trash2 } from 'lucide-react'

import { listCountries, type Country } from '@/api/countries'
import {
  addCustomerAddress,
  deleteCustomerAddress,
  getCustomerMe,
  type CustomerDetails,
} from '@/api/customers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomerEmptyState, CustomerPageHeader } from '@/features/customer-commerce'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { selectClassName } from '@/lib/form-styles'

export function AccountAddressesPage() {
  const [profile, setProfile] = useState<CustomerDetails | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [countryId, setCountryId] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [label, setLabel] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  const load = useCallback(async () => {
    const [me, countryList] = await Promise.all([getCustomerMe(), listCountries()])
    setProfile(me)
    setCountries(Array.isArray(countryList) ? countryList : [])
    setCountryId((current) => current || me.country_id)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load your addresses.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setAdding(true)
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
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    setNotice(null)
    setDeletingId(id)
    try {
      await deleteCustomerAddress(id)
      await load()
      setNotice('Address deleted.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete address.'))
    } finally {
      setDeletingId(null)
    }
  }

  const addresses = profile?.addresses ?? []

  return (
    <div>
      <CustomerPageHeader
        title="Addresses"
        description="Delivery addresses saved on your account. Your default is used first at checkout."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <FormAlert error={error} notice={notice} />

          {addresses.length ? (
            <ul className="space-y-3">
              {addresses.map((address) => (
                <li
                  key={address.id}
                  className="flex items-start justify-between gap-4 rounded-xl bg-card px-4 py-3 ring-1 ring-border/60"
                >
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      {address.label || address.address_type || 'Address'}
                      {address.is_default ? ' · Default' : ''}
                    </p>
                    <p className="text-muted-foreground">
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete address"
                    disabled={deletingId === address.id}
                    onClick={() => handleDelete(address.id)}
                  >
                    {deletingId === address.id ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <CustomerEmptyState
              icon={MapPin}
              title="No addresses yet"
              description="Add a delivery address so checkout can fill it in for you."
            />
          )}

          <section className="space-y-4 rounded-2xl bg-card p-6 ring-1 ring-border/60">
            <h2 className="font-display text-xl">Add an address</h2>
            <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="addr-country">Country</Label>
                {countries.length > 0 ? (
                  <select
                    id="addr-country"
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
                    id="addr-country"
                    value={countryId}
                    onChange={(event) => setCountryId(event.target.value)}
                    className="h-11 bg-surface px-3 font-mono text-sm"
                    required
                  />
                )}
              </div>
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
                  Make this my default address
                </Label>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={adding} className="h-10">
                  {adding ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Adding…
                    </>
                  ) : (
                    'Add address'
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
