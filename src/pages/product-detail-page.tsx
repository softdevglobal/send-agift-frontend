import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle, Minus, Plus, ShoppingBag } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  CustomerPageHeader,
  GiftCard,
  catalogProductFromApi,
  getCatalogProduct,
  listCatalogProductsForSeller,
  registerCatalogProducts,
  useCart,
} from '@/features/customer-commerce'
import { SaveGiftButton } from '@/features/customer-commerce/save-gift-button'
import { SellerIdentity } from '@/features/customer-commerce/seller-identity'
import { categoryName, formatMoney } from '@/features/customer-commerce/utils'
import { formatPriceAmount } from '@/lib/money'
import {
  getPublishedCatalogProduct,
  sellerFromCatalog,
} from '@/lib/published-catalog'
import { getSellerReviewStats } from '@/lib/seller-reviews'
import { cn } from '@/lib/utils'

export function ProductDetailPage() {
  const { productId } = useParams()
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [product, setProduct] = useState(() =>
    productId ? getCatalogProduct(productId) : null,
  )
  const [loading, setLoading] = useState(!product)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!productId) return
    const stored = getPublishedCatalogProduct(productId)
    if (stored) {
      const mapped = catalogProductFromApi(stored)
      registerCatalogProducts([mapped])
      setProduct(mapped)
      setLoading(false)
      setMissing(false)
      return
    }
    const cached = getCatalogProduct(productId)
    if (cached) {
      setProduct(cached)
      setLoading(false)
      return
    }
    setMissing(true)
    setLoading(false)
  }, [productId])

  const sellerId = product?.sellerId || product?.shopId
  const seller = sellerId ? sellerFromCatalog(sellerId) : null
  const tradingName = seller?.trading_name || product?.sellerTradingName
  const legalName = seller?.legal_name || product?.sellerLegalName
  const sellerName =
    tradingName?.trim() ||
    product?.sellerName ||
    legalName?.trim() ||
    product?.shopName ||
    'Seller'
  const sellerImageUrl = seller?.image_url || product?.sellerImageUrl
  const sellerStats = sellerId ? getSellerReviewStats(sellerId) : null
  const moreFromSeller = useMemo(() => {
    if (!sellerId || !product) return []
    return listCatalogProductsForSeller(sellerId)
      .filter((item) => item.id !== product.id)
      .slice(0, 3)
  }, [product, sellerId])

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
  const description = product.description.trim()
  const category = categoryName(product.categoryId)

  function handleAdd() {
    addItem(gift.id, quantity)
    setAdded(true)
  }

  return (
    <div>
      <CustomerPageHeader
        title={product.name}
        description={category || undefined}
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
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 ring-1 ring-border/40">
            <SellerIdentity
              name={sellerName}
              tradingName={tradingName}
              legalName={legalName}
              shopName={product.shopName}
              href={sellerId ? `/customer/sellers/${sellerId}` : undefined}
              imageUrl={sellerImageUrl}
              rating={sellerStats?.average ?? 0}
              reviewCount={sellerStats?.count ?? 0}
              size="md"
              className="min-w-0 flex-1"
            />
            {sellerId ? (
              <Button asChild variant="outline" className="h-9 shrink-0 rounded-full px-3">
                <Link to={`/customer/sellers/${sellerId}`}>
                  View profile
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <p className="font-display text-3xl tracking-tight">{price}</p>
            {product.compareAt ? (
              <p className="text-muted-foreground line-through">
                {formatMoney(product.compareAt)}
              </p>
            ) : null}
          </div>

          {description ? (
            <div className="mt-5">
              <h2 className="text-sm font-medium">About this gift</h2>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {description}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No description has been added for this gift yet.
            </p>
          )}

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

      {moreFromSeller.length > 0 ? (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-display text-xl tracking-tight">More from {sellerName}</h2>
            {sellerId ? (
              <Button asChild variant="ghost" className="h-9 rounded-full px-3">
                <Link to={`/customer/sellers/${sellerId}`}>
                  View seller
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {moreFromSeller.map((item) => (
              <GiftCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
