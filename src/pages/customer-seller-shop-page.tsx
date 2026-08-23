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
import type { CatalogProduct } from '@/features/customer-commerce/types'
import {
  subscribePublicSellers,
  type PublicSeller,
  type PublicShop,
} from '@/lib/public-sellers'
import { sellerFromCatalog, subscribePublishedCatalog } from '@/lib/published-catalog'
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
    function refresh() {
      setSeller(sellerFromCatalog(id))
    }
    refresh()
    const unsubSellers = subscribePublicSellers(refresh)
    const unsubCatalog = subscribePublishedCatalog(refresh)
    return () => {
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
    return <Navigate to="/customer" replace />
  }

  const sellerHref = `/customer/sellers/${sellerId}`
  const sellerName = seller?.trading_name?.trim() || seller?.name || 'Seller'

  if (!seller) {
    return (
      <div>
        <CustomerPageHeader
          title="Shop"
          action={
            <Button asChild variant="outline" className="h-10 rounded-full px-4">
              <Link to="/customer">
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
              <Link to="/customer">Browse gifts</Link>
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
        description={`${sellerName} · ${shopProducts.length} gift${shopProducts.length === 1 ? '' : 's'}`}
        action={
          <Button asChild variant="outline" className="h-10 rounded-full px-4">
            <Link to={sellerHref}>
              <ArrowLeft className="size-4" />
              All shops
            </Link>
          </Button>
        }
      />

      <section className={cn(customerPanelClass, 'mb-8 overflow-hidden')}>
        <div className="flex flex-col sm:flex-row">
          <div className="aspect-[16/9] shrink-0 overflow-hidden bg-muted sm:aspect-auto sm:h-auto sm:w-56">
            {shop.image_url ? (
              <img src={shop.image_url} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full min-h-28 items-center justify-center text-muted-foreground">
                <Store className="size-8" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 p-5">
            <h2 className="font-display text-xl tracking-tight">{shop.name}</h2>
            {shop.customer_visible_location ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{shop.customer_visible_location}</span>
              </p>
            ) : null}
            {shop.description ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {shop.description}
              </p>
            ) : null}
          </div>
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
