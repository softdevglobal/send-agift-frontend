import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Tag,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  createShopProduct,
  deleteSellerProduct,
  getProductInventory,
  getSellerProduct,
  listShopProducts,
  updateProductInventory,
  updateSellerProduct,
  type Product,
} from '@/api/products'
import { getSellerMe, type SellerDetails, type Shop } from '@/api/sellers'
import { type ProductStatus } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Toast } from '@/components/common/toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { ProductWizard } from '@/features/seller/product-wizard'
import {
  productToForm,
  toInventoryInput,
  toProductInput,
  type ProductFormState,
} from '@/features/seller/product-form'
import { getErrorMessage } from '@/lib/api'
import { publishSellerToMarketplace, syncShopPublishedProducts } from '@/lib/published-catalog'
import { selectClassName } from '@/lib/form-styles'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

const statusMeta: Record<
  ProductStatus,
  { label: string; tone: string; dot: string; hint: string }
> = {
  draft: {
    label: 'Draft',
    tone: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground/40',
    hint: 'Hidden from customers',
  },
  published: {
    label: 'Published',
    tone: 'bg-primary/90 text-primary-foreground',
    dot: 'bg-primary',
    hint: 'Visible in the customer catalog',
  },
  paused: {
    label: 'Paused',
    tone: 'bg-[oklch(0.96_0.04_85)] text-[oklch(0.48_0.1_80)]',
    dot: 'bg-[oklch(0.72_0.16_75)]',
    hint: 'Temporarily hidden from customers',
  },
  rejected: {
    label: 'Rejected',
    tone: 'bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
    hint: 'Not shown to customers',
  },
}

