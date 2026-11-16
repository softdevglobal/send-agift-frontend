import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gamepad2, Gift, Hourglass, LoaderCircle, MapPin, ShoppingBag, Smartphone, Ticket, Undo2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  claimFreeEntries,
  getMyGameEntries,
  getMyState,
  setMyState,
  type CustomerState,
  type GameEntriesWallet,
} from '@/api/game-entries'
import { FormAlert } from '@/components/common/form-alert'
import { Sparkle } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import { CustomerEmptyState, CustomerPageHeader } from '@/features/customer-commerce'
import { customerPanelClass } from '@/features/customer-commerce/customer-styles'
import { StateSelect } from '@/features/game-entries/state-select'
import { useCompetitionsEnabled } from '@/features/capabilities/use-competitions-enabled'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'earned' | 'used'

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'earned', label: 'Earned' },
  { id: 'used', label: 'Used' },
]

const number = new Intl.NumberFormat()

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * The customer's game entries: what they hold, where each came from, and
 * whether games are open where they live. Entries are earned by buying
 * promoted products and are used in the mobile app; they cannot be bought.
 */
export function CustomerGameEntriesPage() {
  const [wallet, setWallet] = useState<GameEntriesWallet | null>(null)
  const [state, setState] = useState<CustomerState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [claiming, setClaiming] = useState(false)
  const competitionsOn = useCompetitionsEnabled()

  const load = useCallback(async () => {
    try {
      const [w, s] = await Promise.all([getMyGameEntries(), getMyState()])
      setWallet(w)
      setState(s)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your game entries.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const history = useMemo(() => {
    const all = wallet?.history ?? []
    if (filter === 'earned') return all.filter((e) => e.delta > 0)
    if (filter === 'used') return all.filter((e) => e.delta < 0)
    return all
  }, [wallet, filter])

  async function claim() {
    setClaiming(true)
    setNotice(null)
    try {
      const res = await claimFreeEntries()
      setNotice(res.message)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not claim free entries.'))
    } finally {
      setClaiming(false)
    }
  }

  const totals = wallet?.totals
  const tiles = [
    { label: 'Earned', value: totals?.earned ?? 0, icon: ShoppingBag, tone: 'bg-brand-violet text-white' },
    { label: 'Used on games', value: totals?.spent ?? 0, icon: Gamepad2, tone: 'bg-brand-teal text-brand-ink' },
    { label: 'Waiting for payment', value: totals?.pending ?? 0, icon: Hourglass, tone: 'bg-amber-300 text-amber-950' },
    { label: 'Taken back', value: totals?.reversed ?? 0, icon: Undo2, tone: 'bg-brand-ink text-white' },
  ]
  const blocked = wallet?.play && !wallet.play.allowed ? wallet.play : wallet?.earn && !wallet.earn.allowed ? wallet.earn : null
  const free = wallet?.earn?.allowed ? wallet.earn.free_entries_per_day : 0

  return (
    <>
      <CustomerPageHeader
        title="Game entries"
        description="Earn game entries when you buy products marked with them. Use them to play skill games in the SendAGift mobile app."
      />
      <FormAlert error={error} notice={notice} className="mb-4" />

      {loading ? (
        <div className="flex justify-center py-20">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : wallet ? (
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-ink px-6 py-7 text-white sm:px-8">
            <Sparkle className="absolute top-6 right-[22%] size-6 text-brand-teal" />
            <Sparkle className="absolute right-8 bottom-5 size-4 text-brand-violet" />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-white/55 uppercase">Available to play</p>
                <p className="mt-2 flex items-baseline gap-3 font-poster text-6xl">
                  {number.format(wallet.balance)}
                  <span className="font-sans text-sm font-bold tracking-[0.14em] text-white/60 uppercase">
                    {wallet.balance === 1 ? 'entry' : 'entries'}
                  </span>
                </p>
                {totals && totals.pending > 0 ? (
                  <p className="mt-2 text-sm text-white/70">
                    {number.format(totals.pending)} more arrive when your payment is confirmed.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {competitionsOn ? (
                  <Button asChild className="h-11 rounded-full bg-white px-5 text-brand-ink hover:bg-white/90">
                    <Link to="/competitions">See what&apos;s open</Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline" className="h-11 rounded-full border-white/30 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/products">Shop gifts</Link>
                </Button>
              </div>
            </div>
          </section>

          {blocked ? (
            <section className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <p>{blocked.message}</p>
            </section>
          ) : (
            <section className="flex items-start gap-3 rounded-2xl border-2 border-brand-teal/40 bg-brand-teal/10 px-5 py-4 text-sm">
              <Smartphone className="mt-0.5 size-4 shrink-0" />
              <p>
                Games are played in the SendAGift mobile app. Open the app, sign in with this account and your entries
                are there.
                {wallet.play?.min_age ? ` You must be ${wallet.play.min_age} or older.` : ''}
              </p>
            </section>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className={cn(customerPanelClass, 'flex items-center gap-3 px-4 py-4')}>
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', t.tone)}>
                  <t.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-poster text-2xl leading-none">{number.format(t.value)}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{t.label}</p>
                </div>
              </div>
            ))}
          </div>

          {free > 0 ? (
            <section className={cn(customerPanelClass, 'flex flex-wrap items-center justify-between gap-3 px-5 py-4')}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-brand-ink">
                  <Gift className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">Free entries today</p>
                  <p className="text-sm text-muted-foreground">
                    No purchase needed: {number.format(free)} free {free === 1 ? 'entry' : 'entries'} once a day.
                  </p>
                </div>
              </div>
              <Button variant="outline" className="h-10 px-4" onClick={() => void claim()} disabled={claiming}>
                {claiming ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Claim free entries
              </Button>
            </section>
          ) : null}

          {state ? <StateCard state={state} onChanged={load} /> : null}

          {wallet.play?.official_rules ? (
            <details className={cn(customerPanelClass, 'px-5 py-4 text-sm')}>
              <summary className="cursor-pointer font-semibold">Official rules where you live</summary>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">{wallet.play.official_rules}</p>
            </details>
          ) : null}

          <section className={cn(customerPanelClass, 'overflow-hidden')}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
              <h2 className="font-poster text-xl">History</h2>
              <div className="flex gap-1 rounded-full bg-muted p-1">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                      filter === f.id ? 'bg-background text-brand-ink shadow-sm dark:text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {history.length === 0 ? (
              <div className="px-5 py-10">
                <CustomerEmptyState
                  icon={Ticket}
                  title="Nothing here yet"
                  description="Buy a product marked “Earn game entries” and they appear here as soon as your payment is confirmed."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {history.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.description}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {when(e.created_at)}
                        {e.order_number ? ` · Order ${e.order_number}` : ''}
                        {e.reason && e.entry_type.startsWith('admin') ? ` · ${e.reason}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn('font-bold', e.delta > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground')}>
                        {e.delta > 0 ? '+' : '−'}
                        {number.format(Math.abs(e.delta))}
                      </p>
                      <p className="text-xs text-muted-foreground">Balance {number.format(e.balance_after)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Game entries cannot be bought, sent to someone else or exchanged for money. If an order is refunded or
            cancelled, the entries it earned are taken back. Availability depends on your country and state.
          </p>
        </div>
      ) : null}
    </>
  )
}

/** The state on the account, and changing it within the limits. */
function StateCard({ state, onChanged }: { state: CustomerState; onChanged: () => void | Promise<void> }) {
  const [editing, setEditing] = useState(state.state_required)
  const [choice, setChoice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!state.state && !state.state_required) return null
  const canChangeAt = state.can_change_at ? new Date(state.can_change_at) : null
  const locked = !!state.state && !!canChangeAt && canChangeAt > new Date()

  async function save() {
    if (!choice) return setError('Choose your state or region.')
    setBusy(true)
    setError(null)
    try {
      await setMyState(choice)
      setEditing(false)
      await onChanged()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your state.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={cn(customerPanelClass, 'px-5 py-4')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-brand-ink">
            <MapPin className="size-5" />
          </span>
          <div>
            <p className="font-semibold">{state.state ? state.state.name : 'Your state or region'}</p>
            <p className="text-sm text-muted-foreground">
              {state.state
                ? locked
                  ? `Can be changed again on ${canChangeAt!.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.`
                  : 'The state you live in. Changing it needs a verified phone number.'
                : 'Needed before you can use games and game entries.'}
            </p>
          </div>
        </div>
        {state.state && !locked && !editing ? (
          <Button variant="outline" className="h-10 px-4" onClick={() => setEditing(true)}>
            Change
          </Button>
        ) : null}
      </div>
      {editing && !locked ? (
        <div className="mt-4 space-y-3">
          <StateSelect countryId={state.country_id} value={choice} onChange={setChoice} id="entries-state" />
          <FormAlert error={error} />
          <div className="flex gap-2">
            <Button className="h-10 px-4" onClick={() => void save()} disabled={busy || !choice}>
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Save
            </Button>
            {state.state ? (
              <Button variant="ghost" className="h-10 px-4" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
