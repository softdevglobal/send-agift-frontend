import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { listCountries } from '@/api/countries'
import type { Country } from '@/api/types'
import { AdminPageHeader } from '@/features/admin'
import { ApprovalsPanel } from '@/features/admin/competition-points/approvals-panel'
import { StopsPanel } from '@/features/admin/competition-points/stops-panel'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'approvals', label: 'Approvals' },
  { id: 'stops', label: 'Emergency stops' },
] as const

type Tab = (typeof TABS)[number]['id']

/**
 * Where memberships may be sold and renewed: an approval record per
 * country, and the emergency stops. Games and game entries have their own
 * switches under Games control.
 */
export function AdminCompetitionPointsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'approvals') as Tab
  const [countries, setCountries] = useState<Country[]>([])

  useEffect(() => {
    listCountries()
      .then((list) => setCountries(Array.isArray(list) ? list : []))
      .catch(() => setCountries([]))
  }, [])

  return (
    <>
      <AdminPageHeader
        title="Membership approvals"
        description="Memberships are sold in a country only while an approval record covers it."
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
      {tab === 'approvals' ? <ApprovalsPanel countries={countries} /> : null}
      {tab === 'stops' ? <StopsPanel countries={countries} /> : null}
    </>
  )
}
