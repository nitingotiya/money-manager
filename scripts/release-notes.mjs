#!/usr/bin/env node
// Prints the "What's new" notes for one version as Markdown (used for the GitHub release text).
// Usage: node scripts/release-notes.mjs 1.2.0
import { readFileSync } from 'node:fs'

const version = (process.argv[2] ?? '').replace(/^v/, '')
const entry = JSON.parse(readFileSync('src/changelog.json', 'utf8')).find((r) => r.version === version)
const lines = entry ? entry.notes.map((n) => `- ${n}`) : ['- Improvements and fixes.']
console.log(`## What's new in ${version}\n\n${lines.join('\n')}\n\n**Android:** download \`money-manager.apk\` below and open it on your phone to install or update.`)
