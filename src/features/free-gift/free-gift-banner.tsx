import { useEffect, useState } from 'react'
import { ArrowRight, Gift } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getFreeGiftStatus, listFreeGiftOffers, type FreeGiftStatus } from '@/api/free-gifts'
import { Sparkle } from '@/components/common/storefront-decor'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

/**
 * "You have 1 free gift", for a customer who has not sent theirs, and the
 * offer itself for a guest. Renders nothing when the program is off, the
 * gift is used, or there is nothing to send: it only ever shows what the API
 * says is true.
 */
export function FreeGiftBanner({ className }: { className?: string }) {
  const { isAuthenticated, role } = useAuth()
  const isCustomer = isAuthenticated && role === 'customer'
  const isGuest = !isAuthenticated
  const [status, setStatus] = useState<FreeGiftStatus | null>(null)
  const [hasOffers, setHasOffers] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStatus(null)
    setHasOffers(false)
    if (!isCustomer && !isGuest) return

    // A disabled program, or any failure, simply leaves the banner out.
    listFreeGiftOffers()
      .then((offers) => {
        if (!cancelled) setHasOffers(offers.length > 0)
      })
      .catch(() => undefined)
    if (isCustomer) {
      getFreeGiftStatus()
        .then((next) => {
          if (!cancelled) setStatus(next)
        })
        .catch(() => undefined)
    }
    return () => {
      cancelled = true
    }
  }, [isCustomer, isGuest])

  if (!hasOffers) return null
  if (isCustomer && (!status || status.used)) return null
  if (!isCustomer && !isGuest) return null

  const needsVerify = isCustomer && status ? status.missing.length > 0 : false

  return (
    <Link
      to="/free-gift"
      className={cn(
        'group relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl bg-brand-teal px-5 py-4 text-brand-ink sm:px-6',
        className,
      )}
    >
      <Sparkle className="absolute top-3 right-[28%] hidden size-5 text-white sm:block" />
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-ink text-white">
        <Gift className="size-5" />
      </span>
      <span className="min-w-0 flex-1 basis-48">
        <span className="block font-poster text-xl sm:text-2xl">
          {isCustomer ? 'You have 1 free gift' : 'Your first gift is free'}
        </span>
        <span className="mt-0.5 block text-sm font-medium text-brand-ink/75">
          {isCustomer
            ? needsVerify
              ? 'Verify your email and phone, then send it to someone. You pay nothing.'
              : 'Send it to someone special. The gift and delivery are on the seller.'
            : 'Create an account and send one gift on us. No payment needed.'}
        </span>
      </span>
      <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-brand-ink px-4 text-sm font-bold text-white transition-transform group-hover:translate-x-0.5">
        {isCustomer ? 'Send it' : 'See the gifts'}
        <ArrowRight className="size-4" />
      </span>
    </Link>
  )
}
