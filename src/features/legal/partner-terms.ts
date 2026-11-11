import type { Policy } from './policies'

/**
 * International partner terms, draft of 11 November 2026: the common and
 * international terms, the seller, supplier and courier schedules and the
 * partner addenda. The pack's enrolment copy, developer checks, owner
 * decision register and sources are not contract text and are not
 * published. Values still to be decided stay in [SQUARE BRACKETS].
 */

const draft = {
  audience: 'seller' as const,
  version: '0.1 draft',
  status: 'Not for partner acceptance until every bracketed field is completed and approved for each market',
  updated: '11 November 2026',
  effective: '[EFFECTIVE DATE AFTER APPROVAL]',
}

export const partnerTerms: Policy = {
  ...draft,
  slug: 'partner-terms',
  docId: 'PART-01',
  title: 'Partner Terms',
  summary: 'The common and international terms for every seller, supplier and courier, read with their role terms.',
  intro: [
    'These terms apply together with the role terms you enrol in (Seller, Supplier or Courier), the completed fee schedule and the applicable local addendum. Applicable mandatory law prevails, then the relevant local addendum for the subject it addresses, then the role schedule and these common terms.',
  ],
  sections: [
    {
      heading: '1. Parties and scope',
      blocks: [
        'These terms are between [OPERATOR LEGAL NAME], [REGISTRATION NUMBER], of [OPERATOR ADDRESS], trading as SendAGift (SendAGift, we or us), and the person or legal entity identified in the enrolment record (you). They apply to the role or roles you affirmatively enrol in. The applicable role schedule, completed fee schedule and any expressly identified operational schedule form part of this agreement. Privacy information is provided separately in our Privacy Policy (sendagift.win/legal/privacy).',
        'The schedules describe the actual services and responsibilities of each party. No description of SendAGift as a marketplace removes obligations it has under law or the services it actually provides. The parties to each sale, supply arrangement and delivery must be identified before that transaction is accepted.',
      ],
    },
    {
      heading: '2. Enrolment and acceptance',
      blocks: [
        'You must provide accurate business and contact details, identify an authorised representative, and keep relevant information current. You confirm that the representative accepting these terms is authorised to bind the named entity. We may request proportionate verification relevant to the service, explaining the purpose and how the information will be handled.',
        'You accept by selecting the unticked acceptance box and submitting the enrolment form after being shown these terms and the relevant fee schedule. Application approval and activation occur under [APPROVAL AND CONTRACT START RULE]. We will provide a copy of the accepted terms and record the version and acceptance time. Subscription payment authority is separately obtained as described in the applicable role schedule.',
      ],
    },
    {
      heading: '3. Platform access and conduct',
      blocks: [
        'Each party must take reasonable steps to protect its accounts and notify the other promptly of suspected compromise affecting the service. You must not misrepresent goods or services, submit fraudulent orders, interfere with platform security, misuse personal information or list goods prohibited by law or by Prohibited Products and Reporting (sendagift.win/legal/prohibited-products). Restrictions must be communicated before they apply.',
        'SendAGift will provide the platform services described at [SERVICE SCOPE URL] with reasonable care and skill. Access may be affected by maintenance, outages or third-party failures. We will provide reasonable notice of planned material interruptions where practicable and take reasonable steps to restore service. We do not promise a particular sales volume, number of leads or delivery assignments.',
      ],
    },
    {
      heading: '4. Content and brand use',
      blocks: [
        'You retain your content rights. You grant SendAGift a non-exclusive licence to host, display and format content you submit solely to operate and promote your approved listings on the platform and fulfil related orders. Separate off-platform marketing use requires separate permission. You must have the rights needed for that use. We will remove content from active listings when reasonably practicable after withdrawal, subject to completed orders, recordkeeping and lawful retention.',
      ],
    },
    {
      heading: '5. Privacy and confidentiality',
      blocks: [
        'Each party must use personal information obtained through SendAGift only for the relevant transaction, support, fraud prevention, legal compliance or another separately lawful purpose. Do not add gift recipients or buyers to marketing lists solely because they appear in an order. Limit access to people who need it and protect account, recipient, address and delivery information with reasonable safeguards.',
        'Each party must promptly notify the other through [SECURITY CONTACT] of an incident affecting shared information, preserve relevant evidence and cooperate on containment and legally required notifications. Retention periods, overseas disclosures, service providers and each party’s privacy responsibilities are specified in [DATA HANDLING SCHEDULE]. Nothing here amounts to blanket consent to overseas transfers or unrelated marketing.',
        'Confidential business information must be protected and used only for this agreement, except where already public, independently obtained lawfully, or disclosure is required by law.',
      ],
    },
    {
      heading: '6. Complaints and remedies',
      blocks: [
        'Raise a platform complaint through support@sendagift.win. We will acknowledge and respond under [COMPLAINT RESPONSE STANDARD], explain material decisions and provide a review route. The parties will cooperate reasonably to resolve transaction complaints and preserve relevant evidence. This process does not prevent urgent relief, regulator complaints, tribunal proceedings or rights that cannot lawfully be restricted.',
        'Nothing in these terms excludes, restricts or modifies a statutory right, consumer guarantee or remedy that cannot lawfully be excluded, restricted or modified. Businesses may also qualify for statutory protections. Each party remains responsible for its own conduct and obligations. No blanket exclusion of liability or unlimited partner indemnity applies under these terms. Any proposed liability cap, insurance requirement or indemnity must be expressly negotiated or approved after review of the operational risks and applicable law.',
      ],
    },
    {
      heading: '7. Suspension and ending access',
      blocks: [
        'A material breach may lead to suspension or termination after written reasons and a reasonable opportunity to remedy under [REMEDY PERIOD], unless urgent action is reasonably necessary for safety, fraud, security or a legal requirement. Any restriction must be proportionate. Where notice cannot reasonably be given first, we will explain the decision promptly afterwards unless legally prohibited, and provide [REVIEW PROCESS]. Applicable worker deactivation and employment rights prevail.',
        'You may request closure through [CLOSURE CHANNEL]. Subscription cancellation is dealt with in the role schedule. Closure does not erase accrued lawful charges or outstanding fulfilment and refund obligations. We will arrange access to transaction records and settlement of undisputed funds under [EXIT AND RECORDS PROCESS]. Funds cannot be forfeited merely because an account closes.',
      ],
    },
    {
      heading: '8. Changes and governing law',
      blocks: [
        'Material fee or term changes apply prospectively after [CHANGE NOTICE PERIOD] and any consent required by law. They do not retrospectively change accepted orders. You may decline the change and exit before it applies without an added termination charge, subject to existing lawful obligations. Urgent legal or security changes must be limited to what is necessary and explained promptly.',
        '[GOVERNING LAW AND NONEXCLUSIVE COURTS] applies, without removing mandatory protections or forums available under applicable law. Inconsistencies are resolved under section 9 and the completed [DOCUMENT PRECEDENCE]; an operational policy cannot silently impose new charges or override statutory rights.',
      ],
    },
    {
      heading: '9. Applicable market terms and precedence',
      blocks: [
        'These international provisions supplement the common terms and your role schedule. The country or state addendum identified in your enrolment summary applies where its legal scope is met. Applicable mandatory law prevails, then the relevant local addendum for the subject it addresses, then the role schedule and common terms. A local addendum cannot remove a protection that mandatory law gives you or a customer. Conflicting mandatory requirements must be resolved before the relevant service is offered; acceptance is not a waiver of local rights.',
        'Your business location alone does not determine every applicable law. Buyer residence, delivery destination, place of work, goods location, platform targeting and the parties’ actual activities may also matter. The governing-law clause does not remove mandatory consumer, worker, privacy or public-law protections or their available courts and complaint routes.',
      ],
    },
    {
      heading: '10. Approved services and lawful territory restrictions',
      blocks: [
        'You may use the platform only for the roles, product categories, delivery routes and services activated in your approved service schedule [MARKET SERVICE SCHEDULE]. We will identify supported delivery destinations and material restrictions before an order or subscription is accepted. We will not take payment for a transaction we know cannot lawfully be provided.',
        'Restrictions must have a lawful basis and be applied proportionately. A delivery-area limit is not automatically a right to block website access, refuse otherwise eligible buyers based on nationality or residence, discriminate between qualifying payment methods, or redirect visitors without required consent. Applicable anti-discrimination and geo-blocking rules prevail. Where a restriction affects existing obligations, we will give reasons where permitted and arrange lawful fulfilment, cancellation or refund rather than retain payment for an unavailable service.',
      ],
    },
    {
      heading: '11. International tax and border responsibilities',
      blocks: [
        'The transaction summary will identify [TAX COLLECTOR], [IMPORTER OF RECORD], [CUSTOMS DECLARANT] and the approved allocation of taxes, duties, customs charges and return transport costs. No gift recipient is made an importer or charged an undisclosed border fee merely by being named as a recipient. Where a lawful amount cannot be calculated in advance, the required explanation and calculation method must be given before commitment.',
        'Each party must provide accurate information reasonably required for tax and customs compliance. A party must collect, remit or report amounts the law assigns to it, including marketplace obligations that cannot be transferred to a seller by contract. Foreign exchange rates, conversion fees and the currency of charges and payouts must be disclosed. No tax-inclusive treatment, exchange rate or currency is implied by the “$99” subscription price until approved and displayed.',
      ],
    },
    {
      heading: '12. Product and delivery restrictions',
      blocks: [
        'Sellers and suppliers must not arrange exports or imports prohibited for the route or product, misdescribe value, or treat a commercial sale as an exempt personal gift. The approved product schedule must identify licensing, safety, labelling, age, customs, sanctions and handling restrictions. Couriers must follow the lawful transport and recipient-verification process for each route. SendAGift retains its own applicable platform, product and trade-compliance obligations. Unapproved restricted categories remain unavailable rather than relying on a general partner warranty.',
      ],
    },
    {
      heading: '13. Local consumer rights and partner subscriptions',
      blocks: [
        'Sellers must provide the consumer information, withdrawal or cancellation notices, statutory remedies and durable confirmations required for their transactions. SendAGift will make the approved workflows available for the obligations it performs. Ordinary change-of-mind terms cannot narrow a mandatory cooling-off right. A personalised, perishable or other exception may be applied only to the legally qualifying item and after any required disclosure; it does not remove defective-goods remedies.',
        'For a partner subscription, legal consumer status is determined by the applicable law and actual purpose of the purchase, not solely by the account’s business label. Where mandatory cancellation, renewal, reminder, trial-conversion or refund rights apply, they override inconsistent subscription terms. The three-month free offer and subsequent $99 monthly price remain subject to the completed currency, tax and billing fields and lawful payment authority. They do not create an annual commitment or a seller subscription.',
      ],
    },
    {
      heading: '14. International data processing',
      blocks: [
        'Each party’s role as controller, processor, independent controller or equivalent is recorded by processing activity in [INTERNATIONAL DATA SCHEDULE]. Where one party processes for another, the parties must enter the legally required processing agreement specifying instructions, confidentiality, security, subprocessors, assistance, incident cooperation, return or deletion, and audit rights before that processing starts.',
        'Personal data may be sent to another country only after identifying the destination, recipient, purpose and applicable legal transfer requirements. Where required, an adequacy decision, approved contractual mechanism and necessary assessment or supplementary safeguards must be in place. A general acceptance checkbox is not blanket consent to international transfers. Privacy notices must accurately identify the actual collection and disclosures, data rights, complaints, retention and representatives required for the relevant market.',
        'Gift-recipient details may be used for lawful fulfilment and necessary communications, not treated as the recipient’s consent to marketing. The responsible party must give any required indirect-collection notice. Access, deletion and retention must reflect legal obligations and the actual technical process. These terms do not themselves execute EU standard contractual clauses, a UK transfer instrument or any required representative appointment.',
      ],
    },
    {
      heading: '15. Local delivery and labour protections',
      blocks: [
        'Courier access, job allocation, earnings, deductions, safety and deactivation must satisfy the laws applicable where the work is performed. A subscription fee does not buy a waiver of employee, worker or contractor protections. Minimum-pay, social-security, insurance or licensing obligations that fall on SendAGift remain its responsibility. If the approved courier model or subscription charge is unlawful in a market, that model must not be offered there until a lawful alternative is approved.',
      ],
    },
    {
      heading: '16. Localised acceptance record',
      blocks: [
        'Before acceptance, we will identify the operator, role, service territory, applicable local addendum, fee currency, tax presentation, subscription start and charge dates, cancellation route and required local notices. We will provide the accepted terms in [APPROVED LANGUAGE] and a retainable confirmation. The agreement, local addendum and separate recurring-payment authority will each be linked to their version in the enrolment record. If legally required information or consent is missing, activation or charging will not proceed.',
      ],
    },
  ],
}

