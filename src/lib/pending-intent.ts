/**
 * A guest's "Add to cart" that is waiting for them to sign in. Kept in
 * sessionStorage so it survives the trip through sign-in, sign-up or a
 * social sign-in in the same tab. The cart adds it once, right after
 * sign-in, and clears it first so it can never be added twice.
 */
export type PendingCartAdd = {
  productId: string
  quantity: number
  name: string
  image?: string
  /** The page the guest was on, to come back to after signing up. */
  returnTo: string
  at: number
}

const KEY = 'sag.pendingCartAdd'
/** An add older than this is forgotten rather than surprising someone later. */
const MAX_AGE_MS = 30 * 60 * 1000

export function savePendingCartAdd(add: Omit<PendingCartAdd, 'at'>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...add, at: Date.now() }))
  } catch {
    // Storage can be blocked; the guest just adds it again after sign-in.
  }
}

export function readPendingCartAdd(): PendingCartAdd | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const add = JSON.parse(raw) as PendingCartAdd
    if (!add?.productId || typeof add.at !== 'number' || Date.now() - add.at > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY)
      return null
    }
    return add
  } catch {
    return null
  }
}

export function clearPendingCartAdd() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
