import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { BrandLogo } from '@/components/common/brand-logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

type AccountNavItem = {
  to: string
  label: string
  end?: boolean
}

type AccountShellProps = {
  eyebrow: string
  title: string
  description?: string
  nav: AccountNavItem[]
  children: ReactNode
}

export function AccountShell({
  eyebrow,
  title,
  description,
  nav,
  children,
}: AccountShellProps) {
  const { logout, role } = useAuth()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLogo imgClassName="h-10" />
          <div className="flex items-center gap-3">
            {role ? (
              <span className="hidden rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium tracking-wide text-accent-foreground uppercase sm:inline">
                {role}
              </span>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={logout}>
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 space-y-2">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <h1 className="font-display text-3xl tracking-tight">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {nav.length > 1 ? (
          <nav className="mb-8 flex flex-wrap gap-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : null}

        {children}
      </main>
    </div>
  )
}
