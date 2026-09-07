import { Outlet } from 'react-router-dom'

import { SiteLayout } from '@/components/common/site-layout'
import { storefrontFrameClass } from '@/components/common/site-styles'
import { cn } from '@/lib/utils'

/**
 * Storefront layout for pages that render their own content directly —
 * cart and checkout — without the account side nav.
 */
export function PageLayout() {
  return (
    <SiteLayout>
      <main className={cn(storefrontFrameClass, 'py-8 lg:py-10')}>
        <Outlet />
      </main>
    </SiteLayout>
  )
}
