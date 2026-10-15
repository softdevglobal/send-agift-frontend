/**
 * SendAGift's policies, as drafted on 14 October 2026. The text is kept
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
  {
    slug: 'privacy',
    docId: 'PRIV-01',
    title: 'Privacy Policy',
    summary: 'What personal information we collect, why, who receives it and your choices.',
    audience: 'customer',
    version: '0.1 draft',
    status: 'Not for publication until every bracketed field is completed and reviewed',
    updated: '14 October 2026',
    effective: '[DATE AFTER APPROVAL]',
    intro: [
      'This policy explains how [OPERATOR LEGAL NAME] collects, uses, stores and shares personal information when you use SendAGift, including gifts, marketplace orders, seller onboarding, delivery, customer support and promotion eligibility. It applies in [COUNTRIES/REGIONS]. [COUNTRY-SPECIFIC NOTICE OR LINK].',
    ],
    sections: [
      {
        heading: 'Who operates SendAGift',
        blocks: [
          'SendAGift is operated by [OPERATOR LEGAL NAME], registered in [JURISDICTION] at [REGISTERED ADDRESS]. Contact us about privacy at [PRIVACY CONTACT NAME/ROLE, EMAIL, POSTAL ADDRESS]. For customer support, use [SUPPORT EMAIL/PHONE/FORM]. In [MARKET], the marketplace is operated by [ENTITY] and the product seller is [SELLER LEGAL NAME SHOWN ON PRODUCT/ORDER]. Our legal role for each transaction is [OPERATOR ROLE FOR THIS MARKET].',
        ],
      },
      {
        heading: 'Information we collect',
        blocks: [
          'Depending on the service you use, we may collect:',
          {
            list: [
              'account and contact details: [ACTUAL FIELDS, e.g. name, email, phone, account identifiers];',
              'order and gift details: sender, recipient, chosen product, message if supported, status, receipt/claim activity, support history and transaction records;',
              'delivery information: recipient name, phone, delivery address, instructions and delivery/tracking events;',
              'eligibility and safety information: the minimum name, phone and address signals needed to enforce the one-gift-per-sender/recipient rule, prevent self-gifting and review ambiguous duplicates;',
              'seller information: legal/registered name, business location, contact, required registration/tax/importer details, listings, stock, fulfilment status and accepted agreement/budget terms;',
              'technical/security information: [ACTUAL LOGS, DEVICE/APP EVENTS, SECURITY SIGNALS AND RETENTION].',
            ],
          },
          'We do not use a shared address alone as proof that two people are the same person or acted improperly. If an eligibility match needs review, we restrict access, explain the next step and provide a way to correct or appeal it.',
        ],
      },
      {
        heading: 'Information supplied by someone else',
        blocks: [
          "A sender may enter a recipient's name, phone number, email or delivery address to send a gift. Before submitting those details, the sender must confirm they are authorized to share them for this gift. We use those details to notify the recipient, arrange delivery, provide support, apply approved eligibility rules and meet legal or safety duties. The recipient's active receipt confirmation is recorded separately after delivery. We send the recipient a prompt service notice that explains the source and purpose. This does not sign the recipient up for marketing.",
        ],
      },
      {
        heading: 'Why we use information',
        blocks: [
          'We use information only for the purposes that apply to the feature and market: create and fulfil the order; send service notices; verify account/claim steps if enabled; check eligibility and prevent abuse; manage seller budgets and inventory; respond to questions, complaints, returns, refunds and safety matters; secure the service; meet legal/accounting obligations; and [LIST ANY ANALYTICS OR OTHER PURPOSES ACTUALLY USED]. We do not add a recipient to promotional messages because someone sent them a gift.',
        ],
      },
      {
        heading: 'Who receives information',
        blocks: [
          'Information may be shared only as needed with:',
          {
            list: [
              'the seller of the selected product and the delivery provider for fulfilment and delivery;',
              '[PAYMENT PROVIDER] for payment, refund and reconciliation, if applicable;',
              '[HOSTING/EMAIL/SMS/OTP/SUPPORT/ANALYTICS/OTHER PROCESSORS ACTUALLY USED];',
              'regulators, courts or other parties when required by law, or when necessary to protect safety, rights or the service.',
            ],
          },
          'The recipient countries/locations of our processors are [LIST ACTUAL COUNTRIES, INCLUDING REMOTE SUPPORT ACCESS IF APPLICABLE]. If a provider changes, we will update this policy as required before or when the change applies. Sellers may use recipient information only for fulfilment, delivery, safety and support for that order; they must not use it for their own marketing, upload it to a general CRM or disclose it onward for unrelated purposes.',
        ],
      },
      {
        heading: 'Marketing choices',
        blocks: [
          'Service notices about gift confirmation, delivery, security, support or refunds are not marketing. We send direct marketing only when the required permission exists for that person, channel and purpose. Sender and recipient choices are separate. Marketing boxes are optional and unchecked by default. You can withdraw consent or unsubscribe using the link/instructions in the message or contact [MARKETING CONTACT]. We keep a minimal suppression record so we can respect your opt-out.',
        ],
      },
      {
        heading: 'Storage and security',
        blocks: [
          'We use [ACTUAL SECURITY CONTROLS, ACCESS RESTRICTIONS, ENCRYPTION AND INCIDENT PROCESS]. We retain each category for [SPECIFIC PERIOD OR EVENT-BASED SCHEDULE], then securely delete or de-identify it unless a longer period is required for a stated legal obligation, dispute or safety matter. The retention schedule is [LINK/CONTACT].',
        ],
      },
      {
        heading: 'Your choices and requests',
        blocks: [
          "You can request access to or correction of information, ask about a decision or matching signal, withdraw optional marketing consent, or raise a privacy complaint by contacting [PRIVACY CONTACT]. We will [HOW REQUESTS ARE HANDLED AND RESPONSE TIME], and if you are not satisfied, you may contact [RELEVANT REGULATOR/EXTERNAL COMPLAINT BODY FOR EACH MARKET]. Identity checks may be used to protect your information. We will not reveal another person's account, order or address when answering a request.",
        ],
      },
      {
        heading: 'Children and restricted products',
        blocks: [
          '[MINIMUM AGE AND CHILD-DATA PROCESS FOR THIS MARKET]. Do not use SendAGift to list regulated products that are disabled for your country.',
        ],
      },
      {
        heading: 'Changes and contact',
        blocks: [
          'We may update this policy when services or data practices change. We will publish the new version, date and material change summary at [PRIVACY URL] and obtain any fresh notice or acceptance required. Version [CURRENT VERSION]. Contact [PRIVACY CONTACT].',
        ],
      },
    ],
  },
  {
    slug: 'customer-terms',
    docId: 'CUST-01',
    title: 'Marketplace Customer Terms',
    summary: 'The terms for browsing, ordering, sending and receiving gifts on SendAGift.',
    audience: 'customer',
    version: '0.1 draft',
    status: 'Not for publication until every bracketed field is completed and reviewed',
    updated: '14 October 2026',
    effective: '[DATE AFTER APPROVAL]',
    intro: [
      'These terms apply when you use SendAGift to browse products, send or receive a gift, place an order, or contact support. “We”, “us” and “SendAGift” means [OPERATOR LEGAL NAME AND LEGAL ROLE]. “Seller” means the legal seller named on the product and order page. Your order confirmation will identify the seller and the party responsible for fulfilment, payment and support.',
    ],
    sections: [
      {
        heading: 'Before you order',
        blocks: [
          'Product pages must identify the seller, product, quantity, total price, any mandatory charge, delivery payer, preparation time, delivery estimate/date, delivery location, cancellation route and return/refund summary. The checkout summary controls the amount due; we will not add an undisclosed fee after you confirm. If an order is described as free, the recipient price and any delivery or mandatory amount payable by the sender/customer must be stated clearly before the sender confirms. The recipient is not charged to receive the gift.',
        ],
      },
      {
        heading: 'Orders and fulfilment',
        blocks: [
          'The seller is responsible for [SELLER RESPONSIBILITIES FOR THIS MARKET]. SendAGift is responsible for [SENDAGIFT RESPONSIBILITIES FOR THIS MARKET]. We send the recipient a delivery/service notification using [CHANNELS]. After delivery, the recipient must actively confirm receipt through [CONFIRMATION METHOD]. This confirmation is separate from the notification and from any optional review. An estimated delivery date is an estimate unless the order page clearly labels it as guaranteed. If a seller cannot fulfil, we will explain the available lawful remedy and contact route.',
        ],
      },
      {
        heading: 'Gifts',
        blocks: [
          'A sender must enter accurate recipient details and confirm they are authorized to share those details for this gift. The recipient gets a service notification and may [ACCEPT/DECLINE/CLAIM PROCESS]. [RECIPIENT APP REQUIREMENT AND CONTACT-VERIFICATION METHOD]. A gift does not create marketing consent. Free-gift eligibility is governed by the specific promotion terms shown before submission. Sender and recipient limits are separate, but the applicable program window and reset terms must appear in those promotion terms.',
        ],
      },
      {
        heading: 'Eligibility and fair review',
        blocks: [
          "We may use the minimum name, phone and delivery-address information reasonably needed to apply the promotion terms. If we pause a claim to review eligibility, we will tell you how to request correction or appeal. The review process is described at [ELIGIBILITY REVIEW/PRIVACY LINK]. We will not disclose another person's account or order details.",
        ],
      },
      {
        heading: 'Cancellation, returns and refunds',
        blocks: [
          "The order-specific Returns, Refunds and Cancellations Policy and applicable seller terms explain the process. Your statutory rights are not limited by these terms, a free or discounted item, or the seller's funding or accounting arrangements. We will not refuse a remedy required by law. See [RETURNS POLICY URL].",
        ],
      },
      {
        heading: 'Marketing and reviews',
        blocks: [
          'Service communications about claim status, delivery, safety, support, cancellation or refund are separate from marketing. We send marketing only under the applicable permission for the person and channel. You may opt out as described in the message. Reviews are voluntary and do not affect eligibility, delivery, support, refund or recovery. You may leave honest feedback or skip it.',
        ],
      },
      {
        heading: 'Complaints and safety',
        blocks: [
          'Contact [SUPPORT CONTACT] for order questions and [GRIEVANCE OFFICER NAME/CONTACT/ADDRESS, IF REQUIRED] for a formal complaint. For an unsafe or recalled product, use [PRODUCT SAFETY REPORT ROUTE]. We will explain the complaint owner and next step; applicable law controls any response deadline.',
        ],
      },
      {
        heading: 'Other terms',
        blocks: [
          'We may suspend access for safety or legal reasons and will explain how to appeal where appropriate. Nothing in these terms excludes a right or remedy that cannot be excluded by law. If a term is unenforceable, the remaining terms continue to the extent allowed. Governing law and dispute forum: [GOVERNING LAW AND DISPUTE TERMS FOR THIS MARKET].',
        ],
      },
      {
        heading: 'Contact and version',
        blocks: [
          'SendAGift operator: [LEGAL NAME, REGISTERED ADDRESS AND CONTACT]. Current version: [VERSION]. Effective: [DATE]. Previous version: [ARCHIVE URL].',
        ],
      },
    ],
  },
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
  {
    slug: 'seller-agreement',
    docId: 'SELL-01',
    title: 'Seller Agreement and Onboarding Acceptance',
    summary: 'What sellers agree to: listings, customer care, free-gift offers, data and safety.',
    audience: 'seller',
    version: '0.1 draft',
    status: 'Not for seller acceptance until every bracketed field is completed and reviewed',
    updated: '14 October 2026',
    effective: '[DATE AFTER APPROVAL]',
    intro: [
      'This agreement is between [OPERATOR LEGAL NAME, ADDRESS] (“SendAGift”) and the seller identified below (“Seller”). It supplements the seller\'s listing and order terms for [MARKETS]. It does not reduce obligations imposed by applicable law.',
      {
        fields: [
          ['Seller legal/registered name', '[NAME]'],
          ['Registered/business address', '[ADDRESS]'],
          ['Registration/tax/importer details required in market', '[ID/COUNTRY]'],
          ['Authorized representative', '[NAME, TITLE, EMAIL]'],
          ['Customer-facing support/grievance contact', '[CONTACT]'],
          ['Products/SKUs/territories covered', '[LIST]'],
          ['Effective date/version', '[DATE / VERSION]'],
        ],
      },
    ],
    sections: [
      {
        heading: 'Seller responsibilities',
        blocks: [
          "Seller will provide accurate product, price, origin/importer, safety, stock, preparation, delivery, charge, warranty and return information required in each market. Seller will not offer illegal, counterfeit, unsafe, recalled, misleading or unauthorized products. Seller will fulfil accepted orders at the confirmed terms, promptly update stock/delay status, provide lawful remedies, cooperate with complaints and recalls, and keep required order/refund records. Seller will not alter a confirmed order's price or delivery terms without the customer's approval and any legally required process.",
        ],
      },
      {
        heading: 'Customer care and consumer rights',
        blocks: [
          "Seller will respond to SendAGift's case notices within [RESPONSE TARGET], identify the order owner and provide delivery/refund evidence. Seller will not refuse a legal repair, replacement, refund, cancellation, return or other remedy because an item was free, the seller paid a promotional budget, the customer left a negative review, or the seller's cap is exhausted. Market-specific complaint/grievance requirements: [MARKET-SPECIFIC GRIEVANCE REQUIREMENTS].",
        ],
      },
      {
        heading: 'Free-gift offer and fulfilment',
        blocks: [
          'Seller opts into only the following offer: [SKU, one-unit quantity, regions, start/end, stock cap]. Preparation band: [BAND]. Delivery band/date: [BAND/DATE]. Delivery payer and mandatory charges: [DELIVERY PAYER AND CHARGES]. No substitution without [RECIPIENT CONSENT PROCESS]. Seller may pause future reservations through [CONTROL]; pausing does not cancel an already valid reservation. The recipient will not be charged to receive the gift. Seller must not collect an undisclosed amount from the sender/customer or change the confirmed order total.',
        ],
      },
      {
        heading: 'Seller budget and funding',
        blocks: [
          'A separate Seller Marketing Budget Acceptance records [CAP/CURRENCY], [FUNDING SOURCE: CASH/POINTS/OTHER], period, cost categories, authorization and acceptance version. The cap applies only to this seller and these offers; it is not shared across sellers or countries. No automatic debit, recurring charge or automatic replenishment is authorized by this agreement. The seller must affirmatively approve any additional amount under a new version before it applies. New reservations stop when the available cap is reached. A valid existing reservation is honored under the disclosed terms.',
        ],
      },
      {
        heading: 'Personal information and security',
        blocks: [
          "Seller may use recipient information only for the covered order's fulfilment, delivery, product safety and support, plus legally required recordkeeping. Seller must not use it for its own marketing, add it to general CRM lists, profile the recipient for unrelated purposes or disclose it to an unapproved third party. Seller will restrict staff access, protect data using [SECURITY CONTROLS], use only approved delivery subcontractors, promptly notify [OPERATOR INCIDENT CONTACT] of suspected loss or misuse, assist with access/correction/complaint requests, and delete or return data when fulfilment/support and legal retention permit under [SCHEDULE].",
        ],
      },
      {
        heading: 'Product safety, reporting and cooperation',
        blocks: [
          'Seller will immediately notify [SAFETY CONTACT] of a recall, injury, safety complaint, suspected counterfeit or regulatory contact. Seller will stop listing affected items, preserve relevant records and follow the approved customer-notification/remedy plan. SendAGift may pause a listing or seller for safety, compliance or fraud review, with a reasoned case and an appeal route where appropriate.',
        ],
      },
      {
        heading: 'Fees, records and settlement',
        blocks: [
          'Platform fees, taxes, settlement cycle, invoicing, refunds, chargebacks and service recovery are set out in [SELLER COMMERCIAL SCHEDULE]. Seller will reconcile budget holds, commitments, releases and refunds through [LEDGER/STATEMENT PROCESS]. No off-platform amount may be charged to a customer unless disclosed and lawfully accepted.',
        ],
      },
      {
        heading: 'Term, suspension and disputes',
        blocks: [
          'Term: [START/END/RENEWAL]. Suspension/termination: [NOTICE, IMMEDIATE SAFETY EXCEPTIONS, HANDLING OF ACCEPTED ORDERS]. Governing law/dispute forum: [GOVERNING LAW AND DISPUTE TERMS]. Nothing here excludes rights that cannot be excluded.',
        ],
      },
      {
        heading: 'Acceptance',
        blocks: [
          'By selecting the separate unchecked acceptance box and submitting, the authorized representative confirms they have authority to bind the seller, reviewed this exact version and agree to it for the listed seller, SKUs, territories and period. This acceptance is recorded with seller ID, representative, time, version, document hash and selected offer. The seller agreement does not replace the separate budget authorization or marketing consent.',
          { checkbox: 'I accept Seller Agreement version [VERSION] for the seller and offer scope above.' },
        ],
      },
    ],
  },
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
  seller: 'For sellers',
  notice: 'Notices and consent wording',
}
