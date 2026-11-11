import { customerTerms } from './customer-terms'
import { courierTerms, partnerAddenda, partnerTerms, sellerTerms, supplierTerms } from './partner-terms'
import { privacyPolicy } from './privacy-policy'

/**
 * SendAGift's policies. The customer and partner terms are the drafts of
 * 11 November 2026; the others were drafted on 14 October 2026. The text is kept
 * exactly as written; anything in [SQUARE BRACKETS] is a value still to be
 * filled in, and the page shows it highlighted until it is.
 *
 * A block is a paragraph, a bulleted list, a labelled field ("Label: value"),
 * or an unticked consent box.
 */
export type PolicyBlock =
  | string
  | { list: string[] }
  | { fields: [label: string, value: string][] }
  | { checkbox: string }

export type PolicySection = { heading: string; blocks: PolicyBlock[] }

export type PolicyAudience = 'customer' | 'seller' | 'notice'

export type Policy = {
  slug: string
  docId: string
  title: string
  /** One line for the policies index and the page header. */
  summary: string
  audience: PolicyAudience
  version: string
  status: string
  updated: string
  effective?: string
  intro: PolicyBlock[]
  sections: PolicySection[]
}

export const policies: Policy[] = [
  privacyPolicy,
  customerTerms,
  {
    slug: 'delivery',
    docId: 'DEL-01',
    title: 'Delivery Policy',
    summary: 'Preparation and delivery estimates, delivery charges, tracking and what happens if a parcel is late or lost.',
    audience: 'customer',
    version: '0.1 draft',
    status: 'Not for publication until every bracketed field is completed and reviewed',
    updated: '14 October 2026',
    effective: '[DATE AFTER APPROVAL]',
    intro: [
      'Each product page and order confirmation must identify the seller, delivery region, payer for delivery and any mandatory charge. The seller fulfils the product. The estimate is based on seller preparation and delivery service information shown for that item.',
    ],
    sections: [
      {
        heading: 'Preparation and delivery estimate',
        blocks: [
          'Before you confirm, the product page shows a seller preparation band of [SELLER PREPARATION TIME RANGE], a delivery band of [DELIVERY SERVICE AND REGION BANDS], and an expected date or range [DATE LOGIC/TIME ZONE]. We will label an estimate as an estimate; if a date is guaranteed, the page will say so and explain the remedy if it is missed. Do not rely on a general site-wide estimate where the order page gives a different item-specific date.',
        ],
      },
      {
        heading: 'Delivery charges and payer',
        blocks: [
          "Delivery payer: [DELIVERY PAYER AND EXACT AMOUNT, IF ANY]. Any packing, tax or compulsory charge: [PACKING/TAX/OTHER REQUIRED CHARGE OR NONE]. The sender/customer's total must appear before the sender confirms the order. The recipient is not charged to receive a gift. We do not add a delivery charge after order confirmation.",
        ],
      },
      {
        heading: 'Tracking, changes and delivery issues',
        blocks: [
          'Tracking is provided through [METHOD, IF AVAILABLE]. Delivery instructions can be changed until [CUTOFF/PROCESS]. Contact [SUPPORT] for a delay, wrong address, failed attempt, damaged parcel, loss or missing item. The seller/carrier will investigate and we will tell you who owns the case and the next step. Do not pay a second time for redelivery unless the exact additional charge and reason are disclosed and accepted in advance.',
        ],
      },
      {
        heading: 'Delays, loss and failed delivery',
        blocks: [
          'If the seller expects a delay, [NOTICE PROCESS]. If an item is lost, never delivered, returned to sender or damaged, we apply the Returns, Refunds and Cancellations Policy and any applicable legal remedy. Re-delivery, replacement, refund or other resolution: [RE-DELIVERY, REPLACEMENT OR REFUND PROCESS]. We do not use a delivery delay as a blanket reason to deny a remedy.',
        ],
      },
      {
        heading: 'Address privacy',
        blocks: [
          'We share the minimum address and contact information with the seller and delivery provider needed to fulfil the order. The seller may not reuse it for marketing, unrelated customer profiles or onward disclosure. See [PRIVACY POLICY URL] for processor, country and retention details.',
        ],
      },
      {
        heading: 'Support and version',
        blocks: [
          'Support: [CONTACT]. Current version: [VERSION], effective [DATE]. Operator: [LEGAL NAME]; seller for the order: [SELLER NAME].',
        ],
      },
    ],
  },
  {
    slug: 'returns',
    docId: 'REF-01',
    title: 'Returns, Refunds and Cancellations',
    summary: 'How to cancel an order, report a problem, return an item and get a refund.',
    audience: 'customer',
    version: '0.1 draft',
    status: 'Not for publication until every bracketed field is completed and reviewed',
    updated: '14 October 2026',
    effective: '[DATE AFTER APPROVAL]',
    intro: [
      'This policy explains how to cancel an order, report a problem, return an item and receive a refund. The product/order page identifies the seller, amount paid, delivery charge, mandatory fees, return route and any product-specific change-of-mind rule. This policy does not limit any statutory right or remedy.',
    ],
    sections: [
      {
        heading: 'Contact and order details',
        blocks: [
          'Start at [ORDER HELP URL] or contact [SUPPORT EMAIL/PHONE]. Include order number, the affected item and a short description. We will route the request to [SELLER OR PLATFORM CASE OWNER]. You may ask for help without leaving a review or accepting marketing.',
        ],
      },
      {
        heading: 'Common situations',
        blocks: [
          {
            list: [
              'Sender cancellation before acceptance/fulfilment: cancel through [ROUTE] until [EXACT CUTOFF]. We will confirm whether the invitation, seller reservation and any payment have been stopped. The effect on a free-gift entitlement is [ENTITLEMENT EFFECT FOR THIS CANCELLATION].',
              'Recipient declines or does not accept: the invitation ends at [DATE/TIME ZONE/EXPIRY RULE]. The recipient owes no amount to receive the gift. A pending benefit is handled under [PROMOTION TERMS].',
              "Seller cancellation, stock failure or inability to deliver: we will notify the recipient and sender and offer [REPLACEMENT OR REFUND PROCESS]. If money was paid, the refund includes [ORDER-SPECIFIC AMOUNT/CHARGES REQUIRED BY LAW] and is issued by [REFUNDING PARTY] to the original payment method for the original payer (normally the sender/customer) within [TIMING]. A recipient who reports the issue can receive support or an approved replacement; a cash refund goes to the original payer unless applicable law or an agreed alternative requires otherwise. A valid reserved free gift will not be silently withdrawn because the seller's budget later runs out.",
              'Late delivery: contact [HELP ROUTE]. We will check the seller/carrier status and explain available remedies. Statutory cancellation/refund rights remain available where they apply; there is no blanket denial for late delivery.',
              'Lost in transit: we will investigate with the seller/carrier and offer [REPLACEMENT OR REFUND PROCESS]. You will not be asked to pay again for the same order.',
              "Damaged, defective, unsafe, counterfeit, spurious or not as described: report it through [RETURN/SAFETY ROUTE]. We will assess the issue under applicable consumer law and offer any required repair, replacement, refund or other remedy. For a major failure, any customer choice required by law remains the customer's choice. We do not condition a remedy on a positive review or return of an unrelated promotion item.",
              'Change of mind: [SELLER CHANGE-OF-MIND POLICY, WINDOW, CONDITION, RETURN-SHIPPING PAYER AND REFUND METHOD]. A change-of-mind policy does not affect statutory remedies.',
            ],
          },
        ],
      },
      {
        heading: 'Free gifts, delivery fees and refunds',
        blocks: [
          "The checkout page must show whether the seller/platform or sender/customer pays a delivery charge, who pays it, and any other mandatory amount before order confirmation. The recipient is not charged to receive the gift. If the sender/customer paid a delivery amount, the applicable remedy must state who refunds it and how it is calculated. A free or seller-funded item does not reduce a mandatory remedy for an affected order. Your statutory remedy does not depend on the seller's promotional budget.",
        ],
      },
      {
        heading: 'Return instructions and timing',
        blocks: [
          'Return address: [SELLER/RETURN ADDRESS]. Return label/cost: [PROCESS AND PAYER]. Package and condition requirements: [PACKAGING AND CONDITION REQUIREMENTS]. Refund decision and dispatch timing: [VERIFIED SERVICE PROCESS]. Do not send a product to an address not confirmed by support. If a product is unsafe or subject to a recall, follow the safety instructions even if ordinary return steps differ.',
        ],
      },
      {
        heading: 'Refund method and status',
        blocks: [
          'Refunding party: [SELLER/PLATFORM/PROVIDER BY CASE]. Eligible amount: [ITEM + DELIVERY + MANDATORY FEES + TAX AS APPLICABLE]. Method: [ORIGINAL PAYMENT METHOD OR ALTERNATIVE AGREED WITH CUSTOMER]. Timing: [PROCESS AND ESTIMATE]. We will send confirmation and provide a status route at [URL].',
        ],
      },
      {
        heading: 'Complaints and escalation',
        blocks: [
          "If you are unhappy with a decision, reply to the case or contact [GRIEVANCE CONTACT/ADDRESS]. For [MARKET], the applicable external regulator or dispute-resolution body is [EXTERNAL REGULATOR OR DISPUTE BODY FOR THIS MARKET/URL]. We will review identity-match or duplicate-gift decisions through a human appeal route and will not reveal another user's information.",
        ],
      },
      {
        heading: 'Version and contact',
        blocks: [
          'Current version: [VERSION], effective [DATE]. Operator: [LEGAL NAME]. Seller for the order: [SELLER LEGAL NAME]. Questions: [SUPPORT CONTACT].',
        ],
      },
    ],
  },
  {
    slug: 'free-gift-terms',
    docId: 'GIFT-01',
    title: 'Free Gift Promotion Terms',
    summary: 'Who can send and receive a free gift, what it costs, and how cancellations work.',
    audience: 'customer',
    version: '0.1 draft',
    status: 'Not for publication until every bracketed field is completed and reviewed',
    updated: '14 October 2026',
    effective: '[DATE AFTER APPROVAL]',
    intro: [],
    sections: [
      {
        heading: 'Promotion details',
        blocks: [
          'Promotion name: [NAME]. Operator: [LEGAL NAME]. Participating sellers and products: [LIST/LINK]. Available in: [COUNTRIES/DELIVERY REGIONS]. Opens: [DATE/TIME/TIME ZONE]. Closes: [DATE/TIME/TIME ZONE OR “UNTIL ALLOCATED STOCK IS GONE” WITH ACCURATE CAP]. Each eligible gift is [ONE UNIT/EXACT PRODUCT]. This promotion is not a game or prize draw.',
        ],
      },
      {
        heading: 'Who may send and receive',
        blocks: [
          'A person may send one free gift as sender and may receive one free gift as recipient, subject to the program period [LIFETIME / NAMED PROGRAM PERIOD / RESET RULE]. The sender and recipient limits are independent. The sender must use the SendAGift mobile app. Eligibility is checked using [IDENTITY RULE]. A pending reservation counts from [RESERVATION POINT] and becomes final at [COMMITMENT POINT]. Paid gifts are [TREATMENT OF PAID GIFTS]. [SELF-GIFTING RULE].',
        ],
      },
      {
        heading: 'Checking duplicate or self-gift claims',
        blocks: [
          "We may compare the minimum necessary name, phone and delivery-address information to apply the promotion limit. If we pause a claim to review eligibility, contact [REVIEW/APPEAL ROUTE]. We will not reveal another account's information.",
        ],
      },
      {
        heading: 'Price, delivery and fees',
        blocks: [
          "Product price to the recipient: $0. Delivery payer: [DELIVERY PAYER: SELLER/PLATFORM OR SENDER/CUSTOMER, WITH EXACT AMOUNT]. Other mandatory charges/taxes: [MANDATORY CHARGES/TAXES OR NONE]. The sender/customer's total must be shown before the sender confirms. The recipient is not charged for the gift or its delivery.",
        ],
      },
      {
        heading: 'How to send and receive',
        blocks: [
          "The sender selects an eligible product, reviews the seller, stock, preparation and delivery estimate/date, fee payer and this promotion, then confirms the recipient's details. The sender must be authorized to provide those details for this gift. We send the recipient a service notification at [CHANNEL(S)] with the approved accept/decline/claim steps. After delivery, the recipient must actively confirm receipt through [RECEIPT CONFIRMATION METHOD]. This is separate from the notification and any optional feedback or review. Recipient app install and phone verification are [RECIPIENT APP REQUIREMENT AND VERIFICATION METHOD]. The recipient may contact [SUPPORT] if the message is unexpected, the details are wrong, the parcel has not arrived, or they cannot confirm receipt.",
        ],
      },
      {
        heading: 'Stock, delivery and changes',
        blocks: [
          "Stock, fulfilment and delivery estimates are shown on the product/order page. Seller preparation band: [VALUE]. Delivery band/date: [VALUE AND REGION]. If the seller cannot fulfil a valid reservation, we will contact the recipient and apply the Returns, Refunds and Cancellations Policy. We will not silently revoke an already valid reservation because the seller's budget later becomes exhausted. Any substitution requires [RECIPIENT'S EXPRESS APPROVAL / NO SUBSTITUTION].",
        ],
      },
      {
        heading: 'Cancellation and entitlement',
        blocks: [
          'A sender may cancel until [CUTOFF]; a recipient may decline before [CUTOFF]. The treatment of a pending or accepted entitlement is [ENTITLEMENT EFFECT FOR THIS CANCELLATION]. If an offer expires or is cancelled before fulfilment, we will tell you how the order and any pending gift reservation are handled. We will not take away a statutory remedy or charge the recipient to receive the gift. See [RETURNS POLICY URL].',
        ],
      },
      {
        heading: 'Data and messages',
        blocks: [
          'We use recipient details for gift notification, delivery, eligibility review, recipient receipt confirmation and support under [PRIVACY POLICY URL]. A gift notification is not marketing consent. We will not include a seller promotion in a service-only receipt or delivery message. Optional marketing is a separate, unchecked choice by channel and purpose.',
        ],
      },
      {
        heading: 'Complaints and version',
        blocks: [
          'Contact [SUPPORT / COMPLAINT CONTACT]. Current version [VERSION], effective [DATE], archived at [URL]. The offer can be paused for new claims; any effect on already confirmed orders will be handled under these terms and applicable law.',
        ],
      },
    ],
  },
  {
    slug: 'prohibited-products',
    docId: 'SAFE-01',
    title: 'Prohibited Products and Reporting',
    summary: 'What may not be listed, and how to report an unsafe product or seller.',
    audience: 'customer',
    version: '0.1 draft',
    status: 'Not for publication until market rules and escalation contacts are reviewed',
    updated: '14 October 2026',
    intro: [],
    sections: [
      {
        heading: 'Seller listing standard',
        blocks: [
          'Sellers may list only products they are legally authorized to offer and fulfil in the selected country. Listings must be accurate, authentic, safe, in stock as stated, and include required seller identity, origin/importer, product, price, fees, delivery, return and safety information.',
        ],
      },
      {
        heading: 'Do not list',
        blocks: [
          "Do not list products that are illegal, stolen, counterfeit, recalled, unsafe, materially misdescribed, infringe another person's rights, or require a license/age-control that the seller or platform cannot verify. Do not list a regulated or age-restricted product until the relevant market, catalog checks, seller documents, customer disclosures and age process have been reviewed and approved. Examples that require market-specific review include prescription/controlled medicines, weapons, tobacco/nicotine products, alcohol, hazardous items, financial products, animals and products subject to import/export restrictions. This list is not a substitute for local law.",
          "Do not create fake offers, false urgency, misleading “free” claims, unmarked sponsored results, fake reviews or product pages that hide mandatory charges. Do not use gift recipients' details for unrelated marketing or audience-building.",
        ],
      },
      {
        heading: 'Report a product or seller',
        blocks: [
          'Customers and sellers can report a safety, counterfeit, prohibited-listing, misleading-offer, privacy, delivery or refund issue at [REPORT FORM/EMAIL/PHONE]. Include the order/listing ID and a short explanation; only provide photos or documents needed to assess the issue. For immediate danger or an injury, contact local emergency services first and then notify [SAFETY CONTACT].',
        ],
      },
      {
        heading: 'Review and action',
        blocks: [
          '[TRUST/SAFETY TEAM] triages reports, may pause new sales while it investigates, preserves relevant records, contacts the seller and coordinates a recall or customer notice where needed. Decisions are recorded with reason, evidence, date and owner. Affected users receive a next step at [CONTACT PROCESS]. Sellers may appeal at [APPEAL ROUTE], except that a lawful safety hold remains in place while an urgent risk is assessed.',
        ],
      },
      {
        heading: 'Complaints and contact',
        blocks: [
          'Platform complaints: [GRIEVANCE OFFICER NAME/ADDRESS/EMAIL/PHONE FOR EACH MARKET]. Product safety: [CONTACT]. Privacy: [CONTACT].',
        ],
      },
    ],
  },
  {
    slug: 'complaints',
    docId: 'HELP-01',
    title: 'Complaints and Support Procedure',
    summary: 'How to contact us, what happens next and how to escalate a complaint.',
    audience: 'customer',
    version: '0.1 draft',
    status: 'Not for publication until contact and market response process are verified',
    updated: '14 October 2026',
    intro: [],
    sections: [
      {
        heading: 'Contact us',
        blocks: [
          'Order, delivery, cancellation or refund: [SUPPORT EMAIL/PHONE/FORM]. Privacy/access/correction: [PRIVACY CONTACT]. Product safety/prohibited listing: [SAFETY REPORT ROUTE]. Formal grievance: [OFFICER NAME, ROLE, POSTAL ADDRESS, EMAIL, PHONE, MARKET]. Please include order/listing number, the type of issue and how you want us to contact you. Do not send passwords, OTPs or full payment-card data.',
        ],
      },
      {
        heading: 'What happens next',
        blocks: [
          'We create a case number, identify whether the seller, platform or provider owns the next action, and tell you what information is needed. We share only the minimum case details with the seller/fulfiller. We record the decision and explain any remedy or escalation route. Your statutory rights apply throughout.',
          'Acknowledgement target: [MARKET-SPECIFIC TARGET]. Resolution target: [MARKET-SPECIFIC TARGET]. For India, our grievance contact is [OFFICER NAME AND CONTACT].',
        ],
      },
      {
        heading: 'Eligibility or duplicate-gift review',
        blocks: [
          "If we pause a claim due to a possible duplicate or self-gift, we explain the reason category and the next step. A shared address alone is not proof of fraud. A trained reviewer can consider correction or appeal using minimum relevant data. We do not expose another account's details and do not penalize a person for a negative review or complaint.",
        ],
      },
      {
        heading: 'Escalation',
        blocks: [
          'If you disagree with the outcome, contact [ESCALATION CONTACT] with your case number. External regulator or dispute-resolution body: [MARKET-SPECIFIC CONTACT/URL]. Safety incidents may be escalated immediately to [SAFETY CONTACT].',
        ],
      },
      {
        heading: 'Version and accessibility',
        blocks: [
          'Current version [VERSION], effective [DATE]. Accessible formats/languages: [LANGUAGE/ACCESSIBILITY ROUTE]. Contact [SUPPORT CONTACT] if you need help using the complaint process.',
        ],
      },
    ],
  },
  partnerTerms,
  sellerTerms,
  supplierTerms,
  courierTerms,
  partnerAddenda,
  {
    slug: 'seller-budget',
    docId: 'BUDGET-01',
    title: 'Seller Marketing Budget Acceptance',
    summary: "The separate authorization for a seller-funded free-gift budget: the cap, funding and what happens when it runs out.",
    audience: 'seller',
    version: '0.1 draft',
    status: 'Not for acceptance until every bracketed field is completed and reviewed',
    updated: '14 October 2026',
    effective: '[DATE AFTER APPROVAL]',
    intro: [
      'This is a separate, specific authorization for the seller-funded promotion described below. It is not a card mandate, payment instruction, recurring charge or automatic replenishment instruction.',
      {
        fields: [
          ['Seller legal name/ID', '[SELLER]'],
          ['Authorized signer/name/title', '[PERSON/TITLE]'],
          ['Eligible SKU(s)', '[LIST]'],
          ['Region/currency', '[REGION / ISO CURRENCY]'],
          ['Maximum seller budget cap', '[AMOUNT]'],
          ['Funding instrument', '[CASH / POINTS / OTHER - DESCRIBE]'],
          ['Offer dates/time zone', '[START / END]'],
          ['Included cost categories', '[INCLUDED COST CATEGORIES]'],
          ['Excluded cost categories', '[LIST]'],
          ['Budget reserve/commit/release event', '[BUDGET RESERVATION/COMMIT/RELEASE POINTS]'],
          ['Statement/reconciliation process', '[LINK/PROCESS]'],
        ],
      },
    ],
    sections: [
      {
        heading: 'What you authorize',
        blocks: [
          'If I accept below, I authorize SendAGift to make the specified eligible SKU available under the offer and to reserve/record seller-funded costs up to the cap above using the stated funding instrument. The cap is for this seller and the listed offer only. It is not pooled across sellers, territories or campaigns. Amounts are recorded in the stated currency. The exact cost categories and accounting transitions shown above control.',
        ],
      },
      {
        heading: 'No automatic charge or replenishment',
        blocks: [
          'This authorization does not permit an automatic card charge, bank debit, recurring charge or automatic budget replenishment. SendAGift will stop accepting new reservations when the available cap is reached. Any additional budget requires a new, separate authorization showing the new amount, currency, funding source, dates and cost categories. Seller can pause new reservations at [CONTROL/CONTACT].',
        ],
      },
      {
        heading: 'Valid reservations and cancellations',
        blocks: [
          "A reservation confirmed to a customer while the offer is active and budget is available will be honored under its displayed customer terms, even if later claims exhaust the seller's remaining cap. We will not silently cancel or charge the recipient because the cap later runs out. If an order is cancelled or refunded, any amount returned to the seller budget follows the seller agreement and reconciliation schedule. That internal accounting does not reduce a customer's statutory remedy.",
        ],
      },
      {
        heading: 'Seller acceptance',
        blocks: [
          {
            checkbox:
              'I am authorized to accept for [SELLER LEGAL NAME]. I accept Seller Marketing Budget Acceptance version [VERSION] with the cap, currency, funding source, dates, SKUs and included/excluded costs shown above. I understand that the cap will not be automatically replenished and no payment instrument will be charged under this acceptance.',
          },
          'Signer: [NAME/TITLE] | Time: [RECORDED BY SYSTEM] | Version/hash: [RECORDED BY SYSTEM]',
          'Publication/acceptance blockers: cap, currency, funding source, offer period, product list, actual cost categories, ledger transition, reconciliation, cancellation/refund funding, signer authority, seller verification and support route. Do not use a generic seller marketing opt-in checkbox for this authorization. Do not enable auto-charge/replenishment from this wording.',
        ],
      },
    ],
  },
  {
    slug: 'recipient-notice',
    docId: 'NOTICE-01',
    title: 'Gift Recipient Collection Notice',
    summary: 'The service notice a gift recipient receives explaining where their details came from.',
    audience: 'notice',
    version: '0.1 draft',
    status: 'Not for sending until every bracketed field is completed and reviewed',
    updated: '14 October 2026',
    intro: [
      '[OPERATOR LEGAL NAME] received your [NAME/PHONE/EMAIL/DELIVERY ADDRESS - SHOW ONLY FIELDS ACTUALLY PROVIDED] from the person who sent you a SendAGift gift. We will use these details to tell you about the gift, let you confirm or decline it, arrange delivery, check gift eligibility and self-gifting, provide support, and meet safety or legal obligations. A shared delivery address alone will not automatically disqualify you.',
      'Your information may be shared with [SELLER NAME] and [DELIVERY PROVIDER] for this order, and with [OTHER ACTUAL PROCESSORS] to send this service notice or support the transaction. Processor locations: [COUNTRIES, IF KNOWN/PRACTICABLE]. We will not add you to marketing because a gift was sent. You can choose marketing separately, if offered, and unsubscribe later.',
      'You can ask to access or correct your information, question an eligibility review or complain by contacting [PRIVACY CONTACT/EMAIL/POSTAL ADDRESS]. Full details: [PRIVACY POLICY LINK]. Gift help: [SUPPORT LINK/CONTACT].',
      'This is a service notice. Do not add offers, seller promotions, upsells or review requests to it.',
    ],
    sections: [],
  },
  {
    slug: 'marketing-opt-in',
    docId: 'MKT-01',
    title: 'Separate Marketing Opt In',
    summary: 'The optional, unticked marketing choice, kept separate from service messages.',
    audience: 'notice',
    version: '0.1 draft',
    status: 'Not for use until each purpose, channel and sender identity is verified',
    updated: '14 October 2026',
    intro: [
      'This choice is optional and is not needed to send, receive, claim, pay for, cancel or get support for a gift. It is separate from service notices and from accepting marketplace terms.',
      {
        checkbox:
          "Yes, send me [BRAND/SELLER NAME]'s marketing by [EMAIL / SMS / OTHER SPECIFIC CHANNEL] about [PRODUCTS/OFFERS/CONTENT]. I can unsubscribe at any time using the link or instructions in each message or by contacting [MARKETING CONTACT].",
      },
      'Do not preselect this box. Use a separate choice for each person (sender/recipient), channel, brand and purpose where required. Record the exact wording/version, person, channel, time, source and withdrawal. Do not place marketing content into claim, OTP, receipt, delivery, cancellation, refund or complaint notices.',
      "If seller-specific campaigns are sent, identify the seller and ensure the consent covers that sender/brand. Do not assume a platform opt-in authorizes a seller's unrelated marketing.",
    ],
    sections: [],
  },
]

export function policyBySlug(slug: string | undefined) {
  return policies.find((policy) => policy.slug === slug) ?? null
}

export const audienceLabels: Record<PolicyAudience, string> = {
  customer: 'For customers',
  seller: 'For partners: sellers, suppliers and couriers',
  notice: 'Notices and consent wording',
}
