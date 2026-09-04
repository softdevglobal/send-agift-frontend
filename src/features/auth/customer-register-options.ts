export const customerTypes = [
  { value: 'individual', label: 'Individual' },
  { value: 'family', label: 'Family / Household' },
  { value: 'business', label: 'Business' },
  { value: 'corporate', label: 'Corporate gifting' },
] as const

export type CustomerTypeValue = (typeof customerTypes)[number]['value']

export type CustomerStatus = 'pending' | 'active' | 'inactive' | 'suspended'

export const customerStatusLabel: Record<CustomerStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
}
