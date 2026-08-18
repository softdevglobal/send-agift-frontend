import { Navigate, Route, Routes, useParams } from 'react-router-dom'

import { AdminShell } from '@/features/admin'
import { GuestRoute, ProtectedRoute } from '@/features/auth/protected-route'
import { CustomerShell } from '@/features/customer-commerce'
import { SellerShell } from '@/features/seller'
import { AdminAccountPage } from '@/pages/admin-account-page'
import { AdminAdminsPage } from '@/pages/admin-admins-page'
import { AdminCountriesPage } from '@/pages/admin-countries-page'
import { AdminCustomersPage } from '@/pages/admin-customers-page'
import { AdminDashboardPage } from '@/pages/admin-dashboard-page'
import { AdminLoginPage } from '@/pages/admin-login-page'
import { AdminRegisterPage } from '@/pages/admin-register-page'
import { AdminSellersPage } from '@/pages/admin-sellers-page'
import { BecomeSellerPage } from '@/pages/become-seller-page'
import { CartPage } from '@/pages/cart-page'
import { CheckoutPage } from '@/pages/checkout-page'
import { CheckoutResultPage } from '@/pages/checkout-result-page'
import { CustomerLoginPage } from '@/pages/customer-login-page'
import { CustomerOrderDetailPage } from '@/pages/customer-order-detail-page'
import { CustomerOrdersPage } from '@/pages/customer-orders-page'
import { CustomerPage } from '@/pages/customer-page'
import { CustomerProfilePage } from '@/pages/customer-profile-page'
import { CustomerRegisterPage } from '@/pages/customer-register-page'
import { HomePage } from '@/pages/home-page'
import { ProductDetailPage } from '@/pages/product-detail-page'
import { SellerAnalyticsPage } from '@/pages/seller-analytics-page'
import { SellerDashboardPage } from '@/pages/seller-dashboard-page'
import { SellerEarningsPage } from '@/pages/seller-earnings-page'
import { SellerInboxPage } from '@/pages/seller-inbox-page'
import { SellerLoginPage } from '@/pages/seller-login-page'
import { SellerOrdersPage } from '@/pages/seller-orders-page'
import { SellerProfilePage } from '@/pages/seller-profile-page'
import { SellerRegisterPage } from '@/pages/seller-register-page'
import { SellerShopsPage } from '@/pages/seller-shops-page'

function RedirectShopProduct() {
  const { productId } = useParams()
  return <Navigate to={`/customer/gifts/${productId}`} replace />
}

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
      <Route path="/shop" element={<Navigate to="/customer" replace />} />
      <Route path="/shop/:productId" element={<RedirectShopProduct />} />
      <Route path="/cart" element={<Navigate to="/customer/cart" replace />} />
      <Route path="/checkout" element={<Navigate to="/customer/checkout" replace />} />
      <Route
        path="/checkout/result"
        element={<Navigate to="/customer/checkout/result" replace />}
      />
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
      <Route path="/customer">
        <Route
          path="register"
          element={
            <GuestRoute>
              <CustomerRegisterPage />
            </GuestRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute roles={['customer']}>
              <CustomerShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<CustomerPage />} />
          <Route path="gifts/:productId" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="checkout/result" element={<CheckoutResultPage />} />
          <Route path="orders" element={<CustomerOrdersPage />} />
          <Route path="orders/:orderId" element={<CustomerOrderDetailPage />} />
          <Route path="profile" element={<CustomerProfilePage />} />
        </Route>
      </Route>
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
        path="/seller"
        element={
          <ProtectedRoute roles={['seller']}>
            <SellerShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<SellerDashboardPage />} />
        <Route path="shops" element={<SellerShopsPage />} />
        <Route path="orders" element={<SellerOrdersPage />} />
        <Route path="earnings" element={<SellerEarningsPage />} />
        <Route path="analytics" element={<SellerAnalyticsPage />} />
        <Route path="inbox" element={<SellerInboxPage />} />
        <Route path="profile" element={<SellerProfilePage />} />
      </Route>
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            <AdminShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="sellers" element={<AdminSellersPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="countries" element={<AdminCountriesPage />} />
        <Route path="admins" element={<AdminAdminsPage />} />
        <Route path="account" element={<AdminAccountPage />} />
      </Route>
    </Routes>
  )
}
