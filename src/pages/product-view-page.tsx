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
} from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { SiteLayout } from '@/components/common/site-layout'
import { storefrontFrameClass } from '@/components/common/site-styles'
import { Button } from '@/components/ui/button'
import {
  GiftCard,
  SaveGiftButton,
  ShopIdentity,
  catalogProductFromApi,
  getCatalogProduct,
  listCatalogProductsForSeller,
  registerCatalogProducts,
  useCart,
} from '@/features/customer-commerce'
import { categoryName, formatMoney } from '@/features/customer-commerce/utils'
import { useAuth } from '@/features/auth/auth-context'
import { getSellerReviewStats } from '@/lib/seller-reviews'
import { formatPriceAmount } from '@/lib/money'
import { loadMarketplaceIntoCatalog } from '@/lib/marketplace'
import {
  getPublishedCatalogProduct,
  sellerFromCatalog,
  subscribePublishedCatalog,
} from '@/lib/published-catalog'
import { getPublicShop, subscribePublicSellers } from '@/lib/public-sellers'
import { homePathForRole, returnToState } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function ProductViewPage() {
  const { productId } = useParams()
  const location = useLocation()
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
    let cancelled = false

    function applyLocal() {
      const stored = getPublishedCatalogProduct(productId!)
      if (stored) {
        const mapped = catalogProductFromApi(stored)
        registerCatalogProducts([mapped])
        if (!cancelled) {
          setProduct(mapped)
          setLoading(false)
        }
        return
      }
      const live = getCatalogProduct(productId!)
      if (!cancelled) {
        setProduct(live)
        setLoading(false)
      }
    }

    applyLocal()
    void loadMarketplaceIntoCatalog()
      .then(() => {
        if (!cancelled) applyLocal()
      })
      .catch(() => {
        if (!cancelled) applyLocal()
      })

    const unsubCatalog = subscribePublishedCatalog(applyLocal)
    const unsubSellers = subscribePublicSellers(applyLocal)
    return () => {
      cancelled = true
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
    'Seller'

  // Customers browse shops, not seller accounts, so the gift is attributed to
  // the shop it belongs to and links through to that shop's page.
  const shopId = product?.shopId
  const shop = useMemo(() => (shopId ? getPublicShop(shopId) : null), [shopId])
  const shopName = shop?.shop.name?.trim() || product?.shopName?.trim() || 'Shop'
  const shopLocation =
    shop?.shop.customer_visible_location?.trim() || product?.shopLocation?.trim()
  const shopHref =
    sellerId && shopId ? `/sellers/${sellerId}/shops/${shopId}` : undefined

  const sellerStats = sellerId ? getSellerReviewStats(sellerId) : null

  // "More from this shop" — sibling gifts in the same shop, not everything the
  // seller sells across all their shops.
  const moreFromShop = useMemo(() => {
    if (!sellerId || !product) return []
    return listCatalogProductsForSeller(sellerId)
      .filter((item) => item.id !== product.id)
      .filter((item) => (shopId ? item.shopId === shopId : true))
      .slice(0, 4)
  }, [product, sellerId, shopId])

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
        <main className={cn(storefrontFrameClass, 'py-20 text-center')}>
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
      <main className={cn(storefrontFrameClass, 'py-8 lg:py-12')}>
        <Button asChild variant="ghost" className="mb-6 h-9 rounded-full px-3">
          <Link to="/products">
            <ArrowLeft className="size-4" />
            All gifts
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-border/50">
            <img
              src={product.image}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
            <SaveGiftButton
              productId={product.id}
              className="absolute top-3 right-3 z-10"
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

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 ring-1 ring-border/40">
              <ShopIdentity
                shopName={shopName}
                sellerName={sellerName}
                location={shopLocation}
                href={shopHref}
                imageUrl={product.sellerImageUrl || seller?.image_url}
                rating={sellerStats?.average ?? 0}
                reviewCount={sellerStats?.count ?? 0}
                size="md"
                className="min-w-0 flex-1"
              />
              {shopHref ? (
                <Button asChild variant="outline" className="h-9 shrink-0 rounded-full px-3">
                  <Link to={shopHref}>
                    View shop
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : null}
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
                      : 'Add this gift to your cart to check out.'}
                  </p>
                  {added ? (
                    <Button
                      asChild
                      variant="outline"
                      className="mt-4 h-10 rounded-full px-4"
                    >
                      <Link to="/cart">View cart</Link>
                    </Button>
                  ) : null}
                </>
              ) : isAuthenticated && role ? (
                <div className="rounded-xl bg-muted/50 p-4 ring-1 ring-border/40">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="size-4 text-muted-foreground" />
                    Shopping needs a customer account
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    You&apos;re signed in as a {role}. Open your portal, or sign
                    out first if you want to shop with a customer account.
                  </p>
                  <Button asChild className="mt-4 h-10 rounded-full px-4">
                    <Link to={homePathForRole(role)}>Go to {role} portal</Link>
                  </Button>
                </div>
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
                      <Link
                        to="/login"
                        state={returnToState(location.pathname, location.search)}
                      >
                        Sign in
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-10 rounded-full px-4"
                    >
                      <Link to="/register">Create account</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {moreFromShop.length > 0 ? (
          <section className="mt-14">
            <div className="mb-5 flex items-end justify-between gap-3">
              <h2 className="font-display text-xl tracking-tight sm:text-2xl">
                More from {shopName}
              </h2>
              <Button asChild variant="ghost" className="h-9 rounded-full px-3">
                <Link to={shopHref ?? '/products'}>
                  {shopHref ? 'View shop' : 'All gifts'}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {moreFromShop.map((item) => (
                <GiftCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </SiteLayout>
  )
}
