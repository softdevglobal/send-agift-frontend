import { Gift, LoaderCircle, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  GiftCard,
} from '@/features/customer-commerce'
import {
  catalogProductFromApi,
  registerCatalogProducts,
} from '@/features/customer-commerce/catalog'
import { selectClassName } from '@/lib/form-styles'
import {
  listPublishedCatalog,
  subscribePublishedCatalog,
  type PublishedProduct,
} from '@/lib/published-catalog'
import { subscribePublicSellers } from '@/lib/public-sellers'
import { cn } from '@/lib/utils'

type SortKey = 'latest' | 'price-asc' | 'price-desc'

function filterPublished(
  products: PublishedProduct[],
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
    const haystack = [
      product.name,
      product.description ?? '',
      product.seller_name ?? '',
      product.seller_legal_name ?? '',
      product.seller_trading_name ?? '',
      product.shop_name ?? '',
      ...tags,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  })
}

function sortPublished(products: PublishedProduct[], sort: SortKey) {
  const next = [...products]
  if (sort === 'price-asc') {
    return next.sort((a, b) => a.price_amount - b.price_amount)
  }
  if (sort === 'price-desc') {
    return next.sort((a, b) => b.price_amount - a.price_amount)
  }
  return next.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function CustomerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? 'all'
  const [catalog, setCatalog] = useState<PublishedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [nameQuery, setNameQuery] = useState(query)
  const [sort, setSort] = useState<SortKey>('latest')

  useEffect(() => {
    setNameQuery((current) => (current.trim() === query ? current : query))
  }, [query])

  useEffect(() => {
    function loadCatalog() {
      const products = listPublishedCatalog()
      setCatalog(products)
      registerCatalogProducts(products.map(catalogProductFromApi))
      setLoading(false)
    }

    loadCatalog()
    const unsubCatalog = subscribePublishedCatalog(loadCatalog)
    const unsubSellers = subscribePublicSellers(loadCatalog)
    return () => {
      unsubCatalog()
      unsubSellers()
    }
  }, [])

  const products = useMemo(
    () =>
      sortPublished(filterPublished(catalog, { query, category }), sort).map(
        catalogProductFromApi,
      ),
    [catalog, category, query, sort],
  )

  function applyNameSearch(nextQuery: string) {
    const params = new URLSearchParams(searchParams)
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    else params.delete('q')
    setSearchParams(params, { replace: true })
  }

  function handleNameSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    applyNameSearch(nameQuery)
  }

  function clearFilters() {
    setNameQuery('')
    setSearchParams({})
  }

  return (
    <div>
      <CustomerPageHeader
        title="Gifts"
        eyebrow={false}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleNameSearch} className="relative">
              <label className="sr-only" htmlFor="gifts-name-search">
                Search by name
              </label>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="gifts-name-search"
                value={nameQuery}
                onChange={(event) => {
                  setNameQuery(event.target.value)
                  applyNameSearch(event.target.value)
                }}
                placeholder="Search by name"
                className="h-10 w-48 rounded-full border-border/60 bg-muted/40 pr-4 pl-9 shadow-none sm:w-56"
              />
            </form>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Sort gifts"
              className={cn(selectClassName, 'h-10 w-36 rounded-full bg-muted/40 pr-9')}
            >
              <option value="latest">Latest</option>
              <option value="price-asc">Price: Low</option>
              <option value="price-desc">Price: High</option>
            </select>
          </div>
        }
      />

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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
