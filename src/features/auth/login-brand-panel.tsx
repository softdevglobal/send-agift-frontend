import { BrandLogo } from '@/components/common/brand-logo'
import type { AuthRole } from '@/features/auth/types'
import { loginCopy } from '@/features/auth/copy'
import { cn } from '@/lib/utils'

type LoginBrandPanelProps = {
  role: AuthRole
}

const panelGifts: Record<
  AuthRole,
  Array<{ src: string; alt: string; className: string }>
> = {
  customer: [
    {
      src: '/images/hero/gift-stack.png',
      alt: '',
      className:
        'left-[-4%] top-[8%] w-[58%] -rotate-6 blur-[2px] opacity-75',
    },
    {
      src: '/images/hero/gift-red.png',
      alt: '',
      className:
        'right-[-2%] top-[-4%] w-[42%] rotate-8 blur-sm opacity-65',
    },
    {
      src: '/images/hero/gift-gold.png',
      alt: '',
      className:
        'right-[8%] bottom-[-6%] w-[36%] -rotate-3 blur-[1.5px] opacity-70',
    },
  ],
  seller: [
    {
      src: '/images/hero/gift-red.png',
      alt: '',
      className:
        'left-[-6%] top-[2%] w-[52%] rotate-[-5deg] blur-[2px] opacity-70',
    },
    {
      src: '/images/hero/gift-blue.png',
      alt: '',
      className:
        'right-[-4%] top-[10%] w-[40%] rotate-6 blur-sm opacity-65',
    },
    {
      src: '/images/hero/gift-gold.png',
      alt: '',
      className:
        'left-[18%] bottom-[-8%] w-[38%] rotate-3 blur-[1.5px] opacity-70',
    },
  ],
}

export function LoginBrandPanel({ role }: LoginBrandPanelProps) {
  const copy = loginCopy[role]
  const isSeller = role === 'seller'
  const gifts = panelGifts[role]

  return (
    <aside
      className={cn(
        'relative hidden min-h-svh overflow-hidden lg:flex lg:w-[48%] xl:w-[52%]',
        isSeller
          ? 'bg-[linear-gradient(155deg,oklch(0.3_0.05_145)_0%,oklch(0.24_0.03_125)_50%,oklch(0.28_0.04_100)_100%)]'
          : 'bg-[linear-gradient(155deg,oklch(0.36_0.07_125)_0%,oklch(0.26_0.04_120)_48%,oklch(0.3_0.05_95)_100%)]'
      )}
    >
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute inset-[-8%] bg-grain opacity-80"
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -left-24 top-16 size-[28rem] rounded-full blur-3xl',
          isSeller
            ? 'bg-[oklch(0.55_0.07_145/0.35)]'
            : 'bg-[oklch(0.62_0.08_125/0.35)]'
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-16 bottom-10 size-[22rem] rounded-full blur-3xl',
          isSeller
            ? 'bg-[oklch(0.55_0.06_100/0.28)]'
            : 'bg-[oklch(0.7_0.05_95/0.3)]'
        )}
      />

      <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
        <div className="animate-fade-in">
          <BrandLogo imgClassName="h-14" />
          <p className="mt-2 text-xs tracking-[0.18em] text-white/65 uppercase">
            {copy.panelAccent}
          </p>
        </div>

        <div className="animate-soft-rise my-10 flex flex-1 flex-col justify-center gap-8">
          <div className="max-w-lg space-y-5 text-white">
            <h1 className="font-display text-4xl leading-[1.08] tracking-tight xl:text-5xl">
              {copy.headline}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-white/75 xl:text-lg">
              {copy.panelNote}
            </p>
          </div>

          <div
            aria-hidden
            className="relative mt-2 h-52 w-full max-w-xl xl:h-60"
          >
            <div
              className={cn(
                'pointer-events-none absolute inset-x-8 bottom-0 h-24 rounded-full blur-2xl',
                isSeller
                  ? 'bg-[oklch(0.55_0.06_145/0.35)]'
                  : 'bg-[oklch(0.62_0.07_125/0.4)]'
              )}
            />
            {gifts.map((gift) => (
              <img
                key={gift.src}
                src={gift.src}
                alt=""
                className={cn(
                  'pointer-events-none absolute select-none object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)]',
                  gift.className
                )}
                loading="lazy"
                draggable={false}
              />
            ))}
          </div>
        </div>

        <p className="animate-fade-in text-xs text-white/45">
          Built for country activation, compliance, and trustworthy delivery.
        </p>
      </div>
    </aside>
  )
}
