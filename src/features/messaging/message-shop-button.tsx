import { useMemo, useState } from 'react'
import { ChevronRight, Gift, MessageSquare, Package } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/auth-context'
import type { CatalogProduct } from '@/features/customer-commerce/types'
import { formatMoney } from '@/features/customer-commerce/utils'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

import { useCustomerMessages } from './customer-messages'
import { formatInboxTime } from './messaging-utils'

type MessageShopButtonProps = {
  /**
   * The gifts a question can be about. The API ties every customer ↔ shop chat
   * to a product (or an order item) — there is no shop-wide thread — so the
   * customer picks which gift they mean.
   */
  products: CatalogProduct[]
  shopName: string
  label?: string
  variant?: 'default' | 'outline'
  className?: string
}

function priceOf(product: CatalogProduct): string {
  return product.priceAmount != null && product.currency
    ? formatPriceAmount(product.priceAmount, product.currency)
    : formatMoney(product.price)
}

/**
 * "Message shop" for storefront pages. One gift goes straight to its chat;
 * several open a picker that also offers the customer's existing threads with
 * this shop, so they continue a conversation instead of starting a second one.
 */
export function MessageShopButton({
  products,
  shopName,
  label = 'Message shop',
  variant = 'default',
  className,
}: MessageShopButtonProps) {
  const { isAuthenticated, role } = useAuth()
  const { askAboutProduct, openMessages, conversations } = useCustomerMessages()
  const [pickerOpen, setPickerOpen] = useState(false)

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )
  const existing = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.type !== 'support' &&
          conversation.product_id != null &&
          productsById.has(conversation.product_id),
      ),
    [conversations, productsById],
  )
  const unreadHere = existing.reduce((total, item) => total + item.unread_count, 0)

  // Only customers can start product chats; sellers and admins browsing the
  // storefront don't get a button that would fail.
  if (isAuthenticated && role !== 'customer') return null

  const empty = products.length === 0

  // The picker closes first so the messages panel isn't opened under a closing dialog.
  function afterClose(action: () => void) {
    setPickerOpen(false)
    window.requestAnimationFrame(action)
  }

  function handleClick() {
    if (!isAuthenticated) {
      openMessages() // sends guests to sign in, then back to this page
      return
    }
    if (products.length === 1) {
      askAboutProduct(products[0].id)
      return
    }
    setPickerOpen(true)
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        disabled={empty}
        title={empty ? 'This shop has no gifts to ask about yet' : undefined}
        onClick={handleClick}
        className={cn('relative h-10 rounded-full px-4', className)}
      >
        <MessageSquare className="size-4" />
        {label}
        {unreadHere > 0 ? (
          <span
            aria-label={`${unreadHere} unread`}
            className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-brand-teal ring-2 ring-background"
          />
        ) : null}
      </Button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-md"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader className="border-b border-border/60 px-6 pt-6 pb-5">
            <span className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-violet to-brand-navy text-white shadow-[0_10px_24px_rgba(76,29,149,0.3)]">
              <MessageSquare className="size-5" />
            </span>
            <DialogTitle>Message {shopName}</DialogTitle>
            <DialogDescription>
              Pick the gift you’re asking about, so the shop knows exactly what you mean.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60svh] overflow-y-auto p-3">
            {existing.length ? (
              <section className="mb-3">
                <p className="px-2 pt-1 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Continue a conversation
                </p>
                <ul className="space-y-1">
                  {existing.slice(0, 3).map((conversation) => {
                    const product = conversation.product_id
                      ? productsById.get(conversation.product_id)
                      : undefined
                    const TypeIcon = conversation.type === 'order' ? Package : Gift
                    return (
                      <li key={conversation.id}>
                        <button
                          type="button"
                          onClick={() => afterClose(() => openMessages(conversation.id))}
                          className="flex w-full items-center gap-3 rounded-2xl bg-accent/40 p-2 text-left transition-colors hover:bg-accent/70"
                        >
                          <ProductThumb product={product} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {product?.name ?? 'Gift'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <TypeIcon className="size-3" />
                              {conversation.type === 'order' ? 'Order chat' : 'Your question'} ·{' '}
                              {formatInboxTime(conversation.last_message_at ?? conversation.created_at)}
                            </span>
                          </span>
                          {conversation.unread_count > 0 ? (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-brand-violet to-brand-navy px-1.5 text-[10px] font-semibold text-white">
                              {conversation.unread_count}
                            </span>
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            <p className="px-2 pt-1 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              {existing.length ? 'Or ask about a gift' : 'Choose a gift'}
            </p>
            <ul className="space-y-1">
              {products.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => afterClose(() => askAboutProduct(product.id))}
                    className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-muted/70"
                  >
                    <ProductThumb product={product} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{product.name}</span>
                      <span className="block text-xs text-muted-foreground">{priceOf(product)}</span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ProductThumb({ product }: { product?: CatalogProduct }) {
  return product?.image ? (
    <img
      src={product.image}
      alt=""
      className="size-12 shrink-0 rounded-xl object-cover ring-1 ring-border/60"
    />
  ) : (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <Gift className="size-5" />
    </span>
  )
}
