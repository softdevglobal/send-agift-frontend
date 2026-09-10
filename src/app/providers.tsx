import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from '@/features/auth/auth-context'
import { CartProvider } from '@/features/customer-commerce'
import { SavedGiftsProvider } from '@/features/customer-commerce/saved-gifts-context'
import { CustomerMessagesProvider } from '@/features/messaging'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CustomerMessagesProvider>
          <SavedGiftsProvider>
            <CartProvider>{children}</CartProvider>
          </SavedGiftsProvider>
        </CustomerMessagesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
