import { ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useCart } from '@/features/customer-commerce/cart-context'
import { SaveGiftButton } from '@/features/customer-commerce/save-gift-button'
import { SellerIdentity } from '@/features/customer-commerce/seller-identity'
import type { CatalogProduct } from '@/features/customer-commerce/types'
import { categoryName, formatMoney } from '@/features/customer-commerce/utils'
import type { GiftProduct } from '@/features/marketing/data'
import { formatPriceAmount } from '@/lib/money'
import { getSellerReviewStats } from '@/lib/seller-reviews'

type GiftCardProps = {
  product: CatalogProduct | GiftProduct
  href?: string
}

function isCatalogProduct(
  product: CatalogProduct | GiftProduct,
): product is CatalogProduct {
  return 'categoryId' in product
}

function priceLabel(product: CatalogProduct | GiftProduct) {
  if (isCatalogProduct(product) && product.priceAmount != null && product.currency) {
    return formatPriceAmount(product.priceAmount, product.currency)
  }
  return formatMoney(product.price)
}

export function GiftCard({ product, href }: GiftCardProps) {
  const { addItem } = useCart()
  const to = href ?? `/customer/gifts/${product.id}`
  const category = isCatalogProduct(product)
    ? categoryName(product.categoryId)
    : null
  const description = isCatalogProduct(product) ? product.description.trim() : ''
  const sellerName = isCatalogProduct(product)
    ? product.sellerTradingName?.trim() ||
      product.sellerName.trim() ||
      product.sellerLegalName?.trim() ||
      product.shopName?.trim() ||
      'Seller'
    : ''
  const sellerLegalName = isCatalogProduct(product)
    ? product.sellerLegalName?.trim()
    : undefined
  const sellerTradingName = isCatalogProduct(product)
    ? product.sellerTradingName?.trim()
    : undefined
  const sellerId = isCatalogProduct(product)
    ? product.sellerId || product.shopId
    : undefined
  const sellerImageUrl = isCatalogProduct(product) ? product.sellerImageUrl : undefined
  const sellerStats = sellerId ? getSellerReviewStats(sellerId) : null

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-[0_8px_30px_rgba(40,50,30,0.06)] ring-1 ring-border/60 transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Link to={to} className="block size-full">
          <img
            src={product.image}
            alt={product.name}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        </Link>
        {category ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
            {category}
          </span>
        ) : null}
        <SaveGiftButton productId={product.id} className="absolute top-3 right-3 z-10" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {sellerName ? (
          <SellerIdentity
            name={sellerName}
            tradingName={sellerTradingName}
            legalName={sellerLegalName}
            href={sellerId ? `/customer/sellers/${sellerId}` : undefined}
            imageUrl={sellerImageUrl}
            rating={sellerStats?.average ?? 0}
            reviewCount={sellerStats?.count ?? 0}
          />
        ) : null}

        <div className="space-y-1.5">
          <Link to={to} className="hover:text-primary">
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{product.name}</h3>
          </Link>
          {description ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-base font-semibold">{priceLabel(product)}</span>
            {product.compareAt ? (
              <span className="text-sm text-muted-foreground line-through">
                {formatMoney(product.compareAt)}
              </span>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          className="mt-auto h-10 w-full gap-2"
          onClick={() => addItem(product.id)}
        >
          <ShoppingCart className="size-4" />
          Add to cart
        </Button>
      </div>
    </article>
  )
}
