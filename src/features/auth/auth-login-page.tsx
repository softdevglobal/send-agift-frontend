import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/common/brand-logo'
import { Button } from '@/components/ui/button'
import { LoginBrandPanel } from '@/features/auth/login-brand-panel'
import { LoginForm } from '@/features/auth/login-form'
import { loginCopy } from '@/features/auth/copy'
import type { AuthRole } from '@/features/auth/types'
import { cn } from '@/lib/utils'

type AuthLoginPageProps = {
  initialRole?: AuthRole
}

export function AuthLoginPage({ initialRole = 'customer' }: AuthLoginPageProps) {
  const role = initialRole
  const copy = loginCopy[role]
  const isSeller = role === 'seller'
  const isAdmin = role === 'admin'

  return (
    <main className="flex min-h-svh bg-background">
      <LoginBrandPanel role={role} />

      <section
        className={cn(
          'relative flex flex-1 flex-col bg-grain',
          isSeller || isAdmin ? 'bg-cream/60' : 'bg-background',
        )}
      >
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <BrandLogo className="lg:invisible" imgClassName="h-11" />

          <div className="flex items-center gap-4">
            <Link
              to={copy.registerTo}
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              {isSeller ? 'Register' : isAdmin ? 'Bootstrap' : 'Create account'}
            </Link>
            {isSeller || isAdmin ? (
              <Link
                to={copy.switchTo}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {copy.switchLabel}
              </Link>
            ) : (
              <Button asChild size="sm" variant="outline" className="h-9 px-3">
                <Link to="/become-a-seller">Become a seller</Link>
              </Button>
            )}
          </div>
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
