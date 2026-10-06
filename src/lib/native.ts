import { useEffect, useState } from 'react'
import { isNativeApp } from './version'

/**
 * Small touches that make the web app behave like an installed phone app:
 * - the status bar takes the app's background colour (light or dark),
 * - the top bar gets a hairline once the page scrolls,
 * - the home-screen shortcut "Add transaction" opens the add sheet straight away.
 */
export function useNativeFeel(openAdd: () => void) {
  useEffect(() => {
    const root = document.documentElement
    const onScroll = () => root.classList.toggle('scrolled', window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const syncStatusBar = () => {
      const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
      if (!bg) return
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg))
    }
    syncStatusBar()
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', syncStatusBar)
    const mo = new MutationObserver(syncStatusBar)
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] })

    const params = new URLSearchParams(location.search)
    if (params.get('action') === 'add') {
      openAdd()
      history.replaceState(history.state, '', location.pathname + location.hash)
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      mq.removeEventListener('change', syncStatusBar)
      mo.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// ---- "Install app" support ----

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  // Chrome on Android fires this when the app can be installed; keep it to show our own Install button.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export const isStandalone = () =>
  isNativeApp() ||
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Whether to suggest installing, and a function that opens Chrome's install dialog when available. */
export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])
  const touch = matchMedia('(pointer: coarse)').matches
  return {
    show: !isStandalone() && touch && (!!deferred || isIOS()),
    canPrompt: !!deferred,
    ios: isIOS(),
    async install() {
      if (!deferred) return false
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      listeners.forEach((l) => l())
      return outcome === 'accepted'
    },
  }
}
