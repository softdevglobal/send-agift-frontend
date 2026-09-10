import type { Conversation, ConversationParticipant, SupportCase } from '@/api/types'
import { getCatalogProduct } from '@/features/customer-commerce'
import { getPublicSeller, getPublicShop, publicSellerName } from '@/lib/public-sellers'

import { sellerOrderItemLookup, sellerProductLookup, useLookup } from './lookup'
import {
  capitalize,
  CONVERSATION_TYPE_LABEL,
  shortId,
  type ChatViewerRole,
} from './messaging-utils'

export type ConversationAvatarKind = 'shop' | 'customer' | 'seller' | 'support'

/** The gift or order a thread is about, shown as a card before the first message. */
export type ConversationContext = {
  name: string
  caption: string
  imageUrl?: string | null
  meta?: string
}

export type ConversationLabel = {
  title: string
  subtitle: string
  imageUrl?: string | null
  /** A person's name, for avatar initials when there's no photo. */
  avatarName?: string | null
  kind: ConversationAvatarKind
  context?: ConversationContext | null
}

/** Enough of a conversation to name it — a real one, or a draft that doesn't exist yet. */
export type ConversationLabelSource = Pick<
  Conversation,
  'type' | 'product_id' | 'shop_id' | 'order_item_id'
> & {
  support_case?: SupportCase | null
  participants?: ConversationParticipant[]
}

function participantWithRole(
  source: ConversationLabelSource,
  role: ConversationParticipant['role'],
): ConversationParticipant | undefined {
  return source.participants?.find((participant) => participant.role === role)
}

/** Lowercased shop and gift names for a customer's thread — what their inbox search matches. */
export function customerConversationText(source: ConversationLabelSource): string {
  if (source.type === 'support') {
    return `sendagift support ${source.support_case?.subject ?? ''}`.toLowerCase()
  }
  const product = source.product_id ? getCatalogProduct(source.product_id) : null
  const shopId = source.shop_id || product?.shopId
  const shop = shopId ? getPublicShop(shopId) : null
  return [shop?.shop.name, product?.shopName, product?.name, source.type === 'order' ? 'order' : '']
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * Names a thread from the viewer's side.
 *
 * The API returns participants as bare ids, so the label is built from what
 * each portal can already see: customers read shop and gift names from the
 * storefront catalog, sellers look up their own product and order item, and
 * admins go by the support case's subject.
 */
export function useConversationLabel(
  source: ConversationLabelSource | null,
  viewer: ChatViewerRole,
): ConversationLabel {
  const sellerThread = viewer === 'seller' && source !== null && source.type !== 'support'
  const sellerProduct = useLookup(sellerProductLookup, sellerThread ? source.product_id : null)
  const sellerOrderItem = useLookup(
    sellerOrderItemLookup,
    sellerThread && source.type === 'order' ? source.order_item_id : null,
  )

  if (!source) return { title: 'Conversation', subtitle: '', kind: 'support' }

  if (source.type === 'support') {
    const supportCase = source.support_case
    const subject = supportCase?.subject?.trim()
    if (viewer === 'admin') {
      // The person the case is about: named by the API, or for sellers from the
      // public shop directory when the name isn't there.
      const role = supportCase?.counterpart_role
      const person = role ? participantWithRole(source, role) : undefined
      const directorySeller =
        role === 'seller' && supportCase ? getPublicSeller(supportCase.counterpart_user_id) : null
      const name =
        person?.display_name?.trim() ||
        (directorySeller ? publicSellerName(directorySeller) : null)
      if (name) {
        return {
          title: name,
          subtitle: subject || (role === 'customer' ? 'Customer support' : 'Seller support'),
          imageUrl:
            person?.image_url || directorySeller?.image_url || directorySeller?.shops[0]?.image_url,
          avatarName: name,
          kind: role === 'customer' ? 'customer' : 'seller',
        }
      }
      return {
        title: subject || 'Support ticket',
        subtitle: supportCase
          ? `${capitalize(supportCase.counterpart_role)} · ${shortId(supportCase.counterpart_user_id)}`
          : 'Support',
        kind: supportCase?.counterpart_role === 'customer' ? 'customer' : 'seller',
      }
    }
    return {
      title: 'SendAGift Support',
      subtitle: subject || (viewer === 'seller' ? 'Seller support' : 'Help from our team'),
      kind: 'support',
    }
  }

  if (viewer === 'customer') {
    const product = source.product_id ? getCatalogProduct(source.product_id) : null
    const shopId = source.shop_id || product?.shopId
    const shop = shopId ? getPublicShop(shopId) : null
    const productName = product?.name
    const shopName = shop?.shop.name?.trim() || product?.shopName?.trim() || 'Shop'
    return {
      title: shopName,
      subtitle:
        source.type === 'order'
          ? productName
            ? `Order · ${productName}`
            : 'Order question'
          : productName || CONVERSATION_TYPE_LABEL.product_inquiry,
      imageUrl: shop?.shop.image_url || product?.image,
      kind: 'shop',
      context: productName
        ? {
            name: productName,
            caption: source.type === 'order' ? 'Your order' : 'Asking about',
            imageUrl: product?.image,
            meta: `from ${shopName}`,
          }
        : null,
    }
  }

  if (viewer === 'seller') {
    const productName = sellerProduct?.name ?? sellerOrderItem?.product?.name
    const productImage = sellerProduct?.image_url ?? sellerOrderItem?.product?.image_url
    // Who wrote in — the customer participant's name and photo from the API.
    const customer = participantWithRole(source, 'customer')
    const customerName = customer?.display_name?.trim() || null
    const avatar = {
      imageUrl: customer?.image_url || null,
      avatarName: customerName,
      kind: 'customer' as const,
    }

    if (source.type === 'order') {
      const orderNumber = sellerOrderItem?.order?.order_number
      const orderLabel = orderNumber ? `Order ${orderNumber}` : 'Order'
      return {
        ...avatar,
        title: customerName ?? (orderNumber ? `Order ${orderNumber}` : 'Order chat'),
        subtitle: customerName
          ? [orderLabel, productName].filter(Boolean).join(' · ')
          : productName
            ? `Customer · ${productName}`
            : 'Customer',
        context: productName
          ? {
              name: productName,
              caption: orderLabel,
              imageUrl: productImage,
              meta: customerName
                ? `Ordered by ${customerName}`
                : 'Message the customer about this item',
            }
          : null,
      }
    }
    return {
      ...avatar,
      title: customerName ?? 'Customer question',
      subtitle: productName
        ? customerName
          ? `Asking about ${productName}`
          : productName
        : CONVERSATION_TYPE_LABEL.product_inquiry,
      context: productName
        ? {
            name: productName,
            caption: 'Buyer question',
            imageUrl: productImage,
            meta: customerName ? `From ${customerName}` : undefined,
          }
        : null,
    }
  }

  return { title: CONVERSATION_TYPE_LABEL[source.type], subtitle: '', kind: 'support' }
}
