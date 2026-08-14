import { Heart, ShoppingCart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useCart } from '@/features/customer-commerce/cart-context'
import type { CatalogProduct } from '@/features/customer-commerce/types'
import { categoryName, formatMoney } from '@/features/customer-commerce/utils'
import type { GiftProduct } from '@/features/marketing/data'

type GiftCardProps = {
  product: CatalogProduct | GiftProduct
  href?: string
}

function isCatalogProduct(
  product: CatalogProduct | GiftProduct,
): product is CatalogProduct {
  return 'categoryId' in product
}

export function GiftCard({ product, href }: GiftCardProps) {
  const { addItem } = useCart()
  const to = href ?? `/customer/gifts/${product.id}`
  const category = isCatalogProduct(product)
    ? categoryName(product.categoryId)
    : null

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-[0_8px_30px_rgba(40,50,30,0.06)] ring-1 ring-border/60 transition-transform duration-300 hover:-translate-y-1">
      <Link to={to} className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
        {category ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
            {category}
          </span>
        ) : null}
        <span className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm">
          <Heart className="size-4" />
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <Link to={to} className="hover:text-primary">
            <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">{product.rating}</span>
            <span>({product.reviews})</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold">
              {formatMoney(product.price)}
            </span>
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
