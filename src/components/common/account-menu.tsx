import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, MessageSquare, Store, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { getCustomerMe, type CustomerDetails } from '@/api/customers'
import { SignOutDialog } from '@/components/common/sign-out-dialog'
import { Button } from '@/components/ui/button'
import { accountNavGroups } from '@/features/account/account-nav'
import { useAuth } from '@/features/auth/auth-context'
import { customerDisplayName, customerFirstName, customerInitials } from '@/features/customer-commerce'
import { useCustomerMessages } from '@/features/messaging'
import { homePathForRole, returnToState } from '@/lib/auth'
import { cn } from '@/lib/utils'

type AccountMenuProps = {
  /** Icon-only trigger for the compact header row. */
  compact?: boolean
  className?: string
}

/** One row of the dropdown: a box that fills with ink under the pointer. */
const menuItemClass =
  'mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-ink hover:text-white focus-visible:bg-brand-ink focus-visible:text-white focus-visible:outline-none dark:text-foreground'

export function AccountMenu({ compact = false, className }: AccountMenuProps) {
  const { isAuthenticated, role, logout } = useAuth()
  const { unreadCount, openMessages } = useCustomerMessages()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
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
        // The greeting is decorative. A failure here must not break the header.
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
  const shortGreeting = profile ? customerFirstName(profile) : 'Account'

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
        className={cn(
          'relative',
          compact ? undefined : 'h-10 gap-2 border-2 border-brand-ink/15 px-3 hover:border-brand-ink',
          open && !compact && 'border-brand-ink bg-brand-ink text-white hover:bg-brand-ink hover:text-white',
        )}
      >
        {isCustomer && unreadCount > 0 ? (
          <span
            aria-label={`${unreadCount} unread messages`}
            className="absolute top-1 left-5 size-2 rounded-full bg-[var(--brand-teal)] ring-2 ring-background"
          />
        ) : null}
        {isCustomer && profile?.image_url ? (
          <img src={profile.image_url} alt="" className="size-6 rounded-md object-cover" />
        ) : (
          <User className="size-4.5" />
        )}
        {compact ? null : (
          <>
            <span className="hidden max-w-40 truncate sm:inline">
              {isAuthenticated ? shortGreeting : 'Sign in'}
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
          className="absolute right-0 z-50 mt-2 flex max-h-[calc(100svh-5.5rem)] w-72 flex-col overflow-hidden rounded-xl border border-brand-ink/25 bg-popover shadow-lg"
        >
          {isCustomer ? (
            <>
              <div className="flex shrink-0 items-center gap-3 bg-brand-violet px-4 py-3.5 text-white">
                {profile?.image_url ? (
                  <img
                    src={profile.image_url}
                    alt=""
                    className="size-10 rounded-lg object-cover ring-2 ring-white"
                  />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-lg bg-white text-xs font-extrabold text-brand-ink">
                    {customerInitials(profile)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{greeting}</p>
                  {profile?.email ? (
                    <p className="truncate text-xs text-white/70">
                      {profile.email}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    openMessages()
                  }}
                  className={cn(menuItemClass, 'w-[calc(100%-1rem)] text-left')}
                >
                  <MessageSquare className="size-4 shrink-0" />
                  <span className="flex-1">Messages</span>
                  {unreadCount > 0 ? (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-brand-teal px-1.5 text-[10px] font-bold text-brand-ink">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null}
                </button>
                {accountNavGroups.map((group) => (
                  <div key={group.label} className="pt-1">
                    <p className="px-5 pt-2 pb-1 text-[10px] font-bold tracking-[0.18em] text-brand-ink/50 uppercase dark:text-muted-foreground">
                      {group.label}
                    </p>
                    {group.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        title={item.hint}
                        className={menuItemClass}
                      >
                        <item.icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>

              <div className="shrink-0 border-t-2 border-brand-ink bg-popover py-1">
                <Link
                  to="/become-a-seller"
                  role="menuitem"
                  className={menuItemClass}
                >
                  <Store className="size-4 shrink-0" />
                  Start selling
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    setSignOutOpen(true)
                  }}
                  className={cn(menuItemClass, 'w-[calc(100%-1rem)] text-left')}
                >
                  <LogOut className="size-4 shrink-0" />
                  Sign out
                </button>
              </div>
            </>
          ) : isAuthenticated && role ? (
            <div className="py-1.5">
              <Link
                to={homePathForRole(role)}
                role="menuitem"
                className={menuItemClass}
              >
                <User className="size-4 shrink-0" />
                <span className="capitalize">{role} portal</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  setSignOutOpen(true)
                }}
                className={cn(menuItemClass, 'w-[calc(100%-1rem)] text-left')}
              >
                <LogOut className="size-4 shrink-0" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="p-4">
              <p className="font-poster text-lg">Welcome to SendAgift</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Sign in to track orders, save gifts, and manage addresses.
              </p>
              <Button asChild className="mt-3 h-10 w-full">
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

      <SignOutDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        onConfirm={() => {
          setSignOutOpen(false)
          logout()
        }}
        description={
          isCustomer
            ? undefined
            : "You'll need to sign in again to access your portal."
        }
      />
    </div>
  )
}
