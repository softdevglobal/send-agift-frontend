import { Smartphone } from 'lucide-react'

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
      </div>
    </div>
  )
}
