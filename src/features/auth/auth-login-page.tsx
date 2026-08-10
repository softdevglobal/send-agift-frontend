import { Gift } from 'lucide-react'
import { Link } from 'react-router-dom'

import { LoginBrandPanel } from '@/features/auth/login-brand-panel'
import { LoginForm } from '@/features/auth/login-form'
import type { AuthRole } from '@/features/auth/types'
import { cn } from '@/lib/utils'

type AuthLoginPageProps = {
  role: AuthRole
}

export function AuthLoginPage({ role }: AuthLoginPageProps) {
  const isSeller = role === 'seller'

  return (
    <main className="flex min-h-svh bg-background">
      <LoginBrandPanel role={role} />

      <section
        className={cn(
          'relative flex flex-1 flex-col bg-grain',
          isSeller ? 'bg-cream/60' : 'bg-background'
        )}
      >
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80 lg:invisible"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Gift className="size-4" strokeWidth={1.75} />
            </span>
            <span className="font-display text-xl tracking-tight">SendAgift</span>
          </Link>

          <Link
            to={isSeller ? '/login' : '/seller/login'}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {isSeller ? 'Customer login' : 'Seller login'}
          </Link>
        </header>

        <div className="flex flex-1 items-center px-6 py-8 sm:px-10">
          <LoginForm role={role} />
        </div>

        <footer className="px-6 pb-6 text-center text-xs text-muted-foreground sm:px-10 sm:text-left">
          By continuing you agree to SendAgift country terms and privacy notices.
        </footer>
      </section>
    </main>
  )
}
