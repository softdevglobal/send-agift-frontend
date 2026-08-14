import { Gift, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  GiftCard,
  filterCatalog,
} from '@/features/customer-commerce'
import { giftCategories } from '@/features/marketing/data'
import { cn } from '@/lib/utils'

export function CustomerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? 'all'
  const products = filterCatalog({ query, category })

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
        description="Browse the full catalog, filter by category, and send something they’ll remember."
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
          icon={query ? Search : Gift}
          title={query ? 'No gifts match that search' : 'No gifts in this category'}
          description={
            query
              ? 'Try a different name, occasion, or clear the filters to see the full catalog.'
              : 'Choose another category or view all gifts to keep browsing.'
          }
          action={
            <Button type="button" className="h-10 rounded-full px-4" onClick={clearFilters}>
              Show all gifts
            </Button>
          }
        />
      )}
    </div>
  )
}
