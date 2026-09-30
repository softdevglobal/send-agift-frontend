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
  /**
   * What to show the shopper, e.g. "12 Galle Road, Colombo". Left out when
   * only a date was given — a date alone is still worth remembering.
   */
  address?: string
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
  const hasAddress = typeof intent.address === 'string' && intent.address.length > 0
  const hasDate = typeof intent.date === 'string' && intent.date.length > 0
  // Either one alone is still worth keeping; there is nothing to keep when
  // both are missing.
  return hasAddress || hasDate
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
 * It does not decide which gifts are shown. Nothing in the public catalogue
 * says which gifts can reach which address, so filtering the shelves on it
 * would be a promise the data cannot keep.
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
  if (!intent.date) return where ?? ''
  const on = new Date(`${intent.date}T00:00:00`)
  if (Number.isNaN(on.getTime())) return where ?? ''
  const when = on.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
  // No address was given yet — the date is all there is to show.
  if (!where) return `Arrives ${when}`
  return `${where} · arrives ${when}`
}
