import type { AuthRole, LoginCopy } from '@/features/auth/types'

export const loginCopy: Record<AuthRole, LoginCopy> = {
  customer: {
    roleLabel: 'Customer',
    headline: 'Gifts that arrive with intention.',
    supporting:
      'Discover country-ready gifts, track every delivery, and earn points along the way.',
    submitLabel: 'Sign in',
    switchPrompt: 'Selling on SendAgift?',
    switchLabel: 'Seller sign in',
    switchTo: '/seller/login',
    registerHint: 'New here?',
    registerLabel: 'Create a customer account',
    registerTo: '/register',
    panelAccent: 'Country-controlled gifting',
    panelNote: 'Shop curated gifts, follow orders, and join approved competitions.',
  },
  seller: {
    roleLabel: 'Seller',
    headline: 'Your shop, ready for fulfilment.',
    supporting:
      'Manage inventory, connected payouts, courier labels, and proof of delivery in one place.',
    submitLabel: 'Sign in',
    switchPrompt: 'Shopping for a gift?',
    switchLabel: 'Customer sign in',
    switchTo: '/login',
    registerHint: 'Want to sell?',
    registerLabel: 'Start seller registration',
    registerTo: '/seller/register',
    panelAccent: 'Seller fulfilment portal',
    panelNote: 'Onboard payments, publish products, and stay payout-ready by country.',
  },
  admin: {
    roleLabel: 'Admin',
    headline: 'Operate the marketplace.',
    supporting:
      'Sign in to manage countries, review platform settings, and support live markets.',
    submitLabel: 'Sign in',
    switchPrompt: 'Shopping for a gift?',
    switchLabel: 'Customer sign in',
    switchTo: '/login',
    registerHint: 'First admin?',
    registerLabel: 'Bootstrap an admin account',
    registerTo: '/admin/register',
    panelAccent: 'Platform administration',
    panelNote: 'Activate countries, keep catalogue boundaries, and steward SendAgift.',
  },
}
