import { NavLink, Outlet } from 'react-router-dom'

import { SiteLayout } from '@/components/common/site-layout'
import { storefrontFrameClass } from '@/components/common/site-styles'
import { accountNavGroups } from '@/features/account/account-nav'
import { TemporaryPasswordBanner } from '@/features/account/temporary-password-banner'
import { useSavedGifts } from '@/features/customer-commerce/saved-gifts-context'
import { cn } from '@/lib/utils'

/**
 * Shared frame for the signed-in account pages. It is the ordinary storefront
 * layout plus a side nav. Deliberately not a dashboard: customers browse the
 * same pages as guests and only drop in here for order and profile management.
 */
export function AccountLayout() {
  const { gifts } = useSavedGifts()

  return (
    <SiteLayout>
      <main className={cn(storefrontFrameClass, 'account-box py-8 lg:py-10')}>
        {/* minmax(0, 1fr) on phones too: an auto track grew to fit the
            sideways-scrolling nav strip and pushed every page off screen. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <nav className="flex gap-4 overflow-x-auto pb-2 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
              {accountNavGroups.map((group) => (
                <div key={group.label} className="shrink-0 lg:shrink">
                  <p className="mb-2 hidden px-3 text-[10px] font-bold tracking-[0.18em] text-brand-ink/50 uppercase lg:block dark:text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="flex gap-1 lg:flex-col lg:gap-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          cn(
                            'flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
                            isActive
                              ? 'bg-brand-ink text-white'
                              : 'text-muted-foreground hover:bg-accent hover:text-brand-ink',
                          )
                        }
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.to === '/account/saved-gifts' && gifts.length > 0 ? (
                          <span className="rounded-md bg-brand-teal px-1.5 py-0.5 text-[10px] font-bold text-brand-ink">
                            {gifts.length}
                          </span>
                        ) : null}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <div className="min-w-0">
            <TemporaryPasswordBanner />
            <Outlet />
          </div>
        </div>
      </main>
    </SiteLayout>
  )
}