export function SellerProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sellerProfile, setSellerProfile] = useState<SellerDetails | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    message: string
    variant: 'success' | 'error'
  } | null>(null)
  /**
   * The wizard is the only editor. `create` opens it blank; `handleEdit` sets
   * `editing` to a gift's id + prefilled form and opens the same dialog. There
   * is no separate inline edit form.
   */
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editing, setEditing] = useState<{
    id: string
    form: ProductFormState
    hasInventory: boolean
  } | null>(null)
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const selectedShopId = searchParams.get('shop') ?? shops[0]?.id ?? ''

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedShopId) ?? null,
    [shops, selectedShopId],
  )

  const loadProducts = useCallback(async (shopId: string) => {
    if (!shopId) {
      setProducts([])
      return
    }
    const list = await listShopProducts(shopId)
    const next = Array.isArray(list) ? list : []
    setProducts(next)
    const shop = sellerProfile?.shops?.find((item) => item.id === shopId)
    syncShopPublishedProducts(
      shopId,
      next,
      sellerProfile ? { seller: sellerProfile, shop } : undefined,
    )
  }, [sellerProfile])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSellerMe()
      .then((me) => {
        if (cancelled) return
        publishSellerToMarketplace(me)
        setSellerProfile(me)
        setShops(me.shops ?? [])
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load products.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!shops.length) return
    let cancelled = false
    Promise.all(
      shops.map(async (shop) => {
        const list = await listShopProducts(shop.id)
        return { id: shop.id, products: Array.isArray(list) ? list : [] }
      }),
    )
      .then((results) => {
        if (cancelled) return
        for (const result of results) {
          const shop = shops.find((item) => item.id === result.id)
          syncShopPublishedProducts(
            result.id,
            result.products,
            sellerProfile ? { seller: sellerProfile, shop } : undefined,
          )
        }
      })
      .catch(() => {
        // Catalog sync is best-effort; the selected shop still loads below.
      })
    return () => {
      cancelled = true
    }
  }, [sellerProfile, shops])

  useEffect(() => {
    if (!shops.length) return
    const requested = searchParams.get('shop')
    if (requested && shops.some((shop) => shop.id === requested)) return
    const firstShop = shops[0]
    if (!firstShop) return
    setSearchParams({ shop: firstShop.id }, { replace: true })
  }, [shops, searchParams, setSearchParams])

  useEffect(() => {
    if (!selectedShopId) return
    let cancelled = false
    loadProducts(selectedShopId).catch((err) => {
      if (!cancelled) setError(getErrorMessage(err, 'Could not load products.'))
    })
    return () => {
      cancelled = true
    }
  }, [loadProducts, selectedShopId])

  function startCreate() {
    setError(null)
    setEditing(null)
    setWizardOpen(true)
  }

  function handleSelectShop(shopId: string) {
    setError(null)
    setEditing(null)
    setWizardOpen(false)
    setSearchParams(shopId ? { shop: shopId } : {})
  }

  /**
   * Loads a gift (and its inventory) into the wizard and opens it. Same dialog
   * as "Add product" — the seller lands on step one with every field filled.
   */
  async function handleEdit(id: string) {
    setError(null)
    try {
      const details = await getSellerProduct(id)
      let inventory = details.inventory
      if (!inventory) {
        try {
          inventory = await getProductInventory(id)
        } catch {
          inventory = undefined
        }
      }
      setEditing({
        id,
        form: productToForm(details, inventory),
        hasInventory: Boolean(inventory),
      })
      setWizardOpen(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load product.'))
    }
  }

  /** Runs the wizard's completed form through create or update. */
  async function handleWizardSubmit(form: ProductFormState) {
    if (editing) {
      const body = toProductInput(form, false)
      if (typeof body === 'string') throw new Error(body)
      await updateSellerProduct(editing.id, body)
      if (editing.hasInventory) {
        await updateProductInventory(editing.id, toInventoryInput(form))
      }
      await loadProducts(selectedShopId)
      setToast({ message: 'Product updated.', variant: 'success' })
      return
    }

    if (!selectedShopId) throw new Error('Create a shop before adding products.')
    const body = toProductInput(form, true)
    if (typeof body === 'string') throw new Error(body)
    await createShopProduct(selectedShopId, body)
    await loadProducts(selectedShopId)
    setToast({ message: 'Product created.', variant: 'success' })
  }

  async function confirmDelete() {
    const product = productToDelete
    if (!product) return
    setError(null)
    setDeleting(true)
    try {
      await deleteSellerProduct(product.id)
      if (editing?.id === product.id) {
        setEditing(null)
        setWizardOpen(false)
      }
      // Drop it from the grid right away, then reconcile with the server.
      setProducts((prev) => prev.filter((item) => item.id !== product.id))
      setProductToDelete(null)
      setPreviewProduct((current) => (current?.id === product.id ? null : current))
      await loadProducts(selectedShopId)
      setToast({ message: 'Product deleted.', variant: 'success' })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete product.'))
    } finally {
      setDeleting(false)
    }
  }

  const publishedCount = products.filter((item) => item.status === 'published').length

  if (!loading && shops.length === 0) {
    return (
      <div>
        <SellerPageHeader
          icon={Package}
          tone="teal"
          title="Products"
          description="Create a shop first, then add gifts and inventory for that shop."
        />
        <SellerEmptyState
          icon={Package}
          title="No shops yet"
          description="Products belong to a shop. Create a shop, then come back to list gifts."
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
        icon={Package}
        tone="teal"
        title="Products"
        description="Create gifts per shop. Set status to published so they appear in the customer catalog."
        action={
          <Button type="button" className="h-10 rounded-full px-4" onClick={startCreate}>
            <Plus className="size-4" />
            Add product
          </Button>
        }
      />
      <ProductWizard
        open={wizardOpen}
        onOpenChange={(next) => {
          setWizardOpen(next)
          if (!next) setEditing(null)
        }}
        shopName={selectedShop?.name ?? 'Your shop'}
        mode={editing ? 'edit' : 'create'}
        initialForm={editing?.form ?? null}
        onSubmit={handleWizardSubmit}
      />

      {loading ? (
        <div className="flex justify-center py-24">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <FormAlert error={error} />

          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1 space-y-2 sm:max-w-xs">
              <Label htmlFor="product-shop">Shop</Label>
              <select
                id="product-shop"
                value={selectedShopId}
                onChange={(event) => handleSelectShop(event.target.value)}
                className={selectClassName}
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
            {products.length ? (
              <p className="pb-3 text-sm text-muted-foreground">
                {products.length} {products.length === 1 ? 'gift' : 'gifts'} ·{' '}
                {publishedCount} published
              </p>
            ) : null}
          </div>

          {publishedCount === 0 && products.length > 0 ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-surface/60 p-4">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                None of these gifts are published, so customers can't see them yet. Set a
                product's status to <span className="font-medium">Published</span> to list
                it in the catalog.
              </p>
            </div>
          ) : null}

          {products.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product) => {
                const meta = statusMeta[product.status] ?? statusMeta.draft
                return (
                  <li
                    key={product.id}
                    className={cn(
                      sellerCardClass,
                      'group relative flex flex-col overflow-hidden rounded-xl',
                      editing?.id === product.id && 'ring-2 ring-primary/40',
                    )}
                  >
                    {/*
                      The card face opens the preview panel; Edit and Delete
                      float over the image on hover so they don't cost a row.
                    */}
                    <button
                      type="button"
                      className="flex flex-col text-left focus-visible:outline-none"
                      onClick={() => setPreviewProduct(product)}
                      aria-label={`Preview ${product.name}`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-muted">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-[radial-gradient(ellipse_at_center,oklch(0.94_0.03_125/0.7),transparent_70%)] text-muted-foreground">
                            <Package className="size-7" />
                          </div>
                        )}
                        <span
                          className={cn(
                            'absolute top-2 left-2 size-2.5 rounded-full ring-2 ring-background',
                            meta.dot,
                          )}
                          title={meta.label}
                        />
                        <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold tracking-tight shadow-sm backdrop-blur-sm">
                          {formatPriceAmount(product.price_amount, product.currency)}
                        </span>
                      </div>

                      <div className="w-full p-2.5">
                        <h3 className="truncate text-sm leading-tight font-medium">
                          {product.name}
                        </h3>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {meta.hint}
                        </p>
                      </div>
                    </button>

                    <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
                        aria-label={`Edit ${product.name}`}
                        onClick={() => handleEdit(product.id)}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
                        aria-label={`Delete ${product.name}`}
                        onClick={() => setProductToDelete(product)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <SellerEmptyState
              icon={Package}
              title="No gifts in this shop yet"
              description="Add your first gift with a photo, price, and description. Publish it to make it visible in the customer catalog."
              action={
                <Button
                  type="button"
                  className="h-10 rounded-full px-5"
                  onClick={startCreate}
                >
                  <Plus className="size-4" />
                  Add your first gift
                </Button>
              }
            />
          )}
        </div>
      )}

      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}

      <ProductPreviewPanel
        product={previewProduct}
        shopName={selectedShop?.name}
        onClose={() => setPreviewProduct(null)}
        onEdit={(product) => {
          setPreviewProduct(null)
          void handleEdit(product.id)
        }}
        onDelete={(product) => {
          setPreviewProduct(null)
          setProductToDelete(product)
        }}
      />

      <ConfirmDialog
        open={productToDelete !== null}
        onOpenChange={(open) => !open && setProductToDelete(null)}
        title="Delete this gift?"
        description={
          <>
            <span className="font-medium text-foreground">
              {productToDelete?.name}
            </span>{' '}
            will be removed from your shop and from the customer catalog. This can’t
            be undone.
          </>
        }
        confirmLabel="Delete gift"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}

