/**
 * Full site sync — delegates to the professional DB hub.
 *
 * Usage: npm run sync
 * Prefer: npm run db   (interactive menu)
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

console.log('Site sync → npm run db -- --full\n')

const result = spawnSync('node', ['tools/db-sync.mjs', '--full'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

process.exit(result.status ?? 1)
