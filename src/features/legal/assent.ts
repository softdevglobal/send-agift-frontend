import { customerTerms } from '@/features/legal/customer-terms'
import { partnerTerms } from '@/features/legal/partner-terms'
import { privacyPolicy } from '@/features/legal/privacy-policy'

/**
 * Exactly which documents a sign-up screen put in front of someone, sent with
 * the sign-up so the server can keep a record of what was agreed to. Change
 * a document's version and this changes with it.
 */
export const customerTermsVersion = `${customerTerms.docId} ${customerTerms.version}; ${privacyPolicy.docId} ${privacyPolicy.version}`

/** The seller agreement version shown on the seller sign-up's terms step. */
export const sellerTermsVersion = `${partnerTerms.docId} ${partnerTerms.version}; ${privacyPolicy.docId} ${privacyPolicy.version}`
