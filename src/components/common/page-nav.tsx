import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const TABLE_PAGE_SIZE = 10
export const GRID_PAGE_SIZE = 8

export function pageNumbers(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1)
  const items: (number | 'gap')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)
  if (start > 2) items.push('gap')
  for (let number = start; number <= end; number += 1) items.push(number)
  if (end < pageCount - 1) items.push('gap')
  items.push(pageCount)
  return items
}

export function usePagedList<T>(items: readonly T[], pageSize: number, resetKey?: unknown) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, pageCount)

  useEffect(() => {
    setPage(1)
  }, [resetKey])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const start = (safePage - 1) * pageSize
  return {
    page: safePage,
    pageCount,
    setPage,
    visible: items.slice(start, start + pageSize),
  }
}

export function PageNav({
  page,
  pageCount,
  onPage,
  label = 'Pages',
  scroll = true,
  className,
}: {
  page: number
  pageCount: number
  onPage: (page: number) => void
  label?: string
  /** Full pages jump back to the top. Sections inside a page should leave this off. */
  scroll?: boolean
  className?: string
}) {
  if (pageCount <= 1) return null

  function go(next: number) {
    onPage(next)
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav
      aria-label={label}
      className={cn('mt-8 flex flex-wrap items-center justify-center gap-2', className)}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 rounded-full px-3"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        <ChevronLeft className="size-4" />
        Previous
      </Button>
      {pageNumbers(page, pageCount).map((number, index) =>
        number === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={number}
            type="button"
            size="sm"
            variant={number === page ? 'default' : 'outline'}
            className="size-9 rounded-full px-0"
            aria-label={`Page ${number}`}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => go(number)}
          >
            {number}
          </Button>
        ),
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 rounded-full px-3"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => go(page + 1)}
      >
        Next
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  )
}
