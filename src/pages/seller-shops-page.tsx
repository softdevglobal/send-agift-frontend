import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  createSellerShop,
  deleteSellerShop,
  getSellerMe,
  updateSellerShop,
  type Shop,
  type ShopInput,
} from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SellerPageHeader, sellerListRowClass, sellerPanelClass } from '@/features/seller'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { publishPublicSeller } from '@/lib/public-sellers'
import { textareaClassName } from '@/lib/form-styles'

const emptyShop: ShopInput = {
  name: '',
  slug: '',
  description: '',
  return_address_mode: '',
  customer_visible_location: '',
  status: '',
  address_id: '',
  image_url: '',
}

function toShopInput(shop: Shop): ShopInput {
  return {
    name: shop.name,
    slug: shop.slug ?? '',
    description: shop.description ?? '',
    return_address_mode: shop.return_address_mode ?? '',
    customer_visible_location: shop.customer_visible_location ?? '',
    status: shop.status ?? '',
    address_id: shop.address_id ?? '',
    image_url: shop.image_url ?? '',
  }
}

function serializeShop(input: ShopInput): ShopInput {
  return {
    name: input.name.trim(),
    slug: optionalString(input.slug ?? ''),
    description: optionalString(input.description ?? ''),
    return_address_mode: optionalString(input.return_address_mode ?? ''),
    customer_visible_location: optionalString(input.customer_visible_location ?? ''),
    status: optionalString(input.status ?? ''),
    address_id: optionalString(input.address_id ?? ''),
    image_url: optionalString(input.image_url ?? ''),
  }
}

export function SellerShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [addresses, setAddresses] = useState<{ id: string; line1: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState<ShopInput>(emptyShop)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const me = await getSellerMe()
    publishPublicSeller(me)
    setShops(me.shops ?? [])
    setAddresses(
      (me.addresses ?? []).map((address) => ({
        id: address.id,
        line1: address.line1,
      })),
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load shops.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  function updateField<K extends keyof ShopInput>(key: K, value: ShopInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (!form.name.trim()) {
      setError('Shop name is required.')
      return
    }
    setSaving(true)
    try {
      const body = serializeShop(form)
      if (editingId) {
        await updateSellerShop(editingId, body)
        setNotice('Shop updated.')
      } else {
        await createSellerShop(body)
        setNotice('Shop created.')
      }
      setForm(emptyShop)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save shop.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    setNotice(null)
    try {
      await deleteSellerShop(id)
      if (editingId === id) {
        setEditingId(null)
        setForm(emptyShop)
      }
      await load()
      setNotice('Shop deleted.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete shop.'))
    }
  }

  return (
    <div>
      <SellerPageHeader
        title="Shops"
        description="Create and manage shops. Name is required; slug must be unique."
        action={
          <Button
            type="button"
            className="h-10 rounded-full px-4"
            onClick={() => {
              setEditingId(null)
              setForm(emptyShop)
              document.getElementById('shop-name')?.focus()
            }}
          >
            <Plus className="size-4" />
            Create a new shop
          </Button>
        }
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <FormAlert error={error} notice={notice} />

          <section className={`space-y-4 ${sellerPanelClass} p-6`}>
            <h2 className="font-display text-xl tracking-tight">Your shops</h2>
            {shops.length ? (
              <ul className="space-y-2.5">
                {shops.map((shop) => (
                  <li key={shop.id} className={sellerListRowClass}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {shop.image_url ? (
                          <img
                            src={shop.image_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="font-medium">{shop.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {[shop.slug, shop.status].filter(Boolean).join(' · ') ||
                            shop.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Manage products"
                        asChild
                      >
                        <Link to={`/seller/products?shop=${shop.id}`}>
                          <Package className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Edit shop"
                        onClick={() => {
                          setEditingId(shop.id)
                          setForm(toShopInput(shop))
                          setNotice(null)
                          setError(null)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete shop"
                        onClick={() => handleDelete(shop.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No shops yet.</p>
            )}
          </section>

          <form
            onSubmit={handleSubmit}
            className={`space-y-4 ${sellerPanelClass} p-6`}
          >
            <h2 className="font-display text-xl tracking-tight">
              {editingId ? 'Edit shop' : 'Add shop'}
            </h2>
            <div className="space-y-2">
              <Label htmlFor="shop-name">Name</Label>
              <Input
                id="shop-name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                className="h-11 bg-surface px-3"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shop-slug">Slug</Label>
                <Input
                  id="shop-slug"
                  value={form.slug ?? ''}
                  onChange={(event) => updateField('slug', event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-status">Status</Label>
                <Input
                  id="shop-status"
                  value={form.status ?? ''}
                  onChange={(event) => updateField('status', event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-description">Description</Label>
              <textarea
                id="shop-description"
                value={form.description ?? ''}
                onChange={(event) => updateField('description', event.target.value)}
                className={textareaClassName}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shop-return-mode">Return address mode</Label>
                <Input
                  id="shop-return-mode"
                  value={form.return_address_mode ?? ''}
                  onChange={(event) =>
                    updateField('return_address_mode', event.target.value)
                  }
                  className="h-11 bg-surface px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-visible-location">
                  Customer-visible location
                </Label>
                <Input
                  id="shop-visible-location"
                  value={form.customer_visible_location ?? ''}
                  onChange={(event) =>
                    updateField('customer_visible_location', event.target.value)
                  }
                  className="h-11 bg-surface px-3"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-address">Address</Label>
              <select
                id="shop-address"
                value={form.address_id ?? ''}
                onChange={(event) => updateField('address_id', event.target.value)}
                className="h-11 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-sm"
              >
                <option value="">No linked address</option>
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.line1}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-image">Image URL</Label>
              <Input
                id="shop-image"
                type="url"
                value={form.image_url ?? ''}
                onChange={(event) => updateField('image_url', event.target.value)}
                className="h-11 bg-surface px-3"
                placeholder="https://"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving} className="h-10">
                {saving ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Saving…
                  </>
                ) : editingId ? (
                  'Update shop'
                ) : (
                  'Create shop'
                )}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyShop)
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
