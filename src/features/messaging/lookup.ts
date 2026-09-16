import { useEffect, useSyncExternalStore } from 'react'

import { getSellerProduct } from '@/api/products'
import { getSellerOrderItem } from '@/api/seller-orders'

/**
 * A fetch-once cache for the names a thread label needs.
 *
 * Conversations only carry ids, so an inbox of twenty threads about the same
 * three gifts would otherwise fetch each gift once per row, every poll.
 */
export type Lookup<T> = {
  get: (id: string) => T | null
  load: (id: string) => void
  subscribe: (onChange: () => void) => () => void
}

function createLookup<T>(fetcher: (id: string) => Promise<T>): Lookup<T> {
  const values = new Map<string, T | null>()
  const requested = new Set<string>()
  const listeners = new Set<() => void>()

  return {
    get: (id) => values.get(id) ?? null,
    load(id) {
      if (requested.has(id)) return
      requested.add(id)
      fetcher(id)
        .then((value) => {
          values.set(id, value)
        })
        .catch(() => {
          // A missing label falls back to generic copy; it isn't worth an error.
          values.set(id, null)
        })
        .finally(() => {
          for (const listener of listeners) listener()
        })
    },
    subscribe(onChange) {
      listeners.add(onChange)
      return () => {
        listeners.delete(onChange)
      }
    },
  }
}

export function useLookup<T>(lookup: Lookup<T>, id: string | null | undefined): T | null {
  useEffect(() => {
    if (id) lookup.load(id)
  }, [lookup, id])
  return useSyncExternalStore(lookup.subscribe, () => (id ? lookup.get(id) : null))
}

/** The seller's own products — the gift a buyer is asking about. */
export const sellerProductLookup = createLookup(getSellerProduct)

/** The seller's order items — for the order number on an order chat. */
export const sellerOrderItemLookup = createLookup(getSellerOrderItem)
