import data from './changelog.json'

/**
 * What's new, newest first. The entries live in changelog.json; `npm run release:*` adds one for you.
 * People see the entries newer than the version they last opened, once, after they update.
 * The same notes become the GitHub release notes for the Android APK.
 */
export interface Release {
  version: string
  date: string // YYYY-MM-DD
  notes: string[]
}

export const CHANGELOG: Release[] = data
