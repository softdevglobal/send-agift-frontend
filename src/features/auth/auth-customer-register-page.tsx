import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/common/brand-logo'
import { Button } from '@/components/ui/button'
import { CustomerRegisterForm } from '@/features/auth/customer-register-form'
import { LoginBrandPanel } from '@/features/auth/login-brand-panel'

export function AuthCustomerRegisterPage() {
  return (
    <main className="flex h-svh overflow-hidden bg-background">
      <LoginBrandPanel role="customer" variant="signup" />

      <section className="relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-grain bg-background">
        <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 rounded-full px-3 text-muted-foreground hover:text-foreground">
              <Link to="/products">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>

            <BrandLogo className="lg:hidden" imgClassName="h-12" />
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="h-9 rounded-full bg-background/70 px-4 font-medium">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden h-9 rounded-full bg-background/70 px-4 font-medium sm:inline-flex">
              <Link to="/seller/register">Create seller account</Link>
            </Button>
          </div>
        </header>

        <div className="flex min-w-0 flex-1 items-start px-5 py-4 sm:items-center sm:px-10 sm:py-8">
          <CustomerRegisterForm />
        </div>

        <footer className="px-6 pb-6 text-center text-xs text-muted-foreground sm:px-10 sm:text-left">
          By continuing you agree to SendAgift country terms and privacy notices.
        </footer>
      </section>
    </main>
  )
}
