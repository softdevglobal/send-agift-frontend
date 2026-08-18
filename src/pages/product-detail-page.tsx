import { useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle, Minus, Plus, ShoppingBag, Star } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  CustomerPageHeader,
  catalogProductFromApi,
  getCatalogProduct,
  registerCatalogProducts,
  useCart,
} from '@/features/customer-commerce'
import { SaveGiftButton } from '@/features/customer-commerce/save-gift-button'
import { categoryName, formatMoney } from '@/features/customer-commerce/utils'
import { formatPriceAmount } from '@/lib/money'
import { getPublishedCatalogProduct } from '@/lib/published-catalog'
import { cn } from '@/lib/utils'

export function ProductDetailPage() {
  const { productId } = useParams()
  const cached = productId ? getCatalogProduct(productId) : null
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [product, setProduct] = useState(cached)
  const [loading, setLoading] = useState(!cached)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!productId || cached) return
    const stored = getPublishedCatalogProduct(productId)
    if (stored) {
      const mapped = catalogProductFromApi(stored)
      registerCatalogProducts([mapped])
      setProduct(mapped)
      setLoading(false)
      return
    }
    setMissing(true)
    setLoading(false)
  }, [cached, productId])

  if (missing) {
    return <Navigate to="/customer" replace />
  }

  if (loading || !product) {
    return (
      <div className="flex justify-center py-16">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const gift = product
  const price =
    gift.priceAmount != null && gift.currency
      ? formatPriceAmount(gift.priceAmount, gift.currency)
      : formatMoney(gift.price)

  function handleAdd() {
    addItem(gift.id, quantity)
    setAdded(true)
  }

  return (
    <div>
      <CustomerPageHeader
        title={product.name}
        description={
          product.sellerName
            ? `${categoryName(product.categoryId)} · ${product.sellerName}`
            : categoryName(product.categoryId) || product.description
        }
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
        <div className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-border/50">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-[4/3] w-full object-cover"
          />
          <SaveGiftButton
            productId={product.id}
            className="absolute top-3 right-3 z-10"
          />
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-[0_10px_36px_rgba(40,50,30,0.05)] ring-1 ring-border/50 sm:p-6">
          {product.reviews > 0 ? (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{product.rating}</span>
              <span>({product.reviews} reviews)</span>
            </div>
          ) : null}

          <div className="mt-4 flex items-baseline gap-3">
            <p className="font-display text-3xl tracking-tight">{price}</p>
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
