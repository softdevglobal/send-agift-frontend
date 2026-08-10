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
    tint: 'bg-[#EDE8F5]',
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

export const bestSellingGifts: GiftProduct[] = [
  {
    id: '1',
    name: 'Handbound Memory Journal',
    price: 28,
    compareAt: 36,
    rating: 4.9,
    reviews: 214,
    image:
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '2',
    name: 'Ceramic Pour-Over Set',
    price: 42,
    compareAt: 55,
    rating: 4.8,
    reviews: 168,
    image:
      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '3',
    name: 'Soft Linen Gift Hamper',
    price: 64,
    compareAt: 79,
    rating: 4.9,
    reviews: 301,
    image:
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '4',
    name: 'Wireless Focus Earbuds',
    price: 89,
    compareAt: 119,
    rating: 4.7,
    reviews: 452,
    image:
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
  },
]

export const customerTestimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'Amelia R.',
    quote:
      'I sent a birthday hamper across cities and tracked every step. It felt personal, not like another marketplace order.',
    rating: 5,
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 't2',
    name: 'Jordan K.',
    quote:
      'Country-ready gift filters saved me. The points balance and competition entry made the whole experience fun.',
    rating: 5,
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 't3',
    name: 'Priya S.',
    quote:
      'Beautiful packaging, clear delivery updates, and support that actually resolved a date change quickly.',
    rating: 5,
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80',
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
