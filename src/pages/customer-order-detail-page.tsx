import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Coins,
  Gift,
  LoaderCircle,
  MessageSquare,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { getRecipient, type RecipientDetails } from "@/api/customers";
import { cancelOrder, getOrder, type OrderDetails } from "@/api/orders";
import { FormAlert } from "@/components/common/form-alert";
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
  const { messageAboutOrderItem } = useCustomerMessages();
  // One request for the whole page, rather than one per line.
  const myReviews = useMyReviews();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [recipient, setRecipient] = useState<RecipientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setCatalogTick] = useState(0);

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
  const placedNotice =
    justPlaced && order.status === "pending_payment"
      ? "Your gift order is placed. Payment has not been captured yet — track progress below while it awaits payment."
      : justPlaced
        ? "Your gift order is placed. Track its progress below."
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
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-brand-ink to-[oklch(0.32_0.14_296)] px-6 py-6 text-white shadow-[0_18px_48px_rgba(20,20,55,0.28)] ring-1 ring-white/10 sm:px-8 sm:py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-[var(--brand-violet)]/45 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-10 size-56 rounded-full bg-[var(--brand-teal)]/25 blur-3xl"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Link
              to={listPath}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white"
            >
              <ArrowLeft className="size-3.5" />
              {listLabel}
            </Link>
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
              {order.order_number}
            </h1>
            <p className="text-sm text-white/65">
              Placed {formatOrderDate(order.created_at)}
            </p>
          </div>
          <div className="rounded-full bg-white/95 px-1 py-1">
            <OrderStatusBadge status={order.status} />
          </div>
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
            value={formatPriceAmount(order.total_amount, order.currency)}
          />
          <HeroFact
            icon={Coins}
            label="Points"
            value={
              rewardPoints > 0
                ? `${rewardEarned ? "+" : ""}${formatPoints(rewardPoints)}`
                : "—"
            }
            highlight={rewardPoints > 0}
          />
        </div>
      </section>

      <FormAlert error={error} notice={placedNotice} className="mb-5" />

      {rewardPoints > 0 || (order.gift_points && order.gift_points_status !== "none") ? (
        <section className="relative mb-6 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,oklch(0.97_0.05_88),oklch(0.93_0.09_80))] p-5 ring-1 ring-[oklch(0.85_0.1_80)] sm:p-6">
          <Sparkles
            aria-hidden
            className="pointer-events-none absolute -right-3 -bottom-4 size-28 text-[oklch(0.8_0.13_78)]/40"
          />
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,oklch(0.86_0.14_85),oklch(0.76_0.15_65))] text-white shadow-md">
              <Coins className="size-6" />
            </span>
            <div className="min-w-[12rem] flex-1">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[oklch(0.45_0.1_70)] uppercase">
                Points from this order
              </p>
              {rewardPoints > 0 ? (
                <p className="font-display text-xl tracking-tight text-[oklch(0.3_0.07_60)] sm:text-2xl">
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
            <h2 className="font-medium">Track this gift</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Delivery {formatDeliveryDate(order.delivery_date)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-5">
          <OrderTrackingTimeline
            status={order.status}
            placedAt={formatOrderDate(order.created_at)}
            updatedAt={formatOrderDate(order.updated_at)}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,1fr)]">
        <section className={cn(customerPanelClass, "p-5 sm:p-6")}>
          <h2 className="font-medium">Items</h2>
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
                      <button
                        type="button"
                        onClick={() =>
                          messageAboutOrderItem(item.id, item.product_id)
                        }
                        className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <MessageSquare className="size-3.5" />
                        Message the shop
                      </button>
                      <ReviewOrderItemButton
                        orderItemId={item.id}
                        delivered={item.fulfilment_status === "delivered"}
                        review={myReviews.byOrderItem.get(item.id)}
                        productName={product?.name}
                        onSaved={myReviews.apply}
                      />
                    </div>
                    <p className="text-sm font-medium">
                      {formatPriceAmount(item.total_amount, order.currency)}
                    </p>
                  </div>
                  {/* Full width under the line: an order can span several
                      shops, and each parcel tracks separately. */}
                  {item.tracking ? (
                    <ParcelTracking
                      tracking={item.tracking}
                      onSimulatedDelivery={
                        item.fulfilment_status !== "delivered"
                          ? async () => {
                              await load()
                              await myReviews.reload()
                            }
                          : undefined
                      }
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-6">
          <section className={cn(customerPanelClass, "p-5")}>
            <h2 className="font-medium">Summary</h2>
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
              <div className="flex justify-between gap-3 border-t border-border/60 pt-2 font-medium">
                <dt>Total</dt>
                <dd>{formatPriceAmount(order.total_amount, order.currency)}</dd>
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
            <h2 className="font-medium">Deliver to</h2>
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
              <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                {order.gift_message}
              </p>
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
      return `${n} points not earned — item cancelled`;
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
      return `${n} points came back to you — the recipient has no SendAGift account, or the gift was cancelled.`;
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
