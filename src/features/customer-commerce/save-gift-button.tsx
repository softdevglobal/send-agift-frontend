import { Heart, LoaderCircle } from 'lucide-react'

import { useSavedGifts } from '@/features/customer-commerce/saved-gifts-context'
import { cn } from '@/lib/utils'

type SaveGiftButtonProps = {
  productId: string
  className?: string
}

export function SaveGiftButton({ productId, className }: SaveGiftButtonProps) {
  const { isSaved, toggleSave, pendingProductId } = useSavedGifts()
  const saved = isSaved(productId)
  const pending = pendingProductId === productId

  return (
    <button
      type="button"
      aria-label={saved ? 'Remove from saved gifts' : 'Save gift'}
      aria-pressed={saved}
      disabled={pending}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void toggleSave(productId)
      }}
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm transition-colors hover:bg-white',
        saved && 'text-primary',
        className,
      )}
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Heart className={cn('size-4', saved && 'fill-current')} />
      )}
    </button>
  )
}
