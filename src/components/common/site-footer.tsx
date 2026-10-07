import { ArrowRight, Clock, LifeBuoy, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/common/brand-logo'
import { storefrontFrameClass } from '@/components/common/site-styles'
import { Dot, Marker, Sparkle } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

const quickLinks = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'All gifts' },
  { to: '/reels', label: 'Reels' },
  { to: '/become-a-seller', label: 'Become a Seller' },
]

const serviceLinks = [
  { to: '/orders', label: 'Track order' },
  { to: '/products', label: 'Returns & refunds' },
  { to: '/account/points', label: 'Points & competitions' },
  { to: '/become-a-seller', label: 'Seller support' },
]

const footerHeadingClass = 'mb-5 text-[11px] font-bold tracking-[0.18em] text-white uppercase'
const footerLinkClass = 'text-sm text-white/60 transition-colors hover:text-brand-teal'

export function SiteFooter() {
  const { isAuthenticated } = useAuth()

  return (
    <footer>
      {/* The join band. Guests get a reason to sign up; everyone else a way
          back into the catalogue. */}
      <section className="relative overflow-hidden bg-brand-violet text-white">
        <Sparkle className="absolute top-8 left-[8%] size-6 text-brand-teal" />
        <Sparkle className="absolute right-[10%] bottom-10 size-9 text-white/90" />
        <Dot className="absolute top-12 right-[22%] size-3 bg-brand-teal" />
        <Dot className="absolute bottom-8 left-[24%] size-2.5 bg-white/70" />
        <div
          className={cn(
            storefrontFrameClass,
            'relative flex flex-col items-center gap-5 py-14 text-center lg:py-16',
          )}
        >
          <h2 className="font-poster text-3xl sm:text-4xl lg:text-5xl">
            Join the <Marker tone="ink">gifting</Marker>
            <br />
            community
          </h2>
          <p className="max-w-md text-sm text-white/80 sm:text-base">
            Earn points on every gift, save the ones you love, and track each
            delivery to their door.
          </p>
          <Button
            asChild
            size="lg"
            className="h-12 bg-white px-7 text-brand-ink hover:bg-brand-teal"
          >
            <Link to={isAuthenticated ? '/products' : '/register'}>
              {isAuthenticated ? 'Find a gift' : 'Create free account'}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <div className="bg-brand-ink text-white">
        <div
          className={cn(
            storefrontFrameClass,
            'grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]',
          )}
        >
          <div className="space-y-5">
            <span className="inline-flex rounded-xl bg-white p-2">
              <BrandLogo imgClassName="h-14" />
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-white/60">
              A social gifting marketplace with trusted delivery, points, and
              optional skill competitions.
            </p>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Quick links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Customer service</h3>
            <ul className="space-y-3">
              {serviceLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Contact</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-teal text-brand-ink">
                  <Mail className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Email support</p>
                  <a href="mailto:support@sendagift.com" className={footerLinkClass}>
                    support@sendagift.com
                  </a>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-violet text-white">
                  <Clock className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Always available</p>
                  <p className="text-sm text-white/60">
                    Help for orders, points, and competitions.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-brand-ink">
                  <LifeBuoy className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Need help?</p>
                  <Link to="/orders" className={footerLinkClass}>
                    Track or manage an order
                  </Link>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div
            className={cn(
              storefrontFrameClass,
              'flex flex-col gap-2 py-5 text-[11px] font-medium tracking-[0.12em] text-white/50 uppercase sm:flex-row sm:items-center sm:justify-between',
            )}
          >
            <p>© {new Date().getFullYear()} SendAgift. All rights reserved.</p>
            <p>Delivery · Payments · Points</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
