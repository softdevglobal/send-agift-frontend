import { Heart, PackageSearch, ShoppingBag, UserRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import type { AuthLocationState } from '@/lib/auth'
import { readPendingCartAdd } from '@/lib/pending-intent'

type Reason = { icon: typeof ShoppingBag; title: string; body: string; image?: string }

/** Why a page sent the customer to sign in, by where they were going. */
function reasonForPath(from: string): Reason | null {
  const path = from.split('?')[0]
  if (path === '/orders' || path.startsWith('/orders/')) {
    return {
      icon: PackageSearch,
      title: 'Sign in to track your orders',
      body: 'Your orders are kept with your account. You will go straight back to order tracking.',
    }
  }
  if (path === '/checkout') {
    return {
      icon: ShoppingBag,
      title: 'Sign in to check out',
      body: 'Your cart is kept. You will go straight back to checkout.',
    }
  }
  if (path.startsWith('/account/saved')) {
    return {
      icon: Heart,
      title: 'Sign in to see your saved gifts',
      body: 'Saved gifts are kept with your account.',
    }
  }
  if (path.startsWith('/account')) {
    return {
      icon: UserRound,
      title: 'Sign in to your account',
      body: 'You will go straight back to the page you opened.',
    }
  }
  return null
}

/**
 * Above the customer sign-in and sign-up forms: what the customer was doing
 * when they were asked to sign in. A guest who pressed "Add to cart" sees
 * that gift and is told it will be added; a guest following "Track order"
 * is told why tracking needs an account. Nothing shows for a plain sign-in.
 */
export function SignInReason() {
  const location = useLocation()
  const from = (location.state as AuthLocationState | null)?.from
  const pending = readPendingCartAdd()

  let reason: Reason | null = null
  // The saved cart add only counts when this sign-in came from that page (or
  // from nowhere in particular, as after switching to sign-up).
  if (pending && (!from || from === pending.returnTo)) {
    reason = {
      icon: ShoppingBag,
      image: pending.image,
      title: `Sign in to add ${pending.name} to your cart`,
      body:
        pending.quantity > 1
          ? `${pending.quantity} will go in your cart as soon as you are signed in or have created your account.`
          : 'It goes in your cart as soon as you are signed in or have created your account.',
    }
  } else if (from) {
    reason = reasonForPath(from)
  }
  if (!reason) return null

  const Icon = reason.icon
  return (
    <div
      role="status"
      className="animate-fade-up mx-auto mb-6 flex w-full max-w-[30rem] min-w-0 items-center gap-3 rounded-2xl border border-brand-violet/25 bg-brand-violet/5 p-3"
    >
      {reason.image ? (
        <img src={reason.image} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-violet text-white">
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-bold text-brand-ink dark:text-foreground">{reason.title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{reason.body}</p>
      </div>
    </div>
  )
}
