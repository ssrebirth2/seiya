/**
 * Full site sync — one command for data + indexes + assets.
 *
 * Usage: npm run sync
 */
import { spawnSync } from 'node:child_process'

const steps = [
  { label: 'Import configs + language packs → Supabase', cmd: 'npm', args: ['run', 'import'] },
  { label: 'Build ItemUsageIndex → Supabase', cmd: 'npm', args: ['run', 'items:index'] },
  { label: 'Build item get-path index → public/data', cmd: 'npm', args: ['run', 'items:get-path:build'] },
  { label: 'Build item stage rewards index → public/data', cmd: 'npm', args: ['run', 'items:stage-rewards:build'] },
  { label: 'Extract all game asset recipes → public/', cmd: 'npm', args: ['run', 'assets:extract:all'] },
  { label: 'Regenerate asset manifest', cmd: 'npm', args: ['run', 'assets:manifest'] },
]

console.log('Site sync — configs, indexes, assets\n')

for (const step of steps) {
  console.log(`\n=== ${step.label} ===`)
  const result = spawnSync(step.cmd, step.args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  })
  if (result.status !== 0) {
    console.error(`\nERROR: sync failed at "${step.label}" (exit ${result.status ?? 1})`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nSite sync complete.')
