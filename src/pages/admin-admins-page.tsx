import { ShieldCheck } from 'lucide-react'

import { AdminEmptyState, AdminPageHeader } from '@/features/admin'

export function AdminAdminsPage() {
  return (
    <>
      <AdminPageHeader
        title="Admin team"
        description="Manage console access and roles for staff accounts."
      />
      <AdminEmptyState
        soon
        icon={ShieldCheck}
        title="Team management is not wired up yet"
        description="New admins are added through the account bootstrap flow, using the console's setup secret. Role management will move here once the team directory is ready."
      />
    </>
  )
}
