import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  Globe2,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { SectionHeading } from '@/components/common/section-heading'
import { SiteLayout } from '@/components/common/site-layout'
import { Button } from '@/components/ui/button'
import { sellerTestimonials } from '@/features/marketing/data'
import { FeatureBar } from '@/features/marketing/feature-bar'
import { TestimonialCard } from '@/features/marketing/testimonial-card'

const sellerFeatures = [
  {
    icon: BadgeDollarSign,
    title: 'Secure Payouts',
    description: 'Connected payment onboarding by country.',
  },
  {
    icon: Globe2,
    title: 'Market Reach',
    description: 'Sell where SendAgift is activated.',
  },
  {
    icon: Truck,
    title: 'Fulfilment Tools',
    description: 'Labels, routing, and proof of delivery.',
  },
  {
    icon: BarChart3,
    title: 'Seller Analytics',
    description: 'Track orders, returns, and payout readiness.',
  },
]

const sellerSteps = [
  {
    step: '01',
    title: 'Create your seller account',
    description: 'Register, verify, and start shop setup in minutes.',
  },
  {
    step: '02',
    title: 'Complete payment onboarding',
    description: 'Connect approved providers for your active country.',
  },
  {
    step: '03',
    title: 'List products & fulfil',
    description: 'Upload media, manage inventory, ship, and get paid.',
  },
]

const sellerBenefits = [
  'Country-aware shop activation',
  'Product, inventory, and media management',
  'Courier labels and delivery routing',
  'Returns, refunds, and dispute workflows',
  'Payout ledger visibility',
  'Connected-channel publishing',
]

export function BecomeSellerPage() {
  return (
    <SiteLayout>
      <main>
        <section className="bg-cream">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-16">
            <div className="animate-fade-up space-y-6">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                <Store className="size-4" />
                Seller portal
              </p>
              <h1 className="font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl">
                Start selling on SendAgift today.
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                Join a governed gifting marketplace built for verification,
                payout readiness, fulfilment quality, and country-by-country
                growth.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-11 gap-2 px-5">
                  <Link to="/seller/register">
                    Sign up as Seller
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 bg-background px-5"
                >
                  <Link to="/seller/login">Seller sign in</Link>
                </Button>
              </div>
            </div>

            <div className="animate-soft-rise relative overflow-hidden rounded-[1.75rem] bg-background shadow-[0_30px_80px_rgba(40,50,30,0.12)] ring-1 ring-border/50">
              <img
                src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=80"
                alt="Seller preparing products for fulfilment"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </section>

        <FeatureBar items={sellerFeatures} />

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading title="How to become a seller" align="center" />
          <div className="grid gap-6 md:grid-cols-3">
            {sellerSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl bg-card p-6 ring-1 ring-border/60"
              >
                <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                  Step {item.step}
                </p>
                <h3 className="mt-3 font-display text-2xl tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-muted/40">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">
            <div>
              <SectionHeading title="Built for serious sellers" />
              <ul className="space-y-3">
                {sellerBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-primary" />
                    <span className="text-foreground/90">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[1.75rem] bg-cream p-8 sm:p-10">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="font-display text-2xl tracking-tight sm:text-3xl">
                Payment-provider ready from day one
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Seller onboarding respects approval boundaries, country
                activation, and auditability — so you can focus on products and
                fulfilment quality.
              </p>
              <Button asChild className="mt-6 h-11 px-5">
                <Link to="/seller/register">Open seller portal</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading title="What sellers say" align="center" />
          <div className="grid gap-5 md:grid-cols-3">
            {sellerTestimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        </section>

        <section className="pb-16 lg:pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[1.75rem] bg-primary px-8 py-12 text-center text-primary-foreground sm:px-12">
              <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
                Ready to grow your gift shop?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80 sm:text-base">
                Register, verify, connect payouts, and start fulfilling with
                SendAgift’s seller tools.
              </p>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="mt-7 h-11 bg-background px-6 text-foreground hover:bg-background/90"
              >
                <Link to="/seller/register">Become a Seller</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  )
}
