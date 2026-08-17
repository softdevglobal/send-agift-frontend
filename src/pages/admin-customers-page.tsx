import { Users } from 'lucide-react'

import { AdminEmptyState, AdminPageHeader } from '@/features/admin'

export function AdminCustomersPage() {
  return (
    <>
      <AdminPageHeader
        title="Customers"
        description="Browse registered customers, their markets, and account status."
      />
      <AdminEmptyState
        soon
        icon={Users}
        title="Customer directory is not wired up yet"
        description="When a customer listing endpoint lands, searchable customer records and account actions will appear here."
      />
    </>
  )
}
