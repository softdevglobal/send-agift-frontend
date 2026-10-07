import { Gift, LoaderCircle, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  searchGiftAvailability,
  type AvailabilityProduct,
  type ShopGiftAvailability,
} from '@/api/availability'
import type { Product, Shop } from '@/api/types'
import { PageNav } from '@/components/common/page-nav'
import { SiteLayout } from '@/components/common/site-layout'
import { Dot, Marker, Sparkle } from '@/components/common/storefront-decor'
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

/** Two rows of the desktop grid. */
const GIFTS_PER_PAGE = 8

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
    seller_verification_status: shop.seller_verification_status,
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
  const activeCategoryName = giftCategories.find((item) => item.id === category)?.name
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
        fromApi = true
        if (!cancelled) setCatalog(mapped)
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
  const pageCount = Math.max(1, Math.ceil(products.length / GIFTS_PER_PAGE))
  const requestedPage = Number(searchParams.get('page') || '1')
  const page =
    Number.isFinite(requestedPage) && requestedPage >= 1
      ? Math.min(Math.floor(requestedPage), pageCount)
      : 1
  const pageStart = (page - 1) * GIFTS_PER_PAGE
  const visibleProducts = products.slice(pageStart, pageStart + GIFTS_PER_PAGE)

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (!value || value === 'all') params.delete(key)
    else params.set(key, value)
    params.delete('page')
    setSearchParams(params)
  }

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams)
    if (next <= 1) params.delete('page')
    else params.set('page', String(next))
    setSearchParams(params)
  }

  return (
    <SiteLayout>
      <main className={cn(storefrontFrameClass, 'py-10 lg:py-14')}>
        <div className="relative mb-8 overflow-hidden rounded-[1.75rem] bg-accent px-6 py-10 sm:px-10 lg:px-12 lg:py-12">
          <Sparkle className="absolute top-8 right-[12%] size-8 text-brand-violet" />
          <Sparkle className="absolute right-[26%] bottom-8 hidden size-5 text-brand-teal sm:block" />
          <Dot className="absolute top-1/2 right-[6%] size-3 bg-brand-teal" />
          <p className="mb-4 w-fit rounded-md bg-brand-ink px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
            {query ? 'Search results' : 'The gift shop'}
          </p>
          <h1 className="font-poster text-[8vw] text-brand-ink sm:text-5xl lg:text-6xl dark:text-foreground">
            {activeCategoryName ? (
              <>
                <Marker tone="violet">{activeCategoryName}</Marker> gifts
              </>
            ) : (
              <>
                All <Marker tone="violet">gifts</Marker>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-ink/70 sm:text-base dark:text-muted-foreground">
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
              className="h-9 shrink-0 border-2 px-4 data-[variant=outline]:border-brand-ink/15"
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
                className="h-9 shrink-0 border-2 px-4 data-[variant=outline]:border-brand-ink/15"
                onClick={() => updateParam('category', item.id)}
              >
                {item.name}
              </Button>
            ))}
          </div>
        </div>

        <p className="mb-6 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {giftsLoading
            ? 'Checking which gifts can be delivered there…'
            : products.length === 0
              ? `0 gifts${filteredByDelivery ? ' that can be delivered there' : ''}${
                  query ? ` matching ‘${query}’` : ''
                }`
              : `${pageStart + 1}–${pageStart + visibleProducts.length} of ${products.length} gift${
                  products.length === 1 ? '' : 's'
                }${filteredByDelivery ? ' that can be delivered there' : ''}${
                  query ? ` matching ‘${query}’` : ''
                }`}
        </p>

        {giftsLoading ? (
          <div
            aria-busy="true"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-muted/60 py-20 text-sm text-muted-foreground"
          >
            <LoaderCircle className="size-7 animate-spin text-primary" />
            Finding gifts…
          </div>
        ) : products.length ? (
          <>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleProducts.map((product) => (
                <GiftCard key={product.id} product={product} />
              ))}
            </div>
            <PageNav page={page} pageCount={pageCount} onPage={goToPage} label="Gift pages" />
          </>
        ) : (
          <div className="rounded-2xl bg-muted/60 px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-violet text-white">
              {query || category !== 'all' ? (
                <Search className="size-5" />
              ) : (
                <Gift className="size-5" />
              )}
            </div>
            <p className="font-poster text-xl">
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
                className="mt-5 h-11 px-5"
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
