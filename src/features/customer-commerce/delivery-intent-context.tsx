import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const INTENT_KEY = 'sag.delivery-intent'

/** Where a gift is going and when it should arrive. */
export type DeliveryIntent = {
  /** What to show the shopper, e.g. "12 Galle Road, Colombo". */
  address: string
  /** Street parts from the place lookup. Needed to ask which shops can deliver. */
  line1?: string
  line2?: string
  region?: string
  postalCode?: string
  latitude?: number
  longitude?: number
  /** ISO-3166-1 alpha-2, when the place lookup gave one. */
  countryCode?: string
  countryName?: string
  city?: string
  /** `yyyy-mm-dd`, the day it should arrive. */
  date?: string
}

type DeliveryIntentValue = {
  intent: DeliveryIntent | null
  setIntent: (intent: DeliveryIntent | null) => void
  clearIntent: () => void
}

const DeliveryIntentContext = createContext<DeliveryIntentValue | null>(null)

function isIntent(value: unknown): value is DeliveryIntent {
  if (!value || typeof value !== 'object') return false
  const intent = value as DeliveryIntent
  return typeof intent.address === 'string' && intent.address.length > 0
}

function readIntent(): DeliveryIntent | null {
  try {
    const raw = window.localStorage.getItem(INTENT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isIntent(parsed) ? parsed : null
  } catch {
    // Private windows and cleared site data both throw here; a shopper
    // without a remembered address is the normal starting state anyway.
    return null
  }
}

/**
 * Remembers where the shopper is sending a gift and when it has to arrive.
 *
 * It is set once at the top of the home page and then carried: shown while
 * browsing so the choice is not forgotten, and used to fill in checkout so
 * the same two questions are not asked twice.
 *
 * When the place was picked from the list, the gifts page uses the coordinates
 * and the date to ask which shops can deliver, and hides the rest.
 */
export function DeliveryIntentProvider({ children }: { children: ReactNode }) {
  const [intent, setIntentState] = useState<DeliveryIntent | null>(readIntent)

  useEffect(() => {
    try {
      if (intent) {
        window.localStorage.setItem(INTENT_KEY, JSON.stringify(intent))
      } else {
        window.localStorage.removeItem(INTENT_KEY)
      }
    } catch {
      // Storage being unavailable only costs the shopper the convenience of
      // it still being there next visit.
    }
  }, [intent])

  const setIntent = useCallback((next: DeliveryIntent | null) => {
    setIntentState(next)
  }, [])

  const clearIntent = useCallback(() => setIntentState(null), [])

  const value = useMemo(
    () => ({ intent, setIntent, clearIntent }),
    [intent, setIntent, clearIntent],
  )

  return (
    <DeliveryIntentContext.Provider value={value}>
      {children}
    </DeliveryIntentContext.Provider>
  )
}

export function useDeliveryIntent() {
  const value = useContext(DeliveryIntentContext)
  if (!value) {
    throw new Error('useDeliveryIntent must be used inside DeliveryIntentProvider')
  }
  return value
}

/** "Colombo, Sri Lanka · arrives 5 Oct" — the one-line summary. */
export function describeIntent(intent: DeliveryIntent): string {
  const where = intent.city
    ? [intent.city, intent.countryName].filter(Boolean).join(', ')
    : intent.address
  if (!intent.date) return where
  const on = new Date(`${intent.date}T00:00:00`)
  if (Number.isNaN(on.getTime())) return where
  const when = on.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
  return `${where} · arrives ${when}`
}
