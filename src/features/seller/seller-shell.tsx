import { useEffect, useState } from 'react'
import { LogOut, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { getSellerMe, type SellerDetails } from '@/api/sellers'
import { BrandLogo } from '@/components/common/brand-logo'
import { Sparkle } from '@/components/common/storefront-decor'
import { useStorefrontTheme } from '@/components/common/use-storefront-theme'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/auth-context'
import { InboxProvider, useSharedInbox } from '@/features/messaging'
import { sellerNavGroups } from '@/features/seller/seller-nav'
import { SellerTopBar } from '@/features/seller/seller-top-bar'
import {
  sellerDisplayName,
  sellerInitials,
  sellerVerificationLabel,
} from '@/features/seller/seller-utils'
import { publishSellerToMarketplace } from '@/lib/published-catalog'
import { cn } from '@/lib/utils'

function SellerNavLinks({
  onNavigate,
  unreadMessages,
}: {
  onNavigate?: () => void
  unreadMessages: number
}) {
  return (
    <nav className="flex flex-1 flex-col gap-6">
      {sellerNavGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.18em] text-white/45 uppercase">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) => {
                  const active = isActive
                  return cn(
                    'group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-brand-teal text-brand-ink'
                      : 'text-white/65 hover:bg-white/10 hover:text-white',
                  )
                }}
              >
                {({ isActive }) => {
                  const active = isActive
                  return (
                    <>
                      <span
                        className={cn(
                          'flex size-8 items-center justify-center rounded-md transition-colors',
                          active ? 'bg-brand-ink text-white' : 'bg-white/8 text-current',
                        )}
                      >
                        <item.icon className="size-4" />
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.showsUnread && unreadMessages > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-brand-violet px-1.5 text-[10px] font-bold text-white">
                          <span className="sr-only">Unread messages: </span>
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                      ) : null}
                    </>
                  )
                }}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

/** The inbox is shared so the sidebar badge and the Inbox page poll once, together. */
export function SellerShell() {
  return (
    <InboxProvider>
      <SellerShellLayout />
    </InboxProvider>
  )
}

function SellerShellLayout() {
  useStorefrontTheme()
  // On <body> too, so dialogs and sheets portalled out of the shell match.
  useEffect(() => {
    document.body.classList.add('seller-portal')
    return () => document.body.classList.remove('seller-portal')
  }, [])
  const { logout } = useAuth()
  const { unreadTotal } = useSharedInbox()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profile, setProfile] = useState<SellerDetails | null>(null)
  const [signOutOpen, setSignOutOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSellerMe()
      .then((data) => {
        if (cancelled) return
        publishSellerToMarketplace(data)
        setProfile(data)
      })
      .catch(() => {
        // Sidebar identity is decorative — pages surface their own load errors.
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const statusLabel = profile
    ? sellerVerificationLabel(profile.verification_status)
    : null

  return (
    <div className="flex min-h-svh bg-background">
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden bg-brand-ink px-3 py-5 transition-transform duration-300 lg:sticky lg:top-0 lg:h-svh lg:w-64 lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >

        <Sparkle className="absolute top-6 right-6 hidden size-5 text-brand-teal lg:block" />
        <div className="relative mb-7 flex items-start gap-2 px-2">
          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-lg bg-white p-1">
              <BrandLogo to="/seller" className="max-w-full" imgClassName="h-11" />
            </span>
            <p className="mt-2.5 w-fit rounded-md bg-brand-violet px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
              Seller portal
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Scrolls when the list is taller than the screen, but without a grey
            scrollbar breaking up the ink sidebar. */}
        <div className="relative flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SellerNavLinks
            onNavigate={() => setMenuOpen(false)}
            unreadMessages={unreadTotal}
          />
        </div>

        <div className="relative mt-6 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-violet text-xs font-extrabold text-white">
              {profile ? sellerInitials(profile) : 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {profile ? sellerDisplayName(profile) : 'Signed in'}
              </p>
              <p className="truncate text-[11px] text-white/45">
                {statusLabel ?? 'Seller'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-9 w-full justify-start px-2.5 text-white/65 hover:bg-white/10 hover:text-white"
            onClick={() => setSignOutOpen(true)}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              You'll need to sign in again to access the seller portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-10">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" className="h-10" onClick={logout}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <SellerTopBar
          onOpenMenu={() => setMenuOpen(true)}
          statusLabel={statusLabel}
          unreadMessages={unreadTotal}
        />

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <div className="account-box relative mx-auto w-full max-w-6xl px-3 pt-4 pb-8 sm:px-4 lg:px-6 lg:pt-5 lg:pb-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