export const sellerTerms: Policy = {
  ...draft,
  // Kept at its earlier address: the app and older links point here.
  slug: 'seller-agreement',
  docId: 'PART-SELL',
  title: 'Seller Terms',
  summary: 'The seller role: listings, the 7.9% platform fee and gateway charges, payouts, refunds and chargebacks.',
  intro: [
    'This role schedule applies with the Partner Terms (sendagift.win/legal/partner-terms) and the applicable local addendum. No seller monthly subscription is imposed by these terms.',
  ],
  sections: [
    {
      heading: '1. Seller service and responsibility',
      blocks: [
        'The seller offers products through SendAGift and is responsible for the accuracy of its listings, lawful supply, product quality, stock information, packaging, stated fulfilment commitments and customer remedies for which it is legally responsible. The contract of sale is between [SALE CONTRACT PARTIES]. SendAGift’s precise role, including any agency, payment collection or merchant of record role, is [PLATFORM SALE ROLE]. These fields must match checkout, receipts and actual operations.',
        'Listings must state the product description, price and applicable taxes, availability, material restrictions, delivery options and any relevant safety or use information. Do not make unsupported claims. Products requiring age verification, licences, special handling or other controls may be listed only after the appropriate workflow has been approved. Cooperate promptly on unsafe products, recalls and mandatory reports.',
      ],
    },
    {
      heading: '2. Platform fee and payment gateway charges',
      blocks: [
        'The platform fee is 7.9% of [SELLER FEE BASE]. Applicable taxes on that platform fee are additional, as specified in [SELLER FEE TAX TREATMENT]. The fee becomes payable at [SELLER FEE TRIGGER] and is collected through [SELLER FEE COLLECTION METHOD]. The fee base must expressly state how product taxes, delivery charges, discounts, gift wrapping, credits, tips, cancellations and refunds are treated.',
        'Payment gateway fees are additional to the platform fee and applicable taxes. These fees may vary by card origin and the payment provider’s applicable pricing. The provider, card-origin classification, percentage and fixed amounts, currency conversion charges, tax treatment and other applicable payment costs are specified in [GATEWAY FEE SCHEDULE]. No unspecified gateway rate or automatic processor-price change is incorporated by this sentence. Changes follow the notice and consent rules in the Partner Terms.',
        'Your settlement statement will separately identify gross receipts, the platform fee, taxes, gateway charges, refunds and any authorised adjustments. No seller monthly subscription is imposed by this schedule. Supplier and courier subscription prices do not apply merely because you are a seller.',
      ],
    },
    {
      heading: '3. Your product prices',
      blocks: [
        'You decide your product prices independently, including whether to incorporate your platform and processing costs in your ordinary advertised prices. You must comply with applicable total-price display requirements. These terms do not authorise a card surcharge, misleading checkout add-on or payment-method fee. Any proposed customer-facing charge requires separate review for the payment networks, transaction countries and laws involved.',
      ],
    },
    {
      heading: '4. Orders and delivery coordination',
      blocks: [
        'Orders become binding under [ORDER ACCEPTANCE RULE]. Keep stock current and promptly report an inability to fulfil. Substitutions require the buyer’s consent where required; do not silently substitute a materially different gift. The dispatch time, collection handoff, packaging requirements and delivery responsibility are set out in [SELLER FULFILMENT SCHEDULE]. Retain reasonable evidence of fulfilment without collecting unnecessary recipient information.',
      ],
    },
    {
      heading: '5. Payment collection and payouts',
      blocks: [
        'Customer payments are processed by Stripe under the separately disclosed payment arrangement. The party authorised to receive payments is [PAYMENT COLLECTION ENTITY], acting in [PAYMENT COLLECTION CAPACITY]. Whether buyer payment to that party discharges the buyer’s payment obligation is [PAYMENT DISCHARGE RULE]. Funds are not described as escrow or trust money unless that arrangement has been established and legally verified.',
        'Payout eligibility, frequency, settlement currency, bank transfer costs and the first payout rule are [PAYOUT SCHEDULE]. Required verification and processor restrictions must be disclosed before activation. We will provide itemised payout information and a way to query errors through [PAYOUT SUPPORT].',
        'Only amounts expressly authorised by the completed fee schedule, a supported refund obligation or applicable law may be deducted. Any reserve or hold must follow [RESERVE POLICY], stating the specific risk basis, calculation, maximum period, notice, review and release process. Disputed or unrelated funds are not automatically available for set-off. Undisputed funds should be paid when due unless a specific lawful restriction prevents it.',
      ],
    },
    {
      heading: '6. Refunds and cancellations',
      blocks: [
        'The seller must provide remedies required by law. Change-of-mind returns, personalised goods and perishables are governed by the disclosed Returns, Refunds and Cancellations policy (sendagift.win/legal/returns), which must preserve mandatory rights. A product category exception does not remove rights for defective or misdescribed goods. Buyers must receive a clear support route and cannot be required to waive statutory remedies.',
        'Buyer cancellations before and after acceptance, seller cancellations and missed delivery arrangements follow [ORDER CANCELLATION POLICY]. Platform fee reversals, gateway refund costs, delivery costs and partial refunds are allocated under [REFUND FEE ALLOCATION]. Gateway fees are not assumed to be refundable, non-refundable or chargeable to the buyer without confirming the provider arrangement and applicable law.',
        'Where SendAGift processes a customer refund on a seller’s behalf, its authority, evidence requirements and notice to the seller are [REFUND AUTHORITY]. Urgent mandatory remedies must not be delayed by an internal allocation dispute. Liability between SendAGift, seller, supplier and courier is resolved according to the actual cause, relevant agreement and law, rather than automatically charged to the seller.',
      ],
    },
    {
      heading: '7. Chargebacks and payment disputes',
      blocks: [
        'SendAGift will notify the seller of relevant payment disputes and provide a reasonable opportunity to supply evidence within the processor’s deadline. Allocation of the disputed amount, dispute fees and any reversal is governed by [CHARGEBACK ALLOCATION]. This must distinguish seller fulfilment failures, platform processing errors, courier failures and fraud risks. A processor decision does not conclusively determine all contractual liability between the parties. Any recovery or deduction must be supported, itemised and open to review.',
      ],
    },
    {
      heading: '8. Ending seller access',
      blocks: [
        'Closing the seller account stops new orders at [SELLER CLOSURE CUTOFF]. Existing orders, lawful refunds, payment disputes and final payouts continue under the agreed exit process. SendAGift must not automatically apply a supplier or courier subscription or enrol the seller in another paid role when seller access ends.',
      ],
    },
  ],
}

