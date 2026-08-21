import {
  ArrowRight,
  Headphones,
  RefreshCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { SectionHeading } from '@/components/common/section-heading'
import { SiteLayout } from '@/components/common/site-layout'
import { Button } from '@/components/ui/button'
import { CategoryItem } from '@/features/marketing/category-item'
import {
  bestSellingGifts,
  customerTestimonials,
  giftCategories,
  type GiftProduct,
} from '@/features/marketing/data'
import { FeatureBar } from '@/features/marketing/feature-bar'
import { HeroPhotoBackdrop } from '@/features/marketing/hero-photo'
import { ProductCard } from '@/features/marketing/product-card'
import { TestimonialCard } from '@/features/marketing/testimonial-card'
import {
  catalogProductFromApi,
  registerCatalogProducts,
} from '@/features/customer-commerce/catalog'
import {
  listPublishedCatalog,
  subscribePublishedCatalog,
} from '@/lib/published-catalog'
import { subscribePublicSellers } from '@/lib/public-sellers'

const homeFeatures = [
  {
    icon: Truck,
    title: 'Country Delivery',
    description: 'Gift availability filtered by active countries.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payments',
    description: 'Provider-approved checkout boundaries.',
  },
  {
    icon: RefreshCcw,
    title: 'Easy Returns',
    description: 'Clear refund and dispute pathways.',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Help for orders, points, and competitions.',
  },
]

export function HomePage() {
  // Real published gifts take over this shelf; the sample set is only a
  // placeholder for a store that has not published anything yet.
  const [published, setPublished] = useState<GiftProduct[]>([])

  useEffect(() => {
    function loadCatalog() {
      const products = listPublishedCatalog()
      const mapped = products.map(catalogProductFromApi)
      registerCatalogProducts(mapped)
      setPublished(mapped)
    }

    loadCatalog()
    const unsubCatalog = subscribePublishedCatalog(loadCatalog)
    const unsubSellers = subscribePublicSellers(loadCatalog)
    return () => {
      unsubCatalog()
      unsubSellers()
    }
  }, [])

  const hasPublished = published.length > 0
  const shelfGifts = hasPublished ? published.slice(0, 4) : bestSellingGifts

  return (
    <SiteLayout>
      <main>
        <section className="relative overflow-hidden bg-[oklch(0.97_0.015_95)]">
          <HeroPhotoBackdrop />
          <div className="relative flex items-center px-6 py-12 sm:px-10 lg:min-h-[36rem] lg:px-30 lg:py-16 xl:px-36">
            <div className="animate-fade-up max-w-xl space-y-6">
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                From moments to memories
              </p>
              <h1 className="font-display text-4xl leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.35rem]">
                Discover the best gifts for every moment.
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                Browse curated gifts, track deliveries, earn promotional points,
                and join approved skill competitions — all country-ready.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-11 gap-2 rounded-full px-6">
                  <Link to="/customer">
                    Shop Now
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-full bg-background/80 px-5"
                >
                  <Link to="/become-a-seller">Become a seller</Link>
                </Button>
              </div>

              <div className="flex flex-wrap gap-8 border-t border-border/70 pt-6">
                <div>
                  <p className="font-display text-3xl tracking-tight">10K+</p>
                  <p className="mt-1 text-sm text-muted-foreground">Happy gifters</p>
                </div>
                <div>
                  <p className="font-display text-3xl tracking-tight">2.4K+</p>
                  <p className="mt-1 text-sm text-muted-foreground">Curated gifts</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FeatureBar items={homeFeatures} />

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <SectionHeading
            title="Shop by Categories"
            actionLabel="View All Categories"
            actionTo="/customer"
          />
          <div className="flex gap-6 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible md:grid-cols-6">
            {giftCategories.map((category) => (
              <CategoryItem key={category.id} category={category} />
            ))}
          </div>
        </section>

        <section className="bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <SectionHeading
              title={hasPublished ? 'Fresh from our sellers' : 'Best Selling Gifts'}
              actionLabel="View All Products"
              actionTo="/products"
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {shelfGifts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid overflow-hidden rounded-[1.75rem] bg-cream lg:grid-cols-2">
            <div className="flex flex-col justify-center gap-5 p-8 sm:p-10 lg:p-12">
              <span className="w-fit rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
                Special Offer
              </span>
              <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
                Up to 50% Off curated gift sets
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Seasonal hampers, keepsakes, and wellness gifts with promotional
                points on eligible country checkouts.
              </p>
              <div>
                <Button asChild size="lg" className="h-11 px-5">
                  <Link to="/customer">Shop the Sale</Link>
                </Button>
              </div>
            </div>
            <div className="relative min-h-64">
              <img
                src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1000&q=80"
                alt="Gift bag with seasonal offer"
                className="absolute inset-0 size-full object-cover"
              />
              <span className="absolute top-6 right-6 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-md">
                50% OFF
              </span>
            </div>
          </div>
        </section>

        <section className="bg-background pb-16 lg:pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="What Our Customers Say" align="center" />
            <div className="grid gap-5 md:grid-cols-3">
              {customerTestimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  )
}
