import {
  Heart,
  MapPin,
  ShoppingBag,
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
        to: '/account/orders',
        label: 'Track orders',
        icon: ShoppingBag,
        hint: 'Delivery status and cancellations',
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
