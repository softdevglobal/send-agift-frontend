import { ArrowLeft, Gift } from 'lucide-react'
import { Link } from 'react-router-dom'

import { LoginBrandPanel } from '@/features/auth/login-brand-panel'
import { SellerRegisterForm } from '@/features/auth/seller-register-form'

const sellerRegisterImage =
  'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1400&q=80'

export function AuthSellerRegisterPage() {
  return (
    <main className="flex min-h-svh bg-background">
      <LoginBrandPanel
        role="seller"
        imageSrc={sellerRegisterImage}
        imageAlt="Seller preparing products and gifts for fulfilment"
      />

      <section className="relative flex flex-1 flex-col bg-grain bg-cream/60">
        <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <div className="flex items-center gap-4">
            <Link
              to="/become-a-seller"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>

            <Link
              to="/"
              className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80 lg:hidden"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Gift className="size-4" strokeWidth={1.75} />
              </span>
              <span className="font-display text-xl tracking-tight">
                SendAgift
              </span>
            </Link>
          </div>

          <Link
            to="/seller/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Seller login
          </Link>
        </header>

        <div className="flex flex-1 items-start px-6 py-8 sm:items-center sm:px-10">
          <SellerRegisterForm />
        </div>

        <footer className="px-6 pb-6 text-center text-xs text-muted-foreground sm:px-10 sm:text-left">
          By continuing you agree to SendAgift country terms and privacy notices.
        </footer>
      </section>
    </main>
  )
}
