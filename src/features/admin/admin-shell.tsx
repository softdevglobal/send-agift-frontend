import { useEffect, useState, type FormEvent } from 'react'
import { LogOut, Menu, Search, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { getAdminMe, type Admin } from '@/api/admin'
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
import { adminNavGroups } from '@/features/admin/admin-nav'
import { adminInitials, adminRoleLabel } from '@/features/admin/admin-utils'
import { useAuth } from '@/features/auth/auth-context'
import { InboxProvider, useSharedInbox } from '@/features/messaging'
import type { UserRole } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { ReauthDialog } from './reauth-dialog'

function AdminNavLinks({
  onNavigate,
  unreadMessages,
  role,
}: {
  onNavigate?: () => void
  unreadMessages: number
  role: UserRole | null
}) {
  // Some sections (games and competitions) are for superadmins only.
  const groups = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (role !== null && item.roles.includes(role)),
      ),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <nav className="flex flex-1 flex-col gap-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase">
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
                    'group flex items-center gap-3 rounded-xl px-2.5 py-1 text-sm font-medium transition-all',
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
                        'flex size-7 items-center justify-center rounded-lg ring-1 transition-colors',
                        isActive
                          ? 'bg-white/10 text-white ring-white/15'
                          : 'bg-white/5 text-current ring-white/10',
                      )}
                    >
                      <item.icon className="size-4" />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.showsUnread && unreadMessages > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-semibold text-[oklch(0.24_0.02_120)]">
                        <span className="sr-only">Unread messages: </span>
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    ) : null}
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

/** The inbox is shared so the sidebar badge and the Inbox page poll once, together. */
export function AdminShell() {
  return (
    <InboxProvider>
      <AdminShellLayout />
    </InboxProvider>
  )
}

function AdminShellLayout() {
  const { role, logout } = useAuth()
  const { unreadTotal } = useSharedInbox()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [signOutOpen, setSignOutOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAdminMe()
      .then((data) => {
        if (!cancelled) setAdmin(data)
      })
      .catch(() => {
        // Sidebar identity is decorative. Pages surface their own load errors.
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

  const roleLabel = adminRoleLabel(role)

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
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[oklch(0.24_0.02_120)] px-3 py-4 transition-transform duration-300 lg:sticky lg:top-0 lg:h-svh lg:w-64 lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-10 size-56 rounded-full bg-[oklch(0.72_0.09_125/0.14)] blur-2xl"
        />

        <div className="relative mb-3 flex items-start gap-2 px-2">
          <div className="min-w-0 flex-1">
            <BrandLogo to="/admin" onDark className="max-w-full" imgClassName="h-9" />
            <p className="mt-1 text-[10px] font-medium tracking-[0.18em] text-white/45 uppercase">
              Console
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

        {/* min-h-0 lets this shrink and scroll only when the menu is taller
            than the window, instead of the list being cut to a small box. */}
        <div className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <AdminNavLinks
            onNavigate={() => setMenuOpen(false)}
            unreadMessages={unreadTotal}
            role={role}
          />
        </div>

        {/* One row. Who is signed in, and sign out. So the menu above
            keeps the height. */}
        <div className="relative mt-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white ring-1 ring-white/15">
              {adminInitials(admin)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {admin?.display_name?.trim() || admin?.email || 'Signed in'}
              </p>
              <p className="truncate text-[11px] text-white/45">{roleLabel}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Sign out"
              aria-label="Sign out"
              className="size-9 shrink-0 rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => setSignOutOpen(true)}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              You'll need to sign in again to access the admin console.
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
              <label className="sr-only" htmlFor="admin-search">
                Search the console
              </label>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="admin-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search countries, sellers…"
                className="h-10 rounded-full border-border/60 bg-muted/40 pr-4 pl-10 shadow-none"
              />
            </form>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground sm:inline">
                {roleLabel}
              </span>
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
            {/* The role in this sign-in was fixed when it was issued; after a
                role change, the new one only applies once you sign in again. */}
            {admin?.role && role && admin.role !== role ? (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <p>
                  Your role is now <span className="font-semibold">{adminRoleLabel(admin.role as UserRole)}</span>.
                  Sign out and back in to use it.
                </p>
                <Button type="button" size="sm" className="h-8" onClick={() => setSignOutOpen(true)}>
                  Sign out
                </Button>
              </div>
            ) : null}
            <Outlet />
            <ReauthDialog />
          </div>
        </main>
      </div>
    </div>
  )
}
