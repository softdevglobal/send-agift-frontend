import { useEffect, useRef, useState } from 'react'
import { Check, ShoppingBag, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useCart } from '@/features/customer-commerce/cart-context'
import { getCatalogProduct } from '@/features/customer-commerce/catalog'
import { formatPriceAmount } from '@/lib/money'

/** How long the confirmation stays when the pointer is not on it. */
const SHOW_MS = 4500

let audio: AudioContext | null = null

/**
 * A short, quiet two-note "pop" made in the browser, so there is no sound
 * file to load. It plays only from a click (browsers require one for sound),
 * and a phone that supports it gives a short buzz as well.
 */
function playAddedSound() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    audio ??= new Ctx()
    if (audio.state === 'suspended') void audio.resume()
    const now = audio.currentTime
    for (const [index, frequency] of [660, 990].entries()) {
      const start = now + index * 0.08
      const tone = audio.createOscillator()
      const volume = audio.createGain()
      tone.type = 'sine'
      tone.frequency.setValueAtTime(frequency, start)
      volume.gain.setValueAtTime(0.0001, start)
      volume.gain.exponentialRampToValueAtTime(0.08, start + 0.015)
      volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)
      tone.connect(volume).connect(audio.destination)
      tone.start(start)
      tone.stop(start + 0.18)
    }
  } catch {
    // No sound is fine; the confirmation still shows.
  }
  try {
    navigator.vibrate?.(25)
  } catch {
    // Not every browser allows it.
  }
}

/**
 * "Added to your cart": the gift's photo, name, quantity and price, how
 * many items the cart now holds, and a way to the cart. It slides in after
 * every add, plays a short sound, and closes by itself unless the pointer
 * rests on it. Screen readers hear it through a polite live region.
 */
export function CartAddedToast() {
  const { lastAdded, dismissAdded, itemCount } = useCart()
  const [paused, setPaused] = useState(false)
  const lastSound = useRef(0)

  useEffect(() => {
    if (!lastAdded || lastAdded.at === lastSound.current) return
    lastSound.current = lastAdded.at
    playAddedSound()
  }, [lastAdded])

  useEffect(() => {
    if (!lastAdded || paused) return
    const timer = window.setTimeout(dismissAdded, SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [lastAdded, paused, dismissAdded])

  const product = lastAdded ? getCatalogProduct(lastAdded.productId) : null

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:justify-end">
      {lastAdded && product ? (
        <div
          key={lastAdded.at}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="pointer-events-auto flex w-full max-w-sm animate-in items-start gap-3 rounded-2xl border border-brand-ink/15 bg-card p-3 shadow-xl duration-300 fade-in slide-in-from-bottom-4 dark:border-border"
        >
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-accent">
            {product.image ? <img src={product.image} alt="" className="size-full object-cover" /> : null}
            <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-card">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Added to your cart</p>
            <p className="truncate text-sm font-medium">
              {product.name}
              {lastAdded.quantity > 1 ? ` × ${lastAdded.quantity}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {product.priceAmount != null && product.currency
                ? `${formatPriceAmount(product.priceAmount * lastAdded.quantity, product.currency)} · `
                : ''}
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
            </p>
            <div className="mt-2.5 flex gap-2">
              <Button asChild size="sm" className="h-8 rounded-full px-3">
                <Link to="/cart" onClick={dismissAdded}>
                  <ShoppingBag className="size-3.5" />
                  View cart
                </Link>
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 rounded-full px-3" onClick={dismissAdded}>
                Keep shopping
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissAdded}
            aria-label="Close"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
