import { api } from '@/lib/api'
import type { UserRole } from '@/lib/auth'

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  token: string
  role: UserRole
}

export type AdminRegisterRequest = {
  email: string
  password: string
  display_name: string
  image_url?: string
}

export type AdminRegisterResponse = {
  message: string
  id: string
}

export function loginAdmin(body: LoginRequest) {
  return api<LoginResponse>('/auth/login', {
    method: 'POST',
    body,
    auth: false,
  })
}

export function registerAdmin(body: AdminRegisterRequest, bootstrapSecret?: string) {
  const headers: Record<string, string> = {}
  if (bootstrapSecret) {
    headers['X-Bootstrap-Secret'] = bootstrapSecret
  }

  return api<AdminRegisterResponse>('/admin/register', {
    method: 'POST',
    body,
    headers,
    auth: false,
  })
}

export type SocialProvider = 'google' | 'facebook'

/** Signed in, or a new customer who must add a country and phone first. */
export type SocialSignInResult =
  | { status: 'signed_in'; token: string; role: UserRole }
  | {
      status: 'needs_profile'
      signup_token: string
      email: string
      name?: string
      image_url?: string
    }

export function socialSignIn(body: {
  provider: SocialProvider
  token: string
  token_type?: 'id_token' | 'access_token'
}) {
  return api<SocialSignInResult>('/auth/social', { method: 'POST', body, auth: false })
}

export function completeSocialSignup(body: {
  signup_token: string
  country_id: string
  phone: string
  customer_type?: string
  display_name?: string
}) {
  return api<{ status: 'signed_in'; token: string; role: UserRole }>('/auth/social/complete', {
    method: 'POST',
    body,
    auth: false,
  })
}
