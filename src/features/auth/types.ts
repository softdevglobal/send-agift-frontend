export type AuthRole = 'customer' | 'seller' | 'admin'

export type LoginCopy = {
  roleLabel: string
  headline: string
  supporting: string
  submitLabel: string
  switchPrompt: string
  switchLabel: string
  switchTo: string
  // Admins cannot sign themselves up, so these are absent for the admin role.
  registerHint?: string
  registerLabel?: string
  registerTo?: string
  panelAccent: string
  panelNote: string
}