export const supplierTerms: Policy = {
  ...draft,
  slug: 'supplier-terms',
  docId: 'PART-SUP',
  title: 'Supplier Terms',
  summary: 'The supplier role: supply contracts, three months free then $99 a month, renewal and cancellation.',
  intro: [
    'This role schedule applies with the Partner Terms (sendagift.win/legal/partner-terms) and the applicable local addendum. Suppliers are distinct from sellers unless they separately enrol as sellers.',
  ],
  sections: [
    {
      heading: '1. Supplier service and supply contracts',
      blocks: [
        'This schedule applies to the supplier platform service described in [SUPPLIER SERVICE SCOPE], including the precise listing, lead, ordering or fulfilment features provided. A subscription does not guarantee purchases, revenue or exclusive access.',
        'Each supply transaction is between [SUPPLY CONTRACT PARTIES]. Before acceptance, the parties must agree the products, specifications, quantity, price, currency, taxes, delivery arrangements, title and risk transfer, inspection, rejection, payment due date and lawful remedies in [SUPPLY ORDER TERMS]. This subscription alone does not appoint SendAGift as buyer, reseller or payment guarantor.',
        'Provide accurate descriptions and stock information, goods meeting the agreed specifications and applicable law, relevant safety documentation and necessary rights to supplied content. Notify the contracting party promptly of delays or safety concerns. Approved substitutions and partial deliveries must be recorded. Product recall cooperation and responsibility are [SUPPLIER RECALL PROCESS].',
      ],
    },
    {
      heading: '2. Three months free, then a monthly subscription',
      blocks: [
        'The supplier platform subscription is free for the first three months, then $99 per month in [SUBSCRIPTION CURRENCY]. The $99 is [SUBSCRIPTION TAX TREATMENT]. The free period starts on [SUPPLIER TRIAL START EVENT] and ends at [SUPPLIER TRIAL END RULE AND TIME ZONE]. The actual end date and first paid billing date will be displayed in the enrolment summary.',
        'Trial eligibility, re-enrolment, paused accounts and the definition of a month are [SUPPLIER TRIAL ELIGIBILITY AND CALENDAR RULE]. The free period covers the supplier subscription only; any other cost is expressly listed in [SUPPLIER OTHER CHARGES], or recorded as none. No unconfirmed transaction commission applies.',
        'At the end of the free period, [SUPPLIER CONVERSION MODEL]. If automatic paid conversion applies, the supplier must separately authorise recurring charges before enrolment completes. Each subsequent monthly billing period, billing in advance or arrears, and first charge are [SUPPLIER BILLING RULE]. No automatic charge may occur merely because a payment method was provided.',
      ],
    },
    {
      heading: '3. Renewal, cancellation and failed payments',
      blocks: [
        'If the subscription renews monthly, renewal continues until cancellation using [SUBSCRIPTION CANCEL CHANNEL]. [CANCELLATION CUTOFF AND EFFECTIVE DATE], [ACCESS AFTER CANCELLATION] and [PART MONTH REFUND POLICY] are explained before consent. Cancellation before the first charge is supported under the disclosed trial rules. A cancellation confirmation will state whether any further charge is due and why. Mandatory refunds remain available.',
        'Pre-conversion reminders and material billing notices follow [BILLING NOTICE RULE]. Failed-payment retries, notice, grace period and any suspension follow [FAILED PAYMENT RULE]; no late charge applies unless separately approved and disclosed. Subscription disputes do not automatically permit withholding unrelated supply payments. Approved price changes apply only prospectively with notice and an effective opportunity to cancel.',
      ],
    },
  ],
}

