import { Gift, LoaderCircle, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { Product } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  GiftCard,
} from '@/features/customer-commerce'
import {
  catalogProductFromApi,
  registerCatalogProducts,
} from '@/features/customer-commerce/catalog'
import { giftCategories } from '@/features/marketing/data'
import {
  listPublishedCatalog,
  subscribePublishedCatalog,
} from '@/lib/published-catalog'
import { cn } from '@/lib/utils'

function filterPublished(
  products: Product[],
  { query, category }: { query: string; category: string },
) {
  const normalizedQuery = query.trim().toLowerCase()
  const normalizedCategory = category.trim().toLowerCase()

  return products.filter((product) => {
    const tags = (product.occasion_tags ?? []).map((tag) => tag.toLowerCase())
    const matchesCategory =
      !normalizedCategory ||
      normalizedCategory === 'all' ||
      tags.includes(normalizedCategory)
    if (!matchesCategory) return false
    if (!normalizedQuery) return true
    const haystack = [product.name, product.description ?? '', ...tags]
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  })
}

export function CustomerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? 'all'
  const [catalog, setCatalog] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function loadCatalog() {
      const products = listPublishedCatalog()
      setCatalog(products)
      registerCatalogProducts(products.map(catalogProductFromApi))
      setLoading(false)
    }

    loadCatalog()
    return subscribePublishedCatalog(loadCatalog)
  }, [])

  const products = useMemo(
    () => filterPublished(catalog, { query, category }).map(catalogProductFromApi),
    [catalog, category, query],
  )

  function setCategory(next: string) {
    const params = new URLSearchParams(searchParams)
    if (!next || next === 'all') params.delete('category')
    else params.set('category', next)
    setSearchParams(params)
  }

  function clearFilters() {
    setSearchParams({})
  }

  return (
    <div>
      <CustomerPageHeader
        title="Discover gifts"
        description="Browse published gifts and tap the heart to save them to your wishlist."
      />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <Button
          type="button"
          size="sm"
          variant={category === 'all' ? 'default' : 'outline'}
          className="h-9 shrink-0 rounded-full px-3.5"
          onClick={() => setCategory('all')}
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
            onClick={() => setCategory(item.id)}
          >
            {item.name}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {query ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Showing {products.length} result{products.length === 1 ? '' : 's'} for
              ‘{query}’
            </p>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">
              {products.length} gift{products.length === 1 ? '' : 's'} available
            </p>
          )}

          {products.length ? (
            <div className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3')}>
              {products.map((product) => (
                <GiftCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <CustomerEmptyState
              icon={query || category !== 'all' ? Search : Gift}
              title={
                query || category !== 'all'
                  ? 'No gifts match that search'
                  : 'No published gifts yet'
              }
              description={
                query || category !== 'all'
                  ? 'Try a different name, occasion, or clear the filters to see all gifts.'
                  : 'Publish a product from the seller portal. Draft gifts stay hidden until status is published.'
              }
              action={
                query || category !== 'all' ? (
                  <Button
                    type="button"
                    className="h-10 rounded-full px-4"
                    onClick={clearFilters}
                  >
                    Show all gifts
                  </Button>
                ) : undefined
              }
            />
          )}
        </>
      )}
    </div>
  )
}
