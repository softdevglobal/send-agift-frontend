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

      <section className="relative flex flex-1 flex-col overflow-y-auto bg-grain bg-background">
        <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <div className="flex items-center gap-4">
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>

            <BrandLogo className="lg:hidden" imgClassName="h-12" />
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Customer login
            </Link>
            <Button asChild size="sm" variant="outline" className="h-9 px-3">
              <Link to="/seller/register">Create seller account</Link>
            </Button>
          </div>
        </header>

        <div className="flex flex-1 items-start px-6 py-8 sm:items-center sm:px-10">
          <CustomerRegisterForm />
        </div>

        <footer className="px-6 pb-6 text-center text-xs text-muted-foreground sm:px-10 sm:text-left">
          By continuing you agree to SendAgift country terms and privacy notices.
        </footer>
      </section>
    </main>
  )
}
