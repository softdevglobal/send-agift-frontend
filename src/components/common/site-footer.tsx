import type { FormEvent } from 'react'
import { Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/common/brand-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const quickLinks = [
  { to: '/', label: 'Home' },
  { to: '/customer', label: 'Customer' },
  { to: '/become-a-seller', label: 'Become a Seller' },
  { to: '/login', label: 'Sign in' },
]

const serviceLinks = [
  { to: '/customer', label: 'Track order' },
  { to: '/customer', label: 'Returns & refunds' },
  { to: '/customer', label: 'Points & competitions' },
  { to: '/become-a-seller', label: 'Seller support' },
]

const socialLabels = ['Facebook', 'Instagram', 'X', 'LinkedIn']

export function SiteFooter() {
  function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <footer className="border-t border-border bg-muted/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <BrandLogo imgClassName="h-12" />
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

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Subscribe to our newsletter</h3>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your email"
              className="h-10 bg-background"
              required
            />
            <Button type="submit" className="h-10 shrink-0 px-4">
              Join
            </Button>
          </form>
          <div className="flex items-center gap-2 pt-1">
            {socialLabels.map((label) => (
              <button
                key={label}
                type="button"
                className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-primary"
                aria-label={label}
              >
                <Share2 className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} SendAgift. All rights reserved.</p>
          <p>Country activation · Payments · Compliance-ready</p>
        </div>
      </div>
    </footer>
  )
}
