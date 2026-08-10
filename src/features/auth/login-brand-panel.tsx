import { Gift } from 'lucide-react'

import type { AuthRole } from '@/features/auth/types'
import { loginCopy } from '@/features/auth/copy'
import { cn } from '@/lib/utils'

type LoginBrandPanelProps = {
  role: AuthRole
  imageSrc?: string
  imageAlt?: string
}

export function LoginBrandPanel({
  role,
  imageSrc,
  imageAlt = 'Seller preparing gifts for fulfilment',
}: LoginBrandPanelProps) {
  const copy = loginCopy[role]
  const isSeller = role === 'seller'

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
        <div className="animate-fade-in flex items-center gap-3 text-white">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20 backdrop-blur-sm">
            <Gift className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-display text-2xl leading-none tracking-tight">
              SendAgift
            </p>
            <p className="mt-1 text-xs tracking-[0.18em] text-white/65 uppercase">
              {copy.panelAccent}
            </p>
          </div>
        </div>

        <div className="animate-soft-rise my-10 flex flex-1 flex-col justify-center gap-8">
          {imageSrc ? (
            <div className="relative overflow-hidden rounded-[1.5rem] shadow-[0_24px_60px_rgba(0,0,0,0.35)] ring-1 ring-white/15">
              <img
                src={imageSrc}
                alt={imageAlt}
                className="aspect-[16/10] w-full object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
              />
            </div>
          ) : null}

          <div className="max-w-lg space-y-5 text-white">
            <h1 className="font-display text-4xl leading-[1.08] tracking-tight xl:text-5xl">
              {copy.headline}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-white/75 xl:text-lg">
              {copy.panelNote}
            </p>
          </div>
        </div>

        <p className="animate-fade-in text-xs text-white/45">
          Built for country activation, compliance, and trustworthy delivery.
        </p>
      </div>
    </aside>
  )
}
