import { useEffect, useState } from 'react'
import { LogOut, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { getAdminMe, type Admin } from '@/api/admin'
import { BrandLogo } from '@/components/common/brand-logo'
import { PortalTopBar } from '@/components/common/portal-top-bar'
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
    <nav className="flex flex-1 flex-col gap-6">
      {groups.map((group) => (
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
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-brand-violet text-white'
                      : 'text-white/65 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-md transition-colors',
                        isActive ? 'bg-brand-teal text-brand-ink' : 'bg-white/8 text-current',
                      )}
                    >
                      <item.icon className="size-4" />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.showsUnread && unreadMessages > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-brand-teal px-1.5 text-[10px] font-bold text-brand-ink">
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
  useStorefrontTheme()
  // On <body> too, so dialogs and sheets portalled out of the shell match.
  useEffect(() => {
    document.body.classList.add('admin-portal')
    return () => document.body.classList.remove('admin-portal')
  }, [])
  const { role, logout } = useAuth()
  const { unreadTotal } = useSharedInbox()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
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

  const roleLabel = adminRoleLabel(role)

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

        <Sparkle className="absolute top-5 right-6 hidden size-5 text-brand-violet lg:block" />
        <div className="relative mb-7 flex items-start gap-2 px-2">
          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-lg bg-white p-1">
              <BrandLogo to="/admin" className="max-w-full" imgClassName="h-11" />
            </span>
            <p className="mt-2.5 w-fit rounded-md bg-brand-teal px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-brand-ink uppercase">
              Admin console
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
        <div className="relative mt-6 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-teal text-xs font-extrabold text-brand-ink">
              {adminInitials(admin)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
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
              className="size-9 shrink-0 text-white/65 hover:bg-white/10 hover:text-white"
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
        <PortalTopBar
          pages={adminNavGroups
            .flatMap((group) => group.items)
            .filter((item) => !item.roles || (role !== null && item.roles.includes(role)))}
          portalLabel="Admin console"
          inboxTo="/admin/inbox"
          onOpenMenu={() => setMenuOpen(true)}
          statusLabel={roleLabel}
          unreadMessages={unreadTotal}
        />

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <div className="account-box relative mx-auto w-full max-w-6xl px-3 pt-4 pb-8 sm:px-4 lg:px-6 lg:pt-5 lg:pb-10">
            {/* The role in this sign-in was fixed when it was issued; after a
                role change, the new one only applies once you sign in again. */}
            {admin?.role && role && admin.role !== role ? (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
