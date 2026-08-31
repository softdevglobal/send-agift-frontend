import { Link } from 'react-router-dom'

import { StarRating } from '@/features/customer-commerce/star-rating'
import { publicSellerInitials } from '@/lib/public-sellers'
import { cn } from '@/lib/utils'

type ShopIdentityProps = {
  shopName?: string
  /** Shown as the secondary line — who runs the shop. */
  sellerName?: string
  location?: string
  href?: string
  /** The seller's profile picture — their brand mark across the marketplace. */
  imageUrl?: string
  rating?: number
  reviewCount?: number
  size?: 'sm' | 'md'
  className?: string
}

/**
 * A shop's public identity: the seller's profile picture, the shop name, and
 * the seller behind it. Customers browse shops rather than seller accounts,
 * so this is what product listings link to.
 */
export function ShopIdentity({
  shopName,
  sellerName,
  location,
  href,
  imageUrl,
  rating = 0,
  reviewCount = 0,
  size = 'sm',
  className,
}: ShopIdentityProps) {
  const primary = shopName?.trim() || 'Shop'
  const seller = sellerName?.trim()
  // A one-shop seller usually names the shop after themselves — no point
  // printing "PD Gifts / by PD Gifts".
  const showSeller = Boolean(seller && seller !== primary)
  const place = location?.trim()
  const avatarClass = size === 'md' ? 'size-11 rounded-full' : 'size-6 rounded-full'

  const content = (
    <>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className={cn(avatarClass, 'shrink-0 object-cover ring-1 ring-border')}
        />
      ) : (
        <span
          className={cn(
            avatarClass,
            'flex shrink-0 items-center justify-center bg-accent font-semibold text-primary',
            size === 'md' ? 'text-sm' : 'text-[9px]',
          )}
        >
          {publicSellerInitials({ name: seller || primary })}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'truncate font-medium text-foreground',
              size === 'md' ? 'text-sm' : 'text-xs',
            )}
          >
            {primary}
          </span>
          {reviewCount > 0 ? (
            <StarRating value={rating} count={reviewCount} variant="compact" />
          ) : null}
        </span>
        {showSeller ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            by {seller}
          </span>
        ) : null}
        {place ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {place}
          </span>
        ) : null}
      </span>
    </>
  )

  if (href) {
    return (
      <Link
        to={href}
        className={cn(
          'flex items-center gap-2 rounded-lg transition-colors hover:text-primary',
          className,
        )}
      >
        {content}
      </Link>
    )
  }

  return <div className={cn('flex items-center gap-2', className)}>{content}</div>
}
