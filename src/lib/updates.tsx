import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { APP_VERSION, checkApkUpdate, isNativeApp, releasesSince, type ApkRelease } from './version'
import type { Release } from '../changelog'

/**
 * Two ways a new version reaches people:
 * - Website / installed web app: a service worker downloads the new build in the background,
 *   and we show "Update ready". Tapping it reloads into the new version.
 * - Android app (APK): we ask GitHub Releases for a newer APK and offer to download it.
 */
type Status = 'idle' | 'checking' | 'up-to-date' | 'ready' | 'apk-available' | 'unavailable'

interface UpdateState {
  status: Status
  apk: ApkRelease | null
  whatsNew: Release[]
  native: boolean
  check(): Promise<void>
  apply(): Promise<void>
  dismissWhatsNew(): void
}

const Ctx = createContext<UpdateState | null>(null)
const SEEN_KEY = 'mm:lastSeenVersion'
const HOUR = 60 * 60 * 1000
let swStarted = false // registerSW must run once per page, even under React StrictMode

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}
function writeSeen(v: string) {
  try {
    localStorage.setItem(SEEN_KEY, v)
  } catch {
    /* ignore */
  }
}

export function UpdateProvider({ children }: { children: ReactNode }) {
  const native = isNativeApp()
  const [status, setStatus] = useState<Status>('idle')
  const [apk, setApk] = useState<ApkRelease | null>(null)
  const [whatsNew, setWhatsNew] = useState<Release[]>([])
  const swUpdate = useRef<((reload?: boolean) => Promise<void>) | null>(null)
  const swReg = useRef<ServiceWorkerRegistration | undefined>(undefined)

  // Show "What's new" once after an update.
  useEffect(() => {
    const seen = readSeen()
    if (seen && seen !== APP_VERSION) setWhatsNew(releasesSince(seen))
    writeSeen(APP_VERSION)
  }, [])

  // Website / PWA: register the service worker and look for new builds every hour.
  useEffect(() => {
    if (native || !('serviceWorker' in navigator) || swStarted) return
    swStarted = true
    swUpdate.current = registerSW({
      onNeedRefresh: () => setStatus('ready'),
      onRegisteredSW: (_url, reg) => {
        swReg.current = reg
        if (reg) setInterval(() => reg.update().catch(() => {}), HOUR)
      },
      onRegisterError: () => setStatus('unavailable'),
    })
  }, [native])

  const checkApk = useCallback(async () => {
    const r = await checkApkUpdate()
    setApk(r)
    setStatus(r ? 'apk-available' : 'up-to-date')
  }, [])

  // Android app: check at start and every 6 hours while open.
  useEffect(() => {
    if (!native) return
    checkApk()
    const t = setInterval(checkApk, 6 * HOUR)
    return () => clearInterval(t)
  }, [native, checkApk])

  const value: UpdateState = {
    status,
    apk,
    whatsNew,
    native,
    async check() {
      if (status === 'ready' || status === 'apk-available') return
      setStatus('checking')
      if (native) return checkApk()
      const reg = swReg.current
      if (!reg) return setStatus('unavailable')
      try {
        await reg.update()
      } catch {
        /* offline */
      }
      // onNeedRefresh flips the status to 'ready' if a new build was found.
      setTimeout(() => setStatus((s) => (s === 'checking' ? 'up-to-date' : s)), 2500)
    },
    async apply() {
      if (status === 'ready' && swUpdate.current) {
        await swUpdate.current(true)
        // Fallback: if the browser doesn't reload on its own within a moment, reload now.
        setTimeout(() => location.reload(), 2000)
        return
      }
      if (status === 'apk-available' && apk) {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: apk.url })
      }
    },
    dismissWhatsNew: () => setWhatsNew([]),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUpdates() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUpdates outside UpdateProvider')
  return c
}
