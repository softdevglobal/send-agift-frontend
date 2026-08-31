import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Store, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { getCustomerMe, type CustomerDetails } from '@/api/customers'
import { Button } from '@/components/ui/button'
import { accountNavGroups } from '@/features/account/account-nav'
import { useAuth } from '@/features/auth/auth-context'
import { customerDisplayName, customerInitials } from '@/features/customer-commerce'
import { homePathForRole, returnToState } from '@/lib/auth'
import { cn } from '@/lib/utils'

type AccountMenuProps = {
  /** Icon-only trigger for the compact header row. */
  compact?: boolean
  className?: string
}

export function AccountMenu({ compact = false, className }: AccountMenuProps) {
  const { isAuthenticated, role, logout } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<CustomerDetails | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isCustomer = isAuthenticated && role === 'customer'

  useEffect(() => {
    if (!isCustomer) {
      setProfile(null)
      return
    }
    let cancelled = false
    getCustomerMe()
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch(() => {
        // The greeting is decorative — a failure here must not break the header.
      })
    return () => {
      cancelled = true
    }
  }, [isCustomer])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const greeting = profile ? customerDisplayName(profile) : 'My account'

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="ghost"
        size={compact ? 'icon' : 'sm'}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={compact ? undefined : 'h-9 gap-1.5 rounded-full px-2.5'}
      >
        {isCustomer && profile?.image_url ? (
          <img src={profile.image_url} alt="" className="size-5 rounded-full object-cover" />
        ) : (
          <User className="size-4.5" />
        )}
        {compact ? null : (
          <>
            <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
              {isAuthenticated ? greeting : 'Sign in'}
            </span>
            <ChevronDown
              className={cn('size-3.5 transition-transform', open && 'rotate-180')}
            />
          </>
        )}
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-lg"
        >
          {isCustomer ? (
            <>
              <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
                {profile?.image_url ? (
                  <img
                    src={profile.image_url}
                    alt=""
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {customerInitials(profile)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{greeting}</p>
                  {profile?.email ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {profile.email}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="py-1.5">
                {accountNavGroups.map((group) => (
                  <div key={group.label} className="py-0.5">
                    <p className="px-4 py-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                      {group.label}
                    </p>
                    {group.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        className="flex items-start gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <item.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block font-medium">{item.label}</span>
                          {item.hint ? (
                            <span className="block text-xs text-muted-foreground">
                              {item.hint}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 py-1.5">
                <Link
                  to="/become-a-seller"
                  role="menuitem"
                  className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <Store className="size-4 shrink-0 text-muted-foreground" />
                  Start selling
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <LogOut className="size-4 shrink-0 text-muted-foreground" />
                  Sign out
                </button>
              </div>
            </>
          ) : isAuthenticated && role ? (
            <div className="py-1.5">
              <Link
                to={homePathForRole(role)}
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted"
              >
                <User className="size-4 shrink-0 text-muted-foreground" />
                <span className="capitalize">{role} portal</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted"
              >
                <LogOut className="size-4 shrink-0 text-muted-foreground" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="p-4">
              <p className="text-sm font-medium">Welcome to SendAgift</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Sign in to track orders, save gifts, and manage addresses.
              </p>
              <Button asChild className="mt-3 h-9 w-full rounded-full">
                <Link to="/login" state={returnToState(location.pathname, location.search)}>
                  Sign in
                </Link>
              </Button>
              <p className="mt-2.5 text-center text-xs text-muted-foreground">
                New here?{' '}
                <Link to="/register" className="font-medium text-primary hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
