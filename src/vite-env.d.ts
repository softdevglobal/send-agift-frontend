/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** When "true", show local Shippo delivery simulation controls (also on in Vite DEV). */
  readonly VITE_ENABLE_SHIPPING_TEST_TOOLS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
