import {
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
  { to: '/customer/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/customer/orders', label: 'Orders', icon: ShoppingBag },
]

export const customerAccountNav: CustomerNavItem[] = [
  { to: '/customer/profile', label: 'Profile', icon: User },
]
