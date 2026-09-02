import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, MapPin, Store } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  GiftCard,
  customerPanelClass,
  listCatalogProductsForSeller,
} from '@/features/customer-commerce'
import { publicSellerInitials, subscribePublicSellers, type PublicSeller, type PublicShop } from '@/lib/public-sellers'
import type { CatalogProduct } from '@/features/customer-commerce/types'
import { sellerFromCatalog, subscribePublishedCatalog } from '@/lib/published-catalog'
import { loadMarketplaceIntoCatalog } from '@/lib/marketplace'
import { cn } from '@/lib/utils'

function shopFromCatalog(
  seller: PublicSeller,
  shopId: string,
  products: CatalogProduct[],
): { shop: PublicShop; products: CatalogProduct[] } | null {
  const shopProducts = products.filter((product) => (product.shopId || 'other') === shopId)
  const listed = seller.shops.find((shop) => shop.id === shopId)

  if (listed) {
    if (listed.status === 'inactive' && shopProducts.length === 0) return null
    return { shop: listed, products: shopProducts }
  }

  if (!shopProducts.length) return null
  const first = shopProducts[0]
  return {
    shop: {
      id: shopId,
      name: first?.shopName || 'Shop',
      slug: '',
      description: first?.shopDescription,
      customer_visible_location: first?.shopLocation,
    },
    products: shopProducts,
  }
}

export function CustomerSellerShopPage() {
  const { sellerId, shopId } = useParams()
  const [seller, setSeller] = useState<PublicSeller | null>(() =>
    sellerId ? sellerFromCatalog(sellerId) : null,
  )

  useEffect(() => {
    if (!sellerId) return
    const id = sellerId
    let cancelled = false

    function refresh() {
      if (!cancelled) setSeller(sellerFromCatalog(id))
    }

    refresh()
    void loadMarketplaceIntoCatalog()
      .then(refresh)
      .catch(() => {
        refresh()
      })
    const unsubSellers = subscribePublicSellers(refresh)
    const unsubCatalog = subscribePublishedCatalog(refresh)
    return () => {
      cancelled = true
      unsubSellers()
      unsubCatalog()
    }
  }, [sellerId])

  const products = useMemo(
    () => (seller ? listCatalogProductsForSeller(seller.id) : []),
    [seller],
  )
  const section = useMemo(
    () => (seller && shopId ? shopFromCatalog(seller, shopId, products) : null),
    [seller, shopId, products],
  )

  if (!sellerId) {
    return <Navigate to="/products" replace />
  }

  const sellerHref = `/sellers/${sellerId}`
  const sellerName = seller?.trading_name?.trim() || seller?.name || 'Seller'

  if (!seller) {
    return (
      <div>
        <CustomerPageHeader
          title="Shop"
          action={
            <Button asChild variant="outline" className="h-10 rounded-full px-4">
              <Link to="/products">
                <ArrowLeft className="size-4" />
                All gifts
              </Link>
            </Button>
          }
        />
        <CustomerEmptyState
          icon={Store}
          title="Seller profile not found"
          description="This seller is not in the public directory yet."
          action={
            <Button asChild className="h-10 rounded-full px-4">
              <Link to="/products">Browse gifts</Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (!shopId || !section) {
    return (
      <div>
        <CustomerPageHeader
          title="Shop"
          description={sellerName}
          action={
            <Button asChild variant="outline" className="h-10 rounded-full px-4">
              <Link to={sellerHref}>
                <ArrowLeft className="size-4" />
                All shops
              </Link>
            </Button>
          }
        />
        <CustomerEmptyState
          icon={Store}
          title="Shop not found"
          description="This shop is not available for this seller."
          action={
            <Button asChild className="h-10 rounded-full px-4">
              <Link to={sellerHref}>View shops</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const { shop, products: shopProducts } = section

  return (
    <div>
      <CustomerPageHeader
        title={shop.name}
        description={`${shopProducts.length} gift${shopProducts.length === 1 ? '' : 's'}`}
        action={
          <Button asChild variant="outline" className="h-10 rounded-full px-4">
            <Link to={sellerHref}>
              <ArrowLeft className="size-4" />
              All shops
            </Link>
          </Button>
        }
      />

      {/* Facebook-style header: the shop's own image spans the top as a cover
          photo, with the seller's profile picture overlapping its lower edge. */}
      <section className={cn(customerPanelClass, 'mb-8 overflow-hidden')}>
        <div className="relative aspect-[3/1] w-full bg-muted">
          {shop.image_url ? (
            <img src={shop.image_url} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center bg-accent/40 text-muted-foreground">
              <Store className="size-10" />
            </div>
          )}

          <div className="absolute -bottom-10 left-5 sm:-bottom-12 sm:left-7">
            {seller.image_url ? (
              <img
                src={seller.image_url}
                alt=""
                className="size-20 rounded-full object-cover ring-4 ring-card sm:size-24"
              />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full bg-accent text-xl font-semibold text-primary ring-4 ring-card sm:size-24">
                {publicSellerInitials({ name: sellerName })}
              </span>
            )}
          </div>
        </div>

        {/* Padded past the avatar so the name never sits under it. */}
        <div className="px-5 pt-12 pb-5 sm:px-7 sm:pt-14">
          <h2 className="font-display text-2xl tracking-tight">{shop.name}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sold by <span className="font-medium text-foreground">{sellerName}</span>
          </p>
          {shop.customer_visible_location ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{shop.customer_visible_location}</span>
            </p>
          ) : null}
          {shop.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {shop.description}
            </p>
          ) : null}
        </div>
      </section>

      {shopProducts.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shopProducts.map((product) => (
            <GiftCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <CustomerEmptyState
          icon={Store}
          title="No gifts in this shop"
          description="When this shop publishes gifts, they will appear here."
          action={
            <Button asChild variant="outline" className="h-10 rounded-full px-4">
              <Link to={sellerHref}>Back to shops</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
