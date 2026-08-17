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
        description="New admins are currently created through POST /admin/register with the bootstrap secret. Role management will move here once a listing endpoint exists."
      />
    </>
  )
}
