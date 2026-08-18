import { Link } from 'react-router-dom'

import { StarRating } from '@/features/customer-commerce/star-rating'
import { publicSellerInitials } from '@/lib/public-sellers'
import { cn } from '@/lib/utils'

type SellerIdentityProps = {
  name?: string
  tradingName?: string
  legalName?: string
  href?: string
  imageUrl?: string
  rating?: number
  reviewCount?: number
  size?: 'sm' | 'md'
  className?: string
}

export function SellerIdentity({
  name,
  tradingName,
  legalName,
  href,
  imageUrl,
  rating = 0,
  reviewCount = 0,
  size = 'sm',
  className,
}: SellerIdentityProps) {
  const primary =
    tradingName?.trim() || name?.trim() || legalName?.trim() || 'Seller'
  const legal = legalName?.trim()
  const showLegal = Boolean(legal && legal !== primary)
  const avatarClass = size === 'md' ? 'size-11 rounded-full' : 'size-6 rounded-full'
  const content = (
    <>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className={cn(avatarClass, 'object-cover ring-1 ring-border')}
        />
      ) : (
        <span
          className={cn(
            avatarClass,
            'flex items-center justify-center bg-accent font-semibold text-primary',
            size === 'md' ? 'text-sm' : 'text-[9px]',
          )}
        >
          {publicSellerInitials({ name: primary })}
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
        {showLegal ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {legal}
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
