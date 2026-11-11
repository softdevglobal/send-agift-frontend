import type { Policy } from './policies'

export const privacyPolicy: Policy = {
  slug: 'privacy',
  docId: 'PRIV-01',
  title: 'Privacy Policy',
  summary: 'How SendAGift handles personal information, and how to request access, correction or account deletion.',
  audience: 'customer',
  version: '1.0',
  status: 'Published',
  updated: '11 November 2026',
  effective: '11 November 2026',
  intro: [
    'This policy applies to the SendAGift app and sendagift.win website, published by Soft Dev Global. It explains the information used for accounts, gift shopping, delivery, payments, messaging, reviews, games, points and competitions, where those features are available. Contact support@sendagift.win for privacy questions or requests.',
  ],
  sections: [
    {
      heading: 'Contact and account deletion',
      blocks: [
        'To request deletion of your SendAGift account and associated personal data without installing the app, email support@sendagift.win with the subject "Delete my SendAGift account". Send the request from your registered email address and identify the account. Never send your password, payment-card details or verification codes. If you cannot access that email address, contact the same support address for help verifying ownership.',
        'You can also use the Delete account option in the app’s Account screen or your profile on the website. The self-service flow requires active deliveries to be completed or resolved first. You can still contact support to initiate a deletion request while an order is active; we will explain any information needed to complete delivery, cancellation, a refund or another outstanding obligation.',
        'The account-deletion process removes or anonymises profile contact details, the profile-image reference, date of birth and login credentials, and removes saved addresses, recipients, saved gifts, push-device registrations and linked sign-in identities. It invalidates existing account sessions. Transaction, payment and points records may remain for accounting, dispute resolution, security and fraud prevention. Public contributions, support conversations, uploaded files and provider-held records may require additional handling: include them in your request so support can identify the associated data and explain any necessary retention. Deleting the app alone does not delete your account.',
      ],
    },
    {
      heading: 'Information we collect',
      blocks: [
        {
          list: [
            'Account information: name or display name, email address, phone number, account identifiers, verification status, profile photo and date of birth when you provide them. Passwords are stored as hashes. A sign-in provider supplies account identifiers and profile information when you choose that sign-in method.',
            'Gift and delivery information: products, cart and saved items, sender and recipient details, delivery addresses and any supplied map coordinates, gift messages, delivery instructions, order status and tracking events.',
            'Transactions and rewards: purchase amounts, currencies, payment and refund references, membership status, points balances and ledger entries, game attempts and scores, competition entries, results and prize records.',
            'Content and support: reviews, ratings, comments, messages, attachments and photos you choose to upload. Public reviews, comments and leaderboards can show the display information associated with your contribution; an anonymous display option does not prevent the service from retaining an account association.',
            'Technical information: network addresses used to serve and protect requests, authentication and security events, guest identifiers, notification tokens, device platform and information needed to operate the service and investigate errors.',
            'Seller information: business and contact details, registration identifiers, listings, fulfilment information and payment-provider onboarding information supplied through seller services on the website.',
          ],
        },
      ],
    },
    {
      heading: 'Information about gift recipients',
      blocks: [
        'A sender may supply another person’s name, contact details and delivery address to arrange a gift. Only supply information you are authorised to share. We use it for gift fulfilment, delivery, service communications, support and applicable eligibility or fraud checks. Providing a recipient’s information does not itself create marketing consent for that recipient. Recipients can contact support@sendagift.win about their information even if they do not have an account.',
      ],
    },
    {
      heading: 'How we use information',
      blocks: [
        'We use information to operate accounts and sign-in, display and fulfil orders, process payments and refunds, manage deliveries and recipients, provide messaging and customer support, publish contributions you choose to share, and administer available memberships, points, games and competitions. We also use necessary information to secure the service, prevent abuse, enforce eligibility rules, investigate complaints and comply with applicable obligations.',
        'Information required to complete an order or secure an account is necessary for those services. Optional profile details, content uploads and notification permission can be declined, although the related feature may then be unavailable. Where applicable law requires a legal basis, processing is connected to providing the requested service, meeting legal obligations, protecting legitimate operational and security interests, or consent for optional processing that requires it.',
      ],
    },
    {
      heading: 'Who receives information',
      blocks: [
        {
          list: [
            'Sellers and delivery providers receive the order, recipient and contact details needed to prepare, deliver and support the relevant gift.',
            'Stripe processes payment information when Stripe checkout is used, including payment details entered into its payment interface. SendAGift receives transaction references, status and related payment information needed for orders and refunds.',
            'Infrastructure and communication services process information needed for their functions. The platform integrates AWS hosting and file storage, Firebase notifications, Zoho ZeptoMail email delivery and TextBee SMS delivery. Which service handles a particular request depends on the enabled feature and delivery channel.',
            'Google, Facebook or Apple handle authentication when you select their sign-in option. Their own privacy policies also apply to their services.',
            'Other users can see information you intentionally publish in public reviews, comments or leaderboards. Support and operational staff may access information needed to handle your request or operate the service.',
            'Information may be disclosed where required by law or necessary to investigate fraud, resolve disputes or protect people, rights and the service.',
          ],
        },
        'Providers, sellers or recipients may be located outside your country. Cross-border processing depends on the provider and the destination of your gift. Contact support@sendagift.win for information about the providers involved in your request. Do not include sensitive information in public posts or gift messages that you do not want the recipient or fulfilling seller to receive.',
      ],
    },
    {
      heading: 'Device permissions and local storage',
      blocks: [
        'The app uses device storage for sign-in tokens and preferences, and to retain cart, saved-item and guest-session information. You can clear local app data through your device settings; this does not remove information already held by the service. The website uses browser storage for sign-in and service preferences.',
        'Photos, camera or file access is used when you choose to attach or upload content. Notification permission is used for service and competition notifications where enabled. You can manage these permissions in your device settings. Delivery addresses and any coordinates you supply are used for delivery; an address is not a request for continuous device-location tracking.',
      ],
    },
    {
      heading: 'Security and retention',
      blocks: [
        'The public website uses HTTPS. Account access is protected by authentication, password hashing and access checks; the mobile app uses secure storage for sign-in tokens. No online service can guarantee absolute security. Report suspected misuse or exposure to support@sendagift.win.',
        'Account information is held while needed to provide the account and requested services. You can request deletion at any time using the instructions above. Completed transactions and related records may be retained while needed for accounting, refunds, disputes, fraud prevention or applicable legal obligations. The necessary period depends on the record, outstanding obligation and applicable jurisdiction. Contact support to request deletion of associated records and obtain the reason and applicable retention period for any information that must be kept. Data retained for those reasons is not needed to keep your login active.',
        'Removing an account does not instantly erase separate provider records or recovery copies. A deletion request should cover associated files and provider-held data as well as the account. We will explain any limitations or additional steps needed when handling the request.',
      ],
    },
    {
      heading: 'Your choices and privacy requests',
      blocks: [
        'You can update available profile and address details in your account, manage notification permissions on your device, and contact support@sendagift.win to request access, correction or deletion. Depending on your location, you may also have rights to restrict or object to processing, request a portable copy, withdraw consent, or complain to your local data-protection authority. We may need to verify identity before releasing or changing personal information. Withdrawing consent does not reverse processing already performed lawfully.',
        'For optional promotional messages, use any unsubscribe instructions in the message or contact support. Essential account, security, order and support communications may still be needed to provide the requested service. A gift recipient’s contact information must not be treated as permission for unrelated marketing.',
      ],
    },
    {
      heading: 'Children’s information',
      blocks: [
        'Gift recipients may include children. Senders should provide only the details necessary for delivery and must have appropriate authority to share them. A parent or guardian who believes a child’s information has been provided improperly can contact support@sendagift.win to request review or deletion. Product, account and competition eligibility requirements are separate from this privacy policy.',
      ],
    },
    {
      heading: 'Policy updates',
      blocks: [
        'Updates will be published at https://sendagift.win/legal/privacy with a revised version and effective date. Where required, material changes will be accompanied by additional notice or consent. For all privacy questions and complaints, contact support@sendagift.win and identify SendAGift and the relevant account, order or request.',
      ],
    },
  ],
}
