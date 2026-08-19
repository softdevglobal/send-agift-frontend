import { Heart, LoaderCircle, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  customerListRowClass,
} from '@/features/customer-commerce'
import { useSavedGifts } from '@/features/customer-commerce/saved-gifts-context'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'
import { getPublicSellerByShopId } from '@/lib/public-sellers'
import { useState } from 'react'

export function CustomerSavedGiftsPage() {
  const { gifts, loading, toggleSave, pendingProductId } = useSavedGifts()
  const [error, setError] = useState<string | null>(null)

  async function handleRemove(productId: string) {
    setError(null)
    try {
      await toggleSave(productId)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not remove saved gift.'))
    }
  }

  return (
    <div>
      <CustomerPageHeader
        title="Saved gifts"
        description="Tap the heart on any gift to keep it here. Tap again to remove it."
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <FormAlert error={error} />

          {gifts.length ? (
            <ul className="space-y-3">
              {gifts.map((gift) => (
                <li key={gift.id} className={customerListRowClass}>
                  <Link
                    to={`/customer/gifts/${gift.product_id}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {gift.product?.image_url ? (
                        <img
                          src={gift.product.image_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <Heart className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {gift.product?.name ?? 'Saved gift'}
                      </p>
                      {gift.product?.description ? (
                        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                          {gift.product.description}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {gift.product
                          ? [
                              formatPriceAmount(
                                gift.product.price_amount,
                                gift.product.currency,
                              ),
                              getPublicSellerByShopId(gift.product.shop_id)?.name,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : gift.product_id}
                      </p>
                    </div>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove saved gift"
                    disabled={pendingProductId === gift.product_id}
                    onClick={() => handleRemove(gift.product_id)}
                  >
                    {pendingProductId === gift.product_id ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <CustomerEmptyState
              icon={Heart}
              title="No saved gifts yet"
              description="Browse gifts and tap the heart on a product to save it here."
              action={
                <Button asChild className="h-10 rounded-full px-4">
                  <Link to="/customer">Discover gifts</Link>
                </Button>
              }
            />
          )}
        </div>
      )}
    </div>
  )
}
