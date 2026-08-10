import {
  ArrowRight,
  Gift,
  MapPinned,
  Sparkles,
  Trophy,
  Truck,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { SectionHeading } from '@/components/common/section-heading'
import { SiteLayout } from '@/components/common/site-layout'
import { Button } from '@/components/ui/button'
import { CategoryItem } from '@/features/marketing/category-item'
import {
  bestSellingGifts,
  customerTestimonials,
  giftCategories,
} from '@/features/marketing/data'
import { FeatureBar } from '@/features/marketing/feature-bar'
import { GiftHeroCollage } from '@/features/marketing/gift-hero-collage'
import { ProductCard } from '@/features/marketing/product-card'
import { TestimonialCard } from '@/features/marketing/testimonial-card'

const customerFeatures = [
  {
    icon: MapPinned,
    title: 'Country Filters',
    description: 'Only see gifts available where delivery is active.',
  },
  {
    icon: Truck,
    title: 'Live Tracking',
    description: 'Follow fulfilment from shop to doorstep.',
  },
  {
    icon: Sparkles,
    title: 'Points Balance',
    description: 'Earn and redeem promotional points with integrity.',
  },
  {
    icon: Trophy,
    title: 'Competitions',
    description: 'Play approved skill games where country rules allow.',
  },
]

const customerSteps = [
  {
    step: '01',
    title: 'Discover gifts',
    description: 'Search products and sellers with country availability filters.',
  },
  {
    step: '02',
    title: 'Checkout securely',
    description: 'Pay through approved providers for your active market.',
  },
  {
    step: '03',
    title: 'Track & celebrate',
    description: 'Follow delivery, redeem points, and join competitions.',
  },
]

export function CustomerPage() {
  return (
    <SiteLayout>
      <main>
        <section className="relative overflow-hidden bg-[oklch(0.97_0.015_95)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-20 size-[28rem] rounded-full bg-[oklch(0.92_0.03_125/0.35)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-16">
            <div className="animate-fade-up space-y-6">
              <p className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                <Gift className="size-3.5 text-primary" />
                Customer experience
              </p>
              <h1 className="font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl">
                Send gifts with confidence and delight.
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                Browse searchable product and seller pages, checkout securely,
                track orders, manage points, and access competitions where
                approved.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-11 gap-2 rounded-full px-6">
                  <Link to="/login">
                    Customer sign in
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-full bg-background/80 px-5"
                >
                  <Link to="/customer/register">Create account</Link>
                </Button>
              </div>
            </div>

            <GiftHeroCollage />
          </div>
        </section>

        <FeatureBar items={customerFeatures} />

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading title="How gifting works" align="center" />
          <div className="grid gap-6 md:grid-cols-3">
            {customerSteps.map((item) => (
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
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <SectionHeading
              title="Popular categories"
              actionLabel="View all"
              actionTo="/"
            />
            <div className="flex gap-6 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-8 md:grid-cols-6">
              {giftCategories.map((category) => (
                <CategoryItem key={category.id} category={category} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading
            title="Gifts customers love"
            actionLabel="Shop bestsellers"
            actionTo="/"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bestSellingGifts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="bg-cream">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <SectionHeading title="Loved by gifters" align="center" />
            <div className="grid gap-5 md:grid-cols-3">
              {customerTestimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <Button asChild size="lg" className="h-11 px-6">
                <Link to="/customer/register">Create customer account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  )
}
