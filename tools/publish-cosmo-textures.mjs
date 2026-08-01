#!/usr/bin/env node
/**
 * Publish Cosmo background textures via game-assets recipe (CN → global → assets → backup).
 * Prefer: npm run assets:extract:cosmo
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const result = spawnSync(
  'python',
  ['scripts/game-assets/cli.py', 'extract', '--recipe', 'cosmo'],
  { cwd: ROOT, stdio: 'inherit', shell: true }
)
process.exit(result.status ?? 1)
