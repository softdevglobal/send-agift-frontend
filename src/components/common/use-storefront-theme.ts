import { useEffect } from 'react'

/**
 * Puts the storefront look (heavy type, ink box buttons) on <body> while the
 * calling page is mounted, so the page and anything it portals out to body,
 * such as dialogs and sheets, share it.
 */
export function useStorefrontTheme() {
  useEffect(() => {
    document.body.classList.add('storefront')
    return () => document.body.classList.remove('storefront')
  }, [])
}
