import { NavLink, Outlet } from 'react-router-dom'

import { SiteLayout } from '@/components/common/site-layout'
import { storefrontFrameClass } from '@/components/common/site-styles'
import { accountNavGroups } from '@/features/account/account-nav'
import { useSavedGifts } from '@/features/customer-commerce/saved-gifts-context'
import { cn } from '@/lib/utils'

/**
 * Shared frame for the signed-in account pages. It is the ordinary storefront
 * layout plus a side nav — deliberately not a dashboard: customers browse the
 * same pages as guests and only drop in here for order and profile management.
 */
export function AccountLayout() {
  const { gifts } = useSavedGifts()

  return (
    <SiteLayout>
      <main className={cn(storefrontFrameClass, 'py-8 lg:py-10')}>
        <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="flex gap-4 overflow-x-auto pb-2 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
              {accountNavGroups.map((group) => (
                <div key={group.label} className="shrink-0 lg:shrink">
                  <p className="mb-1.5 hidden px-3 text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase lg:block">
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
                            'flex shrink-0 items-center gap-2.5 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:rounded-lg',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )
                        }
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.to === '/account/saved-gifts' && gifts.length > 0 ? (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
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
            <Outlet />
          </div>
        </div>
      </main>
    </SiteLayout>
  )
}
