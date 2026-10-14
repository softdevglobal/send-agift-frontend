import type { SellerDeliveryQuote } from '@/api/types'

/** Why a shop cannot deliver, in words, with what the shopper can do. */
export type DeliveryProblemCopy = {
  title: string
  body: string
  kind: 'distance' | 'address' | 'shop'
}

function km(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: value < 10 ? 1 : 0 })
}

/**
 * Turns the API's reason into a sentence a shopper understands. The codes
 * come from the backend; older answers without one fall back to the
 * distances, then to the reason text itself.
 */
export function describeDeliveryProblem(
  shopName: string,
  option: SellerDeliveryQuote | undefined,
): DeliveryProblemCopy {
  const shop = shopName.trim() || 'This shop'
  const code = option?.reason_code
  if (
    code === 'OUTSIDE_ZONE' ||
    (!code && option?.distance_km != null && option.farthest_km != null)
  ) {
    const far = option?.distance_km
    const limit = option?.farthest_km
    return {
      kind: 'distance',
      title: `${shop} doesn’t deliver this far`,
      body:
        far != null && limit != null
          ? `This address is ${km(far)} km from the shop. ${shop} delivers up to ${km(limit)} km away.`
          : `This address is outside the area ${shop} delivers to.`,
    }
  }
  if (code === 'ADDRESS_NO_LOCATION') {
    return {
      kind: 'address',
      title: 'This address isn’t on the map',
      body: 'Shops price delivery by distance, and this address has no map pin. Edit the recipient and pick their address from the search so it can be measured.',
    }
  }
  if (code === 'NO_ZONES' || code === 'SHOP_NO_LOCATION') {
    return {
      kind: 'shop',
      title: `${shop} isn’t delivering yet`,
      body: `${shop} hasn’t finished setting up delivery, so it can’t take orders right now. Message the shop, or choose a gift from another shop.`,
    }
  }
  return {
    kind: 'shop',
    title: `${shop} can’t deliver to this address`,
    body: option?.reason?.trim()
      ? `${option.reason.trim().replace(/\.$/, '')}.`
      : 'Try another recipient, or a gift from another shop.',
  }
}
