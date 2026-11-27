import { Apple, Play, Smartphone } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { appStoreUrl, phonePlatform, playStoreUrl } from '@/lib/app-links'
import { cn } from '@/lib/utils'

/**
 * Games are played in the SendAGift mobile app, not on the website. The site
 * shows what is open and what it pays; this says where to play.
 */
export function PlayInApp({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-2xl border-2 border-brand-violet/25 bg-brand-violet/5 px-5 py-4',
        className,
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-violet text-white">
        <Smartphone className="size-5" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold">Play in the SendAGift app</p>
        <p className="mt-0.5 text-muted-foreground">
          {compact
            ? 'Games are played on your phone.'
            : 'Games can only be played in the SendAGift mobile app. Open the app on your phone, sign in with this account and find the competition under Competitions. Your points are the same in the app.'}
        </p>
        {compact ? null : <StoreButtons />}
      </div>
    </div>
  )
}

/** Get-the-app buttons, the visitor's own phone store first. */
function StoreButtons() {
  const stores = [
    appStoreUrl ? { key: 'ios', label: 'Download on the App Store', href: appStoreUrl, icon: Apple } : null,
    { key: 'android', label: 'Get it on Google Play', href: playStoreUrl, icon: Play },
  ].filter((store): store is NonNullable<typeof store> => store !== null)
  const platform = phonePlatform()
  stores.sort((a, b) => Number(b.key === platform) - Number(a.key === platform))
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {stores.map((store) => (
        <Button key={store.key} asChild size="sm" className="h-9 rounded-full px-4">
          <a href={store.href} target="_blank" rel="noreferrer">
            <store.icon className="size-4" />
            {store.label}
          </a>
        </Button>
      ))}
    </div>
  )
}
