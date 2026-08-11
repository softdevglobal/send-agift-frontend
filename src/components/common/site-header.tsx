import { useState, type FormEvent } from 'react'
import {
  ChevronDown,
  Heart,
  HelpCircle,
  Menu,
  Search,
  ShoppingBag,
  Store,
  Truck,
  User,
  X,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import { BrandLogo } from '@/components/common/brand-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { giftCategories } from '@/features/marketing/data'
import { cn } from '@/lib/utils'

const utilityLinks = [
  { to: '/customer', label: 'Track order', icon: Truck },
  { to: '/become-a-seller', label: 'Sell', icon: Store },
  { to: '/customer', label: 'Help & Contact', icon: HelpCircle },
]

const categoryNav = [
  { to: '/customer', label: 'Shop by category' },
  ...giftCategories.map((category) => ({
    to: `/customer#${category.id}`,
    label: category.name,
  })),
  { to: '/customer', label: 'Deals' },
  { to: '/customer', label: 'Competitions' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-md">
      <div className="hidden border-b border-border/60 bg-muted/50 text-xs text-muted-foreground md:block">
        <div className="mx-auto flex h-9 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {utilityLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
              >
                <link.icon className="size-3.5" />
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="transition-colors hover:text-primary">
              Hi! <span className="font-medium text-foreground">Sign in</span>
            </Link>
            <span className="text-border">|</span>
            <Link
              to="/customer/register"
              className="transition-colors hover:text-primary"
            >
              Register
            </Link>
            <Link
              to="/customer"
              className="inline-flex items-center gap-1 transition-colors hover:text-primary"
            >
              <Heart className="size-3.5" />
              Watchlist
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 transition-colors hover:text-primary"
            >
              <User className="size-3.5" />
              My SendAgift
            </Link>
          </div>
        </div>
      </div>

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
              <option value="all">All categories</option>
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
            aria-label="Search"
          >
            <Search className="size-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            asChild
            aria-label="Watchlist"
          >
            <Link to="/customer">
              <Heart className="size-4.5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="Account">
            <Link to="/login">
              <User className="size-4.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Cart"
          >
            <ShoppingBag className="size-4.5" />
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              0
            </span>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="ml-1 hidden h-9 px-3 lg:inline-flex"
          >
            <Link to="/become-a-seller">Sell</Link>
          </Button>
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

      <div className="hidden border-t border-border/60 md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-4 py-2.5 text-sm sm:px-6 lg:px-8">
          {categoryNav.map((item, index) => (
            <NavLink
              key={`${item.label}-${index}`}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'shrink-0 whitespace-nowrap transition-colors hover:text-primary',
                  index === 0
                    ? 'font-semibold text-foreground'
                    : 'text-foreground/75',
                  isActive && item.to !== '/customer' && 'text-primary'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

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
              Search
            </Button>
          </form>
          <nav className="flex flex-col gap-1">
            {utilityLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
            {giftCategories.map((item) => (
              <Link
                key={item.id}
                to={`/customer#${item.id}`}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}
            <Button asChild className="mt-2">
              <Link to="/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/customer/register" onClick={() => setOpen(false)}>
                Register
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/become-a-seller" onClick={() => setOpen(false)}>
                Become a Seller
              </Link>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
