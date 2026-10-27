import { useEffect, useState } from 'react'

import { listCountries } from '@/api/countries'
import type { Country } from '@/api/types'
import { AdminPageHeader } from '@/features/admin'
import { OffersPanel } from '@/features/admin/competition-points/versions-panel'

/**
 * Membership packages: each is one priced, versioned offer in one country.
 * A Super Admin drafts and submits it; a different Super Admin approves it,
 * which publishes it. It is only sold where membership sales are approved.
 */
export function AdminMembershipsPage() {
  const [countries, setCountries] = useState<Country[]>([])

  useEffect(() => {
    listCountries()
      .then((list) => setCountries(Array.isArray(list) ? list : []))
      .catch(() => setCountries([]))
  }, [])

  return (
    <>
      <AdminPageHeader
        title="Memberships"
        description="Create membership packages: price, renewal interval, gift benefits and the extra competition points bonus. Sold only where membership sales are approved."
      />
      <OffersPanel countries={countries} />
    </>
  )
}
