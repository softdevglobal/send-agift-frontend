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
import { Marker, Sparkle } from '@/components/common/storefront-decor'
import { storefrontFrameClass } from '@/components/common/site-styles'
import { Button } from '@/components/ui/button'
import { sellerTestimonials } from '@/features/marketing/data'
import { FeatureBar } from '@/features/marketing/feature-bar'
import { TestimonialCard } from '@/features/marketing/testimonial-card'
import { cn } from '@/lib/utils'

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
        <section className={cn(storefrontFrameClass, 'pt-5 pb-14 lg:pt-6 lg:pb-16')}>
          <div className="relative grid overflow-hidden rounded-[2rem] bg-brand-ink text-white lg:grid-cols-[1.1fr_1fr]">
            <Sparkle className="absolute top-10 left-[48%] hidden size-7 text-brand-teal lg:block" />
            <Sparkle className="absolute bottom-10 left-[6%] size-5 text-brand-violet" />
            <div className="animate-fade-up relative space-y-7 px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
              <p className="inline-flex items-center gap-2 rounded-md bg-brand-teal px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-brand-ink uppercase">
                <Store className="size-3.5" />
                Seller portal
              </p>
              <h1 className="font-poster text-5xl sm:text-6xl lg:text-7xl">
                Start
                <br />
                <Marker tone="violet">selling</Marker>
                <br />
                today.
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-white/70">
                Join a gifting marketplace built for verification, payout
                readiness, fulfilment quality, and country-by-country growth.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 gap-2 bg-white px-7 text-brand-ink hover:bg-brand-teal"
                >
                  <Link to="/seller/register">
                    Sign up as seller
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 border-2 border-white bg-transparent px-6 text-white hover:bg-white hover:text-brand-ink"
                >
                  <Link to="/seller/login">Seller sign in</Link>
                </Button>
              </div>
            </div>
            <div className="relative min-h-72 p-6 pt-0 sm:p-10 sm:pt-0 lg:p-8">
              <img
                src="/images/hero/hero.jpg"
                alt="A gift being handed over"
                className="size-full min-h-72 rounded-[1.5rem] object-cover object-[60%_30%]"
              />
            </div>
          </div>
        </section>

        <FeatureBar items={sellerFeatures} />

        <section className={cn(storefrontFrameClass, 'py-14 lg:py-16')}>
          <SectionHeading title="How to become a seller" align="center" />
          <div className="grid gap-6 md:grid-cols-3">
            {sellerSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl bg-accent p-7"
              >
                <p className="font-poster text-5xl text-brand-violet">{item.step}</p>
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

        <section>
          <div
            className={cn(
              storefrontFrameClass,
              'grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-16',
            )}
          >
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
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-teal text-brand-ink">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="font-display text-2xl tracking-tight sm:text-3xl">
                Payment-provider ready from day one
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Seller onboarding respects approval boundaries, country
                activation, and auditability. So you can focus on products and
                fulfilment quality.
              </p>
              <Button asChild className="mt-6 h-11 px-5">
                <Link to="/seller/register">Open seller portal</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className={cn(storefrontFrameClass, 'py-14 lg:py-16')}>
          <SectionHeading title="What sellers say" align="center" />
          <div className="grid gap-5 md:grid-cols-3">
            {sellerTestimonials.map((testimonial, index) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} index={index} />
            ))}
          </div>
        </section>

        <section className="pb-16 lg:pb-20">
          <div className={storefrontFrameClass}>
            <div className="relative overflow-hidden rounded-[1.75rem] bg-brand-violet px-8 py-14 text-center text-white sm:px-12">
              <Sparkle className="absolute top-8 left-[10%] size-7 text-brand-teal" />
              <Sparkle className="absolute right-[12%] bottom-8 size-5 text-white/80" />
              <h2 className="font-poster text-4xl sm:text-5xl">
                Ready to <Marker tone="ink">grow</Marker> your gift shop?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80 sm:text-base">
                Register, verify, connect payouts, and start fulfilling with
                SendAgift’s seller tools.
              </p>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="mt-7 h-12 bg-white px-7 text-brand-ink hover:bg-brand-teal"
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
