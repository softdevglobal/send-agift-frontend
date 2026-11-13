import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/auth-context'
import { getPublicProduct } from '@/api/products'
import {
  catalogProductFromApi,
  getCatalogProduct,
  getCatalogVersion,
  registerCatalogProducts,
  subscribeCatalog,
} from '@/features/customer-commerce/catalog'
import {
  clearCartStorage,
  readCart,
  writeCart,
} from '@/features/customer-commerce/cart-storage'
import type { CartCustomerType, CartItem, CartLine } from '@/features/customer-commerce/types'
import { ApiError } from '@/lib/api'
import { returnToState } from '@/lib/auth'
import { getMarketplaceCustomerType } from '@/lib/marketplace'

type CartContextValue = {
  items: CartItem[]
  lines: CartLine[]
  /**
   * True while saved items are still being looked up after a reload. An
   * empty `lines` then means "not loaded yet", not "empty cart".
   */
  hydrating: boolean
  /** Saved items whose product could not be found (removed or unpublished). */
  unavailable: CartItem[]
  itemCount: number
  subtotal: number
  /**
   * What the order will actually cost today. Delivery is not quoted before
   * checkout. The API has no customer-facing rate endpoint and records
   * delivery_amount as 0. So the total is the subtotal rather than the
   * subtotal plus a made-up fee.
   */
  total: number
  customerTypes: CartCustomerType[]
  mixedCustomerType: boolean
  cartCustomerType: CartCustomerType | null
  addItem: (productId: string, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function customerTypeForProduct(productId: string): CartCustomerType {
  const product = getCatalogProduct(productId)
  return product?.catalogCustomerType ?? getMarketplaceCustomerType()
}

function toLines(items: CartItem[]): CartLine[] {
  return items.flatMap((item) => {
    const product = getCatalogProduct(item.productId)
    if (!product) return []
    return [
      {
        product,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
        customerType: item.customerType,
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
  const catalogVersion = useSyncExternalStore(subscribeCatalog, getCatalogVersion, getCatalogVersion)
  /** Product IDs looked up and not found, so they are not asked for again. */
  const [missing, setMissing] = useState<ReadonlySet<string>>(() => new Set())
  const [hydrating, setHydrating] = useState(false)

  // A reload keeps only IDs and quantities. Fetch the details of any saved
  // product the catalog does not have yet, before the cart can call itself
  // empty.
  useEffect(() => {
    const wanted = items
      .map((item) => item.productId)
      .filter((id) => !getCatalogProduct(id) && !missing.has(id))
    if (wanted.length === 0) {
      setHydrating(false)
      return
    }
    let cancelled = false
    setHydrating(true)
    void Promise.allSettled(wanted.map((id) => getPublicProduct(id, 'personal'))).then((results) => {
      if (cancelled) return
      const found = results.flatMap((r) => (r.status === 'fulfilled' ? [catalogProductFromApi(r.value)] : []))
      // Only a 404 means the gift is gone; a network blip is not remembered.
      const notFound = wanted.filter((_, i) => {
        const r = results[i]
        return r.status === 'rejected' && r.reason instanceof ApiError && r.reason.status === 404
      })
      registerCatalogProducts(found)
      if (notFound.length > 0) setMissing((prev) => new Set([...prev, ...notFound]))
      setHydrating(false)
    })
    return () => {
      cancelled = true
    }
    // catalogVersion: a product page may register the item meanwhile.
  }, [items, missing, catalogVersion])

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
      const customerType = customerTypeForProduct(productId)
      persist(
        (() => {
          const existing = items.find((item) => item.productId === productId)
          if (!existing) return [...items, { productId, quantity, customerType }]
          return items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + quantity, customerType }
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

  const removeItem = useCallback((productId: string) => {
    // From the latest list, so several removals in a row all stick.
    setItems((prev) => {
      const next = prev.filter((item) => item.productId !== productId)
      writeCart(next)
      return next
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    clearCartStorage()
  }, [])

  // catalogVersion is a dependency on purpose: the join must rerun when product
  // details arrive, even though the saved items did not change.
  const lines = useMemo(() => toLines(items), [items, catalogVersion])
  const unavailable = useMemo(
    () => items.filter((item) => missing.has(item.productId) && !getCatalogProduct(item.productId)),
    [items, missing, catalogVersion],
  )
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.lineTotal, 0),
    [lines],
  )
  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  )
  const customerTypes = useMemo(
    () => [...new Set(lines.map((line) => line.customerType))],
    [lines],
  )
  const mixedCustomerType = customerTypes.length > 1
  const cartCustomerType = customerTypes.length === 1 ? customerTypes[0] : null

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      lines,
      hydrating,
      unavailable,
      itemCount,
      subtotal,
      total: subtotal,
      customerTypes,
      mixedCustomerType,
      cartCustomerType,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      lines,
      hydrating,
      unavailable,
      itemCount,
      subtotal,
      customerTypes,
      mixedCustomerType,
      cartCustomerType,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    ],
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
