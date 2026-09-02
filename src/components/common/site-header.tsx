import { useState, type FormEvent } from 'react'
import {
  ChevronDown,
  Gift,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  Store,
  X,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { AccountMenu } from '@/components/common/account-menu'
import { BrandLogo } from '@/components/common/brand-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { accountNavItems } from '@/features/account/account-nav'
import { useAuth } from '@/features/auth/auth-context'
import { useCart } from '@/features/customer-commerce'
import { returnToState } from '@/lib/auth'
import { giftCategories } from '@/features/marketing/data'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const { isAuthenticated, role, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const loginState = returnToState(location.pathname, location.search)
  const isCustomer = isAuthenticated && role === 'customer'
  const isGuest = !isAuthenticated
  const activeCategory = new URLSearchParams(location.search).get('category')
  const onGifts = location.pathname === '/products'

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category && category !== 'all') params.set('category', category)
    const suffix = params.toString()
    navigate(`/products${suffix ? `?${suffix}` : ''}`)
    setOpen(false)
  }

  function closeMenu() {
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:gap-5 lg:px-8">
        <BrandLogo imgClassName="h-11 sm:h-12" />

        <form
          onSubmit={handleSearch}
          className="hidden min-w-0 flex-1 items-stretch md:flex"
        >
          <label className="sr-only" htmlFor="site-search">
            Search gifts
          </label>
          <div className="relative">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 appearance-none rounded-l-lg border border-r-0 border-input bg-muted/40 py-2 pr-8 pl-3 text-sm text-foreground outline-none focus-visible:z-10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
              aria-label="Search category"
            >
              <option value="all">All gifts</option>
              {giftCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Input
            id="site-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for gifts, sellers, occasions…"
            className="h-11 flex-1 rounded-none border-x-0 bg-background px-3"
          />
          <Button type="submit" className="h-11 rounded-l-none px-5">
            <Search className="size-4" />
            Search
          </Button>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Search gifts"
            asChild
          >
            <Link to="/products">
              <Search className="size-4.5" />
            </Link>
          </Button>

          {isGuest ? (
            <>
              <Button
                asChild
                variant="ghost"
                className="hidden h-9 px-3 md:inline-flex"
              >
                <Link to="/login" state={loginState}>
                  Sign in
                </Link>
              </Button>
              <Button asChild className="h-9 rounded-full px-3.5 sm:px-4">
                <Link to="/register">Sign up</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex"
                asChild
                aria-label="Watchlist"
              >
                <Link to={isCustomer ? '/account/saved-gifts' : '/login'}>
                  <Heart className="size-4.5" />
                </Link>
              </Button>
              <AccountMenu />
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            asChild
            aria-label="Cart"
          >
            <Link to="/cart">
              <ShoppingBag className="size-4.5" />
              {itemCount > 0 ? (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {itemCount}
                </span>
              ) : null}
            </Link>
          </Button>

          {role !== 'seller' ? (
            <Button
              asChild
              variant="outline"
              className="ml-1 hidden h-9 px-3 md:inline-flex"
            >
              <Link to="/become-a-seller">Become a seller</Link>
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      <nav
        aria-label="Gift categories"
        className="hidden border-t border-border/50 md:block"
      >
        <div className="mx-auto flex h-11 max-w-6xl items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/products"
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground',
              onGifts && !activeCategory
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground',
            )}
          >
            All gifts
          </Link>
          {giftCategories.map((item) => {
            const active = onGifts && activeCategory === item.id
            return (
              <Link
                key={item.id}
                to={`/products?category=${item.id}`}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-muted hover:text-foreground',
                  active
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {open ? (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <form onSubmit={handleSearch} className="mb-4 space-y-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search gifts, sellers…"
              className="h-10 bg-background"
            />
            <Button type="submit" className="h-10 w-full">
              <Search className="size-4" />
              Search gifts
            </Button>
          </form>
          <nav className="flex flex-col gap-1">
            <Link
              to="/products"
              onClick={closeMenu}
              className="flex items-center gap-2.5 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-foreground"
            >
              <Gift className="size-4" />
              Browse gifts
            </Link>

            {isGuest ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button asChild>
                  <Link to="/login" state={loginState} onClick={closeMenu}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/register" onClick={closeMenu}>
                    Sign up
                  </Link>
                </Button>
              </div>
            ) : null}

            <p className="mt-4 px-3 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Shop by occasion
            </p>
            {giftCategories.map((item) => (
              <Link
                key={item.id}
                to={`/products?category=${item.id}`}
                onClick={closeMenu}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}

            {isCustomer ? (
              <>
                <p className="mt-3 px-3 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  My account
                </p>
                {accountNavItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMenu}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                ))}
              </>
            ) : null}

            {role !== 'seller' ? (
              <Button asChild variant="outline" className="mt-3">
                <Link to="/become-a-seller" onClick={closeMenu}>
                  <Store className="size-4" />
                  Become a seller
                </Link>
              </Button>
            ) : null}

            {isAuthenticated ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  closeMenu()
                  logout()
                }}
              >
                Sign out
              </Button>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
