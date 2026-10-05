/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Google OAuth web client ID, for "Continue with Google". */
  readonly VITE_GOOGLE_CLIENT_ID?: string
  /** Facebook App ID, for "Continue with Facebook". */
  readonly VITE_FACEBOOK_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
