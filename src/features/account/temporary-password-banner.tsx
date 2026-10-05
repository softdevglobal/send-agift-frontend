import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

import { getCustomerMe } from '@/api/customers'
import { PASSWORD_CHANGED_EVENT } from '@/features/account/change-password-card'

/**
 * Accounts made for gift recipients start on a temporary password that was
 * emailed to them. Until they change it, every account page says so.
 */
export function TemporaryPasswordBanner() {
  const [temporary, setTemporary] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    let cancelled = false
    getCustomerMe()
      .then((me) => {
        if (!cancelled) setTemporary(Boolean(me.password_change_required))
      })
      .catch(() => {
        // Decorative: the pages surface their own errors.
      })
    const cleared = () => setTemporary(false)
    window.addEventListener(PASSWORD_CHANGED_EVENT, cleared)
    return () => {
      cancelled = true
      window.removeEventListener(PASSWORD_CHANGED_EVENT, cleared)
    }
  }, [])

  if (!temporary) return null

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-pink-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center">
      <ShieldAlert className="size-5 shrink-0 text-amber-700" />
      <p className="flex-1 text-sm text-amber-950">
        <strong>You’re using a temporary password.</strong> Set your own so only you can get into
        your account.
      </p>
      {pathname !== '/account/profile' ? (
        <Link
          to="/account/profile#password"
          className="shrink-0 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
        >
          Change password
        </Link>
      ) : null}
    </div>
  )
}
