import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import '@/index.css'
import { autosizeTextareas } from '@/lib/autosize-textareas'

autosizeTextareas()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
