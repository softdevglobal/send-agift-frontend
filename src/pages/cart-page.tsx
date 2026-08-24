import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  customerPanelClass,
  formatMoney,
  useCart,
} from '@/features/customer-commerce'
import { cn } from '@/lib/utils'

export function CartPage() {
  const { lines, itemCount, subtotal, shipping, total, setQuantity, removeItem } =
    useCart()

  if (!lines.length) {
    return (
      <div>
        <CustomerPageHeader
          title="Cart"
          description="Gifts you add stay on this device until you place a demo order."
        />
        <CustomerEmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse the catalog and add a gift to get started."
          action={
            <Button asChild className="h-10 rounded-full px-4">
              <Link to="/products">Discover gifts</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <CustomerPageHeader
        title="Cart"
        description={`${itemCount} item${itemCount === 1 ? '' : 's'} ready for checkout.`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,1fr)]">
        <ul className="space-y-3">
          {lines.map((line) => (
            <li
              key={line.product.id}
              className={cn(customerPanelClass, 'flex gap-4 p-3 sm:p-4')}
            >
              <Link
                to={`/products/${line.product.id}`}
                className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-24"
              >
                <img
                  src={line.product.image}
                  alt={line.product.name}
                  className="size-full object-cover"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/products/${line.product.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {line.product.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatMoney(line.product.price)} each
                    </p>
                  </div>
                  <p className="text-sm font-medium">{formatMoney(line.lineTotal)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center rounded-full border border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full"
                      aria-label={`Decrease ${line.product.name}`}
                      onClick={() =>
                        setQuantity(line.product.id, line.quantity - 1)
                      }
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-7 text-center text-sm">{line.quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full"
                      aria-label={`Increase ${line.product.name}`}
                      onClick={() =>
                        setQuantity(line.product.id, line.quantity + 1)
                      }
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full px-2.5 text-muted-foreground"
                    onClick={() => removeItem(line.product.id)}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className={cn(customerPanelClass, 'h-fit p-5')}>
          <h2 className="font-medium">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatMoney(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{shipping === 0 ? 'Free' : formatMoney(shipping)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border/60 pt-3 font-medium">
              <dt>Total</dt>
              <dd>{formatMoney(total)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Free shipping on orders of $75 or more.
          </p>
          <Button asChild className="mt-5 h-11 w-full rounded-full">
            <Link to="/checkout">Continue to checkout</Link>
          </Button>
        </aside>
      </div>
    </div>
  )
}
