import { useCallback, useEffect, useState } from 'react'
import { Gift, LoaderCircle, Package, Pencil, Plus } from 'lucide-react'

import {
  createPointPackage,
  describeRate,
  formatCents,
  listAdminPointPackages,
  updatePointPackage,
  type PointPackage,
  type PointPackageInput,
  type PointsRate,
} from '@/api/points'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AdminEmptyState, AdminPageHeader } from '@/features/admin'
import { formatPoints } from '@/features/points/format'
import { getErrorMessage } from '@/lib/api'
import { blankIfZero, cn } from '@/lib/utils'

/** What a package works out at per point, against the base rate. */
function valueLine(pkg: PointPackage, rate: PointsRate | null) {
  const total = pkg.points + pkg.bonus_points
  const perPoint = pkg.price_cents / total
  const parts = [`${perPoint.toFixed(perPoint < 1 ? 2 : 1)}¢ per point`]
  if (rate) {
    const saving = 1 - perPoint / rate.cents_per_point
    if (saving >= 0.005) parts.push(`${Math.round(saving * 100)}% better than the base rate`)
    else if (saving <= -0.005) parts.push(`${Math.round(-saving * 100)}% above the base rate`)
  }
  return parts.join(' · ')
}

/**
 * The point packages sellers pick from when they buy points. Admins can add,
 * change or switch one off; each change asks for their password again and is
 * audited.
 */
