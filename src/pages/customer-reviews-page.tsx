import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoaderCircle, Star, Trash2 } from 'lucide-react'

import {
  deleteMyReview,
  updateMyReview,
  type CreateReviewInput,
  type ProductReview,
} from '@/api/reviews'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormAlert } from '@/components/common/form-alert'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  getCatalogProduct,
} from '@/features/customer-commerce'
import { ReviewCard } from '@/features/reviews/review-card'
import { ReviewForm } from '@/features/reviews/review-form'
import { useMyReviews } from '@/features/reviews/my-reviews'
import { getErrorMessage } from '@/lib/api'
import { loadMarketplaceIntoCatalog } from '@/lib/marketplace'

/** The gift a review is about, shown above it so the list is readable. */
function ProductContext({ review }: { review: ProductReview }) {
  const product = getCatalogProduct(review.product_id)
  return (
    <Link
      to={`/products/${review.product_id}`}
      className="flex items-center gap-2.5 text-sm font-medium hover:text-primary"
    >
      {product?.image ? (
        <img
          src={product.image}
          alt=""
          className="size-9 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="size-9 shrink-0 rounded-lg bg-muted" />
      )}
      <span className="truncate">{product?.name ?? 'View gift'}</span>
    </Link>
  )
}

export function CustomerReviewsPage() {
  const { reviews, loading, apply, remove } = useMyReviews()
  const [editing, setEditing] = useState<ProductReview | null>(null)
  const [deleting, setDeleting] = useState<ProductReview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Review rows carry product ids, not names — the catalog fills in the rest.
  useEffect(() => {
    void loadMarketplaceIntoCatalog()
  }, [])

  async function handleUpdate(input: CreateReviewInput) {
    if (!editing) return
    const saved = await updateMyReview(editing.id, input)
    apply(saved)
    setEditing(null)
  }

  async function handleDelete() {
    if (!deleting) return
    setBusy(true)
    setError(null)
    try {
      await deleteMyReview(deleting.id)
      remove(deleting.id)
      setDeleting(null)
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Could not delete that review.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <CustomerPageHeader
        title="My reviews"
        description="Everything you have written about gifts you received. You can edit or remove a review at any time."
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <CustomerEmptyState
          icon={Star}
          title="No reviews yet"
          description="Once a gift is delivered you can review it from the order — your rating helps the next person choose."
          action={
            <Button asChild className="rounded-full">
              <Link to="/orders/history">View delivered orders</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              context={<ProductContext review={review} />}
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full px-3"
                    onClick={() => setEditing(review)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full px-3 text-destructive hover:text-destructive"
                    onClick={() => setDeleting(review)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit your review</DialogTitle>
            <DialogDescription>
              Your updated review replaces the one shown on the gift.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <ReviewForm
              review={editing}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting != null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this review?</DialogTitle>
            <DialogDescription>
              It will be removed from the gift straight away. You can write a new
              one for the same order later.
            </DialogDescription>
          </DialogHeader>
          <FormAlert error={error} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={busy}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={busy}
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Delete review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
