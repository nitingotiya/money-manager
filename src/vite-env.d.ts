/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** "owner/repo" on GitHub, used by the Android app to find newer APK releases. */
  readonly VITE_GITHUB_REPO?: string
  /** Public website address, e.g. https://name.github.io/money-manager/ (used in account emails). */
  readonly VITE_SITE_URL?: string
}
