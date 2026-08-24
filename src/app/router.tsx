import { Navigate, Route, Routes, useParams } from 'react-router-dom'

import { PageLayout } from '@/components/common/page-layout'
import { AccountLayout } from '@/features/account/account-layout'
import { AdminShell } from '@/features/admin'
import { GuestRoute, ProtectedRoute } from '@/features/auth/protected-route'
import { SellerShell } from '@/features/seller'
import { AccountAddressesPage } from '@/pages/account-addresses-page'
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
import { CustomerProfilePage } from '@/pages/customer-profile-page'
import { CustomerRecipientsPage } from '@/pages/customer-recipients-page'
import { CustomerRegisterPage } from '@/pages/customer-register-page'
import { CustomerSavedGiftsPage } from '@/pages/customer-saved-gifts-page'
import { CustomerSellerPage } from '@/pages/customer-seller-page'
import { CustomerSellerShopPage } from '@/pages/customer-seller-shop-page'
import { HomePage } from '@/pages/home-page'
import { ProductsPage } from '@/pages/products-page'
import { ProductViewPage } from '@/pages/product-view-page'
import { SellerAnalyticsPage } from '@/pages/seller-analytics-page'
import { SellerDashboardPage } from '@/pages/seller-dashboard-page'
import { SellerEarningsPage } from '@/pages/seller-earnings-page'
import { SellerInboxPage } from '@/pages/seller-inbox-page'
import { SellerLoginPage } from '@/pages/seller-login-page'
import { SellerOrdersPage } from '@/pages/seller-orders-page'
import { SellerProductsPage } from '@/pages/seller-products-page'
import { SellerProfilePage } from '@/pages/seller-profile-page'
import { SellerRegisterPage } from '@/pages/seller-register-page'
import { SellerShopsPage } from '@/pages/seller-shops-page'

function RedirectProduct() {
  const { productId } = useParams()
  return <Navigate to={`/products/${productId}`} replace />
}

function RedirectSeller() {
  const { sellerId } = useParams()
  return <Navigate to={`/sellers/${sellerId}`} replace />
}

function RedirectSellerShop() {
  const { sellerId, shopId } = useParams()
  return <Navigate to={`/sellers/${sellerId}/shops/${shopId}`} replace />
}

function RedirectOrder() {
  const { orderId } = useParams()
  return <Navigate to={`/account/orders/${orderId}`} replace />
}

export function AppRouter() {
  return (
    <Routes>
      {/* Storefront — the same pages for guests and signed-in customers. */}
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:productId" element={<ProductViewPage />} />
      <Route path="/become-a-seller" element={<BecomeSellerPage />} />

      <Route element={<PageLayout />}>
        <Route path="/sellers/:sellerId" element={<CustomerSellerPage />} />
        <Route
          path="/sellers/:sellerId/shops/:shopId"
          element={<CustomerSellerShopPage />}
        />
        <Route path="/cart" element={<CartPage />} />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute roles={['customer']}>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/result"
          element={
            <ProtectedRoute roles={['customer']}>
              <CheckoutResultPage />
            </ProtectedRoute>
          }
        />
      </Route>

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

      {/* Signed-in account area. */}
      <Route
        path="/account"
        element={
          <ProtectedRoute roles={['customer']}>
            <AccountLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/account/orders" replace />} />
        <Route path="orders" element={<CustomerOrdersPage />} />
        <Route path="orders/:orderId" element={<CustomerOrderDetailPage />} />
        <Route path="saved-gifts" element={<CustomerSavedGiftsPage />} />
        <Route path="addresses" element={<AccountAddressesPage />} />
        <Route path="recipients" element={<CustomerRecipientsPage />} />
        <Route path="profile" element={<CustomerProfilePage />} />
      </Route>

      {/* Legacy customer-portal paths. */}
      <Route path="/shop" element={<Navigate to="/products" replace />} />
      <Route path="/shop/:productId" element={<RedirectProduct />} />
      <Route path="/customer" element={<Navigate to="/products" replace />} />
      <Route path="/customer/gifts/:productId" element={<RedirectProduct />} />
      <Route path="/customer/sellers/:sellerId" element={<RedirectSeller />} />
      <Route
        path="/customer/sellers/:sellerId/shops/:shopId"
        element={<RedirectSellerShop />}
      />
      <Route path="/customer/cart" element={<Navigate to="/cart" replace />} />
      <Route path="/customer/checkout" element={<Navigate to="/checkout" replace />} />
      <Route
        path="/customer/checkout/result"
        element={<Navigate to="/checkout/result" replace />}
      />
      <Route path="/customer/orders" element={<Navigate to="/account/orders" replace />} />
      <Route path="/customer/orders/:orderId" element={<RedirectOrder />} />
      <Route
        path="/customer/saved-gifts"
        element={<Navigate to="/account/saved-gifts" replace />}
      />
      <Route
        path="/customer/recipients"
        element={<Navigate to="/account/recipients" replace />}
      />
      <Route
        path="/customer/profile"
        element={<Navigate to="/account/profile" replace />}
      />
      <Route path="/customer/register" element={<Navigate to="/register" replace />} />

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
        <Route path="products" element={<SellerProductsPage />} />
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
