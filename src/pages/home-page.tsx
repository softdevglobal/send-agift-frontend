import {
  ArrowRight,
  Gift,
  Headphones,
  RefreshCcw,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { SectionHeading } from '@/components/common/section-heading'
import { SiteLayout } from '@/components/common/site-layout'
import { Dot, Marker, Sparkle } from '@/components/common/storefront-decor'
import { storefrontFrameClass } from '@/components/common/site-styles'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { CategoryItem } from '@/features/marketing/category-item'
import { homePathForRole } from '@/lib/auth'
import {
  bestSellingGifts,
  customerTestimonials,
  giftCategories,
  type GiftProduct,
} from '@/features/marketing/data'
import { FeatureBar } from '@/features/marketing/feature-bar'
import { ReelsStrip } from '@/features/reels/reels-strip'
import { TestimonialCard } from '@/features/marketing/testimonial-card'
import { GiftCard, GiftSearchBar } from '@/features/customer-commerce'
import {
  catalogProductFromApi,
  registerCatalogProducts,
} from '@/features/customer-commerce/catalog'
import { loadMarketplaceIntoCatalog } from '@/lib/marketplace'
import { cn } from '@/lib/utils'
import {
  listPublishedCatalog,
  subscribePublishedCatalog,
} from '@/lib/published-catalog'

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

const HERO_PHOTO_SRC = '/images/hero/hero.jpg'

const editorialTiles = [
  {
    title: 'Trending on Reels',
    caption: 'Watch it made, then send it',
    to: '/reels',
    tint: 'bg-accent',
    image:
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Flowers for any day',
    caption: 'Explore now',
    to: '/products?category=flowers',
    tint: 'bg-cream',
    image:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80',
  },
]

const sellerSteps = ['Open a shop', 'List gifts', 'Share reels', 'Get paid']

export function HomePage() {
  const { isAuthenticated, role } = useAuth()
  const isGuest = !isAuthenticated
  const isCustomer = isAuthenticated && role === 'customer'
  // Real published gifts take over this shelf; the sample set is only a
  // placeholder for a store that has not published anything yet.
  const [published, setPublished] = useState<GiftProduct[]>([])

  useEffect(() => {
    let cancelled = false
    let fromApi = false

    async function loadFromApi() {
      try {
        const mapped = await loadMarketplaceIntoCatalog()
        fromApi = true
        if (!cancelled) setPublished(mapped)
      } catch {
        // Public shops endpoint is optional while the backend is down.
      }
    }

    function loadLocal() {
      if (fromApi || cancelled) return
      const products = listPublishedCatalog()
      const mapped = products.map((product) => catalogProductFromApi(product))
      registerCatalogProducts(mapped)
      setPublished(mapped)
    }

    void loadFromApi().then(() => {
      if (!fromApi) loadLocal()
    })
    const unsubCatalog = subscribePublishedCatalog(loadLocal)
    return () => {
      cancelled = true
      unsubCatalog()
    }
  }, [])

  const hasPublished = published.length > 0
  const shelfGifts = hasPublished ? published.slice(0, 5) : bestSellingGifts

  return (
    <SiteLayout>
      <main>
        {/* Hero: a flat lilac panel, a poster headline with words set on
            blocks of brand colour, and the photo framed on the right. */}
        <section className={cn(storefrontFrameClass, 'pt-5 lg:pt-6')}>
          <div className="relative grid overflow-hidden rounded-[2rem] bg-accent lg:grid-cols-[1.05fr_1fr]">
            <Sparkle className="absolute top-8 left-[46%] hidden size-7 text-brand-violet lg:block" />
            <Sparkle className="absolute bottom-24 left-[6%] size-5 text-brand-teal" />
            <Dot className="absolute top-14 right-[44%] hidden size-3 bg-brand-teal lg:block" />

            <div className="animate-fade-up relative flex flex-col justify-center gap-7 px-6 pt-10 pb-16 sm:px-10 lg:px-14 lg:py-16">
              <span className="w-fit rounded-md bg-brand-ink px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
                From moments to memories
              </span>
              <h1 className="font-poster text-[7.6vw] text-brand-ink sm:text-6xl lg:text-[4.6rem] dark:text-foreground">
                <Marker tone="white" className="text-brand-ink">Let&rsquo;s</Marker>
                <br />
                send
                <br />
                <Marker tone="violet">unforgettable</Marker>
                <br />
                gifts.
              </h1>
              <p className="max-w-md text-base leading-relaxed text-brand-ink/70 dark:text-muted-foreground">
                Browse gifts right away, no account needed. Sign in when you
                want to save favourites, check out, and track deliveries.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-12 gap-2 px-7">
                  <Link to="/products">
                    Shop now
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                {isGuest ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 border-2 border-brand-ink bg-transparent px-6 text-brand-ink hover:bg-brand-ink hover:text-white"
                  >
                    <Link to="/register">Create account</Link>
                  </Button>
                ) : isCustomer ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 border-2 border-brand-ink bg-transparent px-6 text-brand-ink hover:bg-brand-ink hover:text-white"
                  >
                    <Link to="/orders">My orders</Link>
                  </Button>
                ) : role ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 border-2 border-brand-ink bg-transparent px-6 text-brand-ink hover:bg-brand-ink hover:text-white"
                  >
                    <Link to={homePathForRole(role)}>Go to dashboard</Link>
                  </Button>
                ) : null}
                {isGuest ? (
                  <Link
                    to="/login"
                    className="text-xs font-bold tracking-[0.1em] text-brand-ink uppercase underline-offset-4 hover:underline dark:text-foreground"
                  >
                    Sign in
                  </Link>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="font-poster text-4xl text-brand-ink dark:text-foreground">10K+</p>
                  <p className="mt-1 text-xs font-semibold tracking-[0.12em] text-brand-ink/60 uppercase dark:text-muted-foreground">
                    Happy gifters
                  </p>
                </div>
                <div>
                  <p className="font-poster text-4xl text-brand-ink dark:text-foreground">2.4K+</p>
                  <p className="mt-1 text-xs font-semibold tracking-[0.12em] text-brand-ink/60 uppercase dark:text-muted-foreground">
                    Curated gifts
                  </p>
                </div>
              </div>
            </div>

            <div className="relative min-h-80 px-6 pb-14 sm:px-10 lg:min-h-0 lg:py-10 lg:pr-10 lg:pl-0">
              <div className="relative h-80 overflow-hidden rounded-[1.5rem] bg-brand-violet sm:h-[26rem] lg:h-full">
                <img
                  src={HERO_PHOTO_SRC}
                  alt="A friend handing over a wrapped gift"
                  className="size-full object-cover object-[60%_30%]"
                  loading="eager"
                  draggable={false}
                />
              </div>
              <div className="absolute bottom-[4.5rem] left-9 flex items-center gap-3 rounded-xl bg-brand-ink px-4 py-3 text-white sm:left-[3.25rem] lg:bottom-20 lg:-left-6">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-teal text-brand-ink">
                  <Gift className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Wrapped &amp; delivered</p>
                  <p className="text-xs text-white/60">On the day you pick</p>
                </div>
              </div>
              <Sparkle className="absolute top-4 right-3 size-8 text-brand-teal sm:right-6 lg:top-6" />
            </div>
          </div>
        </section>

        {/* Before anything else: what you want, where it goes, when it must
            arrive. Lifted onto the seam of the hero so it is the first thing
            met rather than something found after scrolling. */}
        <section className={cn(storefrontFrameClass, 'relative z-10 -mt-6 pb-14 lg:-mt-8 lg:pb-16')}>
          <GiftSearchBar />
        </section>

        <FeatureBar items={homeFeatures} />

        <section className={cn(storefrontFrameClass, 'py-14 lg:py-20')}>
          <SectionHeading
            title="Shop by occasion"
            actionLabel="View all"
            actionTo="/products"
          />
          <div className="-mx-5 flex snap-x scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:scroll-px-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {giftCategories.map((category) => (
              <CategoryItem key={category.id} category={category} />
            ))}
          </div>
        </section>

        {/* Promo band: solid teal, full bleed, the headline's first word on a
            white block. */}
        <section className="relative overflow-hidden bg-brand-teal text-brand-ink">
          <Sparkle className="absolute top-10 left-[44%] size-8 text-white" />
          <Sparkle className="absolute bottom-12 left-[52%] hidden size-5 text-white/80 lg:block" />
          <Dot className="absolute top-1/2 left-[4%] size-3 bg-brand-ink/20" />
          <div
            className={cn(
              storefrontFrameClass,
              'relative grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-0',
            )}
          >
            <div className="space-y-6 lg:py-20">
              <h2 className="font-poster text-5xl sm:text-6xl lg:text-7xl">
                <Marker tone="white">Gift sets</Marker>
                <br />
                up to 50% off
              </h2>
              <p className="max-w-md text-base leading-relaxed font-medium text-brand-ink/75">
                Seasonal hampers, keepsakes, and wellness gifts, with bonus
                points on eligible checkouts.
              </p>
              <p className="text-sm font-extrabold tracking-wide">
                *While stocks last, selected sellers only
              </p>
              <Button asChild size="lg" className="h-12 px-7">
                <Link to="/products">
                  Shop the sale
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="relative lg:self-stretch">
              <img
                src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1000&q=80"
                alt="Gift bag with seasonal offer"
                className="h-72 w-full rounded-[1.5rem] object-cover sm:h-96 lg:absolute lg:inset-y-10 lg:h-auto"
                loading="lazy"
              />
              <span className="absolute -top-4 right-5 flex size-24 rotate-12 flex-col items-center justify-center rounded-full bg-brand-ink text-white lg:top-4">
                <span className="font-poster text-3xl">50%</span>
                <span className="text-[10px] font-bold tracking-[0.18em] uppercase">Off</span>
              </span>
            </div>
          </div>
        </section>

        <section className={cn(storefrontFrameClass, 'py-14 lg:py-20')}>
          <SectionHeading
            title={hasPublished ? 'Fresh from our sellers' : 'Best selling gifts'}
            actionLabel="View all"
            actionTo="/products"
            marker="violet"
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {shelfGifts.map((product) => (
              <GiftCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* Two wide editorial tiles, the "what's trending" pair. */}
        <section className={cn(storefrontFrameClass, 'pb-14 lg:pb-20')}>
          <SectionHeading title="Everyone's favourite" />
          <div className="grid gap-6 md:grid-cols-2">
            {editorialTiles.map((tile) => (
              <Link key={tile.title} to={tile.to} className="group block">
                <span className={cn('block aspect-[16/10] overflow-hidden rounded-2xl', tile.tint)}>
                  <img
                    src={tile.image}
                    alt={tile.title}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                </span>
                <span className="mt-4 flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-lg font-extrabold text-brand-ink dark:text-foreground">
                      {tile.title}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                      {tile.caption}
                    </span>
                  </span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-brand-ink text-brand-ink transition-colors group-hover:bg-brand-ink group-hover:text-white dark:border-foreground dark:text-foreground">
                    <ArrowRight className="size-4" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <ReelsStrip />

        {role !== 'seller' ? (
          <section className={cn(storefrontFrameClass, 'py-14 lg:py-16')}>
            <div className="relative grid overflow-hidden rounded-[2rem] bg-cream lg:grid-cols-[1fr_auto]">
              <Sparkle className="absolute top-8 right-[38%] hidden size-6 text-brand-violet lg:block" />
              <div className="space-y-5 px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
                <p className="inline-flex items-center gap-2 rounded-md bg-brand-violet px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
                  <Store className="size-3.5" />
                  For sellers
                </p>
                <h2 className="font-poster text-4xl text-brand-ink sm:text-5xl dark:text-foreground">
                  Sell your gifts
                  <br />
                  on <Marker tone="teal">SendAgift</Marker>
                </h2>
                <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Create a seller account to open a shop, list products, and
                  get paid in your country.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg" className="h-12 px-6">
                    <Link to="/seller/register">
                      Create seller account
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 border-2 border-brand-ink bg-transparent px-6 text-brand-ink hover:bg-brand-ink hover:text-white"
                  >
                    <Link to="/become-a-seller">How selling works</Link>
                  </Button>
                </div>
              </div>
              <div className="hidden grid-cols-2 gap-3 p-6 lg:grid lg:w-[26rem]">
                {sellerSteps.map((step, index) => (
                  <div
                    key={step}
                    className={cn(
                      'flex flex-col justify-between rounded-2xl p-4',
                      index === 0 && 'bg-brand-ink text-white',
                      index === 1 && 'bg-brand-teal text-brand-ink',
                      index === 2 && 'bg-brand-violet text-white',
                      index === 3 && 'bg-white text-brand-ink',
                    )}
                  >
                    <span className="font-poster text-4xl">0{index + 1}</span>
                    <span className="mt-6 text-sm font-bold">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className={cn(storefrontFrameClass, 'pt-6 pb-16 lg:pb-20')}>
          <SectionHeading title="What our customers say" align="center" marker="violet" />
          <div className="grid gap-5 md:grid-cols-3">
            {customerTestimonials.map((testimonial, index) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} index={index} />
            ))}
          </div>
        </section>
      </main>
    </SiteLayout>
  )
}
