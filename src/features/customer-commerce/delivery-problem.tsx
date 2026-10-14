import { MapPinOff, Store, Trash2, UserRoundPen, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { SellerDeliveryQuote } from '@/api/types'
import { Button } from '@/components/ui/button'
import { describeDeliveryProblem } from '@/features/customer-commerce/delivery-problem-copy'

/**
 * One shop that cannot deliver to the chosen address: what is wrong, and the
 * buttons that fix it.
 */
export function DeliveryProblem({
  shopName,
  option,
  onChangeRecipient,
  onRemoveShopGifts,
  giftCount,
}: {
  shopName: string
  option: SellerDeliveryQuote | undefined
  /** Moves the shopper to the recipient picker. */
  onChangeRecipient?: () => void
  /** Takes this shop's gifts out of the cart. */
  onRemoveShopGifts?: () => void
  /** How many of the cart's gifts come from this shop. */
  giftCount?: number
}) {
  const copy = describeDeliveryProblem(shopName, option)
  const Icon = copy.kind === 'address' ? MapPinOff : copy.kind === 'shop' ? Store : MapPinOff

  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-200/70">
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{copy.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-950/80">{copy.body}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-12">
        {copy.kind === 'address' ? (
          <Button asChild size="sm" variant="outline" className="h-9 bg-white">
            <Link to="/account/recipients">
              <UserRoundPen className="size-3.5" />
              Edit recipient address
            </Link>
          </Button>
        ) : null}
        {onChangeRecipient && copy.kind !== 'shop' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 bg-white"
            onClick={onChangeRecipient}
          >
            <Users className="size-3.5" />
            Send to someone else
          </Button>
        ) : null}
        {onRemoveShopGifts ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 bg-white"
            onClick={onRemoveShopGifts}
          >
            <Trash2 className="size-3.5" />
            {giftCount && giftCount > 1
              ? `Remove ${giftCount} gifts from ${shopName.trim() || 'this shop'}`
              : `Remove this shop’s gift`}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
