import { useState } from 'react'
import { ArrowLeft, Minus, Plus, ShoppingBag, Star } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  CustomerPageHeader,
  getCatalogProduct,
  useCart,
} from '@/features/customer-commerce'
import { categoryName, formatMoney } from '@/features/customer-commerce/utils'
import { cn } from '@/lib/utils'

export function ProductDetailPage() {
  const { productId } = useParams()
  const product = productId ? getCatalogProduct(productId) : null
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  if (!product) {
    return <Navigate to="/customer" replace />
  }

  const gift = product

  function handleAdd() {
    addItem(gift.id, quantity)
    setAdded(true)
  }

  return (
    <div>
      <CustomerPageHeader
        title={product.name}
        description={`${categoryName(product.categoryId)} · ${product.sellerName}`}
        action={
          <Button asChild variant="outline" className="h-10 rounded-full px-4">
            <Link to="/customer">
              <ArrowLeft className="size-4" />
              All gifts
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/50">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-[4/3] w-full object-cover"
          />
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-[0_10px_36px_rgba(40,50,30,0.05)] ring-1 ring-border/50 sm:p-6">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">{product.rating}</span>
            <span>({product.reviews} reviews)</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <p className="font-display text-3xl tracking-tight">
              {formatMoney(product.price)}
            </p>
            {product.compareAt ? (
              <p className="text-muted-foreground line-through">
                {formatMoney(product.compareAt)}
              </p>
            ) : null}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-border bg-background">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">{quantity}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Increase quantity"
                onClick={() => setQuantity((value) => value + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <Button type="button" className="h-11 rounded-full px-5" onClick={handleAdd}>
              <ShoppingBag className="size-4" />
              Add to cart
            </Button>
          </div>

          <p
            className={cn(
              'mt-3 text-sm',
              added ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {added
              ? 'Added to your cart.'
              : 'Saved locally on this device until you check out.'}
          </p>

          {added ? (
            <Button asChild variant="outline" className="mt-4 h-10 rounded-full px-4">
              <Link to="/customer/cart">View cart</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
