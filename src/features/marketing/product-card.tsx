import { Heart, ShoppingCart, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { GiftProduct } from '@/features/marketing/data'

type ProductCardProps = {
  product: GiftProduct
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-[0_8px_30px_rgba(40,50,30,0.06)] ring-1 ring-border/60 transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
        <button
          type="button"
          className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm transition-colors hover:text-primary"
          aria-label={`Save ${product.name}`}
        >
          <Heart className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">{product.rating}</span>
            <span>({product.reviews})</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold">${product.price.toFixed(2)}</span>
            {product.compareAt ? (
              <span className="text-sm text-muted-foreground line-through">
                ${product.compareAt.toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>

        <Button className="mt-auto h-10 w-full gap-2">
          <ShoppingCart className="size-4" />
          Add to Cart
        </Button>
      </div>
    </article>
  )
}
