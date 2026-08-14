import { useState, type FormEvent } from 'react'
import { LogOut, Menu, Search, ShoppingBag, X } from 'lucide-react'
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import { BrandLogo } from '@/components/common/brand-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/auth-context'
import { useCart } from '@/features/customer-commerce/cart-context'
import {
  customerAccountNav,
  customerPrimaryNav,
} from '@/features/customer-commerce/customer-nav'
import { cn } from '@/lib/utils'

function CustomerNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { itemCount } = useCart()

  return (
    <>
      <p className="px-3 pb-2 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Shopping
      </p>
      {customerPrimaryNav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all',
              isActive
                ? 'bg-accent text-accent-foreground shadow-[inset_3px_0_0_0_var(--color-primary)]'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )
          }
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-background/80 text-current ring-1 ring-border/40">
            <item.icon className="size-4" />
          </span>
          <span className="flex-1">{item.label}</span>
          {item.to === '/customer/cart' && itemCount > 0 ? (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {itemCount}
            </span>
          ) : null}
        </NavLink>
      ))}
      <p className="mt-7 px-3 pb-2 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Account
      </p>
      {customerAccountNav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all',
              isActive
                ? 'bg-accent text-accent-foreground shadow-[inset_3px_0_0_0_var(--color-primary)]'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )
          }
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-background/80 ring-1 ring-border/40">
            <item.icon className="size-4" />
          </span>
          {item.label}
        </NavLink>
      ))}
    </>
  )
}

export function CustomerShell() {
  const { logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')

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

  return (
    <div className="flex min-h-svh flex-col bg-cream">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>

          <BrandLogo to="/customer" imgClassName="h-10" />

          <form
            onSubmit={handleSearch}
            className="relative mx-auto hidden min-w-0 flex-1 md:block lg:max-w-lg"
          >
            <label className="sr-only" htmlFor="customer-search">
              Search gifts
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="customer-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search gifts, categories, shops…"
              className="h-10 rounded-full border-border/60 bg-muted/40 pr-4 pl-10 shadow-none"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              asChild
              aria-label="Cart"
            >
              <Link to="/customer/cart">
                <ShoppingBag className="size-4.5" />
                {itemCount > 0 ? (
                  <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {itemCount}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-3"
              onClick={logout}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <nav className="border-b border-border bg-background px-3 py-4 lg:hidden">
          <form onSubmit={handleSearch} className="mb-4">
            <label className="sr-only" htmlFor="customer-search-mobile">
              Search gifts
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="customer-search-mobile"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search gifts…"
                className="h-10 rounded-full bg-muted/40 pr-4 pl-9"
              />
            </div>
          </form>
          <CustomerNavLinks onNavigate={() => setMenuOpen(false)} />
        </nav>
      ) : null}

      <div className="flex flex-1">
        <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] w-60 shrink-0 overflow-y-auto border-r border-border/50 bg-background/70 px-3 py-6 lg:flex lg:flex-col">
          <nav className="flex flex-1 flex-col">
            <CustomerNavLinks />
          </nav>
          <p className="mt-8 px-3 text-[11px] leading-relaxed text-muted-foreground">
            Customer portal
          </p>
        </aside>

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-16 size-[22rem] rounded-full bg-[oklch(0.92_0.03_125/0.28)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-40 -right-20 size-[18rem] rounded-full bg-[oklch(0.93_0.03_80/0.22)]"
          />
          <div className="relative mx-auto w-full max-w-6xl px-3 py-8 sm:px-4 lg:px-5 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
