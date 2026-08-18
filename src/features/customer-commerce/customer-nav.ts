import {
  Heart,
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  User,
  type LucideIcon,
} from 'lucide-react'

export type CustomerNavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const customerPrimaryNav: CustomerNavItem[] = [
  { to: '/customer', label: 'Discover gifts', icon: LayoutDashboard, end: true },
  { to: '/customer/saved-gifts', label: 'Saved gifts', icon: Heart },
  { to: '/customer/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/customer/orders', label: 'Orders', icon: ShoppingBag },
]

export const customerAccountNav: CustomerNavItem[] = [
  { to: '/customer/profile', label: 'Profile', icon: User },
]

export type CustomerNavGroup = {
  label: string
  items: CustomerNavItem[]
}

export const customerNavGroups: CustomerNavGroup[] = [
  { label: 'Shopping', items: customerPrimaryNav },
  { label: 'Account', items: customerAccountNav },
]
