import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/common/site-footer'
import { SiteHeader } from '@/components/common/site-header'
import { useStorefrontTheme } from '@/components/common/use-storefront-theme'

type SiteLayoutProps = {
  children: ReactNode
  /** Immersive pages (the reels feed) drop the footer so nothing scrolls past the viewport. */
  hideFooter?: boolean
}

export function SiteLayout({ children, hideFooter = false }: SiteLayoutProps) {
  useStorefrontTheme()

  return (
    <div className="storefront flex min-h-svh flex-col overflow-x-clip bg-background">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      {hideFooter ? null : <SiteFooter />}
    </div>
  )
}
