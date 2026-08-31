import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/auth-context'
import { getCatalogProduct } from '@/features/customer-commerce/catalog'
import {
  clearCartStorage,
  readCart,
  writeCart,
} from '@/features/customer-commerce/cart-storage'
import type { CartItem, CartLine } from '@/features/customer-commerce/types'
import { shippingForSubtotal } from '@/features/customer-commerce/utils'
import { returnToState } from '@/lib/auth'

type CartContextValue = {
  items: CartItem[]
  lines: CartLine[]
  itemCount: number
  subtotal: number
  shipping: number
  total: number
  addItem: (productId: string, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function toLines(items: CartItem[]): CartLine[] {
  return items.flatMap((item) => {
    const product = getCatalogProduct(item.productId)
    if (!product) return []
    return [
      {
        product,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
      },
    ]
  })
}

type CartProviderProps = {
  children: ReactNode
}

export function CartProvider({ children }: CartProviderProps) {
  const { isAuthenticated, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [items, setItems] = useState<CartItem[]>(() => readCart())
  const isCustomer = isAuthenticated && role === 'customer'

  const persist = useCallback((next: CartItem[]) => {
    setItems(next)
    writeCart(next)
  }, [])

  const addItem = useCallback(
    (productId: string, quantity = 1) => {
      if (!isCustomer) {
        if (!isAuthenticated) {
          navigate('/login', {
            state: returnToState(location.pathname, location.search),
          })
        }
        return
      }
      if (!getCatalogProduct(productId) || quantity < 1) return
      persist(
        (() => {
          const existing = items.find((item) => item.productId === productId)
          if (!existing) return [...items, { productId, quantity }]
          return items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          )
        })(),
      )
    },
    [isAuthenticated, isCustomer, items, location.pathname, location.search, navigate, persist],
  )

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity < 1) {
        persist(items.filter((item) => item.productId !== productId))
        return
      }
      persist(
        items.map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        ),
      )
    },
    [items, persist],
  )

  const removeItem = useCallback(
    (productId: string) => {
      persist(items.filter((item) => item.productId !== productId))
    },
    [items, persist],
  )

  const clearCart = useCallback(() => {
    setItems([])
    clearCartStorage()
  }, [])

  const lines = useMemo(() => toLines(items), [items])
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.lineTotal, 0),
    [lines],
  )
  const shipping = shippingForSubtotal(subtotal)
  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      lines,
      itemCount,
      subtotal,
      shipping,
      total: subtotal + shipping,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [items, lines, itemCount, subtotal, shipping, addItem, setQuantity, removeItem, clearCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
