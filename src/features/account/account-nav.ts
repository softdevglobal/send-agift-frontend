import {
  Heart,
  History,
  MapPin,
  PackageSearch,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type AccountNavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Shown in the header dropdown as a one-line hint. */
  hint?: string
  /** When true, the nav item is only active on that exact path. */
  end?: boolean
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
        to: '/account/saved-gifts',
        label: 'Saved gifts',
        icon: Heart,
        hint: 'Your wishlist',
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
