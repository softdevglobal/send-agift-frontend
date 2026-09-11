/**
 * Comments this customer posted from this browser.
 *
 * The API authorises edits and deletes against the stored author but never
 * says who wrote a comment, so the client has no other way to know which ones
 * to offer controls on. Keyed by the customer id so a shared browser does not
 * hand one customer's controls to the next.
 */

const PREFIX = 'sag.reel-comments.mine.'
/** Enough to cover anything a person would realistically still want to edit. */
const MAX_TRACKED = 500

function key(customerId: string): string {
  return `${PREFIX}${customerId}`
}

export function readOwnCommentIds(customerId: string | null): Set<string> {
  if (!customerId) return new Set()
  try {
    const raw = localStorage.getItem(key(customerId))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(
      Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [],
    )
  } catch {
    return new Set()
  }
}

function write(customerId: string, ids: Set<string>): void {
  try {
    localStorage.setItem(key(customerId), JSON.stringify([...ids].slice(-MAX_TRACKED)))
  } catch {
    // Storage full or blocked: the comment still posted, it just will not
    // offer edit/delete after a reload.
  }
}

export function rememberOwnComment(customerId: string | null, commentId: string): void {
  if (!customerId) return
  const ids = readOwnCommentIds(customerId)
  ids.add(commentId)
  write(customerId, ids)
}

export function forgetOwnComment(customerId: string | null, commentId: string): void {
  if (!customerId) return
  const ids = readOwnCommentIds(customerId)
  if (ids.delete(commentId)) write(customerId, ids)
}
