import { useEffect, useState, type FormEvent } from 'react'
import { LogOut, Menu, Search, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { getSellerMe, type SellerDetails } from '@/api/sellers'
import { BrandLogo } from '@/components/common/brand-logo'
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
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/auth-context'
import { sellerNavGroups } from '@/features/seller/seller-nav'
import {
  sellerDisplayName,
  sellerInitials,
  sellerVerificationLabel,
} from '@/features/seller/seller-utils'
import { publishSellerToMarketplace } from '@/lib/published-catalog'
import { cn } from '@/lib/utils'

function SellerNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-6">
      {sellerNavGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:bg-white/6 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-lg ring-1 transition-colors',
                        isActive
                          ? 'bg-white/10 text-white ring-white/15'
                          : 'bg-white/5 text-current ring-white/10',
                      )}
                    >
                      <item.icon className="size-4" />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function SellerShell() {
  const { logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
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

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  const statusLabel = profile
    ? sellerVerificationLabel(profile.verification_status)
    : null

  return (
    <div className="flex min-h-svh bg-cream">
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
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[oklch(0.24_0.02_120)] px-3 py-5 transition-transform duration-300 lg:sticky lg:top-0 lg:h-svh lg:w-64 lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-10 size-56 rounded-full bg-[oklch(0.72_0.09_125/0.14)] blur-2xl"
        />

        <div className="relative mb-7 flex items-start gap-2 px-2">
          <div className="min-w-0 flex-1">
            <BrandLogo to="/seller" onDark className="max-w-full" imgClassName="h-9" />
            <p className="mt-1.5 text-[10px] font-medium tracking-[0.18em] text-white/45 uppercase">
              Seller portal
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="relative flex-1 overflow-y-auto">
          <SellerNavLinks onNavigate={() => setMenuOpen(false)} />
        </div>

        <div className="relative mt-6 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white ring-1 ring-white/15">
              {profile ? sellerInitials(profile) : 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
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
            className="mt-3 h-9 w-full justify-start rounded-lg px-2.5 text-sm text-white/60 hover:bg-white/10 hover:text-white"
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
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:px-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
            </Button>

            <form
              onSubmit={handleSearch}
              className="relative min-w-0 flex-1 md:max-w-sm"
            >
              <label className="sr-only" htmlFor="seller-search">
                Search the portal
              </label>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="seller-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search gifts, shops…"
                className="h-10 rounded-full border-border/60 bg-muted/40 pr-4 pl-10 shadow-none"
              />
            </form>

            <div className="ml-auto flex items-center gap-2">
              {statusLabel ? (
                <span className="hidden rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground sm:inline">
                  {statusLabel}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-16 size-[22rem] rounded-full bg-[oklch(0.92_0.03_125/0.28)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-40 -right-20 size-[18rem] rounded-full bg-[oklch(0.93_0.03_80/0.22)]"
          />
          <div className="relative mx-auto w-full max-w-6xl px-3 py-8 sm:px-4 lg:px-6 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
