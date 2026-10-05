import { CalendarDays, LoaderCircle, MapPin, Search, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  autocompletePlaces,
  getPlaceDetails,
  newPlacesSessionToken,
  type PlaceDetails,
} from '@/api/places'
import { DatePicker } from '@/components/common/date-picker'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { Button } from '@/components/ui/button'
import {
  useDeliveryIntent,
  type DeliveryIntent,
} from '@/features/customer-commerce/delivery-intent-context'
import { cn } from '@/lib/utils'

/** How long Find gifts keeps its spinner up, even when the check is instant. */
const FINDING_MS = 1000

/** One tap for the days people actually ask for. */
const DATE_PRESETS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
]

/** One segment of the bar: an icon, what it asks, and the field itself. */
function Field({
  icon,
  label,
  children,
  action,
  className,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
  /** Shown beside the field, for example a control that clears it. */
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'group flex min-w-0 items-center gap-4 px-5 py-5 transition-colors',
        'hover:bg-accent/40 focus-within:bg-accent/40',
        className,
      )}
    >
      <span
        className={cn(
          'grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-md',
          'bg-gradient-to-br from-primary to-fuchsia-500 shadow-primary/25',
          'transition-transform group-hover:scale-105 group-focus-within:scale-105',
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {label}
          </p>
          {children}
        </div>
        {action}
      </div>
    </div>
  )
}

/**
 * Where the gift is going, and when it has to be there.
 *
 * Where and when are remembered rather than used to filter the shelves. They
 * are carried through browsing and fill in checkout, so a shopper is not asked
 * the same two questions again at the end.
 */
