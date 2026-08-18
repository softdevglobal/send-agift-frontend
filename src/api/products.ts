import { api } from '@/lib/api'
import type {
  Inventory,
  InventoryInput,
  MessageResponse,
  Product,
  ProductDetails,
  ProductInput,
} from '@/api/types'

export type {
  CustomerTypeVisibility,
  Inventory,
  InventoryInput,
  Product,
  ProductDetails,
  ProductInput,
  ProductStatus,
} from '@/api/types'

export function listShopProducts(shopId: string) {
  return api<Product[]>(`/sellers/me/shops/${shopId}/products`)
}

export function createShopProduct(shopId: string, body: ProductInput) {
  return api<ProductDetails>(`/sellers/me/shops/${shopId}/products`, {
    method: 'POST',
    body,
  })
}

export function getSellerProduct(id: string) {
  return api<ProductDetails>(`/sellers/me/products/${id}`)
}

export function updateSellerProduct(id: string, body: Omit<ProductInput, 'inventory'>) {
  return api<Product>(`/sellers/me/products/${id}`, {
    method: 'PUT',
    body,
  })
}

export function deleteSellerProduct(id: string) {
  return api<MessageResponse>(`/sellers/me/products/${id}`, {
    method: 'DELETE',
  })
}

export function getProductInventory(id: string) {
  return api<Inventory>(`/sellers/me/products/${id}/inventory`)
}

export function updateProductInventory(id: string, body: InventoryInput) {
  return api<Inventory>(`/sellers/me/products/${id}/inventory`, {
    method: 'PUT',
    body,
  })
}
