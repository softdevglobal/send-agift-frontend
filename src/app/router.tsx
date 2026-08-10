import { Route, Routes } from 'react-router-dom'

import { HomePage } from '@/pages/home-page'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  )
}
