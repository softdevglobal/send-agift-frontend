import { ShoppingCart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useCart } from '@/features/customer-commerce'
import { SaveGiftButton } from '@/features/customer-commerce/save-gift-button'
import type { GiftProduct } from '@/features/marketing/data'
import { formatMoney } from '@/features/customer-commerce/utils'

type ProductCardProps = {
  product: GiftProduct
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const { isAuthenticated, role } = useAuth()
  // /customer/gifts is customer-only; guests get the public product page.
  const isCustomer = isAuthenticated && role === 'customer'
  const to = isCustomer ? `/customer/gifts/${product.id}` : `/products/${product.id}`

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
        <SaveGiftButton productId={product.id} className="absolute top-3 right-3 z-10" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <Link to={to} className="hover:text-primary">
            <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
          </Link>
          {product.reviews ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{product.rating}</span>
              <span>({product.reviews})</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No reviews yet</p>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold">{formatMoney(product.price)}</span>
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
          Add to Cart
        </Button>
      </div>
    </article>
  )
}
