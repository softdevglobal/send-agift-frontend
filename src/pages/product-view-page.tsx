import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  LoaderCircle,
  Minus,
  PackageX,
  Plus,
  ShoppingBag,
  Store,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { SiteLayout } from '@/components/common/site-layout'
import { Button } from '@/components/ui/button'
import {
  catalogProductFromApi,
  getCatalogProduct,
  listCatalogProductsForSeller,
  registerCatalogProducts,
  useCart,
} from '@/features/customer-commerce'
import { categoryName, formatMoney } from '@/features/customer-commerce/utils'
import { ProductCard } from '@/features/marketing/product-card'
import { useAuth } from '@/features/auth/auth-context'
import { formatPriceAmount } from '@/lib/money'
import {
  getPublishedCatalogProduct,
  sellerFromCatalog,
  subscribePublishedCatalog,
} from '@/lib/published-catalog'
import { subscribePublicSellers } from '@/lib/public-sellers'
import { cn } from '@/lib/utils'

export function ProductViewPage() {
  const { productId } = useParams()
  const { addItem } = useCart()
  const { isAuthenticated, role } = useAuth()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [product, setProduct] = useState(() =>
    productId ? getCatalogProduct(productId) : null,
  )
  const [loading, setLoading] = useState(!product)

  useEffect(() => {
    if (!productId) return

    function resolve() {
      const stored = getPublishedCatalogProduct(productId!)
      if (stored) {
        const mapped = catalogProductFromApi(stored)
        registerCatalogProducts([mapped])
        setProduct(mapped)
        setLoading(false)
        return
      }
      setProduct(getCatalogProduct(productId!) ?? null)
      setLoading(false)
    }

    resolve()
    const unsubCatalog = subscribePublishedCatalog(resolve)
    const unsubSellers = subscribePublicSellers(resolve)
    return () => {
      unsubCatalog()
      unsubSellers()
    }
  }, [productId])

  const seller = useMemo(() => {
    if (!product) return null
    const id = product.sellerId || product.shopId
    return id ? sellerFromCatalog(id) : null
  }, [product])

  const sellerId = product?.sellerId || product?.shopId || seller?.id
  const sellerName =
    seller?.trading_name?.trim() ||
    product?.sellerTradingName?.trim() ||
    seller?.name ||
    product?.sellerName ||
    seller?.legal_name?.trim() ||
    product?.sellerLegalName?.trim() ||
    product?.shopName ||
    'Seller'

  const moreFromSeller = useMemo(() => {
    if (!sellerId || !product) return []
    return listCatalogProductsForSeller(sellerId)
      .filter((item) => item.id !== product.id)
      .slice(0, 4)
  }, [product, sellerId])

  if (loading) {
    return (
      <SiteLayout>
        <main className="flex justify-center py-24">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </main>
      </SiteLayout>
    )
  }

  if (!product) {
    return (
      <SiteLayout>
        <main className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <PackageX className="size-5" />
          </div>
          <h1 className="font-display text-2xl tracking-tight">Gift not available</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            This gift may have been unpublished or removed by the seller.
          </p>
          <Button asChild className="mt-6 h-10 rounded-full px-5">
            <Link to="/products">Browse all gifts</Link>
          </Button>
        </main>
      </SiteLayout>
    )
  }

  const gift = product
  const price =
    gift.priceAmount != null && gift.currency
      ? formatPriceAmount(gift.priceAmount, gift.currency)
      : formatMoney(gift.price)
  const description = product.description.trim()
  const category = categoryName(product.categoryId)
  const isCustomer = isAuthenticated && role === 'customer'

  function handleAdd() {
    addItem(gift.id, quantity)
    setAdded(true)
  }

  return (
    <SiteLayout>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Button asChild variant="ghost" className="mb-6 h-9 rounded-full px-3">
          <Link to="/products">
            <ArrowLeft className="size-4" />
            All gifts
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/50">
            <img
              src={product.image}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          </div>

          <div>
            {category ? (
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                {category}
              </p>
            ) : null}
            <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-4 flex items-baseline gap-3">
              <p className="font-display text-3xl tracking-tight">{price}</p>
              {product.compareAt ? (
                <p className="text-muted-foreground line-through">
                  {formatMoney(product.compareAt)}
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl bg-muted/50 p-3 ring-1 ring-border/40">
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-primary">
                {product.sellerImageUrl || seller?.image_url ? (
                  <img
                    src={product.sellerImageUrl || seller?.image_url}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <Store className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Sold by</p>
                <p className="truncate font-medium">{sellerName}</p>
              </div>
            </div>

            {description ? (
              <div className="mt-6">
                <h2 className="text-sm font-medium">About this gift</h2>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {description}
                </p>
              </div>
            ) : null}

            <div className="mt-7 border-t border-border/60 pt-6">
              {isCustomer ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
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
                      <span className="w-8 text-center text-sm font-medium">
                        {quantity}
                      </span>
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
                    <Button
                      type="button"
                      className="h-11 rounded-full px-5"
                      onClick={handleAdd}
                    >
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
                    <Button
                      asChild
                      variant="outline"
                      className="mt-4 h-10 rounded-full px-4"
                    >
                      <Link to="/customer/cart">View cart</Link>
                    </Button>
                  ) : null}
                </>
              ) : (
                <div className="rounded-xl bg-muted/50 p-4 ring-1 ring-border/40">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="size-4 text-muted-foreground" />
                    Sign in to order this gift
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Create a customer account to add gifts to your cart, save
                    favourites, and track deliveries.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild className="h-10 rounded-full px-4">
                      <Link to="/login">Sign in</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-10 rounded-full px-4"
                    >
                      <Link to="/customer/register">Create account</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {moreFromSeller.length > 0 ? (
          <section className="mt-14">
            <div className="mb-5 flex items-end justify-between gap-3">
              <h2 className="font-display text-xl tracking-tight sm:text-2xl">
                More from {sellerName}
              </h2>
              <Button asChild variant="ghost" className="h-9 rounded-full px-3">
                <Link to="/products">
                  All gifts
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {moreFromSeller.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </SiteLayout>
  )
}
