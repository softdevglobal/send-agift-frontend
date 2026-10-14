import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { listCountries, type Country } from '@/api/countries'
import { createRecipient, type RecipientDetails } from '@/api/customers'
import { addressFieldsFromPlace, type PlaceDetails } from '@/api/places'
import { FormAlert } from '@/components/common/form-alert'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneField } from '@/features/auth/phone-field'
import { getErrorMessage } from '@/lib/api'
import { countryOptionLabel } from '@/lib/country-options'
import { selectClassName } from '@/lib/form-styles'

type Props = {
  open: boolean
  /** The customer's own country, to start the country field on. */
  defaultCountryId?: string
  onOpenChange: (open: boolean) => void
  /** Called with the new recipient once it is saved. */
  onCreated: (recipient: RecipientDetails) => void
}

type Form = {
  name: string
  email: string
  phone: string
  country_id: string
  line1: string
  line2: string
  city: string
  region: string
  postal_code: string
  latitude: number | null
  longitude: number | null
}

const emptyForm = (countryId: string): Form => ({
  name: '',
  email: '',
  phone: '',
  country_id: countryId,
  line1: '',
  line2: '',
  city: '',
  region: '',
  postal_code: '',
  latitude: null,
  longitude: null,
})

/**
 * Adds a recipient without leaving the free gift page. A free gift needs
 * the recipient's email and phone (it is limited to one per person) and a
 * delivery address with a position, so shops can be matched to it.
 */
export function AddRecipientDialog({ open, defaultCountryId = '', onOpenChange, onCreated }: Props) {
  const [countries, setCountries] = useState<Country[]>([])
  const [form, setForm] = useState<Form>(() => emptyForm(defaultCountryId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(emptyForm(defaultCountryId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || countries.length > 0) return
    let cancelled = false
    listCountries()
      .then((list) => {
        if (cancelled) return
        setCountries(list)
        setForm((current) => (current.country_id ? current : { ...current, country_id: list[0]?.id ?? '' }))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open, countries.length])

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function applyPlace(place: PlaceDetails) {
    const fields = addressFieldsFromPlace(place)
    setForm((current) => ({
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

  const countryCode = countries.find((c) => c.id === form.country_id)?.iso_code
  const located = form.latitude !== null && form.longitude !== null
  const valid =
    form.name.trim() !== '' &&
    form.email.includes('@') &&
    form.phone.trim() !== '' &&
    form.country_id !== '' &&
    form.line1.trim() !== '' &&
    form.city.trim() !== '' &&
    located

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      const created = await createRecipient({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        addresses: [
          {
            country_id: form.country_id,
            line1: form.line1.trim(),
            line2: form.line2.trim() || null,
            city: form.city.trim(),
            region: form.region.trim() || null,
            postal_code: form.postal_code.trim() || null,
            latitude: form.latitude,
            longitude: form.longitude,
            address_type: 'shipping',
            is_default: true,
          },
        ],
      })
      onCreated(created)
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save this recipient.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a recipient</DialogTitle>
          <DialogDescription>
            Who the free gift is for. We need their email and phone number, and where to deliver it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fg-recipient-name">Name</Label>
            <Input
              id="fg-recipient-name"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fg-recipient-email">Email</Label>
              <Input
                id="fg-recipient-email"
                type="email"
                value={form.email}
                onChange={(event) => set('email', event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fg-recipient-phone">Phone</Label>
              <PhoneField id="fg-recipient-phone" value={form.phone} onChange={(v) => set('phone', v)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fg-recipient-country">Country</Label>
            <select
              id="fg-recipient-country"
              value={form.country_id}
              onChange={(event) => set('country_id', event.target.value)}
              className={selectClassName}
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {countryOptionLabel(country)}
                </option>
              ))}
            </select>
          </div>

          <AddressAutocomplete
            id="fg-recipient-search"
            countryCode={countryCode}
            onSelect={applyPlace}
            helperText="Pick a result so the shop knows exactly where to deliver."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fg-recipient-line1">Address</Label>
              <Input
                id="fg-recipient-line1"
                value={form.line1}
                onChange={(event) => set('line1', event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fg-recipient-city">City</Label>
              <Input
                id="fg-recipient-city"
                value={form.city}
                onChange={(event) => set('city', event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fg-recipient-postal">Postal code</Label>
              <Input
                id="fg-recipient-postal"
                value={form.postal_code}
                onChange={(event) => set('postal_code', event.target.value)}
              />
            </div>
          </div>
          {!located && form.line1 ? (
            <p className="text-xs text-muted-foreground">
              Search for the address above and pick a result. We use it to find the shops that can
              deliver there.
            </p>
          ) : null}

          <FormAlert error={error} />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || busy}>
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Save recipient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
