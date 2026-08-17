import {
  Globe2,
  LayoutDashboard,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type AdminNavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** Section has no backend endpoints yet — renders a placeholder screen. */
  soon?: boolean
}

export type AdminNavGroup = {
  label: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { to: '/admin/sellers', label: 'Sellers', icon: Store, soon: true },
      { to: '/admin/customers', label: 'Customers', icon: Users, soon: true },
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, soon: true },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { to: '/admin/countries', label: 'Countries', icon: Globe2 },
      { to: '/admin/admins', label: 'Admin team', icon: ShieldCheck, soon: true },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/admin/account', label: 'Profile', icon: UserCircle }],
  },
]
