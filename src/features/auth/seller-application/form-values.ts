import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

export const inputClass = 'h-12 bg-surface px-3'
export const selectClass = cn(selectClassName, 'h-12')
export const textareaClass = cn(textareaClassName, 'min-h-28 py-3 leading-relaxed')

export type AddressDraft = {
  country: string
  countryOther: string
  line1: string
  line2: string
  city: string
  region: string
  postal: string
  latitude: number | null
  longitude: number | null
}

export const emptyAddress = (country = ''): AddressDraft => ({
  country,
  countryOther: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postal: '',
  latitude: null,
  longitude: null,
})