/** The gift as customers see it, plus the details that only the seller needs. */
function ProductPreviewPanel({
  product,
  shopName,
  onClose,
  onEdit,
  onDelete,
}: {
  product: Product | null
  shopName?: string
  onClose: () => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}) {
  const meta = product
    ? (statusMeta[product.status] ?? statusMeta.draft)
    : statusMeta.draft

  return (
    <SellerSheet
      open={product !== null}
      onOpenChange={(open) => !open && onClose()}
      eyebrow="Gift"
      title={product?.name ?? ''}
      description={shopName}
      media={
        product ? (
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center bg-[radial-gradient(ellipse_at_center,oklch(0.94_0.03_125/0.7),transparent_70%)] text-muted-foreground">
                <Package className="size-10" />
              </div>
            )}
            <span
              className={cn(
                'absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm',
                meta.tone,
              )}
            >
              {meta.label}
            </span>
          </div>
        ) : null
      }
      footer={
        product ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="h-10 flex-1 rounded-full"
              onClick={() => onEdit(product)}
            >
              <Pencil className="size-4" />
              Edit gift
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 text-destructive"
              aria-label={`Delete ${product.name}`}
              onClick={() => onDelete(product)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null
      }
    >
      {product ? (
        <>
          <div>
            <p className="font-display text-3xl tracking-tight">
              {formatPriceAmount(product.price_amount, product.currency)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{meta.hint}</p>
          </div>

          {product.description ? (
            <SellerSheetSection title="Description">
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </SellerSheetSection>
          ) : null}

          <SellerSheetSection icon={Boxes} title="Listing">
            <SellerSheetFacts>
              <SellerSheetRow label="Status">{meta.label}</SellerSheetRow>
              <SellerSheetRow label="Currency">{product.currency}</SellerSheetRow>
              <SellerSheetRow label="Visible to">
                {product.customer_type_visibility === 'both'
                  ? 'All customers'
                  : product.customer_type_visibility === 'corporate'
                    ? 'Corporate buyers'
                    : 'Personal buyers'}
              </SellerSheetRow>
              <SellerSheetRow label="Price" emphasis>
                {formatPriceAmount(product.price_amount, product.currency)}
              </SellerSheetRow>
            </SellerSheetFacts>
          </SellerSheetSection>

          {product.occasion_tags?.length ? (
            <SellerSheetSection icon={Tag} title="Occasions">
              <div className="flex flex-wrap gap-1.5">
                {product.occasion_tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
                  >
                    {tag}
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
