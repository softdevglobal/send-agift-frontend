import {
  BarChart3,
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingBag,
  Store,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type SellerNavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const sellerPrimaryNav: SellerNavItem[] = [
  { to: '/seller', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/seller/shops', label: 'Shops', icon: Store },
  { to: '/seller/products', label: 'Products', icon: Package },
  { to: '/seller/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/seller/earnings', label: 'Earnings', icon: Wallet },
  { to: '/seller/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/seller/inbox', label: 'Inbox', icon: MessageSquare },
]

export const sellerAccountNav: SellerNavItem[] = [
  { to: '/seller/profile', label: 'Profile', icon: User },
]
