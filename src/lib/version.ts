import { Capacitor } from '@capacitor/core'
import { CHANGELOG, type Release } from '../changelog'

/** Version of this build, taken from package.json at build time. */
export const APP_VERSION: string = __APP_VERSION__

/** "owner/repo" of the GitHub repository whose Releases carry the Android APK. Set at build time. */
export const GITHUB_REPO: string = import.meta.env?.VITE_GITHUB_REPO ?? ''

export const isNativeApp = () => Capacitor.isNativePlatform()

/** Compare "1.2.10" with "1.3.0". Returns >0 when a is newer. */
export function compareVersions(a: string, b: string) {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0)
  return 0
}

export function releasesSince(version: string | null): Release[] {
  if (!version) return []
  return CHANGELOG.filter((r) => compareVersions(r.version, version) > 0)
}

export interface ApkRelease {
  version: string
  url: string
  notes: string
}

/**
 * Android app only: asks GitHub for the latest release and returns it when it is newer than this build
 * and has an APK attached. Returns null when up to date, offline, or not configured.
 */
export async function checkApkUpdate(repo = GITHUB_REPO, current = APP_VERSION): Promise<ApkRelease | null> {
  if (!repo) return null
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const rel = (await res.json()) as { tag_name: string; body?: string; assets?: { name: string; browser_download_url: string }[] }
    const apk = rel.assets?.find((a) => a.name.endsWith('.apk'))
    if (!apk || compareVersions(rel.tag_name, current) <= 0) return null
    return { version: rel.tag_name.replace(/^v/, ''), url: apk.browser_download_url, notes: rel.body ?? '' }
  } catch {
    return null
  }
}
