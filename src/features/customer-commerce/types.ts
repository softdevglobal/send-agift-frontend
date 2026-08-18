import type { GiftProduct } from '@/features/marketing/data'

export type CatalogProduct = GiftProduct & {
  categoryId: string
  description: string
  sellerName: string
  currency?: string
  priceAmount?: number
}

export type CartItem = {
  productId: string
  quantity: number
}

export type CartLine = {
  product: CatalogProduct
  quantity: number
  lineTotal: number
}

export type PaymentMethod = 'card' | 'wallet' | 'cod'

export type OrderStatus = 'processing' | 'shipped' | 'delivered'

export type PaymentStatus = 'demo_paid' | 'pay_on_delivery'

export type OrderRecipient = {
  name: string
  email: string
  phone: string
  line1: string
  line2?: string
  city: string
  region?: string
  postalCode?: string
  note?: string
}

export type OrderItem = {
  productId: string
  name: string
  price: number
  quantity: number
  image: string
}

export type CustomerOrder = {
  id: string
  createdAt: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  recipient: OrderRecipient
}
