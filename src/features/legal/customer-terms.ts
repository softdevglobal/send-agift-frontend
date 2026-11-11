import type { Policy } from './policies'

/**
 * Customer terms CUST-01, draft 0.2 of 11 November 2026: the public contract
 * text (pages 2 to 8 of the handoff pack). The pack's implementation notes,
 * owner decisions and source register are not customer terms and are not
 * published. Values still to be decided stay in [SQUARE BRACKETS].
 */
export const customerTerms: Policy = {
  slug: 'customer-terms',
  docId: 'CUST-01',
  title: 'Customer Terms',
  summary: 'The terms for browsing, ordering, sending and receiving gifts on SendAGift, with regional safeguards.',
  audience: 'customer',
  version: '0.2 draft',
  status: 'Not for publication until every bracketed field is completed and approved for each market',
  updated: '11 November 2026',
  effective: '[EFFECTIVE DATE AFTER APPROVAL]',
  intro: [
    'These terms apply to buyers, gift senders and recipients. Mandatory law takes priority, followed by the applicable local addendum, the agreed order particulars and these terms. Regional sections apply only in markets that have been approved.',
  ],
  sections: [
    {
      heading: '1. Who we are and what these terms cover',
      blocks: [
        'SendAGift is operated by [OPERATOR LEGAL NAME], [REGISTRATION NUMBER], of [REGISTERED ADDRESS] (SendAGift, we or us). Contact us at support@sendagift.win and [REQUIRED TELEPHONE AND POSTAL CONTACT]. These terms govern our platform services when you browse, order, send or receive a gift, or contact support. A buyer is the person placing an order; a sender arranges a gift for another person; a recipient is the person to whom it is sent.',
        'The seller identified on the product page and checkout supplies the goods under [SALE CONTRACT STRUCTURE]. SendAGift provides [PLATFORM SERVICES AND LEGAL ROLE]. Delivery is provided under [DELIVERY CONTRACT STRUCTURE]. Your order confirmation identifies the seller, payment collection party and the parties responsible for fulfilment and support. Calling SendAGift a marketplace does not remove any legal obligation it has because of the services it actually performs.',
        'The approved local addendum, order information and the Returns, Refunds and Cancellations policy (sendagift.win/legal/returns) form part of the relevant transaction. Mandatory law takes priority, followed by the applicable local addendum, the agreed order particulars and these terms. A linked policy cannot impose an undisclosed charge or reduce a mandatory remedy. Privacy information is explained separately in our Privacy Policy (sendagift.win/legal/privacy).',
      ],
    },
    {
      heading: '2. Eligibility and account security',
      blocks: [
        'You must have legal capacity to enter the relevant contract and meet any lawful age, location or product restrictions clearly shown before ordering. The approved account age rule is [AGE AND GUARDIAN RULE]. Where a product requires age or identity verification, the relevant requirements will be disclosed before purchase and applied at delivery where required. Do not order for someone who is not legally eligible to receive it.',
        'Provide accurate details, keep your account access secure and tell us promptly at support@sendagift.win if you suspect misuse. You must not impersonate another person, submit fraudulent orders, bypass lawful promotion limits, misuse recipient information, harass anyone or interfere with the service. You are not automatically responsible for every unauthorised transaction merely because it used your account; responsibility depends on the facts and applicable law.',
      ],
    },
    {
      heading: '3. Information before you order',
      blocks: [
        'Before you commit, the product and checkout pages will state the seller, essential product characteristics, quantity, availability, currency, total payable amount, mandatory charges, delivery payer, preparation time, estimated or agreed delivery date, delivery area and material restrictions. Relevant safety, allergen, storage and age information will be supplied where applicable. Optional additions require your choice and will not be selected for you.',
        'Images are illustrative only where clearly stated. Material product characteristics remain as described. We will not use a general image disclaimer to excuse a materially different or misdescribed product. Any approved substitution process will be explained before ordering; a material substitution requires your agreement rather than silence.',
      ],
    },
    {
      heading: '4. Placing and accepting an order',
      blocks: [
        'You may review and correct your order before selecting the clearly labelled payment or order button. Submitting an order is [ORDER OFFER RULE]. A contract is formed when [EXACT ACCEPTANCE EVENT AND RESPONSIBLE PARTY]. An automatic acknowledgement is [ACKNOWLEDGEMENT EFFECT]. We will send a retainable confirmation containing the agreed details and applicable terms through [CONFIRMATION CHANNEL].',
        'If the seller cannot fulfil an order, or a material pricing or listing error is identified, we will explain the issue and available options promptly. We will not increase your accepted order price without your agreement. If an order cannot proceed, any money that must be returned will be refunded and any unused payment authorisation released as appropriate. Cancellation after a contract is formed must respect the contract and mandatory law; an error does not create an unrestricted right to cancel.',
      ],
    },
    {
      heading: '5. Prices, taxes and charges',
      blocks: [
        'The amount and currency shown at final confirmation are the amount you authorise us or the disclosed payment collection party to charge. The price display will include applicable taxes and unavoidable charges as required by law. Delivery, optional services and discounts will be itemised. You will not be charged an undisclosed fee after confirmation.',
        'Where a gift is described as free, the offer will state what is free, who pays delivery and any other mandatory amount before the sender confirms. A recipient is not charged merely to receive a gift. A recipient’s separate optional purchase or upgrade requires a separate, clear agreement and is not a condition of receiving the original gift.',
        'Your bank may apply currency conversion or cross-border charges under its own agreement with you. Any conversion offered by the checkout itself will disclose the currency, rate and charges before you choose it. We will not describe seller processing costs as a customer fee unless that specific charge is lawful, approved and disclosed. No prohibited card surcharge may be added or renamed to evade the applicable rule.',
      ],
    },
    {
      heading: '6. Payment authorisation and disputes',
      blocks: [
        'Payments are processed by Stripe and collected by [PAYMENT COLLECTION ENTITY AND CAPACITY]. Payment authorisation occurs at [AUTHORISATION EVENT] and capture at [CAPTURE EVENT]. Payment to that entity [PAYMENT DISCHARGE RULE]. A temporary authorisation may appear before a completed charge; the confirmation will distinguish the two.',
        'You authorise only the amount and transaction shown at checkout. An order does not authorise recurring payments, a membership or later purchases. Storing a payment method, where offered, follows a separate disclosed choice. We may undertake proportionate fraud checks and contact you to resolve a payment issue. We will explain any cancelled order and lawful refund or authorisation-release process.',
        'Contact support@sendagift.win about duplicate or incorrect charges. This does not prevent you using rights available through your payment provider, bank, regulator or the courts. Internal disputes between SendAGift and its partners must not delay a remedy owed to you by law.',
      ],
    },
    {
      heading: '7. Recipient information and choice',
      blocks: [
        'Give only accurate recipient information reasonably needed to arrange the gift, and ensure you are entitled to provide it for that purpose. Do not include unnecessary sensitive information in gift messages or delivery notes. We explain how recipient information is used in the Gift Recipient Collection Notice (sendagift.win/legal/recipient-notice) and our Privacy Policy. Sending someone a gift does not give consent for marketing to that person.',
        'Where a claim or acceptance step is required, the invitation will explain [CLAIM METHOD], [CLAIM DEADLINE AND TIME ZONE], [APP OR ACCOUNT REQUIREMENT IF ANY] and [CONTACT VERIFICATION METHOD]. The recipient may accept or decline through [RECIPIENT CHOICE ROUTE]. The sender will be told what happens to an unclaimed or declined gift, including cancellation, refund and delivery-charge treatment, under [UNCLAIMED AND DECLINED GIFT POLICY]. No unspecified expiry or forfeiture applies.',
        'Gift invitations and claim links should be kept private. If you believe a gift was sent in error or a link was misused, contact support@sendagift.win. We may reasonably verify a claim before disclosure or fulfilment. We will not reveal another person’s private account or order information to resolve an eligibility query.',
      ],
    },
    {
      heading: '8. Delivery and receipt',
      blocks: [
        'Delivery options, areas, charges and the applicable timing are shown before ordering. An estimate is not a guaranteed date unless expressly described as guaranteed. This does not remove statutory delivery rights or the significance of a date expressly agreed as essential. Tell us about relevant access requirements before dispatch using [DELIVERY INSTRUCTIONS ROUTE].',
        'If delivery cannot occur as agreed, we will explain the problem and the available lawful options, including a revised date or cancellation and refund where applicable. We will not silently extend a delivery commitment where your consent is required. The seller and SendAGift remain responsible for obligations the law places on them; using a courier does not automatically transfer all risk to you at dispatch.',
        'If the approved workflow uses recipient receipt confirmation, the recipient will receive a service notification through [NOTIFICATION CHANNELS] and can actively confirm receipt through [RECEIPT CONFIRMATION METHOD]. Notification, receipt confirmation and an optional review are separate events. Receipt confirmation records delivery only; it does not waive rights about damage, defects, missing items or misdescription. A missing confirmation does not by itself prove non-delivery or remove a remedy.',
        'Leave-safe permission, collection, failed delivery, redelivery and unavailable-recipient handling follow the Delivery Policy (sendagift.win/legal/delivery), shown before order confirmation. Any proposed redelivery charge must be lawful, disclosed and agreed when required. Responsibility for loss or damage follows the applicable law and actual circumstances, including whether delivery instructions were properly followed. A delivery photograph is evidence, not conclusive proof that every obligation was met.',
      ],
    },
    {
      heading: '9. Product safety',
      blocks: [
        'Follow the product’s disclosed safety, storage and use instructions. If an item appears unsafe, stop using it and report it as described in Prohibited Products and Reporting (sendagift.win/legal/prohibited-products). We and the responsible seller will cooperate with applicable safety notices, recalls and required remedies. Safety reporting and statutory remedies are not conditional on leaving a review or maintaining a paid account.',
      ],
    },
    {
      heading: '10. Changing or cancelling an order',
      blocks: [
        'Request a change or cancellation through [ORDER CANCEL ROUTE], quoting the order reference. The ability to make a voluntary change depends on the order stage and the policy shown before purchase. We will confirm whether the request was accepted and any lawful, previously disclosed cost. No cancellation charge applies merely because an undisclosed internal partner fee was incurred.',
        'Separate statutory cancellation and withdrawal rights may apply regardless of the order stage. The relevant regional section below and the Returns, Refunds and Cancellations policy explain those rights, instructions, deadlines and any lawful exceptions. A category such as personalised or perishable goods may affect a change-of-mind cancellation right but does not remove remedies for faulty, unsafe or misdescribed goods.',
      ],
    },
    {
      heading: '11. Problems with an order',
      blocks: [
        'Contact support@sendagift.win if an item is missing, damaged, faulty, late or materially different from its description. Provide the order reference and reasonably available information. We may request proportionate evidence needed to assess the issue, without imposing an unreasonable burden or a short reporting deadline that defeats a statutory right. A gift recipient may exercise rights that the applicable law grants to them.',
        'The responsible party will provide the repair, replacement, refund, cancellation, price reduction or other remedy required by law. A free or discounted item does not justify a blanket denial of applicable consumer protections. A partner’s funding, payout, insurance or accounting arrangements do not reduce your rights. We will identify the complaint owner and coordinate the support steps for the services we provide.',
      ],
    },
    {
      heading: '12. Returns and reimbursement',
      blocks: [
        'The return instructions will state the return address, method, who pays necessary return costs, applicable deadlines and any lawful conditions. Fault remedies and statutory withdrawal will be handled under the applicable law; any additional voluntary return offer is stated separately at [VOLUNTARY RETURNS POLICY]. Do not send goods to an unverified address.',
        'Refunds will be made to the original payment method unless you expressly agree to a lawful alternative, or the original method is unavailable and a lawful alternative is arranged with you. We will not force a statutory refund into store credit. We will confirm the amount, reason and processing date, observing the applicable legal deadline. Any bank processing estimate will be distinguished from the deadline for us to issue the refund.',
        'The person entitled to receive a monetary refund and the method of handling recipient requests will be determined under the applicable law and [GIFT REFUND PROCESS]. We will use appropriate verification without unnecessarily revealing the gift price or the sender’s payment information. Gateway costs, partner commissions and administrative fees will not be deducted from a refund where doing so would reduce a mandatory entitlement.',
      ],
    },
    {
      heading: '13. Rights that cannot be excluded',
      blocks: [
        'Nothing in these terms excludes, restricts or modifies a right, guarantee, duty or remedy that cannot lawfully be excluded, restricted or modified. SendAGift remains responsible for its own acts, omissions and legal duties. These terms do not impose a general consumer indemnity or a blanket exclusion of liability. Any liability limitation proposed for a particular market requires separate legal approval and clear lawful wording.',
      ],
    },
    {
      heading: '14. Privacy and communications',
      blocks: [
        'Our Privacy Policy (sendagift.win/legal/privacy) explains the responsible entities, information collected, purposes and legal bases where applicable, recipients, retention, overseas processing, rights and complaint contacts. We share information with sellers, delivery providers, payment providers and other service providers only as described in that notice and permitted by law. Acceptance of these terms is not blanket consent to unrelated marketing or international data transfers.',
        'Necessary service communications may concern claim status, orders, delivery, safety, payments, complaints or refunds. Optional marketing is handled separately for the individual and channel under applicable rules, with an opt-out route. A sender cannot subscribe a recipient to marketing just by entering their details. Cookie and similar technology choices are handled through [COOKIE NOTICE AND CONTROLS].',
      ],
    },
    {
      heading: '15. Closing your account and requesting deletion',
      blocks: [
        'You may request account closure through the Delete account option in your account or by emailing support@sendagift.win, and exercise applicable privacy rights as described in our Privacy Policy. We will use proportionate verification and respond within the applicable legal period. Account closure, subscription cancellation if separately applicable, and deletion of personal information are distinct requests; the closure process will explain their effects clearly.',
        'Closure does not erase outstanding order, refund or dispute rights and obligations. We will explain how to access necessary records and support after closure. We delete or anonymise personal information when required and when it is no longer lawfully needed. Some records may need to be retained for tax, fraud prevention, legal obligations or claims under an approved retention schedule. We will explain any lawful restriction on a deletion request and available review or complaint rights. We do not promise immediate deletion of every record.',
      ],
    },
    {
      heading: '16. Reviews and submitted content',
      blocks: [
        'Reviews are voluntary. Choosing not to review, or leaving honest negative feedback, does not affect delivery, promotion eligibility, support or remedies. Do not submit unlawful content or another person’s private information. You retain rights in content you submit and grant only the permission reasonably needed to display and administer the chosen feature. Any separate promotional reuse requires the permission or legal basis applicable to that use. Moderation and review challenges follow [CONTENT REVIEW ROUTE].',
      ],
    },
    {
      heading: '17. Suspension and changes',
      blocks: [
        'We may proportionately restrict access where reasonably necessary for fraud, safety, security, a material breach or a legal requirement. We will give reasons and a reasonable chance to respond or correct the issue where appropriate, unless urgent action or law prevents advance notice. You may seek review at [ACCOUNT APPEAL ROUTE]. Suspension does not automatically forfeit paid orders, gift balances or lawful refunds.',
        'Material changes to these terms apply prospectively after [NOTICE PERIOD AND METHOD] and any consent required by law. Accepted orders remain governed by their accepted terms unless a lawful change is agreed. If a change affects an ongoing optional service, we will explain your lawful cancellation rights before it takes effect. Continued use alone will not substitute for affirmative consent where required.',
      ],
    },
    {
      heading: '18. Complaints, governing law and contact',
      blocks: [
        'Contact support@sendagift.win for a complaint and [ESCALATION OR GRIEVANCE CONTACT IF REQUIRED] for escalation; see also our Complaints and Support Procedure (sendagift.win/legal/complaints). We will acknowledge and respond under [COMPLAINT STANDARD], subject to any statutory deadline. You may still contact regulators, use available alternative dispute resolution or bring proceedings. [GOVERNING LAW AND NONEXCLUSIVE FORUM] applies without removing mandatory protections or courts available where you live. No mandatory arbitration or class-action waiver is introduced by these terms. If a provision is unenforceable, the rest continues to the extent permitted by law.',
      ],
    },
    {
      heading: '19. Optional promotions, memberships and gift cards',
      blocks: [
        'Free-gift or discount offers, if available, are governed by rules shown before participation. Those rules identify eligibility, territories, stock or other genuine limits, sender and recipient limits separately, the program window and time zone, reset rules, any expiry and all costs. We may use proportionate verification to apply those rules. If a claim is held or declined, we will provide the reason where lawful and a correction or appeal route at [PROMOTION REVIEW ROUTE]. No review, marketing consent or undisclosed purchase is required to obtain a promised gift.',
        'A competition is offered only under separately published, approved official rules identifying the promoter, eligibility, entry methods and costs, opening and closing times, prize and selection method, winner process, permits where required and privacy treatment. These customer terms do not themselves create a competition or authorise paid entries. Do not participate on the assumption that a purchase creates an entry unless the specific lawful rules say so.',
        'A paid membership exists only if separately offered and affirmatively selected. Its schedule must state benefits, price, currency, taxes, billing frequency, any trial and exact first charge date, renewal, cancellation and refund rules before enrolment. A gift purchase never automatically enrols you. Any recurring charge requires the legally required separate informed authority. Customer membership pricing is not determined by supplier or courier subscriptions.',
        'If gift cards or stored-value credits are offered, the separate approved schedule identifies the issuer, currency, use restrictions, expiry, fees, balances, loss and replacement rules and legally required redemption or refund rights. A promotional claim deadline is not automatically a lawful expiry date for a purchased gift card.',
      ],
    },
    {
      heading: '20. Australian customers',
      blocks: [
        'Where Australian Consumer Law applies, statutory consumer guarantees and remedies remain available, including applicable rights of gift recipients. An “all sales final” statement cannot remove those rights. Gift cards covered by Australian minimum-expiry rules must generally remain redeemable for at least three years, subject to statutory exceptions, and carry the required expiry disclosures.',
        'For Australian transactions subject to the applicable no-surcharge network rules, we will not add Visa, Mastercard, American Express or eftpos card surcharges. ACCC guidance states these rules took effect on 1 October 2026. Any other charge must be lawful and accurately reflected in the total price; changing a card surcharge’s name does not make it permissible.',
      ],
    },
    {
      heading: '21. EU customers',
      blocks: [
        'Where EU consumer rules apply to a qualifying distance contract, you generally have 14 days to withdraw, measured from receipt for goods or contract conclusion for services, subject to lawful exceptions and any longer or extended period required by law. The seller will provide applicable instructions, a cancellation form and [EU WITHDRAWAL ROUTE]. Return-cost responsibility, reimbursement and any lawful withholding pending return are explained in [EU LOCAL RETURNS SCHEDULE]. Legal conformity remedies remain separate from withdrawal.',
        'Any early service performance or digital-content exception requires the applicable separate request, consent and acknowledgement. A general terms checkbox does not waive withdrawal rights. Required online withdrawal functionality must be provided. Local consumer protections and mandatory forums remain available. Each enabled country requires its own approved language, notices and implementation.',
      ],
    },
    {
      heading: '22. United Kingdom and United States customers',
      blocks: [
        'UK: where statutory distance-selling cancellation applies, consumers generally have 14 days after receiving goods to notify cancellation and a further 14 days to return them, subject to lawful exceptions. Applicable reimbursement includes standard delivery costs. Faulty-goods rights remain distinct. Use [UK CANCELLATION ROUTE AND FORM]; applicable legal deadlines override any voluntary policy.',
        'US: for covered merchandise orders, shipment promises must have a reasonable basis. If no shipment time is stated, the applicable federal rule generally requires shipment within 30 days. Required delay-consent, cancellation and prompt refund procedures apply if shipment cannot occur on time. State warranty, privacy, gift-card, renewal and other mandatory protections may add requirements. No uniform 14-day US cooling-off right is promised here.',
      ],
    },
  ],
}
