import { Gift, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { SiteLayout } from '@/components/common/site-layout'
import { storefrontFrameClass } from '@/components/common/site-styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GiftCard } from '@/features/customer-commerce'
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

function localCatalog(): CatalogProduct[] {
  const mapped = listPublishedCatalog().map((product) => catalogProductFromApi(product))
  registerCatalogProducts(mapped)
  return mapped
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? 'all'
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])

  useEffect(() => {
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
  }, [])

  const products = useMemo(
    () => catalog.filter((product) => matchesFilters(product, { query, category })),
    [catalog, category, query],
  )

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

        <div className="mb-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => updateParam('q', event.target.value)}
              placeholder="Search gifts, sellers, occasions…"
              className="h-11 rounded-full bg-card pr-4 pl-9"
              aria-label="Search gifts"
            />
          </div>

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
          {products.length} gift{products.length === 1 ? '' : 's'}
          {query ? ` matching ‘${query}’` : ''}
        </p>

        {products.length ? (
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
              {query || category !== 'all'
                ? 'No gifts match that search'
                : 'No gifts published yet'}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {query || category !== 'all'
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
