import { useEffect, useState, type FormEvent } from 'react'
import {
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  Store,
  User,
  X,
} from 'lucide-react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import { getCustomerMe, type CustomerDetails } from '@/api/customers'
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
import { useCart } from '@/features/customer-commerce/cart-context'
import { customerNavGroups } from '@/features/customer-commerce/customer-nav'
import {
  customerAccountStatus,
  customerDisplayName,
  customerInitials,
} from '@/features/customer-commerce/customer-utils'
import { useSavedGifts } from '@/features/customer-commerce/saved-gifts-context'
import { giftCategories } from '@/features/marketing/data'
import { cn } from '@/lib/utils'

function CustomerNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { gifts } = useSavedGifts()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  return (
    <nav className="flex flex-1 flex-col gap-5">
      {customerNavGroups.map((group) => {
        const key = group.label ?? group.items[0]?.to ?? 'nav'
        const isCollapsed = Boolean(group.label && collapsed[group.label])

        return (
          <div key={key}>
            {group.label ? (
              <button
                type="button"
                className="mb-1 flex w-full items-center justify-between px-3 py-1 text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase"
                onClick={() =>
                  setCollapsed((current) => ({
                    ...current,
                    [group.label!]: !current[group.label!],
                  }))
                }
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    'size-3.5 transition-transform',
                    isCollapsed && '-rotate-90',
                  )}
                />
              </button>
            ) : null}

            {isCollapsed ? null : (
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 rounded-r-xl py-2 pr-2.5 pl-3 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:bg-white/6 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? (
                          <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" />
                        ) : null}
                        <item.icon className="size-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.to === '/customer/saved-gifts' && gifts.length > 0 ? (
                          <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {gifts.length}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function categoryHref(id: string, query: string) {
  const params = new URLSearchParams()
  if (query.trim()) params.set('q', query.trim())
  if (id && id !== 'all') params.set('category', id)
  const suffix = params.toString()
  return `/customer${suffix ? `?${suffix}` : ''}`
}

export function CustomerShell() {
  const { logout } = useAuth()
  const { itemCount } = useCart()
  const { gifts } = useSavedGifts()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [profile, setProfile] = useState<CustomerDetails | null>(null)
  const [signOutOpen, setSignOutOpen] = useState(false)

  const activeCategory = searchParams.get('category') ?? 'all'
  const onCatalog = location.pathname === '/customer'

  useEffect(() => {
    let cancelled = false
    getCustomerMe()
      .then((data) => {
        if (!cancelled) setProfile(data)
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

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    const category = searchParams.get('category')
    if (category) params.set('category', category)
    const suffix = params.toString()
    navigate(`/customer${suffix ? `?${suffix}` : ''}`)
    setMenuOpen(false)
  }

  const statusLabel = profile ? customerAccountStatus(profile.status) : null
  const phoneLabel = profile?.phone?.trim() || profile?.email || 'Customer'

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-cream">
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <header className="sticky top-0 z-30 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-xl">
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

          <BrandLogo to="/customer" imgClassName="h-9" />

          <form
            onSubmit={handleSearch}
            className="relative mx-auto hidden min-w-0 flex-1 md:block md:max-w-xl"
          >
            <label className="sr-only" htmlFor="customer-search">
              Search gifts
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="customer-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product"
              className="h-10 rounded-full border-border/60 bg-muted/40 pr-4 pl-10 shadow-none"
            />
          </form>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Button
              variant="ghost"
              className="hidden h-9 gap-2 rounded-full px-3 text-sm font-medium lg:inline-flex"
              asChild
            >
              <Link to="/become-a-seller">
                <Store className="size-4" />
                Become a seller
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="relative h-9 gap-2 rounded-full px-2.5 text-sm font-medium sm:px-3"
              asChild
            >
              <Link to="/customer/saved-gifts">
                <Heart className="size-4" />
                <span className="hidden sm:inline">Wishlist</span>
                {gifts.length > 0 ? (
                  <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground sm:static sm:size-auto sm:rounded-full sm:px-1.5 sm:py-0.5">
                    {gifts.length}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="relative h-9 gap-2 rounded-full px-2.5 text-sm font-medium sm:px-3"
              asChild
            >
              <Link to="/customer/cart">
                <ShoppingCart className="size-4" />
                <span className="hidden sm:inline">Cart</span>
                {itemCount > 0 ? (
                  <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground sm:static sm:size-auto sm:rounded-full sm:px-1.5 sm:py-0.5">
                    {itemCount}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="h-9 gap-2 rounded-full px-2.5 text-sm font-medium sm:px-3"
              asChild
            >
              <Link to="/customer/profile">
                <User className="size-4" />
                <span className="hidden sm:inline">Account</span>
              </Link>
            </Button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="px-3 pb-3 md:hidden">
          <div className="relative">
            <label className="sr-only" htmlFor="customer-search-mobile">
              Search gifts
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="customer-search-mobile"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product"
              className="h-10 rounded-full border-border/60 bg-muted/40 pr-4 pl-10 shadow-none"
            />
          </div>
        </form>

        <nav
          aria-label="Gift categories"
          className="flex h-11 items-center gap-1 overflow-x-auto border-t border-border/40 px-3 sm:px-5 lg:px-6"
        >
          <Link
            to={categoryHref('all', query)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors',
              onCatalog && activeCategory === 'all'
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            All
          </Link>
          {giftCategories.map((item) => (
            <Link
              key={item.id}
              to={categoryHref(item.id, query)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                onCatalog && activeCategory === item.id
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[oklch(0.24_0.02_120)] px-3 py-5 transition-transform duration-300 lg:static lg:z-0 lg:h-full lg:w-64 lg:translate-x-0',
            menuOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-10 size-56 rounded-full bg-[oklch(0.72_0.09_125/0.14)] blur-2xl"
          />

          <div className="relative mb-4 flex items-center justify-end lg:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <X className="size-5" />
            </Button>
          </div>

          <form onSubmit={handleSearch} className="relative mb-5 md:hidden">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product"
              className="h-10 rounded-full border-white/10 bg-white/8 pr-4 pl-9 text-white shadow-none placeholder:text-white/40"
            />
          </form>

          <div className="relative flex-1 overflow-y-auto">
            <CustomerNavLinks onNavigate={() => setMenuOpen(false)} />
          </div>

          <div className="relative mt-6 border-t border-white/10 pt-4">
            <div className="flex items-center gap-3 px-2">
              <div className="relative shrink-0">
                {profile?.image_url ? (
                  <img
                    src={profile.image_url}
                    alt=""
                    className="size-9 rounded-full object-cover ring-1 ring-white/15"
                  />
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white ring-1 ring-white/15">
                    {customerInitials(profile)}
                  </div>
                )}
                <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-[oklch(0.72_0.14_145)] ring-2 ring-[oklch(0.24_0.02_120)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {profile ? customerDisplayName(profile) : 'Signed in'}
                </p>
                <p className="truncate text-[11px] text-white/45">
                  {phoneLabel}
                </p>
              </div>
            </div>
            {statusLabel ? (
              <p className="mt-2 px-2 text-[11px] text-white/40">{statusLabel}</p>
            ) : null}
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

        <main className="relative min-w-0 flex-1 overflow-y-auto">
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

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              You'll need to sign in again to access the customer portal.
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
    </div>
  )
}
