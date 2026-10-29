import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { listCountries } from '@/api/countries'
import type { Country } from '@/api/types'
import { AdminPageHeader } from '@/features/admin'
import { MembersPanel } from '@/features/admin/competition-points/members-panel'
import { OffersPanel } from '@/features/admin/competition-points/versions-panel'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'packages', label: 'Packages' },
  { id: 'members', label: 'Members' },
] as const

/**
 * Membership packages, and who is on them. A package is one priced, versioned
 * offer in one country; an admin creates it and publishes it directly.
 * The Members tab lists the customers who have paid for one.
 */
export function AdminMembershipsPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'packages'
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
        description="Create membership packages, and see which customers are members and what package they are on."
      />
      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-brand-ink/15">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
              tab === t.id ? 'border-brand-ink text-brand-ink' : 'border-transparent text-muted-foreground hover:text-brand-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'packages' ? <OffersPanel countries={countries} /> : <MembersPanel />}
    </>
  )
}
