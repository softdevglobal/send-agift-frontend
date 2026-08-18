import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from '@/features/auth/auth-context'
import { CartProvider } from '@/features/customer-commerce'
import { SavedGiftsProvider } from '@/features/customer-commerce/saved-gifts-context'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SavedGiftsProvider>
          <CartProvider>{children}</CartProvider>
        </SavedGiftsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
