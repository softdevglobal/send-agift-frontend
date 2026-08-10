import { Route, Routes } from 'react-router-dom'

import { BecomeSellerPage } from '@/pages/become-seller-page'
import { CustomerLoginPage } from '@/pages/customer-login-page'
import { CustomerPage } from '@/pages/customer-page'
import { HomePage } from '@/pages/home-page'
import { SellerLoginPage } from '@/pages/seller-login-page'
import { SellerRegisterPage } from '@/pages/seller-register-page'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/customer" element={<CustomerPage />} />
      <Route path="/become-a-seller" element={<BecomeSellerPage />} />
      <Route path="/login" element={<CustomerLoginPage />} />
      <Route path="/seller/login" element={<SellerLoginPage />} />
      <Route path="/seller/register" element={<SellerRegisterPage />} />
    </Routes>
  )
}
