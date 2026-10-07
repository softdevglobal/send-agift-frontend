import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { socialSignIn, type SocialProvider, type SocialSignInResult } from '@/api/auth'
import { FormAlert } from '@/components/common/form-alert'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID ?? ''

/** Whether either provider is configured; without one the block hides itself. */
const socialSignInEnabled = Boolean(GOOGLE_CLIENT_ID || FACEBOOK_APP_ID)

// ── Provider SDK typings (only what we use) ──────────────────────────────

type GoogleTokenResponse = { access_token?: string; error?: string }
type GoogleTokenClient = { requestAccessToken: () => void }
type FacebookLoginResponse = { authResponse?: { accessToken: string } | null; status: string }

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: GoogleTokenResponse) => void
            error_callback?: (error: { type: string }) => void
          }) => GoogleTokenClient
        }
      }
    }
    FB?: {
      init: (config: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void
      login: (callback: (response: FacebookLoginResponse) => void, options: { scope: string }) => void
    }
    fbAsyncInit?: () => void
  }
}

const scripts = new Map<string, Promise<void>>()

function loadScript(src: string): Promise<void> {
  let pending = scripts.get(src)
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => {
        scripts.delete(src)
        reject(new Error('Could not reach the sign-in service. Check your connection and try again.'))
      }
      document.head.appendChild(script)
    })
    scripts.set(src, pending)
  }
  return pending
}

let facebookReady: Promise<void> | null = null

function loadFacebook(): Promise<void> {
  facebookReady ??= loadScript('https://connect.facebook.net/en_US/sdk.js').then(() => {
    window.FB?.init({ appId: FACEBOOK_APP_ID, cookie: false, xfbml: false, version: 'v21.0' })
  })
  return facebookReady
}

/** Opens Google's account picker and resolves with an access token. */
function googleAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts.oauth2
    if (!oauth2) return reject(new Error('Google sign-in is still loading. Please try again.'))
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (response) => {
        if (response.access_token) resolve(response.access_token)
        else reject(new CancelledError())
      },
      error_callback: () => reject(new CancelledError()),
    })
    client.requestAccessToken()
  })
}

/** Opens Facebook's login dialog and resolves with an access token. */
function facebookAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.FB) return reject(new Error('Facebook sign-in is still loading. Please try again.'))
    window.FB.login(
      (response) => {
        if (response.authResponse?.accessToken) resolve(response.authResponse.accessToken)
        else reject(new CancelledError())
      },
      { scope: 'public_profile,email' },
    )
  })
}

/** The person closed the provider's window; not an error worth showing. */
class CancelledError extends Error {}

type SocialSignInButtonsProps = {
  /** Shown before the provider name, e.g. "Sign up with Google". Empty shows the name alone. */
  verb?: string
  onResult: (result: SocialSignInResult) => void
  className?: string
}

/**
 * "Continue with Google / Facebook". The provider's own window confirms who
 * the person is; the API then signs them in or asks them to finish signing up.
 */
export function SocialSignInButtons({ verb = 'Continue', onResult, className }: SocialSignInButtonsProps) {
  const [busy, setBusy] = useState<SocialProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load the SDKs up front: the provider window must open straight from the
  // click, or the browser blocks it as a pop-up.
  useEffect(() => {
    if (GOOGLE_CLIENT_ID) void loadScript('https://accounts.google.com/gsi/client').catch(() => {})
    if (FACEBOOK_APP_ID) void loadFacebook().catch(() => {})
  }, [])

  async function start(provider: SocialProvider) {
    setError(null)
    setBusy(provider)
    try {
      const token = provider === 'google' ? await googleAccessToken() : await facebookAccessToken()
      onResult(await socialSignIn({ provider, token, token_type: 'access_token' }))
    } catch (err) {
      if (!(err instanceof CancelledError)) setError(getErrorMessage(err, 'Sign-in failed. Please try again.'))
    } finally {
      setBusy(null)
    }
  }

  if (!socialSignInEnabled) return null

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn('grid gap-2.5', GOOGLE_CLIENT_ID && FACEBOOK_APP_ID && 'sm:grid-cols-2')}>
        {GOOGLE_CLIENT_ID ? (
          <button
            type="button"
            onClick={() => void start('google')}
            disabled={busy !== null}
            className="flex h-12 items-center justify-center gap-2.5 rounded-md bg-card whitespace-nowrap px-4 text-sm font-semibold text-foreground ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-foreground/20 disabled:pointer-events-none disabled:opacity-60"
          >
            {busy === 'google' ? <LoaderCircle className="size-4 animate-spin" /> : <GoogleMark />}
            {verb ? `${verb} with Google` : 'Google'}
          </button>
        ) : null}
        {FACEBOOK_APP_ID ? (
          <button
            type="button"
            onClick={() => void start('facebook')}
            disabled={busy !== null}
            className="flex h-12 items-center justify-center gap-2.5 rounded-md bg-[#1877F2] whitespace-nowrap px-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#166FE5] hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
          >
            {busy === 'facebook' ? <LoaderCircle className="size-4 animate-spin" /> : <FacebookMark />}
            {verb ? `${verb} with Facebook` : 'Facebook'}
          </button>
        ) : null}
      </div>
      <FormAlert error={error} />
    </div>
  )
}

/** "or" between the social buttons and the email form. */
export function SocialDivider({ label = 'or use your email' }: { label?: string }) {
  if (!socialSignInEnabled) return null
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden fill="currentColor">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  )
}
