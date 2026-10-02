import { Gift, LoaderCircle, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  searchGiftAvailability,
  type AvailabilityProduct,
  type ShopGiftAvailability,
} from '@/api/availability'
import type { Product, Shop } from '@/api/types'
import { SiteLayout } from '@/components/common/site-layout'
import { storefrontFrameClass } from '@/components/common/site-styles'
import { Button } from '@/components/ui/button'
import { GiftCard } from '@/features/customer-commerce'
import {
  DeliveryIntentBar,
  GiftSearchBar,
  useDeliveryIntent,
} from '@/features/customer-commerce'
import {
  catalogProductFromApi,
  registerCatalogProducts,
} from '@/features/customer-commerce/catalog'
import type { CatalogProduct } from '@/features/customer-commerce/types'
import { giftCategories } from '@/features/marketing/data'
import { loadMarketplaceIntoCatalog } from '@/lib/marketplace'
import { cn } from '@/lib/utils'
import {
  listPublishedCatalog,
  subscribePublishedCatalog,
} from '@/lib/published-catalog'

function matchesFilters(
  product: CatalogProduct,
  { query, category }: { query: string; category: string },
) {
  const normalizedQuery = query.trim().toLowerCase()
  const normalizedCategory = category.trim().toLowerCase()
  const matchesCategory =
    !normalizedCategory ||
    normalizedCategory === 'all' ||
    product.categoryId === normalizedCategory
  if (!matchesCategory) return false
  if (!normalizedQuery) return true

  return [
    product.name,
    product.description ?? '',
    product.sellerName ?? '',
    product.shopName ?? '',
    product.categoryId,
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
}

function productFromSearch(shop: ShopGiftAvailability, gift: AvailabilityProduct): CatalogProduct {
  const product: Product = {
    id: gift.id,
    shop_id: gift.shop_id,
    name: gift.name,
    slug: gift.slug,
    description: gift.description,
    product_type: 'gift',
    price_amount: gift.price_amount,
    currency: gift.currency,
    status: 'published',
    occasion_tags: gift.occasion_tags ?? [],
    customer_type_visibility: 'both',
    points_display_enabled: false,
    prep_minutes: 0,
    created_at: '',
    updated_at: '',
    image_url: gift.image_url,
    stock_left: gift.stock_left,
  }
  const shopCard: Shop = {
    id: shop.shop_id,
    seller_id: shop.shop_id,
    // The availability search does not return the shop's country, and the
    // card only reads the name.
    country_id: '',
    name: shop.shop_name,
    slug: '',
    status: 'active',
    created_at: '',
    updated_at: '',
  }
  return catalogProductFromApi(product, shopCard)
}

function localCatalog(): CatalogProduct[] {
  const mapped = listPublishedCatalog().map((product) => catalogProductFromApi(product))
  registerCatalogProducts(mapped)
  return mapped
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { intent } = useDeliveryIntent()
  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? 'all'
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [buttonFinding, setButtonFinding] = useState(false)
  const [searchGeneration, setSearchGeneration] = useState(0)
  const [availabilityError, setAvailabilityError] = useState(false)
  const giftsLoading = buttonFinding || checkingAvailability

  const destinationLat = intent?.latitude
  const destinationLng = intent?.longitude
  const arrivalDate = intent?.date
  const hasDestination =
    typeof destinationLat === 'number' && typeof destinationLng === 'number'

  useEffect(() => {
    // A searched address owns the shelf. The zone search loads only its gifts.
    if (hasDestination) return
    let cancelled = false
    let fromApi = false

    async function loadFromApi() {
      try {
        const mapped = await loadMarketplaceIntoCatalog()
        if (!cancelled && mapped.length) {
          fromApi = true
          setCatalog(mapped)
        }
      } catch {
        // Public shops endpoint is optional while the backend is down.
      }
    }

    function loadLocal() {
      if (fromApi || cancelled) return
      setCatalog(localCatalog())
    }

    void loadFromApi().then(() => {
      if (!fromApi) loadLocal()
    })
    const unsubCatalog = subscribePublishedCatalog(loadLocal)
    return () => {
      cancelled = true
      unsubCatalog()
    }
  }, [hasDestination])

  useEffect(() => {
    if (
      typeof destinationLat !== 'number' ||
      typeof destinationLng !== 'number'
    ) {
      setAvailabilityError(false)
      setCheckingAvailability(false)
      return
    }
    const latitude = destinationLat
    const longitude = destinationLng
    let cancelled = false
    setCheckingAvailability(true)
    setAvailabilityError(false)
    searchGiftAvailability({
      latitude,
      longitude,
      deliveryDate: arrivalDate,
    })
      .then((result) => {
        if (cancelled) return
        const matched = result.shops.flatMap((shop) =>
          (shop.products ?? []).map((gift) => productFromSearch(shop, gift)),
        )
        registerCatalogProducts(matched)
        setCatalog(matched)
      })
      .catch(() => {
        if (cancelled) return
        setCatalog([])
        setAvailabilityError(true)
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false)
      })
    return () => {
      cancelled = true
    }
  }, [hasDestination, destinationLat, destinationLng, arrivalDate, searchGeneration])

  const products = useMemo(
    () => catalog.filter((product) => matchesFilters(product, { query, category })),
    [catalog, category, query],
  )
  const filteredByDelivery = hasDestination

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (!value || value === 'all') params.delete(key)
    else params.set(key, value)
    setSearchParams(params)
  }

  return (
    <SiteLayout>
      <main className={cn(storefrontFrameClass, 'py-10 lg:py-14')}>
        <div className="mb-8 space-y-3">
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">All gifts</h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every published gift from our sellers. Filter by occasion or search by name,
            seller, or tag.
          </p>
        </div>

        {/* The same bar as the home page, so where and when can be changed
            without going back for them. */}
        <GiftSearchBar
          className="mb-6"
          navigateOnSubmit={false}
          finding={checkingAvailability}
          onFindingChange={(finding, willRefresh) => {
            setButtonFinding(finding)
            if (!finding && willRefresh) {
              setCheckingAvailability(true)
              setSearchGeneration((generation) => generation + 1)
            }
          }}
        />

        {/* What was asked for, still in hand. */}
        <DeliveryIntentBar className="mb-6" />

        <div className="mb-6 space-y-4">

          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              type="button"
              size="sm"
              variant={category === 'all' ? 'default' : 'outline'}
              className="h-9 shrink-0 rounded-full px-3.5"
              onClick={() => updateParam('category', 'all')}
            >
              All gifts
            </Button>
            {giftCategories.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={category === item.id ? 'default' : 'outline'}
                className="h-9 shrink-0 rounded-full px-3.5"
                onClick={() => updateParam('category', item.id)}
              >
                {item.name}
              </Button>
            ))}
          </div>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          {giftsLoading
            ? 'Checking which gifts can be delivered there…'
            : `${products.length} gift${products.length === 1 ? '' : 's'}${
                filteredByDelivery ? ' that can be delivered there' : ''
              }${query ? ` matching ‘${query}’` : ''}`}
        </p>

        {giftsLoading ? (
          <div
            aria-busy="true"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-card py-20 text-sm text-muted-foreground shadow-[0_8px_30px_rgba(40,50,30,0.06)] ring-1 ring-border/60"
          >
            <LoaderCircle className="size-7 animate-spin text-primary" />
            Finding gifts…
          </div>
        ) : products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <GiftCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-card px-6 py-16 text-center shadow-[0_8px_30px_rgba(40,50,30,0.06)] ring-1 ring-border/60">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
              {query || category !== 'all' ? (
                <Search className="size-5" />
              ) : (
                <Gift className="size-5" />
              )}
            </div>
            <p className="font-medium">
              {filteredByDelivery
                ? availabilityError
                  ? 'Delivery zones could not be checked'
                  : 'No gifts can be delivered there'
                : query || category !== 'all'
                  ? 'No gifts match that search'
                  : 'No gifts published yet'}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {filteredByDelivery
                ? availabilityError
                  ? 'Refresh the page and search the address again.'
                  : 'That address is outside every shop delivery zone, or the arrival day is too soon. Try another place or a later day.'
                : query || category !== 'all'
                  ? 'Try a different name, occasion, or clear the filters to see everything.'
                  : 'Sellers publish gifts from the seller portal. Published gifts show up here.'}
            </p>
            {query || category !== 'all' ? (
              <Button
                type="button"
                className="mt-5 h-10 rounded-full px-4"
                onClick={() => setSearchParams({})}
              >
                Show all gifts
              </Button>
            ) : null}
          </div>
        )}
      </main>
    </SiteLayout>
  )
}
