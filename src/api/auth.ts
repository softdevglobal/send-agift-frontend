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
