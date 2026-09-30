import { CalendarDays, MapPin, Search } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import type { PlaceDetails } from '@/api/places'
import { DatePicker } from '@/components/common/date-picker'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { Button } from '@/components/ui/button'
import {
  useDeliveryIntent,
  type DeliveryIntent,
} from '@/features/customer-commerce/delivery-intent-context'
import { cn } from '@/lib/utils'

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
  className,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
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
      <div className="min-w-0 flex-1">
        <p className="text-[0.7rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
        {children}
      </div>
    </div>
  )
}

/**
 * Where the gift is going, and when it has to be there.
 *
 * Where and when are remembered rather than used to filter the shelves — they
 * are carried through browsing and fill in checkout, so a shopper is not asked
 * the same two questions again at the end.
 */
export function GiftSearchBar({
  className,
  navigateOnSubmit = true,
}: {
  className?: string
  /** Home sends the shopper to the catalog. The products page stays put. */
  navigateOnSubmit?: boolean
}) {
  const navigate = useNavigate()
  const { intent, setIntent } = useDeliveryIntent()

  const [address, setAddress] = useState(intent?.address ?? '')
  const [date, setDate] = useState(intent?.date ?? '')
  const [place, setPlace] = useState<Partial<DeliveryIntent>>({
    countryCode: intent?.countryCode,
    countryName: intent?.countryName,
    city: intent?.city,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // An address typed but never picked from the list still counts: the
    // shopper told us where it is going, we just have no country for it.
    const trimmed = address.trim()
    if (trimmed) {
      setIntent({
        address: trimmed,
        countryCode: place.countryCode,
        countryName: place.countryName,
        city: place.city,
        date: date || undefined,
      })
    } else if (date) {
      // A date on its own is still worth keeping for checkout, even the
      // first time — with no address yet, or no intent to add it to.
      setIntent({ ...intent, date })
    } else if (!date && intent) {
      // The date was cleared: drop it from what we remember, but keep the
      // address if there is one.
      setIntent(intent.address ? { ...intent, date: undefined } : null)
    }

    if (navigateOnSubmit) navigate('/products')
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      {/* A thin brand edge, enough to mark the bar out without it glowing. */}
      <div className="relative rounded-[32px] bg-gradient-to-r from-primary/45 via-fuchsia-400/35 to-amber-300/45 p-[1.5px] shadow-lg shadow-black/5">
        <div className="rounded-[30px] bg-surface/98 backdrop-blur">
          <div className="grid divide-y divide-border/70 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.85fr)_auto] lg:divide-x lg:divide-y-0">
            <Field icon={<MapPin className="size-5" />} label="Deliver to">
              {/* Its own label and helper are turned off: the segment already
                  says what it is, and the helper text pushed the row out of
                  line with the others. */}
              <AddressAutocomplete
                id="gift-search-address"
                value={address}
                onQueryChange={setAddress}
                onSelect={(found: PlaceDetails) =>
                  setPlace({
                    countryCode: found.country_code,
                    countryName: found.country_name,
                    city: found.city,
                  })
                }
                label=""
                helperText=""
                placeholder="Where is it going?"
                className="space-y-0 [&_input]:h-9 [&_input]:border-0 [&_input]:bg-transparent [&_input]:pl-7 [&_input]:text-base [&_input]:font-medium [&_input]:shadow-none [&_input]:focus-visible:ring-0 [&>div>svg]:left-0 [&>div>svg]:size-4"
              />
            </Field>

            <Field icon={<CalendarDays className="size-5" />} label="Arrive by">
              <DatePicker
                id="gift-search-date"
                value={date}
                onChange={setDate}
                presets={DATE_PRESETS}
              />
            </Field>

            <div className="p-4 lg:pr-4 lg:pl-2">
              <Button
                type="submit"
                className={cn(
                  'h-14 w-full gap-2 rounded-2xl px-8 text-base font-semibold lg:w-auto',
                  'bg-gradient-to-br from-primary to-fuchsia-500',
                  'shadow-lg shadow-primary/30 transition hover:scale-[1.03] hover:shadow-xl',
                )}
              >
                <Search className="size-5" />
                Find gifts
              </Button>
            </div>
          </div>
        </div>
      </div>

    </form>
  )
}
