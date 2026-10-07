import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/common/brand-logo'
import { Dot, Marker, Sparkle } from '@/components/common/storefront-decor'
import { useStorefrontTheme } from '@/components/common/use-storefront-theme'
import { Button } from '@/components/ui/button'
import { SellerSignupWizard } from '@/features/auth/seller-signup/seller-signup-wizard'

export function AuthSellerRegisterPage() {
  useStorefrontTheme()

  return (
    <main className="min-h-svh bg-background">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-10 xl:px-4">
        <div className="flex items-center gap-4">
          <Link
            to="/become-a-seller"
            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] text-brand-ink uppercase transition-colors hover:text-brand-violet"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <BrandLogo imgClassName="h-12" />
        </div>

        <Button asChild variant="outline" className="h-10 border-2 border-brand-ink px-4">
          <Link to="/seller/login">Seller login</Link>
        </Button>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-10 xl:px-4">
        {/* The poster strip: what this page is, in the storefront's voice. */}
        <section className="relative mb-8 overflow-hidden rounded-[1.75rem] bg-brand-violet px-6 py-8 text-white sm:px-10 sm:py-10">
          <Sparkle className="absolute top-6 right-[10%] size-8 text-brand-teal" />
          <Sparkle className="absolute right-[28%] bottom-6 hidden size-5 text-white/80 sm:block" />
          <Dot className="absolute top-1/2 right-[18%] size-3 bg-white/60" />
          <p className="mb-4 w-fit rounded-md bg-brand-teal px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-brand-ink uppercase">
            Seller portal
          </p>
          <h1 className="font-poster text-4xl sm:text-5xl lg:text-6xl">
            Open your <Marker tone="ink">gift shop</Marker>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
            Seven short steps: your business, contact, addresses, shop, delivery
            and verification. You can come back to any step before you finish.
          </p>
        </section>
      </div>

      <div className="px-4 pb-14 sm:px-10">
        <SellerSignupWizard />
      </div>
    </main>
  )
}
