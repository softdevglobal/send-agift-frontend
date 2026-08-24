import { Outlet } from 'react-router-dom'

import { SiteLayout } from '@/components/common/site-layout'

/**
 * Storefront layout for pages that render their own content directly —
 * cart and checkout — without the account side nav.
 */
export function PageLayout() {
  return (
    <SiteLayout>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>
    </SiteLayout>
  )
}
