import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/common/site-footer'
import { SiteHeader } from '@/components/common/site-header'

type SiteLayoutProps = {
  children: ReactNode
}

export function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
}
