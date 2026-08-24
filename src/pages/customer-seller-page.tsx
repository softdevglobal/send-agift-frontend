import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Store,
} from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { getCustomerMe, type CustomerDetails } from '@/api/customers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  customerDisplayName,
  customerPanelClass,
  listCatalogProductsForSeller,
} from '@/features/customer-commerce'
import { StarRating, StarRatingInput } from '@/features/customer-commerce/star-rating'
import type { CatalogProduct } from '@/features/customer-commerce/types'
import { sellerTypes } from '@/features/auth/seller-register-options'
import { sellerVerificationLabel } from '@/features/seller/seller-utils'
import { getErrorMessage } from '@/lib/api'
import { textareaClassName } from '@/lib/form-styles'
import {
  publicSellerInitials,
  subscribePublicSellers,
  type PublicSeller,
  type PublicShop,
} from '@/lib/public-sellers'
import { sellerFromCatalog, subscribePublishedCatalog } from '@/lib/published-catalog'
import {
  getCustomerSellerReview,
  getSellerReviewStats,
  listSellerReviews,
  subscribeSellerReviews,
  upsertSellerReview,
  type SellerReview,
} from '@/lib/seller-reviews'
import { cn } from '@/lib/utils'

function shopsWithProducts(seller: PublicSeller, products: CatalogProduct[]) {
  const productsByShop = new Map<string, CatalogProduct[]>()
  for (const product of products) {
    const shopId = product.shopId || 'other'
    const list = productsByShop.get(shopId) ?? []
    list.push(product)
    productsByShop.set(shopId, list)
  }

  const seen = new Set<string>()
  const sections: { shop: PublicShop; products: CatalogProduct[] }[] = []

  for (const shop of seller.shops) {
    seen.add(shop.id)
    const shopProducts = productsByShop.get(shop.id) ?? []
    if (shop.status === 'inactive' && shopProducts.length === 0) continue
    sections.push({ shop, products: shopProducts })
  }

  for (const [shopId, shopProducts] of productsByShop) {
    if (seen.has(shopId)) continue
    const first = shopProducts[0]
    sections.push({
      shop: {
        id: shopId,
        name: first?.shopName || 'Shop',
        slug: '',
        description: first?.shopDescription,
        customer_visible_location: first?.shopLocation,
      },
      products: shopProducts,
    })
  }

  return sections
}

function sellerTypeLabel(value: string) {
  return sellerTypes.find((item) => item.value === value)?.label ?? value
}

function formatReviewDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function CustomerSellerPage() {
  const { sellerId } = useParams()
  const [seller, setSeller] = useState<PublicSeller | null>(() =>
    sellerId ? sellerFromCatalog(sellerId) : null,
  )
  const [reviews, setReviews] = useState<SellerReview[]>(() =>
    sellerId ? listSellerReviews(sellerId) : [],
  )
  const [customer, setCustomer] = useState<CustomerDetails | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!sellerId) return
    const id = sellerId
    function refresh() {
      setSeller(sellerFromCatalog(id))
      setReviews(listSellerReviews(id))
    }
    refresh()
    const unsubSellers = subscribePublicSellers(refresh)
    const unsubCatalog = subscribePublishedCatalog(refresh)
    const unsubReviews = subscribeSellerReviews(refresh)
    return () => {
      unsubSellers()
      unsubCatalog()
      unsubReviews()
    }
  }, [sellerId])

  useEffect(() => {
    let cancelled = false
    getCustomerMe()
      .then((me) => {
        if (cancelled) return
        setCustomer(me)
        if (!sellerId) return
        const existing = getCustomerSellerReview(sellerId, me.id)
        if (existing) {
          setRating(existing.rating)
          setComment(existing.comment)
        }
      })
      .catch(() => {
        // Review form stays available; submit will surface load errors.
      })
    return () => {
      cancelled = true
    }
  }, [sellerId])

  const products = useMemo(
    () => (seller ? listCatalogProductsForSeller(seller.id) : []),
    [seller],
  )
  const shopSections = useMemo(
    () => (seller ? shopsWithProducts(seller, products) : []),
    [seller, products],
  )
  const stats = seller ? getSellerReviewStats(seller.id) : { average: 0, count: 0 }
  const locations = seller
    ? seller.shops
        .map((shop) => shop.customer_visible_location?.trim())
        .filter((value): value is string => Boolean(value))
    : []
  const about =
    seller?.shops.find((shop) => shop.description?.trim())?.description?.trim() ?? ''
  const existingReview = customer
    ? reviews.find((review) => review.customerId === customer.id)
    : null

  if (!sellerId) {
    return <Navigate to="/products" replace />
  }

  if (!seller) {
    return (
      <div>
        <CustomerPageHeader
          title="Seller"
          action={
            <Button asChild variant="outline" className="h-10 rounded-full px-4">
              <Link to="/products">
                <ArrowLeft className="size-4" />
                All gifts
              </Link>
            </Button>
          }
        />
        <CustomerEmptyState
          icon={Store}
          title="Seller profile not found"
          description="This seller is not in the public directory yet. Open the gift again after the seller has published their shop."
          action={
            <Button asChild className="h-10 rounded-full px-4">
              <Link to="/products">Browse gifts</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const profile = seller

  async function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (!customer) {
      setError('Could not load your customer profile to save this review.')
      return
    }
    setSaving(true)
    try {
      upsertSellerReview({
        sellerId: profile.id,
        customerId: customer.id,
        customerName: customerDisplayName(customer),
        rating,
        comment,
      })
      setReviews(listSellerReviews(profile.id))
      setNotice(existingReview ? 'Your review was updated.' : 'Thanks for your review.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your review.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <CustomerPageHeader
        title={seller.trading_name?.trim() || seller.name}
        description={
          seller.legal_name &&
          seller.legal_name !== (seller.trading_name?.trim() || seller.name)
            ? seller.legal_name
            : `${sellerTypeLabel(seller.seller_type) || 'Seller'} · ${seller.shops.length} shop${seller.shops.length === 1 ? '' : 's'} · ${products.length} gift${products.length === 1 ? '' : 's'}`
        }
        action={
          <Button asChild variant="outline" className="h-10 rounded-full px-4">
            <Link to="/products">
              <ArrowLeft className="size-4" />
              All gifts
            </Link>
          </Button>
        }
      />

      <section className={cn(customerPanelClass, 'p-5 sm:p-6')}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {seller.image_url ? (
            <img
              src={seller.image_url}
              alt=""
              className="size-20 rounded-2xl object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-primary">
              {publicSellerInitials(seller)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl tracking-tight">
                {seller.trading_name?.trim() || seller.name}
              </h2>
              {seller.verification_status === 'verified' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-primary">
                  <BadgeCheck className="size-3.5" />
                  Verified seller
                </span>
              ) : seller.verification_status ? (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {sellerVerificationLabel(seller.verification_status)}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {seller.legal_name &&
              seller.legal_name !== (seller.trading_name?.trim() || seller.name)
                ? seller.legal_name
                : sellerTypeLabel(seller.seller_type) || 'Seller'}
            </p>
            {stats.count > 0 ? (
              <StarRating
                value={stats.average}
                count={stats.count}
                size="md"
                className="mt-3"
              />
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </div>
        </div>

        {about ? (
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{about}</p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {seller.email ? (
            <a
              href={`mailto:${seller.email}`}
              className="flex items-start gap-3 rounded-xl bg-muted/50 px-3.5 py-3 text-sm ring-1 ring-border/40 hover:bg-muted"
            >
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Email
                </span>
                <span className="mt-0.5 block truncate">{seller.email}</span>
              </span>
            </a>
          ) : null}
          {seller.phone ? (
            <a
              href={`tel:${seller.phone}`}
              className="flex items-start gap-3 rounded-xl bg-muted/50 px-3.5 py-3 text-sm ring-1 ring-border/40 hover:bg-muted"
            >
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Phone
                </span>
                <span className="mt-0.5 block truncate">{seller.phone}</span>
              </span>
            </a>
          ) : null}
          {locations.length ? (
            <div className="flex items-start gap-3 rounded-xl bg-muted/50 px-3.5 py-3 text-sm ring-1 ring-border/40">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Location
                </p>
                <p className="mt-0.5">{locations.join(' · ')}</p>
              </div>
            </div>
          ) : null}
        </div>

        {!seller.email && !seller.phone && locations.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            This seller has not published contact details yet.
          </p>
        ) : null}
      </section>

      <section className="mt-10">
        <div className="mb-5">
          <h2 className="font-display text-xl tracking-tight">Shops</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {shopSections.length} shop{shopSections.length === 1 ? '' : 's'} · {products.length}{' '}
            published gift{products.length === 1 ? '' : 's'}. Open a shop to see its gifts.
          </p>
        </div>

        {shopSections.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shopSections.map((section) => (
              <Link
                key={section.shop.id}
                to={`/sellers/${seller.id}/shops/${section.shop.id}`}
                className={cn(
                  customerPanelClass,
                  'group overflow-hidden transition-transform duration-300 hover:-translate-y-1',
                )}
              >
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  {section.shop.image_url ? (
                    <img
                      src={section.shop.image_url}
                      alt=""
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex size-full min-h-28 items-center justify-center text-muted-foreground">
                      <Store className="size-8" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl tracking-tight">{section.shop.name}</h3>
                  {section.shop.customer_visible_location ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">{section.shop.customer_visible_location}</span>
                    </p>
                  ) : null}
                  {section.shop.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {section.shop.description}
                    </p>
                  ) : null}
                  <p className="mt-3 flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {section.products.length} gift
                      {section.products.length === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                      View gifts
                      <ChevronRight className="size-4" />
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <CustomerEmptyState
            icon={Store}
            title="No shops yet"
            description="When this seller creates shops and publishes gifts, they will appear here."
          />
        )}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form
          onSubmit={handleReview}
          className={cn(customerPanelClass, 'h-fit space-y-4 p-5 sm:p-6')}
        >
          <h2 className="font-display text-xl tracking-tight">
            {existingReview ? 'Update your review' : 'Leave a review'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Ratings and comments are saved on this device for other customers browsing
            this seller.
          </p>
          <FormAlert error={error} notice={notice} />
          <div className="space-y-2">
            <Label htmlFor="seller-review-rating">Rating</Label>
            <StarRatingInput id="seller-review-rating" value={rating} onChange={setRating} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seller-review-comment">Review</Label>
            <textarea
              id="seller-review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className={textareaClassName}
              placeholder="How was it to buy from this seller?"
              rows={4}
            />
          </div>
          <Button type="submit" disabled={saving} className="h-10 rounded-full px-4">
            {saving ? (
              <>
                <LoaderCircle className="animate-spin" />
                Saving…
              </>
            ) : existingReview ? (
              'Update review'
            ) : (
              'Post review'
            )}
          </Button>
        </form>

        <div className={cn(customerPanelClass, 'p-5 sm:p-6')}>
          <h2 className="font-display text-xl tracking-tight">Customer reviews</h2>
          {reviews.length ? (
            <ul className="mt-4 divide-y divide-border/50">
              {reviews.map((review) => (
                <li key={review.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{review.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatReviewDate(review.updatedAt ?? review.createdAt)}
                    </p>
                  </div>
                  <StarRating value={review.rating} className="mt-1.5" />
                  {review.comment ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {review.comment}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Be the first to review {seller.name}.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
