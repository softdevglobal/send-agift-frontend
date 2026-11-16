/**
 * Turns what the server or the browser says into something a person can act
 * on. The server's own wording is kept when it already reads well; known
 * technical messages are replaced, and field names like `country_id` are
 * never shown.
 */

const EXACT: Record<string, string> = {
  'email already registered': 'This email is already used by another account. Sign in instead, or use a different email.',
  'email_in_use': 'This email is already used by another account. Sign in instead, or use a different email.',
  'invalid request body': 'Something in the form wasn’t right. Check your details and try again.',
  unauthorized: 'Your session has ended. Please sign in again.',
  'sign in required': 'Please sign in to continue.',
  'invalid email, phone or password': 'That email, phone number or password doesn’t match our records.',
  'that password is not right': 'That password isn’t right. Try again.',
  'invalid country_id': 'Choose your country from the list.',
  'invalid country id': 'Choose your country from the list.',
  'country not found': 'We couldn’t find that country. Choose another from the list.',
  'customer registration is disabled for this country': 'Sign-ups aren’t open in this country yet.',
  'seller registration is disabled for this country': 'Seller sign-ups aren’t open in this country yet.',
  'login failed': 'We couldn’t sign you in just now. Please try again.',
  forbidden: 'You don’t have access to do that.',
  'not found': 'We couldn’t find what you were looking for.',
  'customer already exists': 'This email is already used by another account. Sign in instead, or use a different email.',
  'seller already exists': 'This email is already used by another seller account. Sign in instead, or use a different email.',
  'this phone number is already verified on another account': 'This phone number is already used by another account. Use a different number.',
  'this email is already confirmed': 'This email is already confirmed. You’re all set.',
  'customer already has a membership': 'You already have a membership. Manage it from My membership.',
  'free gift already used': 'You’ve already used your free gift.',
  'recipient already received a free gift': 'This person has already received a free gift.',
  'this order is already paid': 'This order is already paid.',
  'product review already exists for this order item': 'You’ve already reviewed this gift.',
  'product review already exists': 'You’ve already reviewed this gift.',
  'an order with this idempotency key already exists': 'This order was already placed. Check your orders.',
  'product already saved': 'This gift is already in your saved gifts.',
  'a review already exists for this order item': 'You’ve already reviewed this gift.',
  'order cannot be cancelled in its current status': 'This order can’t be cancelled any more. It may already be on its way.',
  'card payments are not available yet': 'Card payments aren’t available yet. Please try again later.',
  'game session expired, start a new game': 'This game timed out. Start a new game.',
  'shop slug already exists': 'Another shop already uses that web address. Try a different shop name.',
  'product slug already exists for this shop': 'Another gift in this shop already has that name.',
  'currency must be the shop’s country currency': 'The price must be in your shop’s currency.',
  "currency must be the shop's country currency": 'The price must be in your shop’s currency.',
}

/** "country_id" → "country", "price_minor" → "price". */
function readable(field: string): string {
  return field
    .replace(/_(id|ids|minor|amount|bps|at)$/, '')
    .replace(/_/g, ' ')
}

function sentence(text: string): string {
  const t = text.trim()
  if (!t) return t
  const first = t.charAt(0).toUpperCase() + t.slice(1)
  return /[.!?…]$/.test(first) ? first : `${first}.`
}

/** A friendly version of an error message from the API. */
export function friendlyError(message: string | undefined | null, status?: number): string {
  const raw = (message ?? '').trim()
  const key = raw.toLowerCase()

  if (EXACT[key]) return EXACT[key]
  if (/already (registered|in use|exists)/.test(key) && key.includes('email')) {
    return EXACT['email already registered']
  }
  if (key.includes('failed to fetch') || key.includes('networkerror') || key.includes('load failed')) {
    return 'We couldn’t reach SendAGift. Check your internet connection and try again.'
  }
  if (status === 429 || key.includes('too many')) {
    return 'Too many tries in a short time. Please wait a moment and try again.'
  }
  if (!raw || (status !== undefined && status >= 500 && /^(could not|internal|unexpected)/.test(key))) {
    return 'Something went wrong on our side. Please try again in a moment.'
  }

  // "invalid advertising package: name must be 1 to 80 characters" → the
  // part after the label is what the person needs.
  let text = raw.replace(/^invalid [a-z ]+?: /i, '')
  // Never show field names written as code.
  text = text.replace(/\b[a-z]+(?:_[a-z]+)+\b/g, readable)
  return sentence(text)
}
