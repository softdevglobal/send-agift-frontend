import { Clock, LifeBuoy, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/common/brand-logo'
import { storefrontFrameClass } from '@/components/common/site-styles'
import { cn } from '@/lib/utils'

const quickLinks = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Customer' },
  { to: '/become-a-seller', label: 'Become a Seller' },
  { to: '/login', label: 'Sign in' },
]

const serviceLinks = [
  { to: '/products', label: 'Track order' },
  { to: '/products', label: 'Returns & refunds' },
  { to: '/products', label: 'Points & competitions' },
  { to: '/become-a-seller', label: 'Seller support' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/60">
      <div
        className={cn(
          storefrontFrameClass,
          'grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4',
        )}
      >
        <div className="space-y-4">
          <BrandLogo imgClassName="h-16" />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            A country-controlled social gifting marketplace with trusted
            fulfilment, points, and optional skill competitions.
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold">Quick Links</h3>
          <ul className="space-y-2.5">
            {quickLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold">Customer Service</h3>
          <ul className="space-y-2.5">
            {serviceLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold">Contact</h3>
          <ul className="space-y-3.5">
            <li className="flex gap-2.5">
              <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email support</p>
                <a
                  href="mailto:support@sendagift.com"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  support@sendagift.com
                </a>
              </div>
            </li>
            <li className="flex gap-2.5">
              <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Always available</p>
                <p className="text-sm text-muted-foreground">
                  Help for orders, points, and competitions.
                </p>
              </div>
            </li>
            <li className="flex gap-2.5">
              <LifeBuoy className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Need help?</p>
                <Link
                  to="/orders"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Track or manage an order
                </Link>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/80">
        <div
          className={cn(
            storefrontFrameClass,
            'flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <p>© {new Date().getFullYear()} SendAgift. All rights reserved.</p>
          <p>Country activation · Payments · Compliance-ready</p>
        </div>
      </div>
    </footer>
  )
}
