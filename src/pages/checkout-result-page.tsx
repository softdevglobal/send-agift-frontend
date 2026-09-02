import { Navigate, useSearchParams } from 'react-router-dom'

export function CheckoutResultPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  if (orderId) {
    return <Navigate to={`/orders/${orderId}?placed=1`} replace />
  }
  return <Navigate to="/orders" replace />
}
