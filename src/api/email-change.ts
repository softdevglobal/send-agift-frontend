import { api } from '@/lib/api'
import type { MessageResponse } from '@/api/types'

/** Who is changing their email. Customers and sellers use the same flow. */
export type EmailChangeRole = 'customer' | 'seller'

export type EmailChangeStart = {
  new_email: string
  current_password: string
}

export type EmailChangeResult = {
  /** The address the account signs in with from now on. */
  email: string
  /** Replaces the stored token: every older one has stopped working. */
  token: string
  /** Until then prizes, gift points (customers) or buying points and raising
   *  rewards (sellers) are on hold. */
  redemption_locked_until: string
}

const base: Record<EmailChangeRole, string> = {
  customer: '/customers',
  seller: '/sellers',
}

/** Sends a code to the new address. The answer is the same whether or not it can be used. */
export function requestEmailChange(role: EmailChangeRole, body: EmailChangeStart) {
  return api<MessageResponse>(`${base[role]}/me/email/change`, { method: 'POST', body })
}

/** Checks the code and switches the account to the new address. */
export function confirmEmailChange(role: EmailChangeRole, code: string) {
  return api<EmailChangeResult>(`${base[role]}/me/email/confirm`, {
    method: 'POST',
    body: { code },
  })
}

/** The "this wasn't me" link from the old inbox. No sign-in needed. */
export function undoEmailChange(role: EmailChangeRole, token: string) {
  return api<MessageResponse>(`${base[role]}/email/undo`, {
    method: 'POST',
    body: { token },
    auth: false,
  })
}
