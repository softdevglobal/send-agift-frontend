import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { listCountries } from '@/api/countries'
import type { Country } from '@/api/types'
import { AdminPageHeader } from '@/features/admin'
import { ApprovalsPanel } from '@/features/admin/competition-points/approvals-panel'
import { CasesPanel, OverviewPanel, StopsPanel } from '@/features/admin/competition-points/operations-panel'
import { OffersPanel, PoliciesPanel } from '@/features/admin/competition-points/versions-panel'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'policies', label: 'Reward policies' },
  { id: 'offers', label: 'Memberships' },
  { id: 'stops', label: 'Emergency stops' },
  { id: 'cases', label: 'Review cases' },
] as const

type Tab = (typeof TABS)[number]['id']

/**
 * Competition points (handover v4): approvals, reward policies, membership
 * offers, emergency stops and review cases. Admins can see and change them.
 */
export function AdminCompetitionPointsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as Tab
  const [countries, setCountries] = useState<Country[]>([])

  useEffect(() => {
    listCountries()
      .then((list) => setCountries(Array.isArray(list) ? list : []))
      .catch(() => setCountries([]))
  }, [])

  return (
    <>
      <AdminPageHeader
        title="Competition points"
        description="Gift points, the member bonus and competition entry. Nothing is offered anywhere until an approval record covers it."
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
      {tab === 'overview' ? <OverviewPanel /> : null}
      {tab === 'approvals' ? <ApprovalsPanel countries={countries} /> : null}
      {tab === 'policies' ? <PoliciesPanel countries={countries} /> : null}
      {tab === 'offers' ? <OffersPanel countries={countries} /> : null}
      {tab === 'stops' ? <StopsPanel countries={countries} /> : null}
      {tab === 'cases' ? <CasesPanel /> : null}
    </>
  )
}
