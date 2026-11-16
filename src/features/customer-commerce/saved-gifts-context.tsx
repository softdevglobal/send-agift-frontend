import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { getTokenSubject, returnToState } from '@/lib/auth'
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
  const { role, isAuthenticated, token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [gifts, setGifts] = useState<SavedGiftDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingProductId, setPendingProductId] = useState<string | null>(null)
  /** The signed-in customer these gifts belong to; null for anyone else. */
  const account =
    isAuthenticated && role === 'customer' && token ? (getTokenSubject() ?? token) : null
  /** Bumped on every account change, so an older account's answer is dropped. */
  const generation = useRef(0)

  const refresh = useCallback(async () => {
    const mine = generation.current
    if (!account) {
      setGifts([])
      return
    }
    const list = await listSavedGifts()
    if (mine !== generation.current) return
    setGifts(Array.isArray(list) ? list : [])
  }, [account])

  useEffect(() => {
    generation.current += 1
    const mine = generation.current
    setGifts([])
    if (!account) {
      setLoading(false)
      return
    }
    setLoading(true)
    refresh()
      .catch(() => {
        if (mine === generation.current) setGifts([])
      })
      .finally(() => {
        if (mine === generation.current) setLoading(false)
      })
  }, [account, refresh])

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
          state: returnToState(location.pathname, location.search),
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
