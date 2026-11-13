import type { ReactNode } from 'react'
import { Gift, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { CustomerEmptyState } from '@/features/customer-commerce'
import { useCompetitionsStatus } from '@/features/capabilities/use-competitions-enabled'

/** What an old competition link shows while competitions are switched off. */
export function CompetitionsUnavailable() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <CustomerEmptyState
        icon={Gift}
        title="Competitions are not available at this time."
        description="You can still browse and send gifts as usual."
        action={
          <Button asChild className="h-11 rounded-full px-6">
            <Link to="/products">Shop gifts</Link>
          </Button>
        }
      />
    </div>
  )
}

/**
 * Shows competition pages only when the server says competitions are on. A
 * direct load, a saved link and in-app navigation all pass through here.
 */
export function CompetitionsGate({ children }: { children: ReactNode }) {
  const { enabled, loaded } = useCompetitionsStatus()
  if (enabled) return <>{children}</>
  if (!loaded) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground" role="status" aria-label="Loading">
        <LoaderCircle className="size-6 animate-spin" />
      </div>
    )
  }
  return <CompetitionsUnavailable />
}
