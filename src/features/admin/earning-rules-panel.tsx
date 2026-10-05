import { useEffect, useState } from 'react'
import { Coins, LoaderCircle, Play } from 'lucide-react'

import { listEarningRules, runEarning, setEarningRule, type PointsEarningRule } from '@/api/points'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminPanelClass } from '@/features/admin/admin-styles'
import { formatDate } from '@/features/admin/admin-utils'
import { StatusPill } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * How customers earn points, per country: points per whole unit spent on a
 * delivered order (taken back if it is refunded) and a welcome bonus for new
 * customers. Changes apply from now on. Switching a rule on never pays out
 * past orders or sign-ups.
 */
export function EarningRulesPanel({ editable }: { editable: boolean }) {
  const [rules, setRules] = useState<PointsEarningRule[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    listEarningRules()
      .then(setRules)
      .catch((err) => setError(getErrorMessage(err, 'Could not load the earning rules.')))
  }, [])

  async function runNow() {
    setRunning(true)
    setError(null)
    try {
      const r = await runEarning()
      setNotice(
        `Earning run done: ${r.orders_rewarded} orders rewarded (${r.points_awarded} pts), ` +
          `${r.orders_reversed} refunds taken back (${r.points_reversed} pts), ` +
          `${r.signup_bonuses} welcome bonuses (${r.bonus_points_paid} pts), ` +
          `${r.product_rewards} product rewards paid (${r.product_reward_points} pts), ` +
          `${r.gift_points_delivered} gift points delivered, ${r.gift_points_returned} returned.`,
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className={cn(adminPanelClass, 'mb-6 p-5')}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <Coins className="size-5 text-amber-500" />
          How customers earn points
        </h2>
        {editable ? (
          <Button type="button" size="sm" variant="outline" className="h-8" disabled={running} onClick={runNow}>
            {running ? <LoaderCircle className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            Run now
          </Button>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Points for every whole unit spent on a delivered order (taken back if the order is refunded), and a welcome bonus
        for customers who join after it is switched on. The server applies these every few minutes; switching a rule on
        never pays out older orders.
      </p>
      <FormAlert error={error} notice={notice} className="mb-3" />
      {!rules ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <RuleRow
              key={rule.country_id}
              rule={rule}
              editable={editable}
              onSaved={(next) => {
                setRules(next)
                setNotice(`Saved the rule for ${rule.country_name}.`)
              }}
              onError={setError}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function RuleRow({
  rule,
  editable,
  onSaved,
  onError,
}: {
  rule: PointsEarningRule
  editable: boolean
  onSaved: (rules: PointsEarningRule[]) => void
  onError: (message: string) => void
}) {
  const [enabled, setEnabled] = useState(rule.enabled)
  const [perUnit, setPerUnit] = useState(String(rule.points_per_unit))
  const [bonus, setBonus] = useState(String(rule.signup_bonus))
  const [busy, setBusy] = useState(false)
  const dirty =
    enabled !== rule.enabled || Number(perUnit) !== rule.points_per_unit || Number(bonus) !== rule.signup_bonus

  async function save() {
    setBusy(true)
    try {
      onSaved(
        await setEarningRule(rule.country_id, {
          enabled,
          points_per_unit: Math.max(0, Math.trunc(Number(perUnit) || 0)),
          signup_bonus: Math.max(0, Math.trunc(Number(bonus) || 0)),
        }),
      )
    } catch (err) {
      onError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-medium">{rule.country_name}</p>
        <p className="text-xs text-muted-foreground">
          {rule.enabled && rule.effective_from ? `Orders delivered since ${formatDate(rule.effective_from)}` : 'Not earning'}
        </p>
      </div>
      {!rule.earning_allowed ? <StatusPill tone="warn">Earning gate off for this country</StatusPill> : null}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={enabled}
          disabled={!editable}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        On
      </label>
      <label className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={perUnit}
          disabled={!editable}
          onChange={(e) => setPerUnit(e.target.value)}
          className="h-9 w-20"
          aria-label={`Points per ${rule.currency} 1`}
        />
        <span className="text-muted-foreground">pts per {rule.currency} 1</span>
      </label>
      <label className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={bonus}
          disabled={!editable}
          onChange={(e) => setBonus(e.target.value)}
          className="h-9 w-24"
          aria-label="Welcome bonus"
        />
        <span className="text-muted-foreground">welcome bonus</span>
      </label>
      {editable ? (
        <Button type="button" size="sm" className="h-9" disabled={!dirty || busy} onClick={save}>
          {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
          Save
        </Button>
      ) : null}
    </div>
  )
}
