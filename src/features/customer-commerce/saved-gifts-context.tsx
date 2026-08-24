import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  deleteSavedGift,
  listSavedGifts,
  saveGift,
  type SavedGiftDetails,
} from '@/api/savedGifts'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api'
import { isUuid } from '@/lib/uuid'

type SavedGiftsContextValue = {
  gifts: SavedGiftDetails[]
  loading: boolean
  pendingProductId: string | null
  isSaved: (productId: string) => boolean
  toggleSave: (productId: string) => Promise<void>
  refresh: () => Promise<void>
}

const SavedGiftsContext = createContext<SavedGiftsContextValue | null>(null)

type SavedGiftsProviderProps = {
  children: ReactNode
}

export function SavedGiftsProvider({ children }: SavedGiftsProviderProps) {
  const { role, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [gifts, setGifts] = useState<SavedGiftDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingProductId, setPendingProductId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isAuthenticated || role !== 'customer') {
      setGifts([])
      return
    }
    const list = await listSavedGifts()
    setGifts(Array.isArray(list) ? list : [])
  }, [isAuthenticated, role])

  useEffect(() => {
    let cancelled = false
    if (!isAuthenticated || role !== 'customer') {
      setGifts([])
      setLoading(false)
      return
    }
    setLoading(true)
    refresh()
      .catch(() => {
        if (!cancelled) setGifts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, refresh, role])

  const savedByProductId = useMemo(() => {
    const map = new Map<string, SavedGiftDetails>()
    for (const gift of gifts) {
      map.set(gift.product_id, gift)
    }
    return map
  }, [gifts])

  const isSaved = useCallback(
    (productId: string) => savedByProductId.has(productId),
    [savedByProductId],
  )

  const toggleSave = useCallback(
    async (productId: string) => {
      if (!isAuthenticated || role !== 'customer') {
        navigate('/login', {
          state: { from: `${location.pathname}${location.search}` },
        })
        return
      }
      if (!isUuid(productId)) return

      const existing = savedByProductId.get(productId)
      setPendingProductId(productId)
      try {
        if (existing) {
          await deleteSavedGift(existing.id)
        } else {
          try {
            await saveGift(productId)
          } catch (err) {
            if (!(err instanceof ApiError && err.status === 409)) throw err
          }
        }
        await refresh()
      } finally {
        setPendingProductId(null)
      }
    },
    [
      isAuthenticated,
      location.pathname,
      location.search,
      navigate,
      refresh,
      role,
      savedByProductId,
    ],
  )

  const value = useMemo<SavedGiftsContextValue>(
    () => ({
      gifts,
      loading,
      pendingProductId,
      isSaved,
      toggleSave,
      refresh,
    }),
    [gifts, isSaved, loading, pendingProductId, refresh, toggleSave],
  )

  return (
    <SavedGiftsContext.Provider value={value}>{children}</SavedGiftsContext.Provider>
  )
}

export function useSavedGifts(): SavedGiftsContextValue {
  const context = useContext(SavedGiftsContext)
  if (!context) {
    throw new Error('useSavedGifts must be used within SavedGiftsProvider')
  }
  return context
}
