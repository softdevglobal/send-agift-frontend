import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/common/brand-logo'
import { SellerSignupWizard } from '@/features/auth/seller-signup/seller-signup-wizard'

export function AuthSellerRegisterPage() {
  return (
    <main className="min-h-svh bg-grain bg-cream/60">
      <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <div className="flex items-center gap-4">
          <Link
            to="/become-a-seller"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <BrandLogo imgClassName="h-12" />
        </div>

        <Link
          to="/seller/login"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Seller login
        </Link>
      </header>

      <div className="px-4 pb-10 sm:px-10">
        <SellerSignupWizard />
      </div>
    </main>
  )
}
