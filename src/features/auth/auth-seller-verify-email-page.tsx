import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/common/brand-logo'
import { LoginBrandPanel } from '@/features/auth/login-brand-panel'
import { SellerVerifyEmailForm } from '@/features/auth/seller-verify-email-form'

export function AuthSellerVerifyEmailPage() {
  return (
    <main className="flex h-svh overflow-hidden bg-background">
      <LoginBrandPanel role="seller" variant="signup" />

      <section className="relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-grain bg-cream/60">
        <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 rounded-full px-3 text-muted-foreground hover:text-foreground">
              <Link to="/seller/register">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>

            <BrandLogo className="lg:hidden" imgClassName="h-12" />
          </div>

          <Button asChild variant="outline" size="sm" className="h-9 rounded-full bg-background/70 px-4 font-medium">
            <Link to="/seller/login">Seller login</Link>
          </Button>
        </header>

        <div className="flex min-w-0 flex-1 items-start px-6 py-8 sm:items-center sm:px-10">
          <SellerVerifyEmailForm />
        </div>
      </section>
    </main>
  )
}
