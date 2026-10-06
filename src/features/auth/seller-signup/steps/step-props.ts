import type { Country } from '@/api/types'
import type { SignupState } from '@/features/auth/seller-signup/signup-state'

export type StepProps = {
  state: SignupState
  update: (patch: Partial<SignupState>) => void
  /** The business country, once chosen. */
  country: Country | null
  countries: Country[]
  disabled: boolean
}
