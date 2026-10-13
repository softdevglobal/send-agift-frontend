import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Coins,
  Gift,
  LoaderCircle,
  MessageSquare,
  Quote,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { BackLink } from '@/components/common/back-link'
import { getRecipient, type RecipientDetails } from "@/api/customers";
import { cancelOrder, getOrder, type OrderDetails } from "@/api/orders";
import { FormAlert } from "@/components/common/form-alert";
import { syncOrderPayment } from "@/api/payments";
import { PayNowCard } from "@/features/payments/pay-now-card";
import { Button } from "@/components/ui/button";
import {
  CustomerPageHeader,
  customerPanelClass,
  getCatalogProduct,
} from "@/features/customer-commerce";
import {
  canCancelOrder,
  formatDeliveryDate,
  formatOrderDate,
  fulfilmentStatusLabel,
  isFreeGiftOrder,
  isHistoryOrderStatus,
  ordersListPath,
} from "@/features/customer-commerce/order-display";
import {
  OrderStatusBadge,
  OrderTrackingTimeline,
} from "@/features/customer-commerce/order-tracking";
import { ParcelTracking } from "@/features/customer-commerce/parcel-tracking";
import { useCustomerMessages } from "@/features/messaging";
import { formatPoints } from "@/features/points/format";
import { useMyReviews } from "@/features/reviews/my-reviews";
import { ReviewOrderItemButton } from "@/features/reviews/review-order-item-button";
import { ApiError, getErrorMessage } from "@/lib/api";
import { loadMarketplaceIntoCatalog } from "@/lib/marketplace";
import { formatPriceAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

export function CustomerOrderDetailPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get("placed") === "1";
  // Stripe sends the customer back here, paid or not.
  const returnedPaid = searchParams.get("paid") === "1";
  const paymentCancelled = searchParams.get("payment") === "cancelled";
  const { messageAboutOrderItem } = useCustomerMessages();
  // One request for the whole page, rather than one per line.
  const myReviews = useMyReviews();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [recipient, setRecipient] = useState<RecipientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setCatalogTick] = useState(0);
  // After paying on Stripe, the order turns "paid" when Stripe's webhook
  // reaches the server. Watch for that for a short while.
  const [awaitingPayment, setAwaitingPayment] = useState(returnedPaid);

  const load = useCallback(async () => {
    if (!orderId) return;
    const details = await getOrder(orderId);
    setOrder(details);
    if (details.recipient_id) {
      setRecipient(await getRecipient(details.recipient_id).catch(() => null));
    } else {
      setRecipient(null);
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((err) => {
        if (!cancelled)
          setError(getErrorMessage(err, "Could not load this order."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void loadMarketplaceIntoCatalog()
      .then(() => {
        if (!cancelled) setCatalogTick((tick) => tick + 1);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // An order still waiting for payment may already be paid: Stripe's webhook
  // can be late, or missed. Ask the server to check with Stripe, once, as soon
  // as the order is known to be unpaid.
  const unpaidChecked = useRef(false);
  const waitingForPayment = order?.status === "pending_payment";
  useEffect(() => {
    if (!orderId || !waitingForPayment || unpaidChecked.current) return;
    unpaidChecked.current = true;
    void syncOrderPayment(orderId)
      .then((r) => (r.paid ? load() : undefined))
      .catch(() => undefined);
  }, [orderId, waitingForPayment, load]);

  useEffect(() => {
    if (!awaitingPayment || !orderId) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      void syncOrderPayment(orderId)
        .catch(() => undefined)
        .then(() => load())
        .catch(() => undefined)
        .finally(() => {
          if (tries >= 15) setAwaitingPayment(false);
        });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [awaitingPayment, orderId, load]);

  useEffect(() => {
    if (awaitingPayment && order && order.status !== "pending_payment") {
      setAwaitingPayment(false);
    }
  }, [awaitingPayment, order]);

  async function handleCancel() {
    if (!orderId) return;
    setError(null);
    setCancelling(true);
    try {
      setOrder(await cancelOrder(orderId));
    } catch (err) {
      setError(getErrorMessage(err, "Could not cancel this order."));
      if (err instanceof ApiError && err.status === 409) {
        await load().catch(() => undefined);
      }
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <CustomerPageHeader
          title="Order"
          description="This order could not be loaded."
        />
        <FormAlert error={error ?? "Order not found."} className="mb-5" />
        <Button asChild variant="outline" className="h-10 rounded-full px-4">
          <Link to="/orders">
            <ArrowLeft className="size-4" />
            Track orders
          </Link>
        </Button>
      </div>
    );
  }

  const recipientAddress =
    recipient?.addresses?.find((address) => address.is_default) ??
    recipient?.addresses?.[0] ??
    null;
  const listPath = ordersListPath(order.status);
  const listLabel = isHistoryOrderStatus(order.status)
    ? "Order history"
    : "Track orders";
  const freeGift = isFreeGiftOrder(order);
  const placedNotice =
    justPlaced && freeGift
      ? "Your free gift is confirmed. The seller has it now. Track its progress below."
      : justPlaced && order.status === "pending_payment"
        ? awaitingPayment
          ? null
          : "Your gift order is created. Complete the payment below and it is on its way."
      : justPlaced
        ? "Payment received. Your gift order is placed. Track its progress below."
        : null;

  const rewardPoints = order.items.reduce(
    (sum, item) =>
      item.reward_status && item.reward_status !== "none"
        ? sum + (item.reward_points ?? 0)
        : sum,
    0,
  );
  const rewardEarned = order.items.some((i) => i.reward_status === "awarded");

  return (
    <div>
      <BackLink to={listPath} label={listLabel} className="mb-4" />
      <section className="relative mb-6 overflow-hidden rounded-[1.75rem] bg-brand-ink px-6 py-6 text-white ring-1 ring-white/10 sm:px-8 sm:py-7">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
              {order.order_number}
            </h1>
            <p className="text-sm text-white/65">
              Placed {formatOrderDate(order.created_at)}
            </p>
          </div>
          {/* On the dark header the chip stands on its own; the thin ring keeps
              the ink-coloured states (dispatched) from disappearing into it. */}
          <OrderStatusBadge
            status={order.status}
            className="px-3 py-1.5 ring-1 ring-white/25"
          />
        </div>
        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <HeroFact
            icon={CalendarDays}
            label="Delivery"
            value={formatDeliveryDate(order.delivery_date)}
          />
          <HeroFact
            icon={Receipt}
            label="Total"
            value={
              freeGift
                ? "Free"
                : formatPriceAmount(order.total_amount, order.currency)
            }
          />
          <HeroFact
            icon={Coins}
            label="Points"
            value={
              rewardPoints > 0
                ? `${rewardEarned ? "+" : ""}${formatPoints(rewardPoints)}`
                : "-"
            }
            highlight={rewardPoints > 0}
          />
        </div>
      </section>

      <FormAlert error={error} notice={placedNotice} className="mb-5" />

      {freeGift ? (
        <section className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl bg-brand-teal p-5 text-brand-ink sm:p-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-ink text-white">
            <Gift className="size-6" />
          </span>
          <div className="min-w-[12rem] flex-1">
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase">
              Free gift
            </p>
            <p className="font-poster text-xl tracking-tight sm:text-2xl">
              This one is on the seller. You pay nothing.
            </p>
            <p className="mt-1 text-sm font-medium text-brand-ink/75">
              The gift and its delivery are paid for by the shop.
            </p>
          </div>
        </section>
      ) : order.status === "pending_payment" ? (
        awaitingPayment ? (
          <section className="mb-6 flex items-center gap-3 rounded-2xl border border-brand-ink/20 bg-card p-5">
            <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm">Payment received. Confirming your order…</p>
          </section>
        ) : (
          <PayNowCard
            orderId={order.id}
            subtotal={order.subtotal_amount}
            delivery={order.delivery_amount}
            total={order.total_amount}
            currency={order.currency}
            cancelled={paymentCancelled}
          />
        )
      ) : null}

      {rewardPoints > 0 || (order.gift_points && order.gift_points_status !== "none") ? (
        <section className="relative mb-6 overflow-hidden rounded-2xl bg-amber-100 p-5 sm:p-6">
          <Sparkles
            aria-hidden
            className="pointer-events-none absolute -right-3 -bottom-4 size-28 text-[oklch(0.8_0.13_78)]/40"
          />
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950">
              <Coins className="size-6" />
            </span>
            <div className="min-w-[12rem] flex-1">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[oklch(0.45_0.1_70)] uppercase">
                Points from this order
              </p>
              {rewardPoints > 0 ? (
                <p className="font-poster text-xl tracking-tight text-[oklch(0.3_0.07_60)] sm:text-2xl">
                  {rewardEarned
                    ? `+${formatPoints(rewardPoints)} points added to your balance`
                    : rewardLine(order.items.find((i) => i.reward_points)?.reward_status, rewardPoints)}
                </p>
              ) : null}
              {order.gift_points && order.gift_points_status !== "none" ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[oklch(0.4_0.08_65)]">
                  <Gift className="size-4" />
                  {giftPointsLine(order.gift_points_status, order.gift_points)}
                </p>
              ) : null}
            </div>
            <Button asChild className="h-10 rounded-full bg-[oklch(0.32_0.07_60)] px-4 text-white hover:bg-[oklch(0.28_0.07_60)]">
              <Link to="/account/points">
                My points
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      <section className={cn(customerPanelClass, "mb-6 p-5 sm:p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-poster text-xl">Track this gift</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Delivery {formatDeliveryDate(order.delivery_date)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-5">
          <OrderTrackingTimeline
            status={order.status}
            kind={order.order_kind}
            placedAt={formatOrderDate(order.created_at)}
            updatedAt={formatOrderDate(order.updated_at)}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,1fr)]">
        <section className={cn(customerPanelClass, "p-5 sm:p-6")}>
          <h2 className="font-poster text-xl">Items</h2>
          <ul className="mt-4 space-y-4">
            {order.items.map((item) => {
              const product = getCatalogProduct(item.product_id);
              return (
                <li key={item.id} className="space-y-3">
                  <div className="flex gap-3">
                    <Link
                      to={`/products/${item.product_id}`}
                      className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted"
                    >
                      {product?.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="size-full object-cover"
                        />
                      ) : null}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/products/${item.product_id}`}
                        className="font-medium hover:text-primary"
                      >
                        {product?.name ?? "Product"}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Qty {item.quantity} ·{" "}
                        {formatPriceAmount(item.unit_amount, order.currency)} ·{" "}
                        {fulfilmentStatusLabel(item.fulfilment_status)}
                      </p>
                      {item.reward_points && item.reward_status !== "none" ? (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[oklch(0.45_0.12_75)]">
                          <Coins className="size-3.5" />
                          {rewardLine(item.reward_status, item.reward_points)}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            messageAboutOrderItem(item.id, item.product_id)
                          }
                          className="h-9 gap-2 rounded-full px-4"
                        >
                          <MessageSquare className="size-3.5" />
                          Message the shop
                        </Button>
                        <ReviewOrderItemButton
                          asButton
                          orderItemId={item.id}
                          delivered={item.fulfilment_status === "delivered"}
                          review={myReviews.byOrderItem.get(item.id)}
                          productName={product?.name}
                          onSaved={myReviews.apply}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-medium">
                      {formatPriceAmount(item.total_amount, order.currency)}
                    </p>
                  </div>
                  {/* Full width under the line: an order can span several
                      shops, and each parcel tracks separately. */}
                  {item.tracking ? (
                    <ParcelTracking tracking={item.tracking} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-6">
          <section className={cn(customerPanelClass, "p-5")}>
            <h2 className="font-poster text-xl">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <OrderStatusBadge status={order.status} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Delivery date</dt>
                <dd>{formatDeliveryDate(order.delivery_date)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>
                  {formatPriceAmount(order.subtotal_amount, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd>
                  {order.delivery_amount === 0 && !order.shop_deliveries?.length
                    ? "Arranged by the shop"
                    : order.delivery_amount === 0
                      ? "Free"
                      : formatPriceAmount(order.delivery_amount, order.currency)}
                </dd>
              </div>
              {(order.shop_deliveries ?? []).map((delivery) => (
                <div
                  key={delivery.shop_id}
                  className="flex justify-between gap-3 text-xs text-muted-foreground"
                >
                  <dt className="min-w-0 truncate">
                    {delivery.shop_name || "Shop"} ·{" "}
                    {delivery.mode === "seller_delivery"
                      ? "Shop delivery"
                      : `${delivery.provider} ${delivery.service_name}`}
                  </dt>
                  <dd className="shrink-0">
                    {delivery.amount === 0
                      ? "Free"
                      : formatPriceAmount(delivery.amount, delivery.currency)}
                  </dd>
                </div>
              ))}
              {(() => {
                const priced = new Set(
                  (order.shop_deliveries ?? []).map((delivery) => delivery.shop_id),
                );
                const unpriced = new Set(
                  order.items
                    .map((item) => item.shop_id)
                    .filter((shopId) => !priced.has(shopId)),
                ).size;
                return unpriced > 0 && priced.size > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Delivery for {unpriced === 1 ? "one shop" : `${unpriced} shops`} is
                    arranged by the shop.
                  </p>
                ) : null;
              })()}
              {freeGift ? (
                <div className="flex justify-between gap-3 text-brand-violet">
                  <dt>Paid by the seller</dt>
                  <dd>
                    -
                    {formatPriceAmount(
                      order.free_gift_cost ??
                        order.subtotal_amount + order.delivery_amount,
                      order.currency,
                    )}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3 border-t border-border/60 pt-2 font-medium">
                <dt>Total</dt>
                <dd>
                  {freeGift
                    ? "Free"
                    : formatPriceAmount(order.total_amount, order.currency)}
                </dd>
              </div>
            </dl>

            {canCancelOrder(order.status) ? (
              <Button
                type="button"
                variant="outline"
                disabled={cancelling}
                onClick={handleCancel}
                className="mt-4 h-10 w-full rounded-full"
              >
                {cancelling ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  "Cancel order"
                )}
              </Button>
            ) : null}
          </section>

          <section className={cn(customerPanelClass, "p-5")}>
            <h2 className="font-poster text-xl">Deliver to</h2>
            {recipient ? (
              <>
                <p className="mt-3 text-sm font-medium">{recipient.name}</p>
                {recipientAddress ? (
                  <p className="text-sm text-muted-foreground">
                    {[
                      recipientAddress.line1,
                      recipientAddress.line2,
                      recipientAddress.city,
                      recipientAddress.region,
                      recipientAddress.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
                {recipient.email || recipient.phone ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[recipient.email, recipient.phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No recipient was attached to this order.
              </p>
            )}
            {order.gift_message ? (
              <figure className="mt-4 overflow-hidden rounded-xl border border-brand-ink/20 border-l-4 border-l-brand-violet bg-accent/40">
                <figcaption className="flex items-center gap-1.5 border-b border-brand-ink/10 px-3.5 py-2 text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                  <Quote className="size-3.5 text-brand-violet" />
                  Gift message
                </figcaption>
                <blockquote className="px-3.5 py-3 font-display text-lg leading-snug break-words whitespace-pre-wrap">
                  {order.gift_message}
                </blockquote>
              </figure>
            ) : null}
            {order.gift_points && order.gift_points_status !== "none" ? (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-[oklch(0.96_0.05_85)] px-3 py-2 text-sm text-[oklch(0.4_0.1_70)]">
                <Coins className="mt-0.5 size-4 shrink-0" />
                {giftPointsLine(order.gift_points_status, order.gift_points)}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Where a line's reward points are, in words. */
function rewardLine(status: string | undefined, points: number) {
  const n = formatPoints(points);
  switch (status) {
    case "reserved":
      return `Earns ${n} points when delivered`;
    case "awarded":
      return `${n} points added to your balance`;
    case "released":
      return `${n} points not earned. Item cancelled`;
    case "reversed":
      return `${n} points taken back after a refund`;
    default:
      return `${n} points`;
  }
}

/** Where the points sent with the gift are, in words. */
function giftPointsLine(status: string | undefined, points: number) {
  const n = formatPoints(points);
  switch (status) {
    case "held":
      return `${n} points are travelling with this gift.`;
    case "delivered":
      return `${n} points reached the recipient’s account.`;
    case "returned":
      return `${n} points came back to you. The recipient has no SendAGift account, or the gift was cancelled.`;
    case "reversed":
      return `${n} points were returned after a refund.`;
    default:
      return `${n} points sent with this gift.`;
  }
}

function HeroFact({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 backdrop-blur-sm",
        highlight
          ? "bg-[oklch(0.86_0.14_85)]/20 ring-[oklch(0.86_0.14_85)]/40"
          : "bg-white/8 ring-white/10",
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl",
          highlight ? "bg-[oklch(0.86_0.14_85)] text-[oklch(0.3_0.07_60)]" : "bg-white/12 text-white",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-[0.14em] text-white/55 uppercase">
          {label}
        </p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}
