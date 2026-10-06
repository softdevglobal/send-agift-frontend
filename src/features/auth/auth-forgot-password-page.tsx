import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/common/brand-logo'
import { LoginBrandPanel } from '@/features/auth/login-brand-panel'
import { ForgotPasswordForm } from '@/features/auth/forgot-password-form'
import type { AuthRole } from '@/features/auth/types'

export function AuthForgotPasswordPage({ role }: { role: Extract<AuthRole, 'customer' | 'seller'> }) {
  const backTo = role === 'seller' ? '/seller/login' : '/login'

  return (
    <main className="flex h-svh overflow-hidden bg-background">
      <LoginBrandPanel role={role} />
      <section className="relative flex flex-1 flex-col overflow-y-auto bg-grain bg-cream/60">
        <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <div className="flex items-center gap-4">
            <Link
              to={backTo}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
            <BrandLogo className="lg:hidden" imgClassName="h-12" />
          </div>
        </header>
        <div className="flex flex-1 items-center px-6 py-8 sm:px-10">
          <ForgotPasswordForm role={role} />
        </div>
      </section>
    </main>
  )
}
