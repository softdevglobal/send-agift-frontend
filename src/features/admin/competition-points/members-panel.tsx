import { useEffect, useState } from 'react'
import { LoaderCircle, Search, Users } from 'lucide-react'

import { listMembers, type MemberRow, type MembersList } from '@/api/competition-points'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminEmptyState } from '@/features/admin'
import { formatDate, formatMoney } from '@/features/competition-points/format'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

import { StatusPill } from './shared'

const PAGE = 25

const STATES = [
  { id: 'current', label: 'Current' },
  { id: 'ended', label: 'Ended' },
  { id: 'all', label: 'All' },
] as const

type State = (typeof STATES)[number]['id']

const STATUS_LABEL: Record<MemberRow['status'], string> = {
  active: 'active',
  past_due: 'payment failed',
  cancelling: 'not renewing',
  cancelled: 'ended',
  expired: 'expired',
}

/**
 * Who is a member and which package they are on, current members first. A
 * checkout that was never paid is not a member and is not listed.
 */
export function MembersPanel() {
  const [data, setData] = useState<MembersList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<State>('current')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)

  // Search after a short pause in typing, from the first page.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(search.trim())
      setPage(0)
    }, 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    listMembers({ state, q, limit: PAGE, offset: page * PAGE })
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Could not load the members.')))
    return () => {
      cancelled = true
    }
  }, [state, q, page])

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-accent p-1">
          {STATES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setState(s.id)
                setPage(0)
              }}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors',
                state === s.id ? 'bg-brand-ink text-white' : 'text-brand-ink/60 hover:text-brand-ink',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="h-10 pl-9"
          />
        </div>
      </div>

      <FormAlert error={error} />
      {data === null && !error ? (
        <div className="flex justify-center py-10">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.items.length === 0 ? (
        <AdminEmptyState
          icon={Users}
          title="No members found"
          description={
            q || state !== 'current'
              ? 'Nobody matches these filters.'
              : 'Customers appear here once their first membership payment goes through.'
          }
        />
      ) : data ? (
        <>
          {/* Phones: one card per member, so nothing needs a sideways scroll. */}
          <ul className="space-y-3 md:hidden">
            {data.items.map((m) => (
              <li key={m.subscription_id} className="rounded-xl border border-brand-ink/15 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{m.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <StatusPill status={m.status} label={STATUS_LABEL[m.status]} />
                </div>
                <p className="mt-3 font-semibold">{m.package_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMoney(m.price_minor, m.currency)} {m.billing_label} · {m.country_name}
                </p>
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-brand-ink/10 pt-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Joined</dt>
                    <dd className="font-semibold">{formatDate(m.joined_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Paid until</dt>
                    <dd className="font-semibold">{formatDate(m.period_end)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Paid so far</dt>
                    <dd className="font-semibold">{formatMoney(m.total_paid_minor, m.currency)}</dd>
                    <dd className="text-muted-foreground">
                      {m.periods_paid} {m.periods_paid === 1 ? 'period' : 'periods'}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-brand-ink/15 md:block">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="bg-accent/50 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Package</th>
                  <th className="px-3 py-2">Country</th>
                  <th className="px-3 py-2">Joined</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Paid until</th>
                  <th className="px-3 py-2 text-right">Paid so far</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/10">
                {data.items.map((m) => (
                  <tr key={m.subscription_id}>
                    <td className="px-3 py-2.5">
                      <span className="block font-semibold">{m.display_name}</span>
                      <span className="block text-xs text-muted-foreground">{m.email}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="block font-semibold">{m.package_name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatMoney(m.price_minor, m.currency)} {m.billing_label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{m.country_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(m.joined_at)}</td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={m.status} label={STATUS_LABEL[m.status]} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(m.period_end)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="block font-semibold">{formatMoney(m.total_paid_minor, m.currency)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {m.periods_paid} {m.periods_paid === 1 ? 'period' : 'periods'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.total} {data.total === 1 ? 'member' : 'members'}
            </span>
            {pages > 1 ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <span>
                  Page {page + 1} of {pages}
                </span>
                <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
