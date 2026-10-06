import { BrandLogo } from '@/components/common/brand-logo'
import { Dot, Marker, Sparkle } from '@/components/common/storefront-decor'
import { useStorefrontTheme } from '@/components/common/use-storefront-theme'
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

/** Splits a headline so its last word can sit on a marker block. */
function splitHeadline(headline: string) {
  const words = headline.trim().split(/\s+/)
  const last = words.pop() ?? ''
  return { lead: words.join(' '), last }
}

/**
 * Left half of every sign-in and sign-up screen: a flat block of brand colour
 * with a poster headline and the photo framed inside it. Also switches the
 * auth screens onto the storefront look (heavy type, ink box buttons).
 */
export function LoginBrandPanel({
  role,
  variant = 'signin',
}: LoginBrandPanelProps) {
  useStorefrontTheme()
  const copy = loginCopy[role]
  const image = panelImages[variant]
  const { lead, last } = splitHeadline(copy.headline)
  const onViolet = variant === 'signin'

  return (
    <aside
      className={cn(
        'relative hidden h-full overflow-hidden lg:flex lg:w-[46%] xl:w-[50%]',
        onViolet ? 'bg-brand-violet' : 'bg-brand-ink',
      )}
    >
      <Sparkle className="absolute top-10 right-[14%] size-8 text-brand-teal" />
      <Sparkle className="absolute bottom-[42%] left-[8%] size-5 text-white/80" />
      <Dot className="absolute top-[30%] right-[8%] size-3 bg-white/60" />

      <div className="relative z-10 flex w-full flex-col gap-8 p-10 xl:p-14">
        <div className="animate-fade-in flex items-center gap-4">
          <span className="inline-flex rounded-xl bg-white p-1.5">
            <BrandLogo imgClassName="h-12" />
          </span>
          <span className="rounded-md bg-brand-teal px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-brand-ink uppercase">
            {copy.panelAccent}
          </span>
        </div>

        <div className="animate-soft-rise space-y-5 text-white">
          <h1 className="font-poster text-5xl xl:text-6xl">
            {lead}{' '}
            <Marker tone={onViolet ? 'ink' : 'violet'}>{last}</Marker>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-white/75 xl:text-lg">
            {copy.panelNote}
          </p>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.75rem] bg-white/10">
          <img
            src={image.src}
            alt=""
            className={cn('absolute inset-0 size-full object-cover', image.position)}
            draggable={false}
          />
        </div>
      </div>
    </aside>
  )
}
