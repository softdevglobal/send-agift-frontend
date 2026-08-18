import { api } from '@/lib/api'
import type { MessageResponse, SavedGift, SavedGiftDetails } from '@/api/types'

export type { SavedGift, SavedGiftDetails } from '@/api/types'

export function listSavedGifts() {
  return api<SavedGiftDetails[]>('/customers/me/saved-gifts')
}

export function saveGift(productId: string) {
  return api<SavedGift>('/customers/me/saved-gifts', {
    method: 'POST',
    body: { product_id: productId },
  })
}

export function deleteSavedGift(id: string) {
  return api<MessageResponse>(`/customers/me/saved-gifts/${id}`, {
    method: 'DELETE',
  })
}
