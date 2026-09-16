import {
  Clapperboard,
  Eye,
  EyeOff,
  Film,
  Hash,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Send,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
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
import {
  ConfirmDialog,
  SellerEmptyState,
  SellerPageHeader,
  SellerSheet,
  SellerSheetFacts,
  SellerSheetRow,
  SellerSheetSection,
  sellerCardClass,
} from '@/features/seller'
import { ReelWizard } from '@/features/seller/reel-wizard'
import { getErrorMessage } from '@/lib/api'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

const statusMeta: Record<string, { label: string; className: string; dot: string }> = {
  published: {
    label: 'Published',
    className: 'bg-brand-teal/15 text-[color:var(--brand-teal)]',
    dot: 'bg-[color:var(--brand-teal)]',
  },
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground/40',
  },
  archived: {
    label: 'Archived',
    className: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground/40',
  },
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
  const [wizardOpen, setWizardOpen] = useState(false)
  const [reelToDelete, setReelToDelete] = useState<ReelDetails | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Preview and edit both hold the reel by id, not by object: publishing or
  // re-tagging rewrites the reel in `reels`, and the panels track the new value.
  const [previewReelId, setPreviewReelId] = useState<string | null>(null)
  const [editingReelId, setEditingReelId] = useState<string | null>(null)

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
    setEditingReelId(null)
    setWizardOpen(true)
    // Re-check for gifts each time, so a picker emptied by an earlier failure
    // fills in without a page reload.
    if (selectedShopId) void loadProducts(selectedShopId)
  }

  /** Opens the same wizard as "New reel", prefilled with this reel. */
  function openEditWizard(reel: ReelDetails) {
    setEditingReelId(reel.id)
    setWizardOpen(true)
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

  /**
   * Swaps the updated reel into the list in place.
   *
   * Both edits below used to `refresh()`, which dropped the whole grid to a
   * spinner — and now that a preview panel can be open over that grid, a
   * refetch would blank the page behind it for one field's worth of change.
   */
  function replaceReel(updated: ReelDetails) {
    setReels((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  /** Publishing from the list is the common edit, so it gets a one-click path. */
  async function handleToggleStatus(reel: ReelDetails) {
    setBusy(true)
    try {
      replaceReel(
        await updateSellerReel(reel.id, {
          status: reel.status === 'published' ? 'draft' : 'published',
        }),
      )
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
      replaceReel(
        await updateSellerReel(reel.id, { product_id: nextProductId || null }),
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Could not tag the product'))
    } finally {
      setBusy(false)
    }
  }

  const previewReel = useMemo(
    () => reels.find((reel) => reel.id === previewReelId) ?? null,
    [reels, previewReelId],
  )

  const editingReel = useMemo(
    () => reels.find((reel) => reel.id === editingReelId) ?? null,
    [reels, editingReelId],
  )

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
          icon={Clapperboard}
          tone="violet"
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
        icon={Clapperboard}
        tone="violet"
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
          open={wizardOpen}
          onOpenChange={(next) => {
            setWizardOpen(next)
            if (!next) setEditingReelId(null)
          }}
          shopName={selectedShop?.name ?? 'Your shop'}
          products={products}
          mode={editingReel ? 'edit' : 'create'}
          initialReel={editingReel}
          onSubmit={async (body) => {
            if (editingReel) {
              replaceReel(await updateSellerReel(editingReel.id, body))
              return
            }
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
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {reels.map((reel) => (
              <ReelRow
                key={reel.id}
                reel={reel}
                products={products}
                busy={busy}
                editing={editingReelId === reel.id}
                onPreview={() => setPreviewReelId(reel.id)}
                onEdit={() => openEditWizard(reel)}
                onToggleStatus={() => void handleToggleStatus(reel)}
                onDelete={() => setReelToDelete(reel)}
                onRetag={(next) => void handleRetag(reel, next)}
              />
            ))}
          </ul>
        )}
      </div>

      <ReelPreviewPanel
        reel={previewReel}
        busy={busy}
        onClose={() => setPreviewReelId(null)}
        onEdit={(reel) => {
          setPreviewReelId(null)
          openEditWizard(reel)
        }}
        onToggleStatus={(reel) => void handleToggleStatus(reel)}
        onDelete={(reel) => {
          setPreviewReelId(null)
          setReelToDelete(reel)
        }}
      />

      <ConfirmDialog
        open={reelToDelete !== null}
        onOpenChange={(open) => !open && setReelToDelete(null)}
        title="Delete this reel?"
        description="This can’t be undone. The reel’s video and photos are removed too."
        confirmLabel="Delete reel"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}

/** The reel as the feed plays it, plus its stats and the gift it points at. */
function ReelPreviewPanel({
  reel,
  busy,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  reel: ReelDetails | null
  busy: boolean
  onClose: () => void
  onEdit: (reel: ReelDetails) => void
  onToggleStatus: (reel: ReelDetails) => void
  onDelete: (reel: ReelDetails) => void
}) {
  const meta = reel ? (statusMeta[reel.status] ?? statusMeta.draft) : statusMeta.draft
  const poster = reel?.thumbnail?.cdn_url ?? reel?.media?.[0]?.cdn_url ?? null
  const source = reel?.media?.[0]?.cdn_url ?? null

  return (
    <SellerSheet
      open={reel !== null}
      onOpenChange={(open) => !open && onClose()}
      eyebrow="Reel"
      title={reel?.caption?.trim() || 'Untitled reel'}
      badge={
        reel ? (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold',
              meta.className,
            )}
          >
            {meta.label}
          </span>
        ) : null
      }
      media={
        reel ? (
          <div className="relative aspect-[9/16] max-h-[26rem] w-full bg-brand-navy">
            {reel.reel_type === 'video' && source ? (
              <video
                src={source}
                poster={poster ?? undefined}
                className="size-full object-contain"
                controls
                playsInline
              />
            ) : poster ? (
              <img src={poster} alt="" className="size-full object-contain" />
            ) : (
              <div className="grid size-full place-items-center text-white/50">
                <Film className="size-10" />
              </div>
            )}
          </div>
        ) : null
      }
      footer={
        reel ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="h-10 flex-1 rounded-full"
                disabled={busy}
                onClick={() => onEdit(reel)}
              >
                <Pencil className="size-4" />
                Edit reel
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 text-destructive"
                aria-label="Delete reel"
                disabled={busy}
                onClick={() => onDelete(reel)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-full"
              disabled={busy}
              onClick={() => onToggleStatus(reel)}
            >
              {reel.status === 'published' ? 'Unpublish' : 'Publish reel'}
            </Button>
          </div>
        ) : null
      }
    >
      {reel ? (
        <>
          {reel.caption ? (
            <SellerSheetSection title="Caption">
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {reel.caption}
              </p>
            </SellerSheetSection>
          ) : null}

          <SellerSheetSection icon={Package} title="Tagged gift">
            {reel.product ? (
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface/60 p-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {reel.product.image_url ? (
                    <img
                      src={reel.product.image_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Package className="size-4" />
                    </div>
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {reel.product.name}
                </p>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                No gift tagged — this reel promotes the shop only. Tag a gift on the
                card to let customers send it straight from the feed.
              </p>
            )}
          </SellerSheetSection>

          <SellerSheetSection icon={Eye} title="Performance">
            <SellerSheetFacts>
              <SellerSheetRow label="Views">{reel.view_count}</SellerSheetRow>
              <SellerSheetRow label="Type">
                {reel.reel_type === 'video' ? 'Video' : 'Photo'}
              </SellerSheetRow>
              <SellerSheetRow label="Visibility">
                {reel.visibility === 'public' ? 'Public' : 'Private'}
              </SellerSheetRow>
            </SellerSheetFacts>
          </SellerSheetSection>

          {reel.hashtags?.length ? (
            <SellerSheetSection icon={Hash} title="Hashtags">
              <div className="flex flex-wrap gap-1.5">
                {reel.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
                  >
                    #{tag.replace(/^#/, '')}
                  </span>
                ))}
              </div>
            </SellerSheetSection>
          ) : null}
        </>
      ) : null}
    </SellerSheet>
  )
}

function ReelRow({
  reel,
  products,
  busy,
  editing,
  onPreview,
  onEdit,
  onToggleStatus,
  onDelete,
  onRetag,
}: {
  reel: ReelDetails
  products: Product[]
  busy: boolean
  editing: boolean
  onPreview: () => void
  onEdit: () => void
  onToggleStatus: () => void
  onDelete: () => void
  onRetag: (productId: string) => void
}) {
  const meta = statusMeta[reel.status] ?? statusMeta.draft
  const poster = reel.thumbnail?.cdn_url ?? reel.media?.[0]?.cdn_url ?? null
  const isVideo = reel.reel_type === 'video'

  return (
    <li
      className={cn(
        sellerCardClass,
        'group relative flex flex-col overflow-hidden rounded-xl',
        editing && 'ring-2 ring-primary/40',
      )}
    >
      {/* The clip opens the preview; publish + delete float over it on hover. */}
      <button
        type="button"
        onClick={onPreview}
        aria-label="Preview reel"
        className="relative aspect-[9/16] max-h-64 w-full bg-brand-navy focus-visible:outline-none"
      >
        {poster && !isVideo ? (
          <img src={poster} alt="" className="size-full object-cover" loading="lazy" />
        ) : poster && isVideo ? (
          <video
            src={reel.media?.[0]?.cdn_url ?? undefined}
            poster={poster}
            className="size-full object-cover"
            muted
            playsInline
          />
        ) : (
          <div className="grid size-full place-items-center text-white/40">
            <Film className="size-7" />
          </div>
        )}

        {/* Caption over a scrim, so the body below can stay to one tight line. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-2 pt-6 text-left text-[11px] leading-snug font-medium text-white">
          <span className="line-clamp-2">{reel.caption?.trim() || 'No caption'}</span>
        </span>

        <span
          className={cn(
            'absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm',
            meta.className,
          )}
        >
          <span className={cn('size-1.5 rounded-full', meta.dot)} />
          {meta.label}
        </span>
        {reel.view_count > 0 ? (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Eye className="size-3" />
            {reel.view_count}
          </span>
        ) : null}
      </button>

      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background disabled:opacity-50"
          disabled={busy}
          onClick={onToggleStatus}
          aria-label={reel.status === 'published' ? 'Unpublish reel' : 'Publish reel'}
          title={reel.status === 'published' ? 'Unpublish' : 'Publish'}
        >
          {reel.status === 'published' ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Send className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background disabled:opacity-50"
          disabled={busy}
          onClick={onEdit}
          aria-label="Edit reel"
          title="Edit"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm backdrop-blur-sm transition-colors hover:bg-background disabled:opacity-50"
          disabled={busy}
          onClick={onDelete}
          aria-label="Delete reel"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Tagging the gift is the point of the page, so it keeps an inline row. */}
      <div className="p-2">
        <select
          id={`tag-${reel.id}`}
          aria-label="Tagged gift"
          value={reel.product?.id ?? ''}
          disabled={busy}
          onChange={(event) => onRetag(event.target.value)}
          className={cn(selectClassName, 'h-8 text-[11px]')}
        >
          <option value="">No gift — shop promo</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>
    </li>
  )
}
