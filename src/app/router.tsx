import { Route, Routes } from 'react-router-dom'

import { GuestRoute, ProtectedRoute } from '@/features/auth/protected-route'
import { AdminCountriesPage } from '@/pages/admin-countries-page'
import { AdminLoginPage } from '@/pages/admin-login-page'
import { AdminPage } from '@/pages/admin-page'
import { AdminRegisterPage } from '@/pages/admin-register-page'
import { BecomeSellerPage } from '@/pages/become-seller-page'
import { CustomerLoginPage } from '@/pages/customer-login-page'
import { CustomerPage } from '@/pages/customer-page'
import { CustomerProfilePage } from '@/pages/customer-profile-page'
import { CustomerRegisterPage } from '@/pages/customer-register-page'
import { HomePage } from '@/pages/home-page'
import { SellerLoginPage } from '@/pages/seller-login-page'
import { SellerProfilePage } from '@/pages/seller-profile-page'
import { SellerRegisterPage } from '@/pages/seller-register-page'
import { SellerShopsPage } from '@/pages/seller-shops-page'

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <GuestRoute>
            <HomePage />
          </GuestRoute>
        }
      />
      <Route path="/customer" element={<CustomerPage />} />
      <Route path="/become-a-seller" element={<BecomeSellerPage />} />

      <Route
        path="/login"
        element={
          <GuestRoute>
            <CustomerLoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <CustomerRegisterPage />
          </GuestRoute>
        }
      />
      <Route
        path="/customer/register"
        element={
          <GuestRoute>
            <CustomerRegisterPage />
          </GuestRoute>
        }
      />
      <Route
        path="/seller/login"
        element={
          <GuestRoute>
            <SellerLoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/seller/register"
        element={
          <GuestRoute>
            <SellerRegisterPage />
          </GuestRoute>
        }
      />
      <Route
        path="/admin/login"
        element={
          <GuestRoute>
            <AdminLoginPage />
          </GuestRoute>
        }
      />
      <Route path="/admin/register" element={<AdminRegisterPage />} />

      <Route
        path="/customer/profile"
        element={
          <ProtectedRoute roles={['customer']}>
            <CustomerProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/profile"
        element={
          <ProtectedRoute roles={['seller']}>
            <SellerProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/shops"
        element={
          <ProtectedRoute roles={['seller']}>
            <SellerShopsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/countries"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            <AdminCountriesPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
