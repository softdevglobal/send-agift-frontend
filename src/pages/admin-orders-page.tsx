import { ShoppingBag } from 'lucide-react'

import { AdminEmptyState, AdminPageHeader } from '@/features/admin'

export function AdminOrdersPage() {
  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Track gift orders across every seller and market."
      />
      <AdminEmptyState
        soon
        icon={ShoppingBag}
        title="Order oversight is not wired up yet"
        description="Platform-wide orders, payment status, and refunds will be managed from this screen once checkout is live."
      />
    </>
  )
}
