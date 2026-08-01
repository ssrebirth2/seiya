#!/usr/bin/env node
/**
 * Build database changelog from Supabase snapshot diffs.
 *
 *   npm run changelog:build
 *   npm run changelog:build -- --baseline-only
 *
 * First run (no snapshot): writes baseline snapshot, no release.
 * Subsequent runs: diffs → prepends release to public/data/db-changelog.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

import { createSupabaseClient, buildSnapshotFromSupabase } from './lib/changelog/fetch-snapshot.mjs'
import { diffSnapshots } from './lib/changelog/diff.mjs'
import { loadHiddenSets } from './lib/changelog/hidden.mjs'
import { emptyChangelog, MAX_RELEASES } from './lib/changelog/schema.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: join(ROOT, '.env.local') })

const SNAPSHOT_PATH = join(ROOT, 'scripts/data/db-changelog-snapshot.json')
const CHANGELOG_PATH = join(ROOT, 'public/data/db-changelog.json')

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

function saveJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
}

function releaseIdFromDate(d = new Date()) {
  // Include ms so rapid consecutive syncs never collide / overwrite
  return d.toISOString().replace(/:/g, '-')
}

async function main() {
  const baselineOnly = process.argv.includes('--baseline-only')
  const forceBaseline = process.argv.includes('--force-baseline')

  console.log('[changelog] building snapshot from Supabase…')
  const hidden = loadHiddenSets(ROOT)
  const sb = createSupabaseClient()
  const nextSnap = await buildSnapshotFromSupabase(sb, hidden)

  const counts = Object.fromEntries(
    Object.entries(nextSnap.entities).map(([k, v]) => [k, Object.keys(v).length])
  )
  console.log('[changelog] entity counts:', counts)

  const prevSnap = forceBaseline ? null : loadJson(SNAPSHOT_PATH, null)
  const versionMismatch =
    prevSnap && Number(prevSnap.version) !== Number(nextSnap.version)

  if (!prevSnap || baselineOnly || forceBaseline || versionMismatch) {
    saveJson(SNAPSHOT_PATH, nextSnap)
    if (!existsSync(CHANGELOG_PATH)) {
      saveJson(CHANGELOG_PATH, emptyChangelog())
    }
    const reason = versionMismatch
      ? `snapshot version ${prevSnap.version} → ${nextSnap.version}`
      : 'first run / baseline-only'
    console.log(
      `[changelog] baseline snapshot written → ${SNAPSHOT_PATH} (${Object.values(counts).reduce((a, b) => a + b, 0)} entities)`
    )
    console.log(`[changelog] no release generated (${reason})`)
    return
  }

  console.log('[changelog] diffing against previous snapshot…')
  const { entries, summary, collapsedNote, totalEntries } = diffSnapshots(prevSnap, nextSnap)

  saveJson(SNAPSHOT_PATH, nextSnap)

  if (entries.length === 0) {
    console.log('[changelog] no meaningful changes — snapshot updated, changelog unchanged')
    return
  }

  const now = new Date()
  const release = {
    id: releaseIdFromDate(now),
    syncedAt: now.toISOString(),
    summary,
    totalEntries,
    collapsed: collapsedNote || undefined,
    entries,
  }

  const doc = loadJson(CHANGELOG_PATH, emptyChangelog())
  if (!Array.isArray(doc.releases)) doc.releases = []

  // Always prepend — never replace an existing release (history must accumulate)
  const idTaken = doc.releases.some((r) => r.id === release.id)
  if (idTaken) {
    release.id = `${release.id}-${Math.random().toString(36).slice(2, 7)}`
  }
  doc.releases.unshift(release)
  doc.releases = doc.releases.slice(0, MAX_RELEASES)
  doc.generatedAt = now.toISOString()
  doc.version = 1

  saveJson(CHANGELOG_PATH, doc)
  console.log(
    `[changelog] release ${release.id}: +${summary.added} ~${summary.updated} -${summary.removed} (kept ${entries.length}/${totalEntries}) → ${CHANGELOG_PATH}`
  )
}

main().catch((err) => {
  console.error('[changelog] FAILED:', err)
  process.exit(1)
})
