import { Clapperboard, Eye, Film, LoaderCircle, Package, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { listShopProducts, type Product } from '@/api/products'
import {
  createShopReel,
  deleteSellerReel,
  listShopReels,
  updateSellerReel,
} from '@/api/reels'
import { getSellerMe, type Shop } from '@/api/sellers'
import type { ReelDetails } from '@/api/types'
import { SellerEmptyState } from '@/features/seller/seller-empty-state'
import { ReelWizard } from '@/features/seller/reel-wizard'
import { SellerPageHeader } from '@/features/seller/seller-page-header'
import { sellerPanelClass } from '@/features/seller/seller-styles'
import { getErrorMessage } from '@/lib/api'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

const statusMeta: Record<string, { label: string; className: string }> = {
  published: {
    label: 'Published',
    className: 'bg-brand-teal/15 text-[color:var(--brand-teal)]',
  },
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground' },
}

/**
 * Reels in the seller dashboard: post a clip, tag the product it shows, and
 * publish it to the customer feed.
 *
 * The product tag is the point of the page — a reel with a product tagged is
 * what lets a customer watch it and then send it as a gift.
 */
export function SellerReelsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [shops, setShops] = useState<Shop[]>([])
  const [reels, setReels] = useState<ReelDetails[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [reelToDelete, setReelToDelete] = useState<ReelDetails | null>(null)
  const [deleting, setDeleting] = useState(false)

  const selectedShopId = searchParams.get('shop') ?? shops[0]?.id ?? ''

  useEffect(() => {
    getSellerMe()
      .then((me) => setShops(me.shops ?? []))
      .catch((err) => setError(getErrorMessage(err, 'Could not load your shops')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!shops.length) return
    const requested = searchParams.get('shop')
    if (requested && shops.some((shop) => shop.id === requested)) return
    const next = new URLSearchParams(searchParams)
    next.set('shop', shops[0].id)
    setSearchParams(next, { replace: true })
  }, [shops, searchParams, setSearchParams])

  /**
   * The two lists are fetched independently on purpose.
   *
   * They were one `Promise.all` and that was wrong: a failing reel list threw
   * away the products too, which left the tag dropdown empty with no hint why
   * — the picker is the whole point of the page, so it has to survive the
   * other request failing.
   */
  const loadProducts = useCallback(async (shopId: string) => {
    try {
      setProducts((await listShopProducts(shopId)) ?? [])
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load this shop’s gifts'))
    }
  }, [])

  const refresh = useCallback(
    async (shopId: string) => {
      if (!shopId) return
      setLoading(true)
      setError(null)

      const products = loadProducts(shopId)
      try {
        setReels((await listShopReels(shopId)) ?? [])
      } catch (err) {
        setError(getErrorMessage(err, 'Could not load reels'))
      }
      await products
      setLoading(false)
    },
    [loadProducts],
  )

  useEffect(() => {
    if (selectedShopId) void refresh(selectedShopId)
  }, [selectedShopId, refresh])

  function openWizard() {
    setShowForm(true)
    // Re-check for gifts each time, so a picker emptied by an earlier failure
    // fills in without a page reload.
    if (selectedShopId) void loadProducts(selectedShopId)
  }

  async function confirmDelete() {
    const reel = reelToDelete
    if (!reel) return
    setDeleting(true)
    setError(null)
    try {
      await deleteSellerReel(reel.id)
      // Drop it from the list right away instead of refetching the whole grid.
      setReels((prev) => prev.filter((item) => item.id !== reel.id))
      setReelToDelete(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete the reel'))
    } finally {
      setDeleting(false)
    }
  }

  /** Publishing from the list is the common edit, so it gets a one-click path. */
  async function handleToggleStatus(reel: ReelDetails) {
    setBusy(true)
    try {
      await updateSellerReel(reel.id, {
        status: reel.status === 'published' ? 'draft' : 'published',
      })
      await refresh(selectedShopId)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update the reel'))
    } finally {
      setBusy(false)
    }
  }

  /** Re-tags a reel without reposting its media (omitting `media` keeps the files). */
  async function handleRetag(reel: ReelDetails, nextProductId: string) {
    setBusy(true)
    try {
      await updateSellerReel(reel.id, { product_id: nextProductId || null })
      await refresh(selectedShopId)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not tag the product'))
    } finally {
      setBusy(false)
    }
  }

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedShopId) ?? null,
    [shops, selectedShopId],
  )

  const publishedCount = useMemo(
    () => reels.filter((reel) => reel.status === 'published').length,
    [reels],
  )

  if (!loading && shops.length === 0) {
    return (
      <div>
        <SellerPageHeader
          title="Reels"
          description="Create a shop first, then post clips of your gifts."
        />
        <SellerEmptyState
          icon={Clapperboard}
          title="No shops yet"
          description="Reels belong to a shop. Create a shop, then come back to post one."
          action={
            <Button asChild className="h-10 rounded-full px-4">
              <Link to="/seller/shops">Create a shop</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <SellerPageHeader
        title="Reels"
        description="Post short clips of your gifts. Tag a product so customers can send it straight from the feed."
        action={
          <Button
            type="button"
            className="h-10 rounded-full px-4"
            onClick={openWizard}
          >
            <Plus className="size-4" />
            New reel
          </Button>
        }
      />

      <div className="space-y-6">
        <FormAlert error={error} />

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1 space-y-2 sm:max-w-xs">
            <Label htmlFor="reel-shop">Shop</Label>
            <select
              id="reel-shop"
              value={selectedShopId}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                next.set('shop', event.target.value)
                setSearchParams(next)
              }}
              className={selectClassName}
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
          {reels.length ? (
            <p className="pb-3 text-sm text-muted-foreground">
              {reels.length} {reels.length === 1 ? 'reel' : 'reels'} · {publishedCount}{' '}
              published
            </p>
          ) : null}
        </div>

        <ReelWizard
          open={showForm}
          onOpenChange={setShowForm}
          shopName={selectedShop?.name ?? 'Your shop'}
          products={products}
          onSubmit={async (body) => {
            await createShopReel(selectedShopId, body)
            await refresh(selectedShopId)
          }}
        />

        {loading ? (
          <div className="flex justify-center py-24">
            <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : reels.length === 0 ? (
          <SellerEmptyState
            icon={Clapperboard}
            title="No reels yet"
            description="Post a clip of a gift being made, packed or opened. Tag the gift and customers can send it straight from the feed."
            action={
              <Button
                type="button"
                className="h-10 rounded-full px-4"
                onClick={openWizard}
              >
                <Plus className="size-4" />
                New reel
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {reels.map((reel) => (
              <ReelRow
                key={reel.id}
                reel={reel}
                products={products}
                busy={busy}
                onToggleStatus={() => void handleToggleStatus(reel)}
                onDelete={() => setReelToDelete(reel)}
                onRetag={(next) => void handleRetag(reel, next)}
              />
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={reelToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setReelToDelete(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this reel?</DialogTitle>
            <DialogDescription>
              This can’t be undone. The reel’s video and photos are removed too.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-4"
              disabled={deleting}
              onClick={() => setReelToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 rounded-full px-4"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete reel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReelRow({
  reel,
  products,
  busy,
  onToggleStatus,
  onDelete,
  onRetag,
}: {
  reel: ReelDetails
  products: Product[]
  busy: boolean
  onToggleStatus: () => void
  onDelete: () => void
  onRetag: (productId: string) => void
}) {
  const meta = statusMeta[reel.status] ?? statusMeta.draft
  const poster = reel.thumbnail?.cdn_url ?? reel.media?.[0]?.cdn_url ?? null
  const isVideo = reel.reel_type === 'video'

  return (
    <li className={cn(sellerPanelClass, 'flex flex-col overflow-hidden')}>
      <div className="relative aspect-[9/16] max-h-72 bg-brand-navy">
        {poster && !isVideo ? (
          <img src={poster} alt="" className="size-full object-cover" loading="lazy" />
        ) : poster && isVideo ? (
          <video src={reel.media?.[0]?.cdn_url ?? undefined} poster={poster} className="size-full object-cover" muted playsInline />
        ) : (
          <div className="grid size-full place-items-center text-white/50">
            <Film className="size-8" />
          </div>
        )}
        <span
          className={cn(
            'absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            meta.className,
          )}
        >
          {meta.label}
        </span>
        {reel.view_count > 0 ? (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-semibold text-white">
            <Eye className="size-3" />
            {reel.view_count}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {reel.caption ? (
          <p className="line-clamp-2 text-sm text-foreground">{reel.caption}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No caption</p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={`tag-${reel.id}`} className="text-xs text-muted-foreground">
            <Package className="size-3.5" />
            Tagged gift
          </Label>
          <select
            id={`tag-${reel.id}`}
            value={reel.product?.id ?? ''}
            disabled={busy}
            onChange={(event) => onRetag(event.target.value)}
            className={cn(selectClassName, 'h-9 text-xs')}
          >
            <option value="">No gift — shop promo only</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="h-9 flex-1 text-xs"
            disabled={busy}
            onClick={onToggleStatus}
          >
            {reel.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-destructive"
            disabled={busy}
            onClick={onDelete}
            aria-label="Delete reel"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  )
}
