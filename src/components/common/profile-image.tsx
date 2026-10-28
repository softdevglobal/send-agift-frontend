import { useState, type ReactNode } from 'react'

/**
 * A person's profile photo, usually from Google or Facebook sign-in. Google's
 * image host refuses requests that name another site as the referrer, so none
 * is sent. If the photo still fails to load (it was removed, or the link
 * expired), `fallback` shows instead of a broken image.
 */
export function ProfileImage({
  src,
  className,
  fallback,
  loading,
}: {
  src?: string | null
  className?: string
  fallback: ReactNode
  loading?: 'lazy' | 'eager'
}) {
  const url = src?.trim() || ''
  // Remembers which URL failed, so a new photo gets a fresh try.
  const [failed, setFailed] = useState<string | null>(null)

  if (!url || failed === url) return <>{fallback}</>
  return (
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      loading={loading}
      onError={() => setFailed(url)}
      className={className}
    />
  )
}
