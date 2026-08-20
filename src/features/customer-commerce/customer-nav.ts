import {
  Heart,
  LayoutDashboard,
  ShoppingBag,
  User,
  type LucideIcon,
} from 'lucide-react'

export type CustomerNavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const customerDashboardNav: CustomerNavItem = {
  to: '/customer',
  label: 'Dashboard',
  icon: LayoutDashboard,
  end: true,
}

export const customerPrimaryNav: CustomerNavItem[] = [
  customerDashboardNav,
  { to: '/customer/orders', label: 'Orders & Returns', icon: ShoppingBag },
  { to: '/customer/saved-gifts', label: 'My Wishlist', icon: Heart },
]

export const customerAccountNav: CustomerNavItem[] = [
  { to: '/customer/profile', label: 'Profile', icon: User },
]

export type CustomerNavGroup = {
  label?: string
  items: CustomerNavItem[]
}

export const customerNavGroups: CustomerNavGroup[] = [
  { items: [customerDashboardNav] },
  {
    label: 'Orders',
    items: [
      { to: '/customer/orders', label: 'Orders & Returns', icon: ShoppingBag },
      { to: '/customer/saved-gifts', label: 'My Wishlist', icon: Heart },
    ],
  },
  { label: 'Account', items: customerAccountNav },
]