export function AdminPointPackagesPage() {
  const [items, setItems] = useState<PointPackage[]>([])
  const [rate, setRate] = useState<PointsRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<PointPackage | 'new' | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await listAdminPointPackages()
      setItems(res.items)
      setRate(res.rate)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the point packages.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function toggle(pkg: PointPackage) {
    setToggling(pkg.id)
    setError(null)
    setNotice(null)
    try {
      await updatePointPackage(pkg.id, { ...toInput(pkg), is_active: !pkg.is_active })
      await load()
      setNotice(pkg.is_active ? `${pkg.name} is no longer on sale.` : `${pkg.name} is on sale again.`)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change the package.'))
    } finally {
      setToggling(null)
    }
  }

  const onSale = items.filter((p) => p.is_active).length

  return (
    <>
      <AdminPageHeader
        title="Point packages"
        description={`The bundles sellers can buy to fund product rewards${
          rate ? `. Base rate ${describeRate(rate)}` : ''
        }. ${onSale} on sale.`}
        action={
          <Button onClick={() => setEditing('new')} className="h-11 px-5">
            <Plus className="size-4" />
            New package
          </Button>
        }
      />

      <FormAlert error={error} notice={notice} className="mb-4" />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={Package}
          title="No packages yet"
          description="Sellers can still buy any amount. Add packages to give them ready-made choices."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((pkg) => (
            <article
              key={pkg.id}
              className={cn(
                'relative flex flex-col rounded-xl border-2 bg-card p-5',
                pkg.is_active ? 'border-brand-ink/15' : 'border-dashed border-brand-ink/15 opacity-70',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                    {pkg.name}
                  </p>
                  <p className="mt-1 font-poster text-3xl">
                    {formatPoints(pkg.points + pkg.bonus_points)}
                    <span className="ml-1 font-sans text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">
                      pts
                    </span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] uppercase',
                      pkg.is_active ? 'bg-brand-teal text-brand-ink' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {pkg.is_active ? 'On sale' : 'Off'}
                  </span>
                  {pkg.badge ? (
                    <span className="rounded-md bg-amber-300 px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-amber-950 uppercase">
                      {pkg.badge}
                    </span>
                  ) : null}
                </div>
              </div>

              {pkg.bonus_points > 0 ? (
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-violet">
                  <Gift className="size-4" />
                  {formatPoints(pkg.points)} + {formatPoints(pkg.bonus_points)} bonus
                </p>
              ) : null}
              {pkg.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{pkg.description}</p>
              ) : null}

              <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/60 pt-3">
                <div>
                  <p className="text-lg font-bold">{formatCents(pkg.price_cents, pkg.currency)}</p>
                  <p className="text-xs text-muted-foreground">{valueLine(pkg, rate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={pkg.is_active}
                    disabled={toggling === pkg.id}
                    onCheckedChange={() => void toggle(pkg)}
                    aria-label={pkg.is_active ? `Take ${pkg.name} off sale` : `Put ${pkg.name} on sale`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full px-3"
                    onClick={() => setEditing(pkg)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing ? (
        <PackageDialog
          pkg={editing === 'new' ? null : editing}
          rate={rate}
          nextSort={items.length}
          onClose={() => setEditing(null)}
          onSaved={async (saved, created) => {
            setEditing(null)
            await load()
            setNotice(created ? `${saved.name} created.` : `${saved.name} saved.`)
          }}
        />
      ) : null}
    </>
  )
}

function toInput(pkg: PointPackage): PointPackageInput {
  return {
    name: pkg.name,
    description: pkg.description ?? null,
    points: pkg.points,
    bonus_points: pkg.bonus_points,
    price_cents: pkg.price_cents,
    badge: pkg.badge ?? null,
    is_active: pkg.is_active,
    sort_order: pkg.sort_order,
  }
}

function PackageDialog({
  pkg,
  rate,
  nextSort,
  onClose,
  onSaved,
}: {
  pkg: PointPackage | null
  rate: PointsRate | null
  nextSort: number
  onClose: () => void
  onSaved: (saved: PointPackage, created: boolean) => void | Promise<void>
}) {
  const [name, setName] = useState(pkg?.name ?? '')
  const [description, setDescription] = useState(pkg?.description ?? '')
  const [points, setPoints] = useState(String(pkg?.points ?? ''))
  const [bonus, setBonus] = useState(blankIfZero(pkg?.bonus_points))
  const [price, setPrice] = useState(pkg ? String(pkg.price_cents / 100) : '')
  const [badge, setBadge] = useState(pkg?.badge ?? '')
  const [sort, setSort] = useState(String(pkg?.sort_order ?? nextSort))
  const [active, setActive] = useState(pkg?.is_active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Suggest points from the base rate when a price is typed for a new package.
  function onPrice(value: string) {
    setPrice(value)
    const cents = Math.round(Number(value) * 100)
    if (!pkg && rate && Number.isFinite(cents) && cents > 0 && (points === '' || points === '0')) {
      setPoints(String(Math.floor(cents / rate.cents_per_point)))
    }
  }

  const total = (Number(points) || 0) + (Number(bonus) || 0)

  async function save() {
    setError(null)
    const body: PointPackageInput = {
      name: name.trim(),
      description: description.trim() || null,
      points: Math.floor(Number(points)),
      bonus_points: Math.floor(Number(bonus) || 0),
      price_cents: Math.round(Number(price) * 100),
      badge: badge.trim() || null,
      is_active: active,
      sort_order: Math.floor(Number(sort) || 0),
    }
    if (!body.name) return setError('Give the package a name.')
    if (!(body.points > 0)) return setError('Points must be more than zero.')
    if (!(body.price_cents >= 100)) return setError('The price must be at least 1.00.')
    setBusy(true)
    try {
      const saved = pkg ? await updatePointPackage(pkg.id, body) : await createPointPackage(body)
      await onSaved(saved, !pkg)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the package.'))
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pkg ? `Edit ${pkg.name}` : 'New point package'}</DialogTitle>
          <DialogDescription>
            Priced in {rate?.currency ?? 'the points currency'}. Purchases already made keep the
            name and points they were bought at.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pkg-name">Name</Label>
            <Input id="pkg-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Popular" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg-price">Price ({rate?.currency ?? ''})</Label>
            <Input id="pkg-price" type="number" inputMode="decimal" min={1} step="0.01" value={price} onChange={(e) => onPrice(e.target.value)} placeholder="25.00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg-points">Points</Label>
            <Input id="pkg-points" type="number" inputMode="numeric" min={1} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="250" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg-bonus">Bonus points</Label>
            <Input id="pkg-bonus" type="number" inputMode="numeric" min={0} value={bonus} onChange={(e) => setBonus(e.target.value)} />
            <p className="text-xs text-muted-foreground">On top of the points; up to as many again.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg-badge">Badge</Label>
            <Input id="pkg-badge" value={badge} maxLength={24} onChange={(e) => setBadge(e.target.value)} placeholder="Most popular" />
            <p className="text-xs text-muted-foreground">Optional label on the card.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pkg-desc">Description</Label>
            <Input id="pkg-desc" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} placeholder="Enough for about 25 rewarded orders" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg-sort">Order on the page</Label>
            <Input id="pkg-sort" type="number" inputMode="numeric" value={sort} onChange={(e) => setSort(e.target.value)} />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-lg border-2 border-brand-ink/10 px-3 py-2">
            <span className="text-sm font-medium">On sale</span>
            <Switch checked={active} onCheckedChange={setActive} />
          </label>
        </div>

        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          Sellers pay{' '}
          <span className="font-bold">
            {Number(price) > 0 ? formatCents(Math.round(Number(price) * 100), rate?.currency) : '–'}
          </span>{' '}
          and get <span className="font-bold">{formatPoints(total)} points</span>
          {rate && total > 0 && Number(price) > 0 ? (
            <span className="text-muted-foreground">
              {' '}
              ({((Number(price) * 100) / total).toFixed(2)}¢ a point; base rate{' '}
              {rate.cents_per_point}¢)
            </span>
          ) : null}
          .
        </div>

        <FormAlert error={error} />

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {pkg ? 'Save package' : 'Create package'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
