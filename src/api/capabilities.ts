import { api } from '@/lib/api'

/** GET /capabilities: what the server allows right now, for any visitor. */
export type Capabilities = {
  competitions?: {
    enabled?: boolean
    policyVersion?: number
    reason?: string
  }
}

export function getCapabilities() {
  return api<Capabilities>('/capabilities', { auth: false })
}
