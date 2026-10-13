export type GiftCategory = {
  id: string
  name: string
  image: string
  tint: string
}

export type GiftProduct = {
  id: string
  name: string
  price: number
  compareAt?: number
  rating: number
  reviews: number
  image: string
}

export type Testimonial = {
  id: string
  name: string
  quote: string
  rating: number
  avatar: string
  role?: string
}

export const giftCategories: GiftCategory[] = [
  {
    id: 'birthday',
    name: 'Birthday',
    image:
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=300&q=80',
    tint: 'bg-[#E8F1F8]',
  },
  {
    id: 'flowers',
    name: 'Flowers',
    image:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=300&q=80',
    tint: 'bg-[#F8E9EF]',
  },
  {
    id: 'hampers',
    name: 'Hampers',
    image:
      'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?auto=format&fit=crop&w=300&q=80',
    tint: 'bg-[#F3EBDD]',
  },
  {
    id: 'wellness',
    name: 'Wellness',
    image:
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=300&q=80',
    tint: 'bg-[#F8EBE3]',
  },
  {
    id: 'tech',
    name: 'Tech Gifts',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80',
    tint: 'bg-[#E5F3F0]',
  },
  {
    id: 'keepsakes',
    name: 'Keepsakes',
    image:
      'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=300&q=80',
    tint: 'bg-[#F8EFE4]',
  },
]

export const sellerTestimonials: Testimonial[] = [
  {
    id: 's1',
    name: 'Maya Chen',
    role: 'Home gifts seller',
    quote:
      'Onboarding for payouts was clear by country. Orders, labels, and proof of delivery finally live in one place.',
    rating: 5,
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 's2',
    name: 'Daniel Okoro',
    role: 'Florist & hampers',
    quote:
      'Connected publishing and fulfilment tools helped us scale without losing the handmade feel of each gift.',
    rating: 5,
    avatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 's3',
    name: 'Elena Voss',
    role: 'Wellness studio',
    quote:
      'The payout ledger and dispute tools give us confidence. Customers find us, and we stay ready to fulfil.',
    rating: 5,
    avatar:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80',
  },
]
