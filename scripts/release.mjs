#!/usr/bin/env node
/**
 * Prepares a new release in one step.
 *
 *   npm run release:patch -- "Fixed the date picker on small phones"
 *   npm run release:minor -- "Added wallets" "Export to Excel"
 *   npm run release:major -- "New design"
 *
 * patch = small fixes (1.1.0 -> 1.1.1), minor = new features (1.1.0 -> 1.2.0),
 * major = big changes (1.1.0 -> 2.0.0).
 *
 * It bumps the version, adds the notes to "What's new", checks the code builds,
 * commits and tags. Pushing the tag (`git push --follow-tags`) then publishes the
 * website and builds the Android APK automatically.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()
const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

const [kind, ...notes] = process.argv.slice(2)
if (!['patch', 'minor', 'major'].includes(kind)) fail('Say which kind of release: patch, minor or major.')
if (notes.length === 0)
  fail('Add at least one line for "What\'s new", in quotes, e.g.\n  npm run release:minor -- "Added wallets"')

if (out('git status --porcelain')) fail('You have uncommitted changes. Commit them first (git add -A && git commit -m "...").')

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
let [major, minor, patch] = pkg.version.split('.').map(Number)
if (kind === 'major') [major, minor, patch] = [major + 1, 0, 0]
if (kind === 'minor') [minor, patch] = [minor + 1, 0]
if (kind === 'patch') patch += 1
// Android's versionCode is major*10000 + minor*100 + patch, so minor and patch must stay below 100.
if (minor > 99 || patch > 99) fail('Minor and patch numbers must stay below 100. Do a minor or major release instead.')
const version = `${major}.${minor}.${patch}`

// 1. Version in package.json and package-lock.json
run(`npm version ${version} --no-git-tag-version`, { stdio: 'ignore' })

// 2. "What's new" entry
const logPath = 'src/changelog.json'
const log = JSON.parse(readFileSync(logPath, 'utf8'))
log.unshift({ version, date: new Date().toISOString().slice(0, 10), notes })
writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n')

// 3. Make sure it still builds before tagging
console.log('\nChecking the app builds…')
run('npm run typecheck')
run('npm run build', { stdio: 'ignore' })

// 4. Commit and tag
run('git add package.json package-lock.json src/changelog.json')
run(`git commit -m "Release v${version}" --quiet`)
run(`git tag -a v${version} -m "Version ${version}"`)

console.log(`\n✔ Version ${version} is ready.\n\nPublish it with:\n\n  git push --follow-tags\n`)