export function GiftSearchBar({
  className,
  navigateOnSubmit = true,
  finding = false,
  onFindingChange,
}: {
  className?: string
  /** Home sends the shopper to the catalog. The products page stays put. */
  navigateOnSubmit?: boolean
  /** The gifts page is still applying the zone check. */
  finding?: boolean
  /**
   * Fires when Find gifts starts and when the wait ends.
   * `willRefresh` is true when a picked address should reload the gift list.
   */
  onFindingChange?: (finding: boolean, willRefresh?: boolean) => void
}) {
  const navigate = useNavigate()
  const { intent, setIntent } = useDeliveryIntent()

  const [address, setAddress] = useState(intent?.address ?? '')
  const [date, setDate] = useState(intent?.date ?? '')
  const [submitting, setSubmitting] = useState(false)
  const busy = finding || submitting
  const [place, setPlace] = useState<Partial<DeliveryIntent>>({
    line1: intent?.line1,
    line2: intent?.line2,
    countryCode: intent?.countryCode,
    countryName: intent?.countryName,
    city: intent?.city,
    region: intent?.region,
    postalCode: intent?.postalCode,
    latitude: intent?.latitude,
    longitude: intent?.longitude,
  })

  function rememberAddress(trimmed: string, picked: Partial<DeliveryIntent> = place) {
    setIntent({
      address: trimmed,
      line1: picked.line1 || trimmed,
      line2: picked.line2,
      countryCode: picked.countryCode,
      countryName: picked.countryName,
      city: picked.city,
      region: picked.region,
      postalCode: picked.postalCode,
      latitude: picked.latitude,
      longitude: picked.longitude,
      date: date || undefined,
    })
  }

  /** Turns a typed address into coordinates when no suggestion was picked. */
  async function resolveTypedAddress(trimmed: string): Promise<{
    shown: string
    picked: Partial<DeliveryIntent>
  } | null> {
    try {
      const session = newPlacesSessionToken()
      const suggestions = await autocompletePlaces(trimmed, { sessionToken: session })
      const first = suggestions[0]
      if (!first) return null
      const found = await getPlaceDetails(first.place_id, { sessionToken: session })
      const shown = found.formatted_address || found.line1 || trimmed
      return {
        shown,
        picked: {
          line1: found.line1,
          line2: found.line2,
          countryCode: found.country_code,
          countryName: found.country_name,
          city: found.city,
          region: found.region,
          postalCode: found.postal_code,
          latitude: found.latitude,
          longitude: found.longitude,
        },
      }
    } catch {
      return null
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setSubmitting(true)
    onFindingChange?.(true)
    let willRefresh = false
    try {
      await new Promise((resolve) => window.setTimeout(resolve, FINDING_MS))

      // The gift list waits for this button. A suggestion only fills the
      // field; coordinates are stored here, which is what reloads the shelf.
      const trimmed = address.trim()
      let shown = trimmed
      let picked = place
      const hasPoint =
        typeof picked.latitude === 'number' && typeof picked.longitude === 'number'
      if (trimmed && !hasPoint) {
        const resolved = await resolveTypedAddress(trimmed)
        if (resolved) {
          shown = resolved.shown
          picked = resolved.picked
          setAddress(shown)
          setPlace(picked)
        }
      }
      if (trimmed) {
        rememberAddress(shown, picked)
        willRefresh =
          typeof picked.latitude === 'number' && typeof picked.longitude === 'number'
      } else if (date) {
        // A date on its own is still worth keeping for checkout, even the
        // first time. With no address yet, or no intent to add it to.
        setIntent({ ...intent, date })
      } else if (!date && intent) {
        // The date was cleared: drop it from what we remember, but keep the
        // address if there is one.
        setIntent(intent.address ? { ...intent, date: undefined } : null)
      }

      if (navigateOnSubmit) navigate('/products')
    } finally {
      setSubmitting(false)
      onFindingChange?.(false, willRefresh)
    }
  }

  function clearAddress() {
    setAddress('')
    setPlace({})
    setIntent(date ? { date } : null)
  }

  function clearDate() {
    setDate('')
    const trimmed = address.trim()
    if (!trimmed) {
      setIntent(null)
      return
    }
    setIntent({
      address: trimmed,
      line1: place.line1 || trimmed,
      line2: place.line2,
      countryCode: place.countryCode,
      countryName: place.countryName,
      city: place.city,
      region: place.region,
      postalCode: place.postalCode,
      latitude: place.latitude,
      longitude: place.longitude,
    })
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      {/* A thin brand edge, enough to mark the bar out without it glowing. */}
      <div className="relative rounded-[32px] bg-gradient-to-r from-primary/45 via-fuchsia-400/35 to-amber-300/45 p-[1.5px] shadow-lg shadow-black/5">
        <div className="rounded-[30px] bg-surface/98 backdrop-blur">
          <div className="grid divide-y divide-border/70 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.85fr)_auto] lg:divide-x lg:divide-y-0">
            <Field
              icon={<MapPin className="size-5" />}
              label="Deliver to"
              action={
                address.trim() ? (
                  <button
                    type="button"
                    onClick={clearAddress}
                    aria-label="Clear delivery address"
                    className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                ) : null
              }
            >
              {/* Its own label and helper are turned off: the segment already
                  says what it is, and the helper text pushed the row out of
                  line with the others. */}
              <AddressAutocomplete
                id="gift-search-address"
                value={address}
                onQueryChange={(value) => {
                  setAddress(value)
                  // Editing after a pick drops the old point, so Find gifts
                  // looks up the text that is actually in the field.
                  setPlace((current) =>
                    current.latitude == null && current.longitude == null
                      ? current
                      : { ...current, latitude: undefined, longitude: undefined },
                  )
                }}
                onSelect={(found: PlaceDetails) => {
                  const shown = found.formatted_address || found.line1
                  setAddress(shown)
                  // Held until Find gifts. Writing it into the delivery intent
                  // now would reload the gift list before the button is pressed.
                  setPlace({
                    line1: found.line1,
                    line2: found.line2,
                    countryCode: found.country_code,
                    countryName: found.country_name,
                    city: found.city,
                    region: found.region,
                    postalCode: found.postal_code,
                    latitude: found.latitude,
                    longitude: found.longitude,
                  })
                }}
                label=""
                helperText=""
                placeholder="Where is it going?"
                className="space-y-0 [&_input]:h-9 [&_input]:border-0 [&_input]:bg-transparent [&_input]:pl-7 [&_input]:text-base [&_input]:font-medium [&_input]:shadow-none [&_input]:focus-visible:ring-0 [&>div>svg]:left-0 [&>div>svg]:size-4"
              />
            </Field>

            <Field
              icon={<CalendarDays className="size-5" />}
              label="Arrive by"
              action={
                date ? (
                  <button
                    type="button"
                    onClick={clearDate}
                    aria-label="Clear arrival date"
                    className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                ) : null
              }
            >
              <DatePicker
                id="gift-search-date"
                value={date}
                onChange={(next) => {
                  if (!next) {
                    clearDate()
                    return
                  }
                  setDate(next)
                }}
                presets={DATE_PRESETS}
                clearLabel="Clear"
              />
            </Field>

            <div className="p-4 lg:pr-4 lg:pl-2">
              <Button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                className={cn(
                  'h-14 w-full gap-2 rounded-2xl px-8 text-base font-semibold lg:w-auto',
                  'bg-gradient-to-br from-primary to-fuchsia-500',
                  'shadow-lg shadow-primary/30 transition hover:scale-[1.03] hover:shadow-xl',
                  'disabled:hover:scale-100',
                )}
              >
                {busy ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <Search className="size-5" />
                )}
                {busy ? 'Finding…' : 'Find gifts'}
              </Button>
            </div>
          </div>
        </div>
      </div>

    </form>
  )
}