export const courierTerms: Policy = {
  ...draft,
  slug: 'courier-terms',
  docId: 'PART-COUR',
  title: 'Courier Terms',
  summary: 'The courier role: job offers, safe delivery and records, three months free then $99 a month, and your protections.',
  intro: [
    'This role schedule applies with the Partner Terms (sendagift.win/legal/partner-terms) and the applicable local addendum.',
  ],
  sections: [
    {
      heading: '1. Courier platform service',
      blocks: [
        'This schedule covers [COURIER SERVICE SCOPE]. The party engaging the courier for each job is [DELIVERY CONTRACT PARTIES]. The delivery fee payer, rates, taxes, payment timing and authorised adjustments are set out in [COURIER JOB PAYMENT SCHEDULE]. Courier subscription fees are separate from delivery earnings and customer delivery charges. Subscription charges are not deducted from earnings unless the arrangement is lawful, expressly authorised and disclosed.',
        'The platform does not guarantee work volume. Each job offer will identify the collection and delivery locations, parcel description, known handling requirements, proposed timing, payment and cancellation arrangements before acceptance. Whether work may be declined or subcontracted is [COURIER ACCEPTANCE AND SUBCONTRACTING RULE], subject to applicable law and approved controls.',
      ],
    },
    {
      heading: '2. Safe fulfilment and delivery records',
      blocks: [
        'Couriers must have the licences, registrations, training and insurance that the law and [COURIER COMPLIANCE SCHEDULE] require for the work. Do not accept loads that cannot safely or lawfully be carried. Follow lawful handling instructions, reasonable safe-work procedures and applicable transport rules; do not drive unsafely to meet a promised delivery time.',
        'Record collection, exceptions and proof of delivery through [DELIVERY EVIDENCE PROCESS]. Recipient photographs, signatures, location data and identity checks must be limited to what is necessary and permitted. Do not publish delivery evidence or reuse recipient contact information for marketing.',
        'Loss, damage, late delivery, unavailable recipients, incorrect addresses, failed delivery, redelivery and returns follow [DELIVERY EXCEPTION SCHEDULE]. That schedule identifies who may authorise leaving goods unattended, safe-drop restrictions, claim evidence, reasonable response times, compensation and allocation based on cause and law. A short reporting deadline cannot remove mandatory rights. Notify SendAGift promptly of incidents and cooperate with claims without admitting another party’s liability.',
      ],
    },
    {
      heading: '3. Three months free, then a monthly subscription',
      blocks: [
        'The courier subscription is free for the first three months, then $99 per month in [SUBSCRIPTION CURRENCY], with [SUBSCRIPTION TAX TREATMENT]. It starts on [COURIER TRIAL START EVENT] and ends under [COURIER TRIAL END RULE AND TIME ZONE]. Eligibility, calendar-month calculations, pauses and repeat trials are [COURIER TRIAL ELIGIBILITY AND CALENDAR RULE]. Other approved charges, if any, are [COURIER OTHER CHARGES].',
        'The conversion model is [COURIER CONVERSION MODEL] and the billing rule is [COURIER BILLING RULE]. Any automatic paid conversion and renewal requires separately captured recurring-payment authority. The cancellation, reminder, failed-payment and refund rules in section 3 of the Supplier Terms apply to couriers, unless an expressly accepted courier-specific schedule replaces them. Supplier supply obligations do not apply to couriers.',
      ],
    },
    {
      heading: '4. Status and mandatory protections',
      blocks: [
        'The actual legal relationship is [COURIER LEGAL STATUS]. Contract labels do not override employment, employee-like worker, road transport, minimum-pay, superannuation, workplace safety or deactivation rights. Suspension or deactivation must comply with applicable procedural protections, even where the Partner Terms would otherwise permit faster action.',
      ],
    },
  ],
}

