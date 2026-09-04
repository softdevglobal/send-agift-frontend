import { BrandLogo } from '@/components/common/brand-logo'
import type { AuthRole } from '@/features/auth/types'
import { loginCopy } from '@/features/auth/copy'
import { cn } from '@/lib/utils'

type AuthPanelVariant = 'signin' | 'signup'

type LoginBrandPanelProps = {
  role: AuthRole
  variant?: AuthPanelVariant
}

const panelImages: Record<
  AuthPanelVariant,
  { src: string; position: string }
> = {
  signin: {
    src: '/images/auth/auth-signin.jpg',
    position: 'object-[center_18%]',
  },
  signup: {
    src: '/images/auth/auth-signup.jpg',
    position: 'object-center',
  },
}

export function LoginBrandPanel({
  role,
  variant = 'signin',
}: LoginBrandPanelProps) {
  const copy = loginCopy[role]
  const image = panelImages[variant]

  return (
    <aside className="relative hidden h-full overflow-hidden lg:flex lg:w-[48%] xl:w-[52%]">
      <img
        src={image.src}
        alt=""
        className={cn(
          'absolute inset-0 size-full object-cover',
          image.position,
        )}
        draggable={false}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.18_0.10_307/0.62)_0%,oklch(0.16_0.10_307/0.28)_36%,oklch(0.14_0.12_307/0.55)_68%,oklch(0.12_0.10_307/0.82)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.14_0.10_307/0.38)_0%,transparent_58%)]"
      />
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute inset-[-8%] bg-grain opacity-40"
      />

      <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
        <div className="animate-fade-in">
          <BrandLogo onDark imgClassName="h-16" />
          <p className="mt-2 text-xs tracking-[0.18em] text-white/70 uppercase">
            {copy.panelAccent}
          </p>
        </div>

        <div className="animate-soft-rise my-10 flex flex-1 flex-col justify-end gap-5">
          <div className="max-w-lg space-y-5 text-white">
            <h1 className="font-display text-4xl leading-[1.08] tracking-tight xl:text-5xl">
              {copy.headline}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-white/80 xl:text-lg">
              {copy.panelNote}
            </p>
          </div>
        </div>

        <p className="animate-fade-in text-xs text-white/55">
          Built for country activation, compliance, and trustworthy delivery.
        </p>
      </div>
    </aside>
  )
}
