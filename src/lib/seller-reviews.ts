const STORAGE_KEY = 'sag.sellerReviews'
const CHANGE_EVENT = 'sag:seller-reviews'

export type SellerReview = {
  id: string
  sellerId: string
  customerId: string
  customerName: string
  rating: number
  comment: string
  createdAt: string
  updatedAt?: string
}

export type SellerReviewStats = {
  average: number
  count: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isReview(value: unknown): value is SellerReview {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.sellerId === 'string' &&
    typeof value.customerId === 'string' &&
    typeof value.customerName === 'string' &&
    typeof value.rating === 'number' &&
    value.rating >= 1 &&
    value.rating <= 5 &&
    typeof value.comment === 'string' &&
    typeof value.createdAt === 'string'
  )
}

function readAll(): SellerReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isReview)
  } catch {
    return []
  }
}

function writeAll(reviews: SellerReview[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function listSellerReviews(sellerId: string): SellerReview[] {
  return readAll()
    .filter((review) => review.sellerId === sellerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getCustomerSellerReview(sellerId: string, customerId: string) {
  return (
    readAll().find(
      (review) => review.sellerId === sellerId && review.customerId === customerId,
    ) ?? null
  )
}

export function getSellerReviewStats(sellerId: string): SellerReviewStats {
  const reviews = listSellerReviews(sellerId)
  if (reviews.length === 0) return { average: 0, count: 0 }
  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  return {
    average: Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length,
  }
}

export function upsertSellerReview(input: {
  sellerId: string
  customerId: string
  customerName: string
  rating: number
  comment: string
}): SellerReview {
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)))
  const comment = input.comment.trim()
  const reviews = readAll()
  const existing = reviews.find(
    (review) =>
      review.sellerId === input.sellerId && review.customerId === input.customerId,
  )
  const now = new Date().toISOString()

  if (existing) {
    const updated: SellerReview = {
      ...existing,
      customerName: input.customerName,
      rating,
      comment,
      updatedAt: now,
    }
    writeAll(reviews.map((review) => (review.id === existing.id ? updated : review)))
    return updated
  }

  const created: SellerReview = {
    id: crypto.randomUUID(),
    sellerId: input.sellerId,
    customerId: input.customerId,
    customerName: input.customerName,
    rating,
    comment,
    createdAt: now,
  }
  writeAll([created, ...reviews])
  return created
}

export function subscribeSellerReviews(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}