export const partnerAddenda: Policy = {
  ...draft,
  slug: 'partner-addenda',
  docId: 'PART-INTL',
  title: 'Partner Regional Addenda',
  summary: 'Additional partner terms for the EU and EEA, the United Kingdom, the United States and Australia.',
  intro: [
    'These addenda apply with the Partner Terms only where the relevant law applies and the market has been approved. Each is subject to country or state approval; approval of one market does not approve another.',
  ],
  sections: [
    {
      heading: 'EU and EEA: scope',
      blocks: [
        'This addendum applies when the relevant EU or EEA rules apply to SendAGift, a partner, or the transaction, in [EU EEA COUNTRIES ENABLED]. “EU/EEA” is not a single approval for every country or every role. Partner-facing platform duties and consumer sales duties are assessed separately.',
      ],
    },
    {
      heading: 'EU and EEA: consumer sales and withdrawal',
      blocks: [
        'For a qualifying distance sale to a consumer, the seller will provide the required pre-contract information and the applicable withdrawal instructions and form. Unless a lawful exception applies, a consumer may withdraw within the applicable 14-day period: generally from receipt for goods and from contract conclusion for services. Longer periods or extensions required by local law remain available. The seller will process withdrawal, returns and reimbursement under [EU COUNTRY WITHDRAWAL SCHEDULE], including applicable refund deadlines, delivery-cost treatment and lawful withholding pending return or evidence of return.',
        'No consumer will be required to accept a refund only as platform credit. Where a legally valid early-performance request is relevant, it must be separate and informed. Starting a service does not automatically waive all withdrawal rights. Digital content, if later offered, needs its own approved consent and acknowledgement flow. The responsible trader will provide an online withdrawal function where legally required.',
      ],
    },
    {
      heading: 'EU and EEA: marketplace and business partner duties',
      blocks: [
        'The parties will supply and verify information needed for applicable trader traceability, product safety and marketplace duties. SendAGift will operate [EU NOTICE AND ACTION ROUTE], [EU COMPLAINT ROUTE] and the legally required statement-of-reasons process where the applicable regime requires them. Requests for identification must be necessary, securely collected and retained only for an approved period. Responsibility for platform obligations is not transferred wholesale to the partner.',
        'Where platform-to-business rules apply, [EU PLATFORM DISCLOSURES] describe relevant ranking parameters, any differentiated treatment, data access and complaint or mediation arrangements. Changes, restrictions and termination must meet the applicable reasons and notice requirements; notice periods in the Partner Terms cannot shorten a statutory minimum.',
      ],
    },
    {
      heading: 'EU and EEA: tax, payments and data',
      blocks: [
        'The seller and SendAGift will apply the legally correct VAT treatment, including any deemed-supplier role of the platform and reporting obligations. Seller responsibility for tax does not displace platform obligations. Fees and payment-method treatment must comply with the applicable local law and payment network rules; seller gateway costs are not general permission to surcharge consumers.',
        'GDPR obligations and required processing and transfer arrangements apply as specified in the international data schedule. Local supervisory-authority rights and mandatory court access remain available. No Australian jurisdiction clause removes them.',
      ],
    },
    {
      heading: 'United Kingdom: scope and consumer remedies',
      blocks: [
        'This addendum applies where UK mandatory law applies. The responsible seller will provide its identity, address, product information, total price and other required distance-selling information before commitment, followed by a retainable confirmation. Qualifying consumers receive cancellation rights under the applicable Consumer Contracts Regulations, generally including a 14-day period, subject only to lawful exceptions and required disclosures. The seller will provide [UK CANCELLATION FORM AND INSTRUCTIONS] and process returns and refunds under [UK REFUND SCHEDULE].',
        'Goods and services must meet applicable statutory standards. A return-policy exception for bespoke or perishable goods cannot remove remedies for non-conforming goods. Any permitted early service start, proportionate charge or loss of a cancellation right must meet the statutory conditions, not merely a general acceptance of these terms.',
      ],
    },
    {
      heading: 'United Kingdom: partner subscriptions, VAT and privacy',
      blocks: [
        'Supplier and courier subscriptions retain the three-month free period followed by $99 per month in the separately confirmed currency and tax treatment. Any legally applicable renewal, cancellation, reminder, cooling-off and refund requirements override the commercial schedule. We will provide a straightforward cancellation route at [UK SUBSCRIPTION CANCEL ROUTE] and retain evidence of the terms and payment authority presented.',
        'The transaction will state the appropriate tax collector and importer roles. Where UK marketplace VAT rules make SendAGift responsible, that responsibility remains with SendAGift even if the underlying seller is overseas.',
        'UK GDPR and other applicable privacy rules govern relevant processing. Restricted international transfers require the approved UK mechanism and assessment where necessary. UK individuals retain mandatory rights and regulator access. Couriers retain any mandatory employment, worker, contractor, transport and safety protections applicable to their actual relationship. No subscription, label or contractual choice of law waives those rights.',
      ],
    },
    {
      heading: 'United States: scope and subscriptions',
      blocks: [
        'This addendum applies where US law applies, together with [US STATE ADDENDA]. Approval of one state does not approve all states. Mandatory consumer, privacy, employment, delivery and tax rules are assessed using the actual transaction and activities. No arbitration, jury waiver or class-action waiver is introduced by these terms.',
        'For an internet negative-option transaction covered by federal law, we will disclose material terms clearly before obtaining billing information, obtain express informed consent before charging and provide a simple mechanism to stop recurring charges. Applicable state laws may require additional notices, consent records, cancellation methods and renewal safeguards. For California transactions within its Automatic Renewal Law, the flow will capture the required affirmative consent, provide the acknowledgement and cancellation information, and deliver the notices and cancellation options required for the offer and renewal.',
        'The free period remains three months and the subsequent price remains $99 per month in [SUBSCRIPTION CURRENCY], with the tax treatment separately disclosed. [US STATE SUBSCRIPTION SCHEDULE] specifies timing, methods, records and any refunds required by each enabled state. If those requirements are not implemented, the relevant automatic conversion will not be offered.',
      ],
    },
    {
      heading: 'United States: shipment, taxes, privacy and courier work',
      blocks: [
        'For covered merchandise orders, the seller must have a reasonable basis for the advertised shipment time or the applicable default period. When timely shipment cannot occur, the seller will follow the required delay-consent, cancellation and refund process rather than silently extend the delivery date. SendAGift will support [US SHIPPING DELAY AND REFUND WORKFLOW] for the functions it performs. Applicable state warranty and consumer remedies remain available.',
        'The tax schedule identifies state and local sales-tax nexus, marketplace-facilitator duties, registrations and collection responsibilities. The platform performs the duties legally assigned to it. Privacy notices and controls reflect the applicable state laws and actual processing, including access, deletion, correction, appeals, opt-outs and recognised preference signals where required. Courier status, deductions, insurance, pay and deactivation are reviewed under the laws of the states and localities where work occurs.',
      ],
    },
    {
      heading: 'Australia',
      blocks: [
        'Where Australian law applies, nothing in the terms excludes a non-excludable consumer guarantee, remedy, unfair-contract protection or regulated-worker right. SendAGift and partners remain responsible for obligations arising from their own actual roles. Standard-form business agreements are subject to applicable small-business protections.',
        'The seller’s 7.9% platform fee and additional gateway costs are seller-side commercial charges, with the fee base and taxes still to be confirmed. They do not authorise a buyer card surcharge. Current network rules, including the Australian changes effective from 1 October 2026, apply to the actual payment flow. A foreign-issued card does not permit a surcharge.',
        'Supplier and courier subscriptions remain three months free, then $99 monthly, with currency, GST treatment and all billing choices completed before acceptance. Automatic conversion requires the disclosed authority and a lawful cancellation process. Statutory refunds and unfair-term protections prevail over any no-refund or renewal wording.',
        'Where the Privacy Act applies, applicable overseas-disclosure, security and notification obligations apply; the partner privacy clause does not transfer SendAGift’s accountability entirely to a partner. Couriers retain applicable regulated-worker and transport protections.',
      ],
    },
  ],
}
