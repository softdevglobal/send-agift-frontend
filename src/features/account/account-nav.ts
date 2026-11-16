import { useMemo } from 'react'
import {
  Ticket,
  Crown,
  Gift,
  Heart,
  History,
  MapPin,
  PackageSearch,
  Star,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { useCompetitionsEnabled } from '@/features/capabilities/use-competitions-enabled'

export type AccountNavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Shown in the header dropdown as a one-line hint. */
  hint?: string
  /** When true, the nav item is only active on that exact path. */
  end?: boolean
  /** Shown only while the server has competitions switched on. */
  competitions?: boolean
}

export type AccountNavGroup = {
  label: string
  items: AccountNavItem[]
}

export const accountNavGroups: AccountNavGroup[] = [
  {
    label: 'Orders',
    items: [
      {
        to: '/orders',
        label: 'Track orders',
        icon: PackageSearch,
        hint: 'Live delivery progress',
        end: true,
      },
      {
        to: '/orders/history',
        label: 'Order history',
        icon: History,
        hint: 'Delivered and past gifts',
      },
      {
        to: '/account/gifts',
        label: 'Gifts received',
        icon: Gift,
        hint: 'Gifts sent to you. Review them here',
      },
      {
        to: '/account/saved-gifts',
        label: 'Saved gifts',
        icon: Heart,
        hint: 'Your wishlist',
      },
      {
        to: '/account/reviews',
        label: 'My reviews',
        icon: Star,
        hint: 'Ratings you left on delivered gifts',
      },
      {
        to: '/account/game-entries',
        label: 'Game entries',
        icon: Ticket,
        hint: 'Your entries and where they came from',
      },
    ],
  },
  {
    label: 'Membership',
    items: [
      {
        to: '/account/membership',
        label: 'Membership',
        icon: Crown,
        hint: 'Your plan, paid periods and member bonus',
      },
      {
        to: '/competitions',
        label: 'Competitions',
        icon: Trophy,
        hint: 'Open competitions; play them in the app',
        competitions: true,
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        to: '/account/addresses',
        label: 'Addresses',
        icon: MapPin,
        hint: 'Delivery addresses on your account',
      },
      {
        to: '/account/recipients',
        label: 'Recipients',
        icon: Users,
        hint: 'People you send gifts to',
      },
      {
        to: '/account/profile',
        label: 'Account settings',
        icon: User,
        hint: 'Name, contact details, and country',
      },
    ],
  },
]

export const accountNavItems: AccountNavItem[] = accountNavGroups.flatMap(
  (group) => group.items,
)

/** The account nav with competition links left out while they are off. */
export function useAccountNav(): { groups: AccountNavGroup[]; items: AccountNavItem[] } {
  const competitionsOn = useCompetitionsEnabled()
  return useMemo(() => {
    const groups = accountNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => competitionsOn || !item.competitions),
      }))
      .filter((group) => group.items.length > 0)
    return { groups, items: groups.flatMap((group) => group.items) }
  }, [competitionsOn])
}
