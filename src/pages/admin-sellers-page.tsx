import { Store } from 'lucide-react'

import { AdminEmptyState, AdminPageHeader } from '@/features/admin'

export function AdminSellersPage() {
  return (
    <>
      <AdminPageHeader
        title="Sellers"
        description="Review seller applications, verification status, and shop activity."
      />
      <AdminEmptyState
        soon
        icon={Store}
        title="Seller management is not wired up yet"
        description="Once the backend exposes seller listing and verification endpoints, approvals and shop oversight will live here."
      />
    </>
  )
}
